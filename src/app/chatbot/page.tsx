"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, FileText, Youtube, Terminal, Image, ArrowRight } from "lucide-react";
import axios from "axios";
import { useToast } from "@/providers/ToastProvider";

export default function ChatbotDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = "Dashboard | CognitoX";
  }, []);

  const handleQuickLaunch = async (variant: string, promptText?: string) => {
    try {
      const res = await axios.post("/api/conversation", { variant });
      if (res.data?.success) {
        const id = res.data.data.id;
        
        if (variant === "chat") {
          // If we have a prompt, redirect to chat. (We can implement prompt passing later)
          router.push(`/chatbot/c/${id}`);
        } else {
          // Open specific tool
          let routeName = "notes-tool";
          if (variant === "youtube_tool") routeName = "youtube-video-tool";
          else if (variant === "diagram_tool") routeName = "diagrams-tool";
          else if (variant === "image_filter_tool") routeName = "image-filter-tool";
          
          router.push(`/chatbot/t/${routeName}`);
        }
      }
    } catch {
      showToast({
        type: "error",
        title: "Launch Error",
        message: "Failed to initialize the quick session.",
      });
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dotted-canvas"></div>

      <div className="dashboard-content">
        <div className="welcome-banner">
          <h1 className="welcome-title">
            Welcome to <span className="gradient-text">CognitoX</span>
          </h1>
          <p className="welcome-desc">
            Hi, {session?.user?.name || "Explorer"}. Select a tool below or start a new conversation to begin synthesizing your documents, visual canvases, and videos.
          </p>
        </div>

        <div className="shortcuts-grid">
          {/* Notes OCR */}
          <div className="shortcut-card glass-card" onClick={() => handleQuickLaunch("notes_tool")}>
            <div className="card-header">
              <FileText className="card-icon text-indigo" />
              <h3>Smart Notes OCR</h3>
            </div>
            <p className="card-body">Digitize handwritten or scanned study notes and compile them into structured Markdown summaries.</p>
            <div className="card-footer">
              <span>Upload notes</span>
              <ArrowRight className="arrow-icon" />
            </div>
          </div>

          {/* YouTube Video */}
          <div className="shortcut-card glass-card" onClick={() => handleQuickLaunch("youtube_tool")}>
            <div className="card-header">
              <Youtube className="card-icon text-cyan" />
              <h3>YouTube Media Analyzer</h3>
            </div>
            <p className="card-body">Paste lecture URLs to automatically scrape transcripts and draft comprehensive study guides.</p>
            <div className="card-footer">
              <span>Scrape video</span>
              <ArrowRight className="arrow-icon" />
            </div>
          </div>

          {/* Diagram Studio */}
          <div className="shortcut-card glass-card" onClick={() => handleQuickLaunch("diagram_tool")}>
            <div className="card-header">
              <Terminal className="card-icon text-green" />
              <h3>Diagram Studio</h3>
            </div>
            <p className="card-body">Translate text descriptions into structural visual Mermaid.js flowcharts and diagrams.</p>
            <div className="card-footer">
              <span>Open Studio</span>
              <ArrowRight className="arrow-icon" />
            </div>
          </div>

          {/* Image Filter */}
          <div className="shortcut-card glass-card" onClick={() => handleQuickLaunch("image_filter_tool")}>
            <div className="card-header">
              <Image className="card-icon text-pink" />
              <h3>Image Filter Canvas</h3>
            </div>
            <p className="card-body">Apply real-time filters (Contrast, Brightness, Blur, Sobel edges) to image documents in the browser.</p>
            <div className="card-footer">
              <span>Open canvas</span>
              <ArrowRight className="arrow-icon" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          position: relative;
          overflow-y: auto;
        }
        .dashboard-content {
          max-width: 900px;
          width: 100%;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .welcome-banner {
          text-align: center;
        }
        .welcome-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 12px;
          font-family: var(--font-display);
        }
        .gradient-text {
          background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .welcome-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 620px;
          margin: 0 auto;
        }
        .shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 640px) {
          .shortcuts-grid {
            grid-template-columns: 1fr;
          }
        }
        .shortcut-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          min-height: 200px;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .card-icon {
          width: 28px;
          height: 28px;
        }
        .text-indigo { color: #818cf8; }
        .text-cyan { color: #22d3ee; }
        .text-green { color: #34d399; }
        .text-pink { color: #f472b6; }
        .shortcut-card h3 {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .card-body {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          flex: 1;
        }
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 500;
          transition: color 0.2s;
        }
        .shortcut-card:hover .card-footer {
          color: var(--text-primary);
        }
        .arrow-icon {
          width: 14px;
          height: 14px;
          transition: transform 0.2s;
        }
        .shortcut-card:hover .arrow-icon {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
