# src/utils/config.py
import os, re, yaml

def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

# --- helpers pour résoudre ${...} dans les YAML ---
_VAR_RE = re.compile(r"\$\{([^}]+)\}")

def _resolve_str(s: str, ctx: dict) -> str:
    """
    Remplace ${cle} par ctx['cle'] (ou variable d'environnement)
    Boucle jusqu'à stabilisation pour gérer les références imbriquées.
    """
    prev = None
    while prev != s:
        prev = s
        def repl(m):
            key = m.group(1)
            return str(ctx.get(key, os.environ.get(key, m.group(0))))
        s = _VAR_RE.sub(repl, s)
    return s

def _resolve_mapping(d: dict) -> dict:
    """
    Résout les variables d'un mapping (ex.: paths.yaml).
    Les clés référencées peuvent être définies avant ou après.
    """
    out = dict(d)
    changed = True
    while changed:
        changed = False
        for k, v in list(out.items()):
            if isinstance(v, str):
                new_v = _resolve_str(v, out)
                if new_v != v:
                    out[k] = new_v
                    changed = True
    return out

def load_all_configs():
    paths   = load_yaml("configs/paths.yaml")
    paths   = _resolve_mapping(paths)  # <= IMPORTANT : résout ${...}

    train   = load_yaml("configs/train.yaml")
    metrics = load_yaml("configs/metrics.yaml")
    models  = load_yaml("configs/models.yaml")
    return {"paths": paths, "train": train, "metrics": metrics, "models": models}
