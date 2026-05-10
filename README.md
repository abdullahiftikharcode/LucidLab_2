# LucidLab 🧪✨
> **AR Science Learning Platform — Theory and Applications of Virtual Reality, Spring 2026**

LucidLab is a comprehensive two-sided Augmented Reality (AR) education platform designed to make science experiments safer, more accessible, and highly interactive. It replaces expensive and potentially dangerous physical lab equipment with interactive 3D simulations anchored to physical printed Vuforia markers.

---

## 👥 Team Members & Roles

| Student ID | Name | Role & Responsibilities |
|------------|------|------------------------|
| BSCS23070 | Muhammad Abdullah | **Unity AR mobile app** — runtime, WebView shell, Vuforia experiments, and AI (Vapi/Gemini) integration |
| BSCS23118 | Abdul Moiz | **Designer Studio** — VPL node editor, scene logic system, and EditorRenderer (Unity WebGL preview) |
| BSCS23212 | Faizan Amir | **Designer Studio** — React frontend, UI/UX, and component library |
| BSCS23173 | Waqas Shoaib | **Backend** — Firebase Auth, Firestore, Gemini AI logic generation endpoint |
| BSCS23176 | Sameer | **Backend** — Supabase storage, asset pipeline, build optimization |

---

## ⚙️ Unity Version (Required)

> **Unity 2022.3.62f3 (LTS)**

This exact version **must** be used to open either Unity project (`LucidLab/` or `EditorRenderer/`). Using a different version may cause shader, package, or scene compatibility issues.

---

## 🌟 Platform Overview

LucidLab consists of **four interconnected components** that together form a complete classroom AR ecosystem:

```
┌─────────────────────────────────────────────────────────────┐
│                        LucidLab Platform                     │
│                                                              │
│  ┌──────────────┐   REST API   ┌──────────────────────────┐  │
│  │   Designer   │ ──────────► │       Backend API         │  │
│  │  (React Web) │             │   (Node/Express + Firebase │  │
│  └──────┬───────┘             │    + Supabase + Gemini AI) │  │
│         │ iframe              └──────────────────────────┘  │
│  ┌──────▼───────┐                                           │
│  │ EditorRenderer│  (Unity WebGL — live 3D scene preview)   │
│  └──────────────┘                                           │
│                                                              │
│  ┌──────────────┐   REST API   ┌──────────────────────────┐  │
│  │  LucidLab    │ ──────────► │       Backend API         │  │
│  │ (Unity AR    │             └──────────────────────────┘  │
│  │  Mobile App) │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
LucidLab/                          # Root repository
├── LucidLab/                      # Unity Mobile AR App (Student)
│   ├── Assets/
│   │   ├── Scenes/                # LoginScene, ARMainScene, Chemical, AtomicReaction
│   │   ├── Scripts/               # AR logic, VPL runtime, demo experiments
│   │   ├── Materials/             # URP-compatible materials
│   │   ├── 3DModels/              # Atom, lab equipment, chemical models
│   │   ├── Textures/
│   │   │   └── VuforiaTargets/    # Printable marker images (Cl, Na, H, O, ...)
│   │   └── StreamingAssets/       # WebUI HTML pages (dashboard, student app)
│   └── Packages/                  # Unity package manifest (URP, Vuforia, AR Foundation)
│
├── Designer/                      # React Web App (Instructor)
│   ├── src/
│   │   ├── pages/                 # Dashboard, Experiments, Classrooms, Scene Editor
│   │   ├── components/            # Reusable UI components, VPL node graph editor
│   │   └── services/              # Firebase, Supabase, API integrations
│   └── server/                    # Local dev proxy server
│
├── EditorRenderer/                # Unity WebGL Project (Live 3D Preview)
│   └── Assets/                    # Embedded in Designer iframe for scene preview
│
├── backend/                       # Node.js/Express REST API Server
│   └── src/
│       ├── routes/
│       │   ├── ai.js              # Gemini AI scene logic generation endpoint
│       │   ├── firestore.js       # Firestore CRUD operations
│       │   ├── storage.js         # Supabase file storage operations
│       │   └── health.js          # Server health check
│       ├── services/              # Firebase Admin, Supabase client setup
│       └── middleware/            # Auth verification, error handling
│
├── Chemistr-AR-Unity-main/        # Source chemistry AR project (integrated as demo)
├── docs/                          # Architecture specs & workflow documentation
├── tests/                         # End-to-end and unit testing suites
└── README.md                      # This file
```

