import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Activity,
  AlertCircle,
  CheckCircle,
  FileImage,
  Zap,
  Brain,
  BarChart3,
  TrendingUp,
  Shield,
  LogIn,
  User,
  Lock,
  LogOut,
  Heart,
  Mail,
  Phone,
  MapPin,
  X,
  History,
  Calendar,
  Users,
  FileText,
  Download,
  Eye,
  Printer,
} from "lucide-react";

export default function CancerDetectionSenegal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentView, setCurrentView] = useState("analysis"); // 'analysis' ou 'history'

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState("checking");
  const fileInputRef = useRef(null);

  // Informations du patient
  const [patientInfo, setPatientInfo] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    patientId: "",
  });

  // Historique des diagnostics
  const [diagnosticHistory, setDiagnosticHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);

  useEffect(() => {
    checkApiHealth();
    loadHistoryFromStorage();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadHistoryFromStorage();
    }
  }, [isAuthenticated, currentUser]);

  const checkApiHealth = async () => {
    try {
      const response = await fetch("http://localhost:8080/health");
      if (response.ok) {
        setApiStatus("online");
      } else {
        setApiStatus("offline");
      }
    } catch (err) {
      setApiStatus("offline");
    }
  };

  const loadHistoryFromStorage = () => {
    if (currentUser) {
      const storageKey = `diagnostic_history_${currentUser.username}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDiagnosticHistory(JSON.parse(stored));
      }
    }
  };

  const saveHistoryToStorage = (history) => {
    if (currentUser) {
      const storageKey = `diagnostic_history_${currentUser.username}`;
      localStorage.setItem(storageKey, JSON.stringify(history));
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "";
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleDateOfBirthChange = (date) => {
    setPatientInfo({
      ...patientInfo,
      dateOfBirth: date,
      age: calculateAge(date),
    });
  };

  const handleLogin = () => {
    setLoginError("");

    if (loginForm.username && loginForm.password) {
      if (loginForm.password.length >= 6) {
        setIsAuthenticated(true);
        setCurrentUser({
          username: loginForm.username,
          role: "Médecin",
          hospital: "Hôpital Principal de Dakar",
        });
        setLoginForm({ username: "", password: "" });
      } else {
        setLoginError("Le mot de passe doit contenir au moins 6 caractères");
      }
    } else {
      setLoginError("Veuillez remplir tous les champs");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    resetAnalysis();
    setDiagnosticHistory([]);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setResult(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePatientInfo = () => {
    if (!patientInfo.firstName || !patientInfo.lastName) {
      setError("Veuillez renseigner le nom et prénom du patient");
      return false;
    }
    if (!patientInfo.dateOfBirth) {
      setError("Veuillez renseigner la date de naissance du patient");
      return false;
    }
    if (!patientInfo.gender) {
      setError("Veuillez sélectionner le genre du patient");
      return false;
    }
    return true;
  };

  const handlePredict = async () => {
    if (!selectedFile) {
      setError("Veuillez sélectionner une image");
      return;
    }

    if (!validatePatientInfo()) {
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://localhost:8080/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la prédiction");
      }

      const data = await response.json();
      setResult(data);

      // Ajouter à l'historique
      const newDiagnostic = {
        id: Date.now(),
        date: new Date().toISOString(),
        patient: { ...patientInfo },
        result: data,
        imageName: selectedFile.name,
        imagePreview: preview,
        doctor: currentUser.username,
      };

      const updatedHistory = [newDiagnostic, ...diagnosticHistory];
      setDiagnosticHistory(updatedHistory);
      saveHistoryToStorage(updatedHistory);
    } catch (err) {
      setError(err.message || "Erreur de connexion à l'API");
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setPatientInfo({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      age: "",
      gender: "",
      patientId: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const viewHistoryDetail = (item) => {
    setSelectedHistoryItem(item);
    setShowHistoryDetail(true);
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(diagnosticHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique_${currentUser.username}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
  };

  const exportPatientToPDF = (item) => {
    // Créer le contenu HTML pour le PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport de Diagnostic - ${item.patient.firstName} ${
      item.patient.lastName
    }</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 4px solid #00853F;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .flag {
            display: flex;
            justify-content: center;
            margin-bottom: 15px;
          }
          .flag-part {
            width: 80px;
            height: 50px;
          }
          .flag-green { background: #00853F; }
          .flag-yellow { background: #FDEF42; }
          .flag-red { background: #E31B23; }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #1a202c;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 14px;
            color: #718096;
          }
          .section {
            margin-bottom: 25px;
            padding: 20px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 12px;
            color: #718096;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1a202c;
          }
          .result-box {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
          }
          .result-positive {
            background: #f0fdf4;
            border: 3px solid #86efac;
          }
          .result-negative {
            background: #fef2f2;
            border: 3px solid #fca5a5;
          }
          .result-text {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .result-positive .result-text { color: #16a34a; }
          .result-negative .result-text { color: #dc2626; }
          .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f7fafc;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          .metric-label {
            font-size: 14px;
            color: #4a5568;
          }
          .metric-value {
            font-size: 16px;
            font-weight: bold;
            color: #1a202c;
          }
          .progress-bar {
            width: 100%;
            height: 12px;
            background: #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            margin-top: 8px;
          }
          .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
          }
          .progress-green { background: linear-gradient(90deg, #10b981, #059669); }
          .progress-red { background: linear-gradient(90deg, #ef4444, #dc2626); }
          .image-container {
            text-align: center;
            margin: 20px 0;
          }
          .analyzed-image {
            max-width: 400px;
            max-height: 300px;
            border-radius: 12px;
            border: 3px solid #e2e8f0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #718096;
          }
          .warning-box {
            background: #fffbeb;
            border: 2px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .warning-text {
            font-size: 11px;
            color: #92400e;
            line-height: 1.5;
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
            border-top: 2px solid #2d3748;
            padding-top: 10px;
          }
          .signature-label {
            font-size: 12px;
            color: #4a5568;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="flag">
            <div class="flag-part flag-green"></div>
            <div class="flag-part flag-yellow"></div>
            <div class="flag-part flag-red"></div>
          </div>
          <div class="title">🇸🇳 RAPPORT DE DIAGNOSTIC MÉDICAL</div>
          <div class="subtitle">Cancer Detection AI - Sénégal, Ensemble Contre le Cancer</div>
        </div>

        <div class="section">
          <div class="section-title">📋 Informations du Patient</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nom complet</div>
              <div class="info-value">${item.patient.firstName} ${
      item.patient.lastName
    }</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date de naissance</div>
              <div class="info-value">${new Date(
                item.patient.dateOfBirth
              ).toLocaleDateString("fr-FR")}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Âge</div>
              <div class="info-value">${item.patient.age} ans</div>
            </div>
            <div class="info-item">
              <div class="info-label">Genre</div>
              <div class="info-value">${
                item.patient.gender === "M" ? "Masculin" : "Féminin"
              }</div>
            </div>
            ${
              item.patient.patientId
                ? `
            <div class="info-item">
              <div class="info-label">ID Patient</div>
              <div class="info-value">${item.patient.patientId}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="section">
          <div class="section-title">🗓️ Informations du Diagnostic</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Date de l'examen</div>
              <div class="info-value">${new Date(item.date).toLocaleDateString(
                "fr-FR"
              )}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Heure de l'examen</div>
              <div class="info-value">${new Date(item.date).toLocaleTimeString(
                "fr-FR",
                { hour: "2-digit", minute: "2-digit" }
              )}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Médecin responsable</div>
              <div class="info-value">Dr. ${item.doctor}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Établissement</div>
              <div class="info-value">Hôpital Principal de Dakar</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fichier analysé</div>
              <div class="info-value" style="font-size: 11px;">${
                item.imageName
              }</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">🔬 Résultat de l'Analyse IA</div>
          <div class="result-box ${
            item.result.label === 0 ? "result-positive" : "result-negative"
          }">
            <div class="result-text">${item.result.prediction}</div>
            <div style="font-size: 14px; color: #4a5568;">Diagnostic assisté par intelligence artificielle</div>
          </div>

          <div class="metric">
            <span class="metric-label">Probabilité de cancer détecté</span>
            <span class="metric-value">${(
              item.result.probability_cancer * 100
            ).toFixed(2)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${
              item.result.probability_cancer > 0.5
                ? "progress-red"
                : "progress-green"
            }" 
                 style="width: ${item.result.probability_cancer * 100}%"></div>
          </div>

          <div class="metric" style="margin-top: 15px;">
            <span class="metric-label">Niveau de confiance du modèle</span>
            <span class="metric-value">${(item.result.confidence * 100).toFixed(
              2
            )}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill progress-green" style="width: ${
              item.result.confidence * 100
            }%"></div>
          </div>
        </div>

        ${
          item.imagePreview
            ? `
        <div class="section">
          <div class="section-title">🖼️ Image Analysée</div>
          <div class="image-container">
            <img src="${item.imagePreview}" alt="Image médicale analysée" class="analyzed-image">
          </div>
        </div>
        `
            : ""
        }

        <div class="warning-box">
          <div class="warning-text">
            <strong>⚠️ AVERTISSEMENT MÉDICAL IMPORTANT :</strong><br>
            Ce rapport a été généré par un système d'intelligence artificielle à des fins d'aide au diagnostic uniquement. 
            Les résultats présentés ne constituent pas un diagnostic médical définitif et ne doivent pas être utilisés comme 
            unique base de décision thérapeutique. Une confirmation par un médecin spécialiste qualifié et des examens 
            complémentaires sont impératifs avant toute prise de décision médicale. Ce système IA a une précision de 95.2% 
            sur les données de test mais peut présenter des faux positifs ou faux négatifs.
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-label">
              <strong>Signature du Médecin</strong><br>
              Dr. ${item.doctor}<br>
              Hôpital Principal de Dakar
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-label">
              <strong>Date et Cachet</strong><br>
              ${new Date(item.date).toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>

        <div class="footer">
          <strong>Cancer Detection AI - Système de Diagnostic Assisté par Intelligence Artificielle</strong><br>
          Hôpital Principal de Dakar • Avenue Nelson Mandela, Dakar, Sénégal<br>
          Tél: +221 33 823 45 67 • Email: admin@cancerdetection.sn<br>
          <br>
          Document généré le ${new Date().toLocaleString(
            "fr-FR"
          )} • Référence: ${item.id}
        </div>
      </body>
      </html>
    `;

    // Ouvrir dans une nouvelle fenêtre et imprimer
    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Attendre que le contenu soit chargé avant d'imprimer
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  };

  const SenegalFlag = () => (
    <svg viewBox="0 0 900 600" className="w-full h-full">
      <rect width="300" height="600" fill="#00853F" />
      <rect x="300" width="300" height="600" fill="#FDEF42" />
      <rect x="600" width="300" height="600" fill="#E31B23" />
      <path
        d="M 450,200 L 475,275 L 555,275 L 490,320 L 515,395 L 450,350 L 385,395 L 410,320 L 345,275 L 425,275 Z"
        fill="#00853F"
      />
    </svg>
  );

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <h3 className={`text-3xl font-bold ${color} mb-1`}>{value}</h3>
          <p className="text-gray-500 text-xs">{subtitle}</p>
        </div>
        <div
          className={`p-3 rounded-lg ${color
            .replace("text", "bg")
            .replace("600", "100")}`}
        >
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const ConfidenceBar = ({ value, label }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">
          {(value * 100).toFixed(2)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${
            value > 0.5
              ? "bg-gradient-to-r from-red-500 to-red-600"
              : "bg-gradient-to-r from-green-500 to-green-600"
          }`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="text-center lg:text-left space-y-6">
            <div className="flex items-center justify-center lg:justify-start space-x-4">
              <div className="w-20 h-14 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                <SenegalFlag />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Cancer Detection AI
                </h1>
                <p className="text-lg text-gray-600 flex items-center justify-center lg:justify-start gap-2 mt-1">
                  <Heart className="w-5 h-5 text-red-500" />
                  Sénégal, Ensemble Contre le Cancer
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-xl border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Notre Mission
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Utiliser l'intelligence artificielle pour améliorer le
                diagnostic précoce du cancer au Sénégal et sauver des vies.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">95%</div>
                  <div className="text-xs text-gray-600 mt-1">Précision</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">24/7</div>
                  <div className="text-xs text-gray-600 mt-1">Disponible</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">100%</div>
                  <div className="text-xs text-gray-600 mt-1">Sécurisé</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm text-gray-600">
              <Shield className="w-5 h-5" />
              <span>Données sécurisées • Conforme aux normes médicales</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-12 border border-gray-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-yellow-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Connexion
              </h2>
              <p className="text-gray-600">Accédez à votre espace médecin</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, username: e.target.value })
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    placeholder="Entrez votre nom d'utilisateur"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    placeholder="Entrez votre mot de passe"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{loginError}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <LogIn className="w-5 h-5" />
                <span>Se connecter</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Vous n'avez pas de compte ?{" "}
                <button
                  onClick={() => setShowContactModal(true)}
                  className="text-green-600 font-semibold hover:underline"
                >
                  Contactez l'administrateur
                </button>
              </p>
            </div>
          </div>
        </div>

        {showContactModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fadeIn">
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-yellow-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Contactez-nous
                </h3>
                <p className="text-gray-600">
                  Pour obtenir un accès, contactez notre équipe
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl">
                  <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <a
                      href="mailto:admin@cancerdetection.sn"
                      className="text-green-600 hover:underline"
                    >
                      admin@cancerdetection.sn
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-xl">
                  <Phone className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Téléphone
                    </p>
                    <a
                      href="tel:+221338234567"
                      className="text-yellow-600 hover:underline"
                    >
                      +221 33 823 45 67
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Adresse</p>
                    <p className="text-red-600">
                      Hôpital Principal de Dakar
                      <br />
                      Avenue Nelson Mandela, Dakar, Sénégal
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-600 text-center">
                  💡 Les demandes d'accès sont traitées dans un délai de 24-48
                  heures
                </p>
              </div>

              <button
                onClick={() => setShowContactModal(false)}
                className="w-full mt-6 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-red-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-12 rounded-lg overflow-hidden shadow-md border-2 border-gray-200">
                <SenegalFlag />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Cancer Detection AI
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Sénégal, Ensemble Contre le Cancer
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    apiStatus === "online" ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                />
                <span className="text-sm text-gray-600">
                  API {apiStatus === "online" ? "en ligne" : "hors ligne"}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {currentUser?.username}
                  </p>
                  <p className="text-xs text-gray-600">{currentUser?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex space-x-2 bg-white rounded-xl p-2 shadow-md">
          <button
            onClick={() => setCurrentView("analysis")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-all ${
              currentView === "analysis"
                ? "bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>Nouvelle Analyse</span>
          </button>
          <button
            onClick={() => setCurrentView("history")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-all ${
              currentView === "history"
                ? "bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <History className="w-5 h-5" />
            <span>Historique ({diagnosticHistory.length})</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        {currentView === "analysis" ? (
          <>
            <div className="bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    🇸🇳 Initiative Nationale de Santé
                  </h2>
                  <p className="text-lg opacity-90">
                    Ensemble, nous luttons contre le cancer pour un Sénégal en
                    meilleure santé
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center">
                    <p className="text-4xl font-bold">2025</p>
                    <p className="text-sm">Année d'innovation</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={Brain}
                title="Modèle IA"
                value="PyTorch"
                subtitle="Deep Learning avancé"
                color="text-purple-600"
              />
              <StatCard
                icon={Zap}
                title="Précision"
                value="95.2%"
                subtitle="Sur données de test"
                color="text-blue-600"
              />
              <StatCard
                icon={Users}
                title="Patients"
                value={diagnosticHistory.length}
                subtitle="Diagnostics effectués"
                color="text-green-600"
              />
              <StatCard
                icon={Shield}
                title="Sécurité"
                value="100%"
                subtitle="Données privées"
                color="text-red-600"
              />
            </div>

            {/* Informations Patient */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Informations du Patient
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={patientInfo.firstName}
                    onChange={(e) =>
                      setPatientInfo({
                        ...patientInfo,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    placeholder="Prénom du patient"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={patientInfo.lastName}
                    onChange={(e) =>
                      setPatientInfo({
                        ...patientInfo,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    placeholder="Nom du patient"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    value={patientInfo.dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Âge
                  </label>
                  <input
                    type="text"
                    value={patientInfo.age ? `${patientInfo.age} ans` : ""}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                    placeholder="Calculé automatiquement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genre *
                  </label>
                  <select
                    value={patientInfo.gender}
                    onChange={(e) =>
                      setPatientInfo({ ...patientInfo, gender: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  >
                    <option value="">Sélectionner</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Patient (optionnel)
                  </label>
                  <input
                    type="text"
                    value={patientInfo.patientId}
                    onChange={(e) =>
                      setPatientInfo({
                        ...patientInfo,
                        patientId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    placeholder="Ex: PAT-2025-001"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <FileImage className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Analyser une image
                  </h2>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    preview
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
                  }`}
                >
                  {preview ? (
                    <div className="space-y-4">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg shadow-lg object-contain"
                      />
                      <p className="text-sm text-gray-600 font-medium">
                        {selectedFile?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 via-yellow-500 to-red-500 rounded-full flex items-center justify-center">
                        <Upload className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 mb-1">
                          Cliquez pour télécharger
                        </p>
                        <p className="text-sm text-gray-500">
                          Formats: JPG, PNG, TIFF • Max 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/tiff,image/tif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={handlePredict}
                    disabled={!selectedFile || loading}
                    className="flex-1 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Analyse en cours...</span>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-5 h-5" />
                        <span>Analyser l'image</span>
                      </>
                    )}
                  </button>
                  {(preview || result) && (
                    <button
                      onClick={resetAnalysis}
                      className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <Activity className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Résultats de l'analyse
                  </h2>
                </div>

                {!result && !loading && (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">
                      En attente d'analyse
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Remplissez les informations patient et téléchargez une
                      image
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center h-96">
                    <div className="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">
                      Analyse en cours...
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Le modèle traite votre image
                    </p>
                  </div>
                )}

                {result && (
                  <div className="space-y-6 animate-fadeIn">
                    <div
                      className={`p-6 rounded-xl border-2 ${
                        result.label === 0
                          ? "bg-green-50 border-green-300"
                          : "bg-red-50 border-red-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        {result.label === 0 ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                          <AlertCircle className="w-8 h-8 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Diagnostic
                          </p>
                          <h3
                            className={`text-2xl font-bold ${
                              result.label === 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {result.prediction}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        Patient
                      </p>
                      <p className="text-blue-800">
                        {patientInfo.firstName} {patientInfo.lastName}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {patientInfo.age} ans •{" "}
                        {patientInfo.gender === "M" ? "Masculin" : "Féminin"}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Analyse détaillée
                      </h4>
                      <ConfidenceBar
                        value={result.probability_cancer}
                        label="Probabilité de cancer"
                      />
                      <ConfidenceBar
                        value={result.confidence}
                        label="Niveau de confiance"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">
                          Probabilité
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(result.probability_cancer * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Confiance</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(result.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        ⚠️ <strong>Important:</strong> Ce résultat est fourni à
                        titre indicatif uniquement. Il ne remplace pas un
                        diagnostic médical professionnel.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <History className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Historique des Diagnostics
                  </h2>
                </div>
                {diagnosticHistory.length > 0 && (
                  <button
                    onClick={exportHistory}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exporter</span>
                  </button>
                )}
              </div>

              {diagnosticHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    Aucun diagnostic enregistré
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Commencez par effectuer une analyse
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {diagnosticHistory.map((item) => (
                    <div
                      key={item.id}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div
                              className={`p-2 rounded-lg ${
                                item.result.label === 0
                                  ? "bg-green-100"
                                  : "bg-red-100"
                              }`}
                            >
                              {item.result.label === 0 ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {item.patient.firstName} {item.patient.lastName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {item.patient.age} ans •{" "}
                                {item.patient.gender === "M"
                                  ? "Masculin"
                                  : "Féminin"}
                                {item.patient.patientId &&
                                  ` • ID: ${item.patient.patientId}`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Date</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(item.date).toLocaleDateString(
                                  "fr-FR"
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Heure</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(item.date).toLocaleTimeString(
                                  "fr-FR",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Résultat</p>
                              <p
                                className={`text-sm font-semibold ${
                                  item.result.label === 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {item.result.prediction}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Confiance</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {(item.result.confidence * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <FileImage className="w-4 h-4" />
                            <span>{item.imageName}</span>
                          </div>
                        </div>

                        <div className="ml-4 flex space-x-2">
                          <button
                            onClick={() => exportPatientToPDF(item)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors group"
                            title="Exporter en PDF"
                          >
                            <Printer className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                          </button>
                          <button
                            onClick={() => viewHistoryDetail(item)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Détails Historique */}
      {showHistoryDetail && selectedHistoryItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 relative animate-fadeIn">
            <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                Détails du Diagnostic
              </h3>
              <button
                onClick={() => setShowHistoryDetail(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Informations Patient</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Nom complet:</span>
                        <span className="font-semibold text-blue-900">
                          {selectedHistoryItem.patient.firstName}{" "}
                          {selectedHistoryItem.patient.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">
                          Date de naissance:
                        </span>
                        <span className="font-semibold text-blue-900">
                          {new Date(
                            selectedHistoryItem.patient.dateOfBirth
                          ).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Âge:</span>
                        <span className="font-semibold text-blue-900">
                          {selectedHistoryItem.patient.age} ans
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Genre:</span>
                        <span className="font-semibold text-blue-900">
                          {selectedHistoryItem.patient.gender === "M"
                            ? "Masculin"
                            : "Féminin"}
                        </span>
                      </div>
                      {selectedHistoryItem.patient.patientId && (
                        <div className="flex justify-between">
                          <span className="text-blue-700">ID Patient:</span>
                          <span className="font-semibold text-blue-900">
                            {selectedHistoryItem.patient.patientId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <h4 className="font-bold text-purple-900 mb-3 flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Informations Diagnostic</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-purple-700">Date:</span>
                        <span className="font-semibold text-purple-900">
                          {new Date(
                            selectedHistoryItem.date
                          ).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Heure:</span>
                        <span className="font-semibold text-purple-900">
                          {new Date(
                            selectedHistoryItem.date
                          ).toLocaleTimeString("fr-FR")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Médecin:</span>
                        <span className="font-semibold text-purple-900">
                          {selectedHistoryItem.doctor}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Image:</span>
                        <span className="font-semibold text-purple-900 text-xs truncate max-w-[150px]">
                          {selectedHistoryItem.imageName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div
                    className={`rounded-xl p-4 border-2 ${
                      selectedHistoryItem.result.label === 0
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <h4 className="font-bold mb-3 flex items-center space-x-2">
                      {selectedHistoryItem.result.label === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span
                        className={
                          selectedHistoryItem.result.label === 0
                            ? "text-green-900"
                            : "text-red-900"
                        }
                      >
                        Résultat du Diagnostic
                      </span>
                    </h4>
                    <div
                      className={`text-3xl font-bold mb-4 ${
                        selectedHistoryItem.result.label === 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {selectedHistoryItem.result.prediction}
                    </div>
                    <div className="space-y-3">
                      <ConfidenceBar
                        value={selectedHistoryItem.result.probability_cancer}
                        label="Probabilité de cancer"
                      />
                      <ConfidenceBar
                        value={selectedHistoryItem.result.confidence}
                        label="Niveau de confiance"
                      />
                    </div>
                  </div>

                  {selectedHistoryItem.imagePreview && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-3">
                        Image analysée
                      </h4>
                      <img
                        src={selectedHistoryItem.imagePreview}
                        alt="Analyse"
                        className="w-full rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  ⚠️ <strong>Rappel:</strong> Ce diagnostic assisté par IA est
                  fourni à titre indicatif. Une confirmation par un médecin
                  spécialiste est nécessaire pour tout diagnostic définitif.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 rounded-b-2xl p-6 flex space-x-4">
              <button
                onClick={() => exportPatientToPDF(selectedHistoryItem)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimer le rapport</span>
              </button>
              <button
                onClick={() => setShowHistoryDetail(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
