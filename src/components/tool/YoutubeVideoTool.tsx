"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import ToolsHeading from "./ToolsHeading";
import axios from "axios";
import { Youtube, Link2 } from "lucide-react";

export default function YoutubeVideoTool() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = "YouTube Media Analyzer | CognitoX";
  }, []);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please enter a YouTube link.",
      });
      return false;
    }
    const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim());
    if (!isYT) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Invalid YouTube video URL.",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = value.trim();
    if (!validateUrl(cleanUrl) || loading) return;

    setLoading(true);

    try {
      // Create youtube_tool conversation session
      const convRes = await axios.post("/api/conversation", {
        title: `YouTube Analysis - ${new Date().toLocaleDateString()}`,
        variant: "youtube_tool",
      });

      if (!convRes.data?.success) {
        throw new Error(convRes.data?.message || "Failed to start YouTube session");
      }

      const convId = convRes.data.data.id;

      // Submit transcript parsing request
      const chatRes = await axios.post("/api/tool-chat", {
        conversationId: convId,
        content: cleanUrl,
        history: []
      });

      if (!chatRes.data?.success) {
        throw new Error(chatRes.data?.message || "Failed to analyze YouTube video");
      }

      showToast({
        type: "success",
        title: "Analysis Ready",
        message: "YouTube transcript processed successfully. Opening notes dashboard...",
      });

      router.push(`/chatbot/c/${convId}`);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Analysis Failure",
        message: error.response?.data?.message || error.message || "Failed to crawl video.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tool-view-section">
      <div className="dotted-canvas"></div>

      <div className="tool-box-container">
        <ToolsHeading firstPart="YouTube Media" secondPart="Analyzer" />

        <div className="media-preview-box glass-panel">
          <Youtube className="yt-large-icon animate-pulse" />
          <p className="preview-instruction">Analyze media lectures and convert them into organized exam prep outlines.</p>
        </div>

        <form onSubmit={handleSubmit} className="youtube-form glass-panel">
          <div className="input-group">
            <label>YouTube Video URL</label>
            <div className="input-with-icon">
              <Link2 className="link-icon" />
              <input 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                className="input-field-with-padding input-field"
                disabled={loading}
              />
            </div>
            <span className="input-tip">Accepts standard YouTube links, embeds, or short URLs.</span>
          </div>

          <button 
            type="submit" 
            disabled={loading || !value.trim()}
            className="btn-primary form-submit-btn"
          >
            {loading ? "Crawling video transcript..." : "Analyze Media"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .tool-view-section {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }
        .tool-box-container {
          max-width: 600px;
          width: 100%;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .media-preview-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          text-align: center;
        }
        .yt-large-icon {
          width: 64px;
          height: 64px;
          color: var(--accent-danger);
          margin-bottom: 16px;
        }
        .preview-instruction {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 320px;
        }
        .youtube-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .link-icon {
          position: absolute;
          left: 12px;
          width: 16px;
          height: 16px;
          color: var(--text-muted);
        }
        .input-field-with-padding {
          padding-left: 38px;
        }
        .input-tip {
          font-size: 0.68rem;
          color: var(--text-muted);
        }
        .form-submit-btn {
          width: 100%;
        }
      `}</style>
    </section>
  );
}