---

## 🧩 Component Details

### 1. LucidLab — Unity Mobile AR App (Student)
The primary student-facing mobile application built in Unity.

**Key Features:**
- AR Foundation (ARCore/ARKit) for marker and plane detection
- Vuforia Engine for high-precision image target tracking
- Dynamic VPL runtime that downloads and executes JSON experiment graphs
- WebView shell (`StreamingAssets/student_app.html`) for the UI layer
- Built-in quiz system with scoring and submission tracking

**Scenes:**
| Scene | Purpose |
|-------|---------|
| `LoginScene` | Authentication entry point |
| `ARMainScene` | Main AR runtime with dynamic experiment loading |
| `Chemical` | Pre-built chemistry lab demo (landscape) |
| `AtomicReaction` | Vuforia marker-based atomic fusion demo (landscape) |

**Demo Experiments (Atomic Reaction):**
- **Na + Cl → NaCl** (Sodium Chloride / Salt): Two-marker fusion
- **O + H + H → H₂O** (Water): Three-marker simultaneous fusion
- Additional elements: CH₄, C₆H₆, C₃H₆O₃, H₂SO₃, O₃, S, Fe, Au

---

### 2. Designer — React Web App (Instructor)
A powerful web-based authoring environment for instructors.

**Key Features:**
- Classroom management: create classrooms, add students via join codes
- Drag-and-drop scene editor for placing 3D objects onto AR markers
- **Visual Programming Language (VPL):** node-based logic editor (React Flow)
- AI Assistant powered by Gemini to auto-generate experiment logic
- Live 3D preview via embedded `EditorRenderer` iframe
- Evaluation dashboard for grading submissions

**Tech Stack:** React 18, TypeScript, Chakra UI, React Flow

---

### 3. EditorRenderer — Unity WebGL (Live Preview)
A Unity WebGL build embedded as an iframe inside the Designer.

**Purpose:** Provides a real-time 3D scene preview of the experiment being authored, so instructors can see how their VPL logic and object placements will look in AR before publishing.

---

### 4. Backend — Node.js/Express REST API
The central API server that powers both the Designer and the mobile app.

**Endpoints:**
| Route | Description |
|-------|-------------|
| `POST /ai/generate` | Gemini AI scene logic generation |
| `GET/POST /firestore/...` | Classroom, experiment, user CRUD |
| `GET/POST /storage/...` | Supabase file upload/download |
| `GET /health` | Server health check |

**Tech Stack:** Node.js, Express, Firebase Admin SDK, Supabase JS, Gemini REST API

---

## 🏗️ Full Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile AR** | Unity 2022.3.62f3 (LTS), AR Foundation 5.2.0, Vuforia Engine |
| **Render Pipeline** | Universal Render Pipeline (URP) 14.0.12 |
| **Designer UI** | React 18, TypeScript, Chakra UI, React Flow |
| **3D Preview** | Unity WebGL (EditorRenderer) |
| **Backend API** | Node.js, Express 4.x |
| **Database** | Firebase Firestore (NoSQL) |
| **Authentication** | Firebase Auth (Email + Google SSO) |
| **File Storage** | Supabase Storage |
| **AI** | Google Gemini REST API |
| **Testing** | Node.js built-in test runner, Playwright (e2e) |

---

## 🚀 How to Run the Application

