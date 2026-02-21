# CognitoX: Unified Intelligence across Web, Media, Notes & Visual Workflows

CognitoX is a premium, high-fidelity AI-powered cognitive workspace. It integrates document ingestion (PDF, text), high-quality OCR notes compilation, automated YouTube video transcripts analyzer, natural language Mermaid.js diagramming, and interactive canvas image filtering into a sleek, glassmorphic UI.

CognitoX is designed to run locally in a single directory as a Next.js 15 App Router application without complex Python runtime environments or Docker containers.

---

## Key Features

1. **AI Chat Workspace:** Rich chat interface with support for file uploads (PDF, TXT, MD, Images). Contextually grounds conversation responses using uploaded files.
2. **Smart Notes OCR:** Converts scanned notes and documents into detailed, formatted Markdown outlines, summaries, key terms, and sample Q&A sheets.
3. **YouTube Media Analyzer:** Paste a YouTube URL to retrieve transcriptions and automatically compile lecture summaries and exam study prep guides.
4. **Diagram Studio:** Generate flowcharts, sequence diagrams, class diagrams, etc., using Mermaid.js syntax. Supports manual editing and conversational refinements.
5. **Image Filter Tool:** Client-side visual canvas for real-time image filtering (Contrast, Brightness, Blur, Grayscale, Binarization, and Edge Detection) with visual crop scan area controls, image copying to clipboard, PNG downloading, and Send to Chat loading status animations integrated inside a consolidated bottom canvas actions tray (optimized with a complete white background in light mode).
6. **Agentic Tool Calling:** Background agents to perform Wikipedia searches, arXiv paper retrievals, and DuckDuckGo web searches.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Styling:** Vanilla CSS Custom design system (Glassmorphism, Dark mode, dynamic Framer Motion animations)
- **Database ORM:** Prisma Client connecting to MongoDB
- **Inference Engines:**
  - **Text, OCR & Agents:** OmniKey AI Unified API Gateway (`auto:generateContent`)
  - **Image Generation:** Pollinations.ai API Gateway
- **Diagrams:** Mermaid.js client-side rendering

---

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB database (local or cloud instance)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   Copy variables and add database url, NextAuth secrets, and API keys.
3. Generate database client:
   ```bash
   npx prisma generate
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.
