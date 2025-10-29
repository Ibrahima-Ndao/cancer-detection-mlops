from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import io
import torch
from PIL import Image
import torchvision.transforms as T
import logging
from contextlib import asynccontextmanager

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import des configurations et modèles
from src.utils.config import load_all_configs
from src.models.models import build_model

# Variables globales pour le modèle
model = None
device = None
tfm = None
cfg = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    global model, device, tfm, cfg
    
    # Startup
    logger.info("🚀 Initialisation de l'API Cancer Detection...")
    try:
        cfg = load_all_configs()
        best_checkpoint = f"checkpoints/best_{cfg['train']['model_name']}.pt"
        img_size = cfg["train"]["img_size"]
        
        # Configuration du device
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"📱 Device utilisé: {device}")
        
        # Chargement du modèle
        logger.info(f"📦 Chargement du modèle: {cfg['train']['model_name']}")
        model = build_model(
            cfg["train"]["model_name"], 
            num_classes=1, 
            pretrained=False
        ).to(device)
        
        model.load_state_dict(torch.load(best_checkpoint, map_location=device))
        model.eval()
        logger.info("✅ Modèle chargé avec succès")
        
        # Transformations d'image
        tfm = T.Compose([
            T.Resize((img_size, img_size)),
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        
        logger.info("✅ API prête à recevoir des requêtes")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'initialisation: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Arrêt de l'API...")


# Création de l'application FastAPI
app = FastAPI(
    title="Cancer Detection API",
    description="API de détection de cancer à partir d'images médicales utilisant le deep learning",
    version="1.0.0",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Modèles Pydantic
class PredictionResponse(BaseModel):
    probability_cancer: float = Field(..., ge=0.0, le=1.0, description="Probabilité de cancer (0-1)")
    label: int = Field(..., ge=0, le=1, description="Classe prédite (0: sain, 1: cancer)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Niveau de confiance")
    prediction: str = Field(..., description="Prédiction en texte")


class HealthResponse(BaseModel):
    status: str
    model_name: str
    device: str
    image_size: int


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


# Routes
@app.get("/", tags=["General"])
async def root():
    """Route racine - Vérification que l'API est en ligne"""
    return {
        "message": "🏥 Cancer Detection API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "predict": "/predict"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Vérification de l'état de santé de l'API et du modèle"""
    if model is None or cfg is None:
        raise HTTPException(status_code=503, detail="Modèle non initialisé")
    
    return HealthResponse(
        status="healthy",
        model_name=cfg['train']['model_name'],
        device=str(device),
        image_size=cfg["train"]["img_size"]
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(file: UploadFile = File(..., description="Image médicale à analyser (JPG, PNG, TIFF)")):
    """
    Prédiction de cancer à partir d'une image médicale
    
    - **file**: Image au format JPG, PNG, JPEG, TIF, TIFF
    - Retourne: Probabilité de cancer et classification
    """
    
    # Vérification du modèle
    if model is None or tfm is None:
        raise HTTPException(
            status_code=503, 
            detail="Modèle non initialisé. Veuillez réessayer."
        )
    
    # Vérification du type de fichier
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/tiff", "image/tif"]
    allowed_extensions = [".jpg", ".jpeg", ".png", ".tif", ".tiff"]
    
    # Vérification par extension si le content_type n'est pas reconnu
    file_extension = file.filename.lower().split('.')[-1] if file.filename else ""
    is_valid_extension = f".{file_extension}" in allowed_extensions
    
    if file.content_type not in allowed_types and not is_valid_extension:
        raise HTTPException(
            status_code=400,
            detail=f"Format de fichier non supporté. Formats acceptés: JPG, PNG, TIFF"
        )
    
    try:
        # Lecture et traitement de l'image
        logger.info(f"📷 Traitement de l'image: {file.filename}")
        image_data = await file.read()
        
        # Vérification de la taille du fichier (max 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Fichier trop volumineux. Taille maximale: 10MB"
            )
        
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Transformation et préparation pour le modèle
        x = tfm(image).unsqueeze(0).to(device)
        
        # Prédiction
        with torch.no_grad():
            logits = model(x)
            probability = torch.sigmoid(logits).item()
        
        # Détermination de la classe et de la confiance
        label = int(probability >= 0.5)
        confidence = probability if label == 1 else (1 - probability)
        prediction_text = "Cancer détecté" if label == 1 else "Tissu sain"
        
        logger.info(f"✅ Prédiction: {prediction_text} (prob: {probability:.4f})")
        
        return PredictionResponse(
            probability_cancer=round(probability, 4),
            label=label,
            confidence=round(confidence, 4),
            prediction=prediction_text
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur lors de la prédiction: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du traitement de l'image: {str(e)}"
        )


@app.get("/model/info", tags=["Model"])
async def model_info():
    """Informations détaillées sur le modèle chargé"""
    if model is None or cfg is None:
        raise HTTPException(status_code=503, detail="Modèle non initialisé")
    
    try:
        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        
        return {
            "model_name": cfg['train']['model_name'],
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "input_size": cfg["train"]["img_size"],
            "device": str(device),
            "checkpoint": f"checkpoints/best_{cfg['train']['model_name']}.pt"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Gestion des erreurs globales
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Erreur globale: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Erreur interne du serveur", "detail": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api:app",
        host="0.0.0.0",
        port=8080,
        reload=False,
        log_level="info"
    )