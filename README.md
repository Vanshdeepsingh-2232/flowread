<div align="center">


# 🌊 FlowRead
### *The Art of Frictionless Reading*

FlowRead isn't just an e-reader; it's an AI-powered reading companion designed to turn daunting "walls of text" into digestible, engaging, and memorable "Smart Reading Cards." 

[**Launch App**](https://ai.studio/apps/drive/1yyXR68pXRfEd3xRa5kmVskEKTJJ7gZNx) • [**Report Bug**](https://github.com/Vanshdeepsingh-2232/flowread/issues)

---
</div>

## ✨ Features

- **🧠 AI Smart Chunking**: Powered by Flow AI, FlowRead automatically converts long PDFs and text files into semantic "cards" based on scene changes, plot points, or topic shifts.
- **🎭 Automated Genre Detection**: The app analyzes your book upon upload to tailor the UI and reading experience (Fiction vs. Non-Fiction vs. Technical).
- **☁️ Seamless Cloud Sync**: Authenticate with Firebase to sync your reading progress and library across all your devices.
- **⚡ Local-First Performance**: Uses Dexie (IndexedDB) for blazing fast, offline-ready library management.
- **🎨 Premium Themes**:
  - **Midnight**: Deep blue-black for late-night immersion.
  - **Slate**: Balanced dark gray for professional reading.
  - **Paper**: Warm, textured sepia tone for a classic paperback feel.
  - **Daylight**: High-contrast light mode for outdoor clarity.
- **📊 Reading Insights**: Track your streaks, total read time, and vocabulary build-up.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [AI API Key](https://aistudio.google.com/app/apikey)
- Firebase Project (for Auth & Cloud Sync)

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/Vanshdeepsingh-2232/flowread.git
   cd flowread
   npm install
   ```

2. **Environment Setup**
   The app uses `.env.local` for configuration. You can run the setup script to initialize environment variables:
   ```bash
   node setupEnv.js
   ```
   *Then update `.env.local` with your own keys:*
   - `API_KEY`: Your key from the AI provider dashboard.
   - `VITE_FIREBASE_API_KEY`: Found in Firebase Project Settings.

3. **Enable API (Crucial)**
   Ensure the **Generative Language API** is enabled for your project:
   [Enable AI API here](https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview)

4. **Launch**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8000` to start reading.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Dexie.js (IndexedDB)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: Flow AI Core (Gemini 2.5)

---

<p align="center">
Built with ❤️ by Vanshdeep Singh<br/>
<i>Making the world's knowledge more accessible, one card at a time.</i>
</p>
