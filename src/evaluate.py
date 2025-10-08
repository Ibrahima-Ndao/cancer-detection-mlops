# src/evaluate.py
import argparse, os, platform, time, json
import torch, numpy as np
from src.utils.logger import setup_logging
from src.utils.config import load_all_configs
from src.utils.metrics import binary_metrics
from src.data.dataset import get_loaders
from src.models.models import build_model
import mlflow

@torch.no_grad()
def run_eval(cfg, logger, model_name, weights_path, img_size=None):
    paths = cfg["paths"]
    trcfg = cfg["train"].copy()
    trcfg["model_name"] = model_name
    if img_size is not None:
        trcfg["img_size"] = img_size

    device = torch.device(trcfg["device"] if torch.cuda.is_available() else "cpu")
    workers = trcfg["num_workers"]
    if platform.system().lower().startswith("win") and workers > 0:
        workers = 0

    _, val_loader = get_loaders(batch_size=trcfg["batch_size"], img_size=trcfg["img_size"], num_workers=workers)

    model = build_model(model_name, num_classes=1, pretrained=False).to(device)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()

    ys, ps = [], []
    for xb, yb in val_loader:
        xb = xb.to(device)
        prob = torch.sigmoid(model(xb)).squeeze(1).cpu().numpy()
        ys.extend(yb.numpy().tolist())
        ps.extend(prob.tolist())

    m = binary_metrics(ys, ps, thresh=0.5)
    logger.info(f"[EVAL {model_name}] AUC={m['auc']:.4f} ACC={m['accuracy']:.4f} "
                f"P={m['precision']:.4f} R={m['recall']:.4f} F1={m['f1']:.4f}")

    # log in MLflow as a separate run
    os.makedirs(paths["mlruns_dir"], exist_ok=True)
    mlflow.set_tracking_uri(paths["mlruns_dir"])
    mlflow.set_experiment("cancer-detection-ai")
    with mlflow.start_run(run_name=f"eval-{model_name}"):
        mlflow.log_param("eval_model", model_name)
        mlflow.log_param("weights", weights_path)
        mlflow.log_param("img_size", trcfg["img_size"])
        for k,v in m.items(): mlflow.log_metric(f"eval_{k}", v)
    return m

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--weights", required=True)
    ap.add_argument("--img-size", type=int, default=None)
    args = ap.parse_args()

    logger = setup_logging()
    cfg = load_all_configs()
    run_eval(cfg, logger, args.model, args.weights, img_size=args.img_size)
    # write metrics json si demandé par env ou param
    out_json = os.environ.get("EVAL_JSON", None)
    if out_json:
        os.makedirs(os.path.dirname(out_json), exist_ok=True)
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(m, f, indent=2)
    return m

if __name__ == "__main__":
    main()
