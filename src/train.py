# src/train.py
import os, time, argparse, platform
import torch, torch.nn as nn
from torch.optim import AdamW
from tqdm import tqdm
import mlflow

from src.utils.logger import setup_logging
from src.utils.config import load_all_configs
from src.utils.seed import set_seed
from src.utils.metrics import binary_metrics
from src.data.dataset import get_loaders
from src.models.models import build_model


def train_one_epoch(model, loader, device, optim, criterion, logger):
    model.train()
    total = 0.0
    for xb, yb in tqdm(loader, desc="Train", leave=False):
        xb = xb.to(device)
        yb = yb.float().unsqueeze(1).to(device)

        optim.zero_grad()
        logits = model(xb)
        loss = criterion(logits, yb)
        loss.backward()
        optim.step()

        total += loss.item() * xb.size(0)
    avg = total / len(loader.dataset)
    logger.info(f"train_loss={avg:.4f}")
    return avg

@torch.no_grad()
def validate(model, loader, device, logger):
    model.eval()
    ys, ps = [], []
    for xb, yb in tqdm(loader, desc="Val", leave=False):
        xb = xb.to(device)
        logits = model(xb)
        prob = torch.sigmoid(logits).squeeze(1).cpu().numpy().tolist()
        ys.extend(yb.numpy().tolist())
        ps.extend(prob)
    metrics = binary_metrics(ys, ps, thresh=0.5)
    logger.info(f"val_auc={metrics['auc']:.4f}  acc={metrics['accuracy']:.4f}  "
                f"prec={metrics['precision']:.4f}  rec={metrics['recall']:.4f}  f1={metrics['f1']:.4f}")
    return metrics

def run_train(cfg, logger, overrides=None):
    # --- merge overrides ---
    if overrides:
        for k,v in overrides.items():
            if k in cfg["train"]:
                cfg["train"][k] = v

    paths = cfg["paths"]
    trcfg = cfg["train"]

    # --- device & seed ---
    set_seed(1337)
    device = torch.device(trcfg["device"] if torch.cuda.is_available() else "cpu")
    if device.type == "cpu":
        logger.info("No CUDA detected -> using CPU")

    # --- data loaders ---
    # Windows: si multiprocess bug, num_workers=0
    workers = trcfg["num_workers"]
    if platform.system().lower().startswith("win") and workers > 0:
        workers = min(workers, 0)  # force 0 si souci, ajuste si ok chez toi
    train_loader, val_loader = get_loaders(
        batch_size=trcfg["batch_size"],
        img_size=trcfg["img_size"],
        num_workers=workers
    )

    # --- model ---
    model = build_model(
        name=trcfg["model_name"],
        num_classes=1,
        pretrained=trcfg["pretrained"],
        dropout=0.2
    ).to(device)

    # --- optim & loss ---
    optim = AdamW(model.parameters(), lr=trcfg["lr"], weight_decay=trcfg["weight_decay"])
    criterion = nn.BCEWithLogitsLoss()

    # --- mlflow tracking ---
    os.makedirs(paths["mlruns_dir"], exist_ok=True)
    mlflow.set_tracking_uri(paths["mlruns_dir"])
    mlflow.set_experiment("cancer-detection-ai")

    best_auc = -1.0
    best_path = f"checkpoints/best_{trcfg['model_name']}.pt"
    os.makedirs("checkpoints", exist_ok=True)

    patience = int(trcfg.get("early_stopping", 0))
    bad_epochs = 0

    with mlflow.start_run(run_name=trcfg["model_name"]):
        # log params
        for k,v in trcfg.items(): mlflow.log_param(k, v)

        for epoch in range(1, trcfg["epochs"]+1):
            logger.info(f"Epoch {epoch}/{trcfg['epochs']}")
            train_loss = train_one_epoch(model, train_loader, device, optim, criterion, logger)
            val_metrics = validate(model, val_loader, device, logger)

            # log metrics
            mlflow.log_metric("train_loss", train_loss, step=epoch)
            for mk, mv in val_metrics.items():
                mlflow.log_metric(f"val_{mk}", mv, step=epoch)

            # save best
            if val_metrics["auc"] > best_auc:
                best_auc = val_metrics["auc"]
                torch.save(model.state_dict(), best_path)
                mlflow.log_artifact(best_path)
                logger.info(f"→ new best AUC {best_auc:.4f}, saved {best_path}")
                bad_epochs = 0
            else:
                bad_epochs += 1

            # early stopping
            if patience > 0 and bad_epochs >= patience:
                logger.info(f"Early stopping after {epoch} epochs (no improvement)")
                break

        logger.info(f"Best AUC: {best_auc:.4f}")
        mlflow.log_metric("best_val_auc", best_auc)

def main():
    # CLI minimal si tu veux lancer sans menu
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=None)
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--img-size", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--lr", type=float, default=None)
    parser.add_argument("--pretrained", action="store_true")
    args = parser.parse_args()

    logger = setup_logging()
    cfg = load_all_configs()

    overrides = {}
    if args.model is not None:      overrides["model_name"] = args.model
    if args.epochs is not None:     overrides["epochs"] = args.epochs
    if args.img_size is not None:   overrides["img_size"] = args.img_size
    if args.batch_size is not None: overrides["batch_size"] = args.batch_size
    if args.lr is not None:         overrides["lr"] = args.lr
    if args.pretrained:             overrides["pretrained"] = True

    run_train(cfg, logger, overrides)

if __name__ == "__main__":
    main()
