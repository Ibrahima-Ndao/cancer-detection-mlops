# Cancer Detection AI — MLOps

Projet modulaire (configs YAML, logging, DVC, MLflow) + menu CLI pour préparer les données, entraîner, évaluer et soumettre.
Projet complet d'apprentissage profond et d'ingénierie MLOps pour détecter le cancer sur des images médicales. Le dépôt combine préparation des données, entraînement supervisé, suivi des expériences, génération de prédictions test, API de déploiement et interface web.

## 🧭 Aperçu

- **Pipeline reproductible** (Python 3.11) piloté par des YAML et orchestré avec DVC.
- **Suivi d'expériences** et gestion des checkpoints via MLflow.
- **Modèles PyTorch** prêts à l'emploi (ResNet, VGG, DenseNet, EfficientNet, modèle custom `IbraCancerModel`).
- **Interface CLI** pour enchaîner préparation → entraînement → évaluation → prédictions Kaggle.
- **API FastAPI** dockerisable servant les poids `checkpoints/best_<model>.pt`.
- **Frontend React** (Tailwind + lucide-react) pour simuler un portail de diagnostic.

## 🗂️ Arborescence principale

| Répertoire / fichier               | Description                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `configs/`                         | YAML des chemins, hyperparamètres, modèles et logging.                                                    |
| `src/`                             | Code Python : CLI (`menu.py`), entraînement (`train.py`), évaluation, prédictions test, API, utilitaires. |
| `frontend/`                        | Application React consommant l'API.                                                                       |
| `data.dvc` / `dvc.yaml`            | Définition des données versionnées et pipeline DVC.                                                       |
| `Dockerfile`, `docker-compose.yml` | Conteneurisation de l'API.                                                                                |
| `tests/`                           | Tests PyTorch & configuration (`pytest`).                                                                 |
| `notebooks/`, `submissions/`       | Analyses exploratoires et exports Kaggle.                                                                 |
| `rc.txt`                           | Raccourcis de commandes utiles.                                                                           |

## ⚙️ Pré-requis

- Python ≥ 3.11
- Git + [DVC](https://dvc.org/doc/install) (pour récupérer les données)
- Optionnel : GPU CUDA, Docker / Docker Compose, Node.js ≥ 18 pour le frontend

## 🚀 Mise en route

```bash
# 1. Cloner le dépôt
 git clone <repo> && cd cancer-detection-mlops

# 2. Créer et activer un environnement
 python -m venv .venv
 source .venv/bin/activate  # (Windows: .venv\Scripts\activate)

# 3. Installer les dépendances
 pip install -r requirements.txt

# 4. Récupérer les données suivies par DVC
 dvc pull
```

Les images et fichiers CSV se placent dans `data/` selon `configs/paths.yaml`.

## 🧪 Workflow MLOps

### 1. Préparation des splits

```bash
python -m src.data.prepare_splits  # génère data/splits/{train,val}.csv
```

### 2. Entraînement & suivi MLflow

```bash
# Lancement rapide
python -m src.train --model resnet18 --epochs 5 --batch-size 64 --img-size 96

# Menu interactif pour explorer plusieurs modèles
python -m src.menu
```

Pendant l'entraînement :

- MLflow logge hyperparamètres et métriques (`mlruns/`).
- Les meilleurs poids sont sauvegardés dans `checkpoints/best_<model>.pt`.
- Ajustez `configs/train.yaml` ou passez des overrides CLI (`--lr`, `--pretrained`, ...).

### 3. Évaluation sur la validation

```bash
python -m src.evaluate \
  --model resnet18 \
  --weights checkpoints/best_resnet18.pt \
  --img-size 96 \
  --out-json reports/metrics.json
```

Le JSON de métriques est compatible DVC (`dvc metrics show`).

### 4. Prédictions sur le jeu de test

```bash
python -m src.predict_test \
  --model resnet18 \
  --weights checkpoints/best_resnet18.pt
# Produit submissions/submission_resnet18.csv
```

### 5. Visualiser les expériences MLflow

```bash
mlflow ui --backend-store-uri ./mlruns
```

## 🧰 Configuration & personnalisation

- `configs/train.yaml` : hyperparamètres globaux (batch, epochs, lr, device, etc.).
- `configs/models.yaml` : liste des backbones disponibles dans le menu.
- `configs/paths.yaml` : chemins de référence (data, logs, mlruns).
- `configs/logging.yaml` : format et niveau de logs.

Chaque exécution fusionne la configuration YAML avec les overrides CLI / menu.

## 📦 DVC pipeline

Le fichier `dvc.yaml` décrit trois étapes :

1. **prepare** – génère les splits d'entraînement/validation.
2. **train** – entraîne un modèle et produit des checkpoints.
3. **evaluate** – calcule et trace les métriques (`reports/metrics.json`).

```bash
# Pour lancer le pipeline complet
 dvc repro
```

## 🌐 API FastAPI

- Point d'entrée : `src/api.py`
- Lancement local :

```bash
uvicorn src.api:app --host 0.0.0.0 --port 8080
```

- Endpoints principaux :
  - `GET /` (ping)
  - `GET /health`
  - `POST /predict` (image → probabilité)
  - `GET /model/info`

Les checkpoints doivent être présents dans `checkpoints/`. Pour un déploiement containerisé :

```bash
docker compose up --build
```

Le Dockerfile crée un utilisateur non-root, installe les dépendances nécessaires à PyTorch/Pillow et expose le port 8080.

## 💻 Frontend React

Le dossier `frontend/` contient une SPA Tailwind simulant un portail hospitalier (login fictif, upload d'image, historique local). Pour la lancer :

```bash
cd frontend
npm install
npm start  # http://localhost:3000
```

Assurez-vous que l'API FastAPI tourne sur `http://localhost:8080`.

## ✅ Tests

```bash
pytest
```

Les tests vérifient le chargement des configurations et un passage avant arrière des modèles supportés.

## 📝 Conseils supplémentaires

- `rc.txt` regroupe des commandes pratiques (entraînement multi-modèles, MLflow UI, etc.).
- `notebooks/` peut accueillir vos explorations EDA ou validations manuelles.
- `submissions/` conserve l'historique des fichiers `submission_*.csv` générés.

## 🤝 Contribution

1. Forkez et créez une branche (`git checkout -b feature/ma-fonctionnalite`).
2. Ajoutez vos modifications + tests.
3. Ouvrez une Pull Request en décrivant clairement le changement.

Bon entraînement !
