# src/utils/config.py
import yaml

def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def load_all_configs():
    paths   = load_yaml("configs/paths.yaml")
    train   = load_yaml("configs/train.yaml")
    metrics = load_yaml("configs/metrics.yaml")
    models  = load_yaml("configs/models.yaml")
    return {"paths": paths, "train": train, "metrics": metrics, "models": models}
