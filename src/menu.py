# src/menu.py
import os, sys, platform, subprocess
from src.utils.logger import setup_logging
from src.utils.config import load_all_configs
from src.data.prepare_splits import main as prepare_splits_main
from src.train import run_train
from src.evaluate import run_eval
from src.predict_test import run_predict

def clear():
    os.system("cls" if platform.system().lower().startswith("win") else "clear")

def press_enter():
    input("\nAppuie sur Entrée pour continuer...")

def pick(prompt, options):
    print(prompt)
    for i, opt in enumerate(options, 1):
        print(f"  {i}) {opt}")
    while True:
        try:
            k = int(input("Choix: "))
            if 1 <= k <= len(options): return options[k-1]
        except: pass
        print("Choix invalide, réessaie.")

def main():
    logger = setup_logging()
    cfg = load_all_configs()
    models = cfg["models"]["available"]

    while True:
        clear()
        print("=== MENU MLOPS ===")
        print("1) Préparer les splits (train/val)")
        print("2) Entraîner un modèle (MLflow)")
        print("3) Évaluer un modèle (validation)")
        print("4) Générer submission.csv (test)")
        print("5) Ouvrir MLflow UI")
        print("0) Quitter")
        choice = input("Sélection: ").strip()

        if choice == "1":
            prepare_splits_main()
            press_enter()

        elif choice == "2":
            m = pick("Choisis un modèle :", models)
            epochs = int(input("Epochs (ex 2): ").strip() or "2")
            bs     = int(input("Batch size (ex 64): ").strip() or "64")
            img    = int(input("Img size (96 ou 224 si pretrained): ").strip() or "96")
            pre    = input("Pretrained ImageNet ? (y/n): ").strip().lower().startswith("y")
            overrides = {"model_name": m, "epochs": epochs, "batch_size": bs, "img_size": img, "pretrained": pre}
            run_train(cfg, logger, overrides)
            press_enter()

        elif choice == "3":
            m = pick("Modèle:", models)
            w = input(f"Chemin des poids (ex checkpoints/best_{m}.pt): ").strip() or f"checkpoints/best_{m}.pt"
            img = input("Img size (enter pour défaut config): ").strip()
            img = int(img) if img else None
            run_eval(cfg, logger, m, w, img_size=img)
            press_enter()

        elif choice == "4":
            m = pick("Modèle:", models)
            w = input(f"Chemin des poids (ex checkpoints/best_{m}.pt): ").strip() or f"checkpoints/best_{m}.pt"
            img = input("Img size (enter pour défaut config): ").strip()
            img = int(img) if img else None
            run_predict(cfg, logger, m, w, img_size=img)
            press_enter()

        elif choice == "5":
            # Affiche la commande à lancer dans un autre terminal
            uri = cfg["paths"]["mlruns_dir"]
            print("\nLance MLflow UI dans un autre terminal avec :")
            print(f"mlflow ui --backend-store-uri {uri}")
            press_enter()

        elif choice == "0":
            print("Bye!")
            break
        else:
            print("Choix invalide."); press_enter()

if __name__ == "__main__":
    main()
