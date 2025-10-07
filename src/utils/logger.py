# src/utils/logger.py
import os, logging, logging.config, yaml

def setup_logging(logging_yaml="configs/logging.yaml"):
    os.makedirs("logs", exist_ok=True)
    with open(logging_yaml, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    logging.config.dictConfig(cfg)
    logger = logging.getLogger("mlops")
    return logger
