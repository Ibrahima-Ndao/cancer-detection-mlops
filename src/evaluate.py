# src/evaluate.py
# ------------------------------------------------------------
# Évaluation sur le split validation :
# - charge le modèle + poids
# - calcule proba, métriques (AUC, acc, precision, recall, f1)
# - log dans MLflow (run séparé "eval-<model>")
# - écrit un JSON de métriques si --out-json est fourni (compatible DVC)
# ------------------------------------------------------------

import argparse
import os
import platform
import json
import torch
import numpy as np

from src.utils.logger import setup_logging
from src.utils.config import load_all_configs
from src.utils.metrics import binary_metrics
from src.data.dataset import get_loaders
from src.models.models import build_model
import mlflow


@torch.no_grad()
def run_eval(cfg, logger, model_name, weights_path, img_size=None, out_json=None):
    # --------- Config effective ---------
    paths = cfg["paths"]
    trcfg = cfg["train"].copy()
    trcfg["model_name"] = model_name
    if img_size is not None:
        trcfg["img_size"] = img_size

    # --------- Device ---------
    device = torch.device(trcfg["device"] if torch.cuda.is_available() else "cpu")
    if device.type == "cpu":
        logger.info("No CUDA detected -> using CPU")

    # --------- DataLoader (validation uniquement) ---------
    workers = int(trcfg.get("num_workers", 2))
    # Sous Windows, réduire si besoin
    if platform.system().lower().startswith("win") and workers > 0:
        workers = 0

    _, val_loader = get_loaders(
        batch_size=int(trcfg.get("batch_size", 64)),
        img_size=int(trcfg.get("img_size", 96)),
        num_workers=workers
    )

    # --------- Modèle + poids ---------
    model = build_model(model_name, num_classes=1, pretrained=False).to(device)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()

    # --------- Inférence & métriques ---------
    ys, ps = [], []
    for xb, yb in val_loader:
        xb = xb.to(device)
        prob = torch.sigmoid(model(xb)).squeeze(1).cpu().numpy()  # [B]
        ys.extend(yb.numpy().tolist())
        ps.extend(prob.tolist())

    m = binary_metrics(ys, ps, thresh=0.5)
    logger.info(
        f"[EVAL {model_name}] "
        f"AUC={m['auc']:.4f}  ACC={m['accuracy']:.4f}  "
        f"P={m['precision']:.4f}  R={m['recall']:.4f}  F1={m['f1']:.4f}"
    )

    # --------- MLflow logging ---------
    os.makedirs(paths["mlruns_dir"], exist_ok=True)
    mlflow.set_tracking_uri(paths["mlruns_dir"])
    mlflow.set_experiment("cancer-detection-ai")
    with mlflow.start_run(run_name=f"eval-{model_name}"):
        mlflow.log_param("eval_model", model_name)
        mlflow.log_param("weights", weights_path)
        mlflow.log_param("img_size", trcfg["img_size"])
        for k, v in m.items():
            mlflow.log_metric(f"eval_{k}", v)

    # --------- Export JSON (pour DVC) ---------
    if out_json:
        out_dir = os.path.dirname(out_json)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(m, f, indent=2)
        logger.info(f"Metrics JSON written to: {out_json}")

    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Nom du modèle (ex: resnet18)")
    ap.add_argument("--weights", required=True, help="Chemin des poids .pt")
    ap.add_argument("--img-size", type=int, default=None, help="Override img_size (sinon config)")
    ap.add_argument("--out-json", default=None, help="Chemin du JSON de métriques (ex: reports/metrics.json)")
    args = ap.parse_args()

    logger = setup_logging()
    cfg = load_all_configs()

    run_eval(
        cfg=cfg,
        logger=logger,
        model_name=args.model,
        weights_path=args.weights,
        img_size=args.img_size,
        out_json=args.out_json
    )


if __name__ == "__main__":
    main()
