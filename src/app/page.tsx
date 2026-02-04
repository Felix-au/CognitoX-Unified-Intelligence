"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import { Sparkles, Terminal, FileText, Youtube, Image, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please enter both email and password.",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        showToast({
          type: "error",
          title: "Login Failed",
          message: result.error,
        });
      } else {
        showToast({
          type: "success",
          title: "Welcome Back",
          message: "Signed in successfully. Redirecting to workspace...",
        });
        router.push("/chatbot");
      }
    } catch (err: any) {
      showToast({
        type: "error",
        title: "System Error",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing-container">
      <div className="dotted-canvas"></div>

      <div className="landing-grid">
        {/* Left Side: Branding & Features */}
        <div className="branding-section">
          <div className="logo-badge">
            <Sparkles className="logo-icon animate-pulse" />
            <span>CognitoX Workspace</span>
          </div>

          <h1 className="hero-title">
            Unified Intelligence across <br />
            <span className="gradient-text">Web, Media, Notes &amp; Visuals</span>
          </h1>

          <p className="hero-subtitle">
            An advanced agentic workspace that synthesizes documents, transcribes videos, generates diagrams, and filters visuals through a seamless AI pipeline.
          </p>

          <div className="features-grid">
            <div className="feature-card glass-card">
              <FileText className="feat-icon text-indigo" />
              <div>
                <h3>Smart Notes OCR</h3>
                <p>Convert scanned notes into organized study sheets instantly.</p>
              </div>
            </div>

            <div className="feature-card glass-card">
              <Youtube className="feat-icon text-cyan" />
              <div>
                <h3>YouTube Analyzer</h3>
                <p>Crawl media transcripts to generate rich outlines and prep tests.</p>
              </div>
            </div>

            <div className="feature-card glass-card">
              <Terminal className="feat-icon text-green" />
              <div>
                <h3>Diagram Studio</h3>
                <p>Compile descriptions into interactive Mermaid.js diagrams.</p>
              </div>
            </div>

            <div className="feature-card glass-card">
              <Image className="feat-icon text-pink" />
              <div>
                <h3>Premium Image Filters</h3>
                <p>Enhance scans client-side with Canny edge and Sobel filters.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphic Authentication Panel */}
        <div className="auth-section">
          <div className="auth-box glass-panel">
            <h2>Access Workspace</h2>
            <p className="auth-intro">Sign in to initialize your cognitive sandbox.</p>

            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Initializing..." : "Enter CognitoX"}
              </button>
            </form>

            <div className="sandbox-info">
              <ShieldAlert className="sandbox-icon" />
              <span>
                <strong>Developer Sandbox:</strong> Out-of-the-box mode auto-creates non-existent accounts for testing.
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: #030712;
          overflow: hidden;
          padding: 24px;
        }
        .landing-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 48px;
          max-width: 1200px;
          width: 100%;
          z-index: 10;
          align-items: center;
        }
        @media (max-width: 968px) {
          .landing-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
        .branding-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          padding: 6px 12px;
          border-radius: 20px;
          font-family: var(--font-display);
          font-size: 0.85rem;
          color: #a5b4fc;
          width: fit-content;
        }
        .logo-icon {
          width: 14px;
          height: 14px;
        }
        .hero-title {
          font-size: 2.8rem;
          line-height: 1.15;
          font-family: var(--font-display);
          font-weight: 700;
        }
        .gradient-text {
          background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          color: var(--text-secondary);
          font-size: 1.05rem;
          line-height: 1.6;
          max-width: 540px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 12px;
        }
        @media (max-width: 640px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
        .feature-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          align-items: flex-start;
        }
        .feat-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .text-indigo { color: #818cf8; }
        .text-cyan { color: #22d3ee; }
        .text-green { color: #34d399; }
        .text-pink { color: #f472b6; }
        .feature-card h3 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .feature-card p {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .auth-section {
          display: flex;
          justify-content: center;
        }
        .auth-box {
          width: 100%;
          max-width: 400px;
          padding: 32px;
        }
        .auth-box h2 {
          font-size: 1.6rem;
          font-family: var(--font-display);
          margin-bottom: 6px;
        }
        .auth-intro {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .w-full {
          width: 100%;
        }
        .sandbox-info {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          padding: 12px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: 8px;
          font-size: 0.75rem;
          color: #f59e0b;
          line-height: 1.45;
        }
        .sandbox-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }
      `}</style>
    </main>
  );
}
