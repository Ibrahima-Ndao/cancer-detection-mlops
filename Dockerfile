# Dockerfile optimisé pour l'API Cancer Detection
FROM python:3.11-slim

# Métadonnées
LABEL maintainer="ndaoibrahima037@gmail.com"
LABEL description="Cancer Detection API avec FastAPI et PyTorch"

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Installation des dépendances système nécessaires pour OpenCV et PIL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Création d'un utilisateur non-root pour la sécurité
RUN useradd -m -u 1000 apiuser && \
    mkdir -p /app/checkpoints && \
    chown -R apiuser:apiuser /app

WORKDIR /app

# Copie et installation des dépendances Python
COPY --chown=apiuser:apiuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY --chown=apiuser:apiuser src/ ./src/
COPY --chown=apiuser:apiuser configs/ ./configs/

# Copie des checkpoints du modèle (si disponibles localement)
# Décommentez cette ligne si vous avez les checkpoints
# COPY --chown=apiuser:apiuser checkpoints/ ./checkpoints/

# Changement vers l'utilisateur non-root
USER apiuser

# Healthcheck pour vérifier que l'API est opérationnelle
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')" || exit 1

# Exposition du port
EXPOSE 8080

# Commande de démarrage
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]