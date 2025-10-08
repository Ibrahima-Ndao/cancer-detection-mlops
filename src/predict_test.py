# src/predict_test.py
# ------------------------------------------------------------
# Prédiction batched sur le jeu de test pour générer submission_<model>.csv
# - DataLoader (batchs, num_workers, prefetch, pin_memory)
# - Support GPU (CUDA) si disponible + AMP (mi-précision)
# - Chemins/paramètres lus depuis les YAML (configs/)
# ------------------------------------------------------------

import os
import csv
import argparse
import platform
from contextlib import nullcontext
from PIL import Image

import torch
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T

from src.utils.logger import setup_logging
from src.utils.config import load_all_configs
from src.models.models import build_model

# Prioriser les formats rapides (PNG/JPG) ; TIF en dernier car plus lent
EXTS = (".png", ".jpg", ".jpeg", ".tif")


def find_image(root: str, img_id: str) -> str:
    """Trouve le chemin d'une image test par id en testant plusieurs extensions."""
    for ext in EXTS:
        p = os.path.join(root, img_id + ext)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(img_id)


class TestCSV(Dataset):
    """Dataset pour le test set (ids -> images) avec les mêmes prétraitements que la validation."""
    def __init__(self, ids, img_root: str, img_size: int = 96):
        self.ids = ids
        self.img_root = img_root
        self.tfm = T.Compose([
            T.Resize((img_size, img_size)),
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406],
                        [0.229, 0.224, 0.225]),
        ])

    def __len__(self):
        return len(self.ids)

    def __getitem__(self, idx):
        _id = self.ids[idx]
        path = find_image(self.img_root, _id)
        img = Image.open(path).convert("RGB")
        return self.tfm(img), _id


@torch.inference_mode()  # plus rapide que no_grad pour l'inférence
def run_predict(
    cfg: dict,
    logger,
    model_name: str,
    weights_path: str,
    img_size: int | None = None,
    out_dir: str = "submissions",
    batch_size: int | None = None,
    num_workers: int | None = None,
    device_arg: str | None = None,  # "cuda" | "cpu" | None (auto)
    amp: bool = True
):
    """Prédit tout le test set en batchs et écrit un CSV de soumission Kaggle."""

    paths = cfg["paths"]
    trcfg = cfg["train"].copy()

    # overrides
    if img_size is not None:
        trcfg["img_size"] = img_size
    if batch_size is None:
        # Batch assez grand en inférence si RAM/VRAM ok
        batch_size = trcfg.get("batch_size", 256)
    if num_workers is None:
        num_workers = trcfg.get("num_workers", 2)

    # --- device propre (prend en compte la demande utilisateur et la dispo CUDA) ---
    if device_arg == "cpu":
        device = torch.device("cpu")
    elif device_arg == "cuda":
        if torch.cuda.is_available():
            device = torch.device("cuda")
        else:
            logger.warning("CUDA demandé mais indisponible → fallback CPU")
            device = torch.device("cpu")
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    logger.info(f"Inference on {device.type.upper()}")

    # Windows: si souci multi-process, réduire à 0-2 workers
    if platform.system().lower().startswith("win") and num_workers > 2:
        num_workers = 2

    # --- lire l'ordre des ids depuis sample_submission.csv ---
    ids = []
    with open(paths["sample_sub_csv"], newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            ids.append(row["id"])
    logger.info(f"{len(ids)} images test à prédire")

    # --- dataset & dataloader ---
    ds = TestCSV(ids, paths["test_images"], img_size=trcfg["img_size"])
    pin = (device.type == "cuda")
    dl_kwargs = dict(
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin
    )
    # persistent_workers & prefetch_factor seulement si num_workers > 0
    if num_workers and num_workers > 0:
        dl_kwargs.update(dict(
            persistent_workers=True,
            prefetch_factor=2
        ))
    dl = DataLoader(ds, **dl_kwargs)

    # --- modèle ---
    model = build_model(model_name, num_classes=1, pretrained=False).to(device)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()

    # --- AMP moderne (CUDA ou CPU) ---
    if amp and device.type == "cuda":
        autocast_ctx = torch.cuda.amp.autocast
    elif amp and device.type == "cpu":
        # Nouvelle API : torch.amp.autocast('cpu')
        autocast_ctx = lambda: torch.amp.autocast(device_type="cpu")  # noqa: E731
    else:
        autocast_ctx = nullcontext

    # --- prédiction batched ---
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"submission_{model_name}.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        w.writerow(["id", "label"])

        for xb, id_batch in dl:
            xb = xb.to(device, non_blocking=True)
            with autocast_ctx():
                # logits -> sigmoid -> proba ; squeeze(1) pour [B,1] -> [B]
                prob = torch.sigmoid(model(xb)).squeeze(1).detach().cpu().numpy()

            # écrire en gardant l'ordre
            for _id, p in zip(id_batch, prob):
                w.writerow([_id, float(p)])

    logger.info(f"submission saved -> {out_path}")
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Nom du modèle (ex: resnet18)")
    ap.add_argument("--weights", required=True, help="Chemin du .pt (ex: checkpoints/best_resnet18.pt)")
    ap.add_argument("--img-size", type=int, default=None, help="Override img_size (sinon config)")
    ap.add_argument("--batch-size", type=int, default=None, help="Taille de lot pour l'inférence")
    ap.add_argument("--num-workers", type=int, default=None, help="Workers DataLoader")
    ap.add_argument("--device", default=None, help="cuda|cpu (auto si non spécifié)")
    ap.add_argument("--no-amp", action="store_true", help="Désactiver AMP (mi-précision)")
    args = ap.parse_args()

    logger = setup_logging()
    cfg = load_all_configs()

    run_predict(
        cfg=cfg,
        logger=logger,
        model_name=args.model,
        weights_path=args.weights,
        img_size=args.img_size,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        device_arg=args.device,
        amp=not args.no_amp
    )


if __name__ == "__main__":
    main()
