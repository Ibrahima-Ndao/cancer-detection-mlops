# src/utils/metrics.py
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_fscore_support, accuracy_score

def binary_metrics(y_true, y_prob, thresh=0.5):
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    y_pred = (y_prob >= thresh).astype(int)

    # AUC (protégé si labels tous identiques)
    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        auc = 0.5

    acc = float(accuracy_score(y_true, y_pred))
    p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    return {"auc": auc, "accuracy": acc, "precision": float(p), "recall": float(r), "f1": float(f1)}
