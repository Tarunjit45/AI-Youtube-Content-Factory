# AI YouTube Content Factory 🎬🤖

Welcome to **AI YouTube Content Factory**, a production-grade, full-stack application designed to automate the research, scriptwriting, voiceover generation, and rendering of high-engagement video packages (YouTube videos, Shorts, thumbnails, and social media promos).

The platform uses a powerful, multi-agent AI pipeline to research target companies or topics, structure engaging multi-scene video scripts, synthesize matching professional voice narrations, and synchronize animations and captions perfectly down to the millisecond.

---

## 🚀 Key Architectural Features

### 1. Dual-Engine Server-Side TTS 🎙️
* **Premium Gemini TTS**: Direct integration with Gemini's high-fidelity audio capabilities to synthesize realistic voiceovers (featuring natural emotional variations).
* **Translate Fallback Engine**: Auto-healing architecture that falls back to Google Translate TTS in case of quota limits, ensuring uninterrupted rendering.

### 2. Smart Prefetching & Blob RAM Caching (429 Prevention) 🛡️
* **Active-Adjacent Prefetching**: To prevent Google Cloud API rate-limiting (`429 Too Many Requests`), the engine sequentially preloads only the current active scene and the immediately following adjacent scene.
* **In-Memory Caching**: Synthesized audio blobs are stored locally in the browser’s RAM cache. This enables instant, gap-free subtitle synchronization and saves API usage.

### 3. Word-by-Word Caption Synchronization ⏱️
* Subtitle text is dynamically scanned and parsed for pacing tags (e.g., `[Slow]`, `[Energetic]`, `[Pause]`).
* Words are highlighted precisely in real-time as the narrator speaks, offering an immersive player preview.

### 4. Dynamic Timeline Shrink/Growth Fitting 📏
* The timeline naturally adjusts its scene durations based on the actual duration of the generated audio file.
* If a voiceover runs shorter or longer, the scene duration automatically conforms to prevent narration overlaps or cutting off audio early.

---

## 🛠️ How to Use

### 1. Researching & Generating Content
1. Navigate to the **Workspace** tab.
2. Enter a company name, industry, or promotional topic.
3. Choose your content format (e.g., Standard Video or YouTube Shorts).
4. Run the **Multi-Agent Pipeline** to trigger background research agents. They will compile an execution plan, generate scripts, design visual mockups, and prepare promotional social copy.

### 2. Editing & Timing the Video
1. Switch to the **Video Compiler** panel.
2. Review the structured scenes and their corresponding narration scripts.
3. Select your **Narrator Voice** from the dropdown menu (e.g., *Zephyr (Premium Warm)*, *Fenrir (Premium Deep)*, or standard male/female options).
4. Click **Play** to test the voiceover alignment. Notice how captions highlight word-by-word, and the next scenes preload automatically.

### 3. Compiling the Final Package
1. Customize pacing modes (Normal, Cinematic, Fast-Paced).
2. Click **Render Video** to compile your scenes, images, background tracks, and audio narratives into a downloadable, production-ready timeline layout.

---

## 💻 Tech Stack

* **Frontend**: React (Vite), Tailwind CSS for elegant visual design, and `lucide-react` for responsive icon representation.
* **Backend**: Node.js, Express, and `esbuild` for CJS-bundled builds.
* **AI Pipelines**: `@google/genai` for multi-agent synthesis, content planning, and speech-to-audio.

---

## ⚙️ Local Development Setup

To run this project locally, follow these simple steps:

### Prerequisites
* Node.js (v18 or higher recommended)
* NPM or Yarn

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd ai-youtube-content-factory
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory and provide your Google Gemini API key:
```env
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run the Development Server
```bash
npm run dev
```
The application will launch locally at `http://localhost:3000`.

### 4. Build for Production
To bundle the frontend and compile the server into a single production-optimized CommonJS file:
```bash
npm run build
npm start
```

---

## 🤝 How to Contribute

We welcome and encourage contributions to make the **AI YouTube Content Factory** even better! Here's how you can get involved:

### 1. Style & Code Standards
* **TypeScript**: Ensure strict type-safety. Keep files modular and declare types in `/src/types.ts`.
* **Tailwind CSS**: Use utility classes directly for custom styling. Avoid external `.css` files.
* **Icons**: Use icons imported exclusively from `lucide-react`.

### 2. Contribution Steps
1. **Fork the Repository**: Create your own copy of the project.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-new-capability
   ```
3. **Commit your Changes**:
   ```bash
   git commit -m 'Add some amazing capability'
   ```
4. **Push to the Branch**:
   ```bash
   git push origin feature/amazing-new-capability
   ```
5. **Open a Pull Request**: Submit your code for review!

### 3. Reporting Bugs & Suggesting Features
* Open an **Issue** with a descriptive title.
* Provide clear, step-by-step instructions to reproduce any bugs, including relevant console log warnings or screenshots.
* Explain the user value of any proposed feature enhancements.

---

*Crafted with 💖 by the AI YouTube Content Factory Developer Community.*
