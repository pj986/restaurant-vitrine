📄 README.md — restaurant-vitrine
# 🍽️ Restaurant Vitrine — Application Web MVC

Application web complète de gestion d’un restaurant, développée en **Node.js / Express** avec une **architecture MVC**, intégrant un **back-office administrateur** et un **site vitrine public**.

Projet réalisé dans un cadre pédagogique (BTS SIO SLAM) avec des fonctionnalités proches d’un projet professionnel réel.

---

## 🎯 Objectifs du projet

- Proposer un **site vitrine** pour les clients (menu, infos, réservation)
- Mettre à disposition un **back-office sécurisé** pour l’administrateur
- Gérer les données via une **base MySQL**
- Respecter une **architecture MVC claire**
- Mettre en place un **versionnement Git/GitHub**

---

## 🧱 Architecture du projet (MVC)

- **Models** : accès aux données (MySQL)
- **Views** : pages HTML générées côté serveur
- **Controllers** : logique métier et routes



restaurant-vitrine/
│
├── app.js
├── config/
│ └── db.js
├── controllers/
│ ├── adminController.js
│ ├── adminMenuController.js
│ ├── authController.js
│ └── publicController.js
├── middleware/
│ └── authMiddleware.js
├── models/
│ ├── ReservationModel.js
│ ├── DishModel.js
│ ├── SettingsModel.js
│ └── AdminModel.js
├── routes/
│ ├── adminRoutes.js
│ ├── adminMenuRoutes.js
│ ├── authRoutes.js
│ └── publicRoutes.js
├── views/
│ ├── admin/
│ └── public/
├── public/
│ └── css/
├── uploads/
├── utils/
│ └── html.js
├── .env.example
├── package.json
└── README.md


---

## ⚙️ Stack technique

- **Backend** : Node.js, Express
- **Base de données** : MySQL
- **Frontend** : HTML, CSS (serveur)
- **Sécurité** :
  - Authentification admin
  - Sessions
  - Protection des routes
- **Outils** :
  - Multer (upload CSV)
  - csv-parse
  - ExcelJS
  - Git / GitHub

---

## 🔐 Back-office administrateur

Accessible après authentification.

### Pages disponibles :
- `/admin/reservations`  
  → Gestion des réservations (PENDING / CONFIRMED / CANCELLED)

- `/admin/menu`  
  → Gestion du menu (CRUD plats)

- `/admin/menu/import`  
  → Import CSV avec **aperçu avant validation**, détection d’erreurs

- `/admin/settings`  
  → Paramètres généraux du restaurant :
  - Nom
  - Adresse
  - Contact
  - Horaires
  - Capacité
  - Activation des réservations

---

## 🌍 Site vitrine (public)

- `/` : page d’accueil
- `/menu` : menu du restaurant
- `/reservation` : formulaire de réservation
- `/infos` : informations / contact

Les données affichées sont dynamiques et proviennent de la base MySQL.

---

## 📂 Import CSV (fonction avancée)

- Import de plats en masse
- Aperçu avant validation
- Surbrillance des lignes en erreur
- Badge “X erreurs” ou “0 erreur”
- Sécurité : aucune insertion si erreurs

---

## 🛡️ Sécurité

- Middleware `requireAdmin`
- Sessions Express
- Échappement HTML contre XSS
- Variables sensibles dans `.env` (non versionné)

---

## 🚀 Installation locale

### 1. Cloner le projet
```bash
git clone https://github.com/pj986/restaurant-vitrine.git
cd restaurant-vitrine

2. Installer les dépendances
npm install

3. Configurer l’environnement

Créer un fichier .env à partir de .env.example

4. Lancer le serveur
node app.js


➡️ Application disponible sur :
http://localhost:3000

👤 Auteur

Projet réalisé par Pierre-Jordan Tchokote
Étudiant en BTS SIO – option SLAM

📌 Contexte pédagogique

Projet destiné à :

l’épreuve E4 / E5

la présentation orale BTS

la démonstration d’un projet web structuré et professionnel


