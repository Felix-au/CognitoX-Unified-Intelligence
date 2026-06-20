# CognitoX: Unified Intelligence Workspace — Quick Guide

A unified intelligence workspace and sandboxed cognitive platform that integrates web research, media transcription, scanned documents, and interactive visual generation.

> [!IMPORTANT]
> **Unlike traditional cloud chat interfaces** that require constant browser tabs, manual copy-pasting, and lack file integrations, CognitoX runs **tool-integrated workspaces** (Notes OCR, YouTube Media Analyzer, Diagram Studio) connected to your database sessions. It offers full edge-filtering on images and line-level diagram debugging.

---

## Table of Contents

- [How to Run](#how-to-run)
  - [Option A: Running Locally (Development)](#option-a-running-locally-development)
  - [Option B: Deployment (Production)](#option-b-deployment-production)
- [Workspace Database Setup](#workspace-database-setup)
- [Prisma Client Generation](#prisma-client-generation)
- [Usage Basics and Interface Map](#usage-basics-and-interface-map)
- [Example Workflows](#example-workflows)
- [Directory Index Checklist](#directory-index-checklist)
- [Important Notes](#important-notes)

---

## How to Run

### Option A: Running Locally (Development)

**Prerequisites:** Node.js (v18+), npm, MongoDB Atlas account, Firebase Client configuration keys.

```bash
# 1. Install dependencies
npm install

# 2. Configure Environment Variables
cp .env.example .env
# Open .env and add database connection url, secrets, and keys

# 3. Generate Prisma client
npx prisma generate

# 4. Start Next.js development server
npm run dev
```

The server will start on [http://localhost:3000](http://localhost:3000). The landing page forces the dark theme statically on load to prevent transition flashes.

### Option B: Deployment (Production)

CognitoX is designed to deploy seamlessly to Vercel via GitHub integration:

1. Create a repository on GitHub and push the codebase.
2. In the Vercel Dashboard, import the repository.
3. Configure the environment variables (DATABASE_URL, NextAuth secrets, Firebase client keys) in Vercel settings.
4. Vercel automatically runs the Next.js production build, compiles the Prisma schema, and deploys.
5. In your Firebase console under Authentication, add your Vercel deployment domain to the list of **Authorized Domains**.

---

## Workspace Database Setup

CognitoX utilizes **MongoDB Atlas** as its cloud database cluster.

### Setup Steps
1. Create a free cluster on MongoDB Atlas.
2. Create a database user and copy the connection string.
3. Under **Network Access**, whitelist `0.0.0.0/32` (or your specific Vercel deployment IP ranges) to allow API connections.
4. Replace `<username>` and `<password>` in the connection string and paste it into the `DATABASE_URL` field inside `.env`.

---

## Prisma Client Generation

```bash
npx prisma generate
```

This compiles your `schema.prisma` file into a native TypeScript client tailored to MongoDB. If you add database collections or modify schema types:
1. Update `prisma/schema.prisma`.
2. Run `npx prisma generate` to rebuild the TypeScript types.
3. Restart your Next.js dev server.

---

## Usage Basics and Interface Map

1. **Enter CognitoX** – Register a new account on the landing page or sign in. If registering, check your inbox for the Firebase confirmation link.
2. **Branding Header Logo** – Clicking the logo in the sidebar or tools workspace redirects you back to the home view.
3. **Workspace Switcher** – Toggle the sidebar to swap between:
    * **Chat**: Standard completions.
    * **Notes OCR**: Canvas-based text extraction.
    * **YouTube Video**: Transcribe video links into mock tests.
    * **Diagrams**: Compile Mermaid.js diagrams.
    * **Image Filter**: Edit image shaders.
4. **Theme Toggle** – Click the theme toggle icon (top-right) to switch between the premium dark mode and the crimson/orange light mode.

---

## Example Workflows

```text
Notes OCR     --> Click Upload Image --> Extract text --> Generate parsed guide
YouTube Video --> Paste Video Link   --> Crawl captions --> Generate study outlines
Diagrams      --> Edit code          --> Click render    --> Catch compilation errors
Image Filter  --> Upload Scan        --> Apply Sobel     --> Download edge filter canvas
```

---

## Directory Index Checklist

Here is a checklist of critical files and directories mapping out the codebase structure for developers:

| File / Folder | Purpose |
|---|---|
| [`prisma/schema.prisma`](file:///c:/Users/Felix/Desktop/CognitoX/prisma/schema.prisma) | Database schema defining User, Conversation, and Chat models. |
| [`prisma/seed.ts`](file:///c:/Users/Felix/Desktop/CognitoX/prisma/seed.ts) | Database seeder scripts to populate baseline workspace data. |
| [`src/app/page.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/app/page.tsx) | Landing Page housing the login panel, theme settings, and 3D visual CSS engine. |
| [`src/app/layout.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/app/layout.tsx) | Global layout template setting up Firebase clients and forcing dark theme. |
| [`src/app/globals.css`](file:///c:/Users/Felix/Desktop/CognitoX/src/app/globals.css) | Custom Tailwind stylesheets and design system token variables. |
| [`src/app/api/chat/`](file:///c:/Users/Felix/Desktop/CognitoX/src/app/api/chat/) | API endpoint handling SSE chunk streaming for standard prompts. |
| [`src/app/api/tool-chat/`](file:///c:/Users/Felix/Desktop/CognitoX/src/app/api/tool-chat/) | API endpoint handling SSE chunk streaming for notes/video workspace tools. |
| [`src/components/tool/NotesTool.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/components/tool/NotesTool.tsx) | Notes OCR workspace UI displaying canvas OCR extraction layouts. |
| [`src/components/tool/YoutubeVideoTool.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/components/tool/YoutubeVideoTool.tsx) | Media transcription workspace UI rendering outlines and video analysis feeds. |
| [`src/components/tool/DiagramsTool.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/components/tool/DiagramsTool.tsx) | Mermaid Studio editor containing render hooks and compilation syntax error banners. |
| [`src/components/tool/ImageFilterTool.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/components/tool/ImageFilterTool.tsx) | Image filter workspace offering client-side Sobel/Canny shaders on canvas. |
| [`src/components/MermaidChart.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/components/MermaidChart.tsx) | Exception catcher for Mermaid compilation that parses syntax error line numbers. |
| [`src/lib/firebase-client.ts`](file:///c:/Users/Felix/Desktop/CognitoX/src/lib/firebase-client.ts) | Client-side Firebase instance configurations. |
| [`src/lib/auto-search.ts`](file:///c:/Users/Felix/Desktop/CognitoX/src/lib/auto-search.ts) | Web-scraper fallback script using DuckDuckGo HTML parser. |
| [`src/lib/files.ts`](file:///c:/Users/Felix/Desktop/CognitoX/src/lib/files.ts) | PDF file screenshot renderer using pdf-to-png-converter. |
| [`src/providers/ToastProvider.tsx`](file:///c:/Users/Felix/Desktop/CognitoX/src/providers/ToastProvider.tsx) | Toast notification container for auth warnings and workspace sync logs. |

---

## Important Notes

* **MongoDB Connections**: Ensure your database access permissions allow connections from all IPs (`0.0.0.0/32`) if you are deploying to Vercel.
* **Firebase Authorized Domains**: Firebase block logins from unauthorized domains. Add your local (`localhost:3000`) and production (e.g. `*.vercel.app`) domains in the Firebase console.
* **Type Safety**: Running `npx tsc --noEmit` checks the entire codebase for TypeScript type safety before deployment.
