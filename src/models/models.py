# src/models/models.py
import torch, torch.nn as nn
import torchvision.models as models

# ----- Attention blocks (CBAM-like) -----
class ChannelAttention(nn.Module):
    def __init__(self, c, r=16):
        super().__init__()
        self.avg = nn.AdaptiveAvgPool2d(1); self.max = nn.AdaptiveMaxPool2d(1)
        self.fc  = nn.Sequential(nn.Conv2d(c, c//r, 1, bias=False), nn.ReLU(True),
                                 nn.Conv2d(c//r, c, 1, bias=False))
        self.sigmoid = nn.Sigmoid()
    def forward(self, x): return self.sigmoid(self.fc(self.avg(x)) + self.fc(self.max(x)))

class SpatialAttention(nn.Module):
    def __init__(self, k=7):
        super().__init__(); p = k//2
        self.conv = nn.Conv2d(2,1,k,padding=p,bias=False); self.sigmoid = nn.Sigmoid()
    def forward(self, x):
        avg = torch.mean(x,1,keepdim=True); mx,_ = torch.max(x,1,keepdim=True)
        return self.sigmoid(self.conv(torch.cat([avg,mx],1)))

class AttentionBlock(nn.Module):
    def __init__(self, c): super().__init__(); self.ca=ChannelAttention(c); self.sa=SpatialAttention()
    def forward(self, x):  x = x*self.ca(x); x = x*self.sa(x); return x

# ----- Ton modèle perso : IbraCancerModel -----
class IbraCancerModel(nn.Module):
    def __init__(self, num_classes=1, dropout=0.2):
        super().__init__()
        self.f = nn.Sequential(
            nn.Conv2d(3,32,3,padding=1), nn.BatchNorm2d(32), nn.ReLU(), AttentionBlock(32), nn.MaxPool2d(2),
            nn.Conv2d(32,64,3,padding=1), nn.BatchNorm2d(64), nn.ReLU(), AttentionBlock(64), nn.MaxPool2d(2),
            nn.Conv2d(64,128,3,padding=1), nn.BatchNorm2d(128), nn.ReLU(), AttentionBlock(128),
            nn.AdaptiveAvgPool2d(1)
        )
        self.c = nn.Sequential(nn.Flatten(), nn.Dropout(dropout), nn.Linear(128, num_classes))
    def forward(self, x): return self.c(self.f(x))

# ----- Helpers pour remplacer la tête -----
def _replace_fc(m: nn.Module, in_features: int, num_classes: int, dropout: float):
    m.fc = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))

# ----- Fabrique de modèles -----
def build_model(name="resnet18", num_classes=1, pretrained=False, dropout=0.2):
    n = name.lower()
    if n=="ibracancermodel": return IbraCancerModel(num_classes=num_classes, dropout=dropout)
    if n=="resnet18":
        m = models.resnet18(weights=models.ResNet18_Weights.DEFAULT if pretrained else None)
        _replace_fc(m, m.fc.in_features, num_classes, dropout); return m
    if n=="resnet50":
        m = models.resnet50(weights=models.ResNet50_Weights.DEFAULT if pretrained else None)
        _replace_fc(m, m.fc.in_features, num_classes, dropout); return m
    if n=="vgg16":
        m = models.vgg16(weights=models.VGG16_Weights.DEFAULT if pretrained else None)
        m.classifier[-1] = nn.Linear(m.classifier[-1].in_features, num_classes); return m
    if n=="efficientnet_b0":
        m = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT if pretrained else None)
        m.classifier[-1] = nn.Linear(m.classifier[-1].in_features, num_classes); return m
    if n=="densenet121":
        m = models.densenet121(weights=models.DenseNet121_Weights.DEFAULT if pretrained else None)
        m.classifier = nn.Linear(m.classifier.in_features, num_classes); return m
    raise ValueError(f"Unknown model: {name}")
