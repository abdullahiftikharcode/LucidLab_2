# EduAR - Augmented Reality Science Experiments Platform

**_Where teachers design the impossible and students experience the unimaginable — all through Augmented Reality_**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com/)
[![Platform: iOS](https://img.shields.io/badge/Platform-iOS-blue.svg)](https://developer.apple.com/ios/)
[![Web App](https://img.shields.io/badge/Web-React-orange.svg)](https://reactjs.org/)

## 🎯 Overview

EduAR is a two-sided Augmented Reality platform that empowers science teachers to design and deploy interactive lab experiments without writing a single line of code — and lets students experience those experiments in AR by simply pointing their smartphone camera at printed marker sheets placed on their desk.

## 🚀 What Makes EduAR Special

- **📱 No Headset Required** - Works on any smartphone (Android/iOS)
- **🎨 Visual Programming Language** - Teachers design experiments with drag-and-drop logic blocks
- **☁️ Real-time Cloud Sync** - Experiments designed on web instantly available on mobile
- **📍 Multi-marker AR** - Physical markers serve as interaction points and anchors
- **🏗️ Complete Platform** - Designer web app + Player mobile app + Firebase backend

## 🏗️ Architecture

### EduAR Designer (Teacher Side)
- **Web Application** - React.js based visual experiment builder
- **Scene Editor** - Place 3D objects, set properties, assign markers
- **Visual Programming Language** - Node-based logic editor (triggers → conditions → actions)
- **Live Unity Preview** - Embedded WebGL 3D preview
- **Cloud Publishing** - One-click publish to Firebase with unique experiment codes

### EduAR Player (Student Side)
- **Mobile AR App** - Unity + AR Foundation for Android/iOS
- **Marker Detection** - Scan printed markers to launch experiments
- **Interactive Experiments** - Tap, move, and trigger AR interactions
- **Real-time Logic** - VPL logic executes live on device

## 🧪 Example Experiments

- **⚗️ Chemistry:** Acid-Base Neutralization with color changes and pH indicators
- **⚡ Physics:** Ohm's Law Circuit with adjustable resistance and live current display
- **🧬 Biology:** Cell Division/Mitosis with phase-by-phase animations

## 🛠️ Technology Stack

**Frontend (Designer):**
- React.js with TypeScript
- React Flow for Visual Programming
- Unity WebGL for 3D preview
- Firebase for authentication and data

**Backend:**
- Firebase Firestore (experiment configurations)
- Firebase Storage (3D assets, markers)
- Supabase Storage (marker images)

**Mobile (Player):**
- Unity 3D LTS
- AR Foundation
- C# scripting
- Firebase SDK

## 📱 How It Works

1. **Teacher** designs experiment in web Designer using visual programming
2. **Publishes** to Firebase → gets unique experiment code
3. **Student** opens Player app, enters code
4. **Scans** printed marker sheet
5. **Experiments** appear in AR with full interactivity

## 🎯 Key Features

- ✅ **Safe Experiments** - No real chemicals, electricity, or hazards
- ✅ **Unlimited Repeats** - Students can retry experiments infinitely
- ✅ **Cost Effective** - No consumable materials or expensive equipment
- ✅ **Accessible** - Works on any smartphone, no special hardware
- ✅ **Collaborative** - Multiple students can work together
- ✅ **Assessment** - Built-in quizzes and recording features

## 🌟 Impact

EduAR solves three core problems in STEM education:
1. **Safety Hazards** - Dangerous experiments become safe in AR
2. **Financial Cost** - No expensive lab materials needed
3. **Limited Scope** - Experiments can be repeated and explored freely

## 👥 Target Audience

- **Primary:** Science teachers and STEM students (grade 8 - university)
- **Secondary:** Schools, colleges, tuition centers, educational NGOs
- **Geography:** Particularly valuable for schools with limited lab facilities

## 📁 Project Structure

```
EduAR/
├── Designer/                 # React web application for teachers
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── core/            # Core logic and hooks
│   │   └── app.tsx          # Main app entry
│   └── package.json
├── EduARPlayer/             # Unity mobile app for students
│   ├── Assets/
│   │   ├── Interaction/     # AR marker management
│   │   ├── Logic/          # Visual programming execution
│   │   ├── SceneManagement/ # Scene loading and objects
│   │   └── Scripts/        # Core C# scripts
│   └── ProjectSettings/
├── tests/                   # Test files and utilities
└── README.md
```

## 🔧 Getting Started

### For Teachers
1. Open EduAR Designer in your browser
2. Create experiment using visual programming interface
3. Publish and share experiment code with students
4. Print marker sheets for your experiments

### For Students
1. Download EduAR Player app
2. Enter experiment code from teacher
3. Scan printed markers to launch AR experiments
4. Interact with 3D objects and observe results

### Development Setup

**Prerequisites:**
- Node.js 16+
- Unity 2022.3 LTS
- Firebase project
- Android Studio / Xcode

**Designer Setup:**
```bash
cd Designer
npm install
npm start
```

**Player Setup:**
1. Open EduARPlayer in Unity
2. Configure Firebase settings
3. Build for Android/iOS

## 📊 Project Status

This is a complete, working AR platform with:
- ✅ Fully functional Designer web app
- ✅ Complete Player mobile app
- ✅ Cloud synchronization via Firebase
- ✅ Multiple science experiment templates
- ✅ Visual programming language implementation

## 🤝 Contributing

We welcome contributions that enhance the platform's capabilities! Please feel free to submit pull requests or create issues for bugs and feature requests.

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the EduXR thesis project by Ahmad Elwasefi
- Built as part of Augmented & Virtual Reality course
- Special thanks to our course instructor for guidance and support

---

**Built by:** Abdullah Iftikhar, Abdul Moiz, Faizan Amir, Sameer Amir, Waqas Shoaib  
**Course:** Augmented & Virtual Reality  
**Date:** February 28, 2026

🚀 **Transforming science education through accessible Augmented Reality!**
