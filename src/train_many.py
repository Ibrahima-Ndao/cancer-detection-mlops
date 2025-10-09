# src/train_many.py
import argparse
from src.utils.logger import setup_logging
from src.utils.config import load_all_configs
from src.train import run_train

ALL = ["resnet18","resnet50","vgg16","efficientnet_b0","densenet121","ibracancermodel"]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--models", default="resnet18",
                   help="Liste séparée par des virgules (ex: resnet18,ibracancermodel) ou 'all'")
    p.add_argument("--epochs", type=int, default=None)
    p.add_argument("--batch-size", type=int, default=None)
    p.add_argument("--img-size", type=int, default=None)
    p.add_argument("--lr", type=float, default=None)
    p.add_argument("--pretrained", action="store_true")
    p.add_argument("--device", default=None)  # cuda|cpu (optionnel, sinon prend la config)
    args = p.parse_args()

    log = setup_logging()
    cfg = load_all_configs()

    models = ALL if args.models.lower()=="all" else [m.strip() for m in args.models.split(",")]

    for m in models:
        log.info(f"=== TRAIN {m} ===")
        overrides = {"model_name": m}
        if args.epochs is not None:     overrides["epochs"] = args.epochs
        if args.batch_size is not None: overrides["batch_size"] = args.batch_size
        if args.img_size is not None:   overrides["img_size"] = args.img_size
        if args.lr is not None:         overrides["lr"] = args.lr
        if args.pretrained:             overrides["pretrained"] = True
        if args.device is not None:     overrides["device"] = args.device  # pris en compte par run_train

        try:
            run_train(cfg, log, overrides)
        except Exception as e:
            log.exception(f"Echec sur {m}: {e} (je continue avec le modèle suivant)")

if __name__ == "__main__":
    main()