### Prerequisites
- **Unity Hub** with Unity **2022.3.62f3 (LTS)** (Android + iOS Build Support modules)
- **Node.js** v18+ and npm
- A physical **Android** (ARCore) or **iOS** (ARKit) device for AR testing
- Firebase project credentials
- Supabase project credentials
- Gemini API key

---

### 1. Backend API Server

```bash
cd backend
npm install
cp .env.example .env   # Fill in Firebase, Supabase, and Gemini credentials
npm start              # Runs at http://localhost:4000 (or configured port)
```

---

### 2. Designer Web App (Instructor)

```bash
cd Designer
npm install
# Ensure backend URL is set in .env
npm start              # Runs at http://localhost:3000
```

---

### 3. LucidLab Unity AR App (Student)

1. Open **Unity Hub** → **Open Project** → select the **`LucidLab/`** folder.
2. Wait for Unity to import all assets (first load may take several minutes).
3. Go to **File → Build Settings** and confirm all scenes are listed:
   - `Assets/Scenes/LoginScene.unity`
   - `Assets/Scenes/ARMainScene.unity`
   - `Assets/Scenes/Chemical.unity`
   - `Assets/Scenes/AtomicReaction.unity`
4. Select **Android** or **iOS** as the target platform and click **Switch Platform**.
5. Connect your device and click **Build and Run**.

**To test the Atomic Reaction demo:**
- Print the marker images from `Assets/Textures/VuforiaTargets/`
- Hold the **Cl** and **Na** cards in front of the camera and bring them together to trigger the Salt (NaCl) fusion.

---

### 4. EditorRenderer (WebGL Preview — Optional)

The EditorRenderer is a Unity WebGL project that is embedded inside the Designer.
1. Open **Unity Hub** → **Open Project** → select the **`EditorRenderer/`** folder (Unity **2022.3.62f3**).
2. Build for **WebGL** (File → Build Settings → WebGL → Build).
3. Place the output in the Designer's `public/` folder as configured.

---

## 🛡️ Security & Privacy

- **Role-Based Access:** Firebase Firestore Security Rules — students cannot modify experiment definitions.
- **Data Isolation:** Classroom join-code architecture prevents unauthorized access.
- **Auth Protection:** All backend routes validate Firebase ID tokens via middleware.
- **Secure Submissions:** Student recordings are locked to the specific instructor's viewing privileges.

---

---

## 📦 Complete Submission Instructions

Follow these instructions for the final project submission (`Group_No_Project_Report.zip`):

### 1. Folder Structure
Create a folder containing the following items, then zip it:
- `LucidLab_Project_Report.pdf` (The generated PDF from `report/main.tex`)
- `Scanned_Prototypes/` (A folder containing your hand-drawn paper prototypes)
- `Complete_Project_Source.zip` (Or a link in a notepad file if the size exceeds limits)
- `LucidLab_Unity_Package.unitypackage` (Exported Unity package of the core project)
- `LucidLab_Demo_Video.mp4` (Video of the running application from start to end)
- `README.md` (This file)

### 2. Submission Checklist
- [x] **Project Report:** PDF format, 1-inch margins, justified text, APA style references.
- [x] **Title Page:** Includes Project Name, Team Names, Reg. Numbers, Course Name, Instructor, and Date.
- [x] **Storyboard:** At least 6 hand-drawn frames using the Vincent sketch template.
- [x] **Development Evidence:** At least 5 screenshots of the working application.
- [x] **Running State:** Verified AR deployment on mobile device.
- [x] **Naming Convention:** `Group_No_Project_Report.zip` (Replace `Group_No` with your group number).

---

## 📄 Course Information

| Field | Details |
|-------|---------|
| Course | Theory and Applications of Virtual Reality |
| Semester | Spring 2026 |
| Instructor | Dr. Ibrahim Ghaznavi |
| TA | Muhammad Qasim |
| Submission Date | May 2, 2026 |

---

*LucidLab — Spring 2026 — FAST NUCES*
