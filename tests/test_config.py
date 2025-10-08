from src.utils.config import load_all_configs
def test_configs_load():
    cfg = load_all_configs()
    assert "paths" in cfg and "train" in cfg and "models" in cfg
