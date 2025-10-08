import torch
from src.models.models import build_model
def test_build_models_forward():
    x = torch.randn(2,3,96,96)
    for name in ["ibracancermodel","resnet18","vgg16","densenet121","efficientnet_b0"]:
        m = build_model(name, num_classes=1, pretrained=False)
        y = m(x)
        assert tuple(y.shape)==(2,1)
