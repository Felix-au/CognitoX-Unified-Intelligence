"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import { Sparkles, Terminal, FileText, Youtube, Image as ImageIcon, Chrome, Sun, Moon } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase-client";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendEmailVerification
} from "firebase/auth";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const router = useRouter();
  const { showToast } = useToast();

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "dark";
    setTheme(activeTheme);
    document.title = "CognitoX: Unified Intelligence Workspace";
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  const handleNextAuthSignIn = async (idToken: string) => {
    const result = await signIn("credentials", {
      idToken,
      redirect: false,
    });

    if (result?.error) {
      showToast({
        type: "error",
        title: "Session Error",
        message: result.error,
      });
    } else {
      showToast({
        type: "success",
        title: "Workspace Initialized",
        message: "Signed in successfully. Loading cognitive space...",
      });
      router.push("/chatbot");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
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
      let userCredential;
      if (authMode === "login") {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Enforce email verification on login
        if (!userCredential.user.emailVerified) {
          // Attempt to send a verification link in case they missed the previous one
          await sendEmailVerification(userCredential.user);
          await auth.signOut();
          showToast({
            type: "error",
            title: "Email Not Verified",
            message: "Your email address is not verified. A verification link has been sent to your inbox. Please verify it and try again.",
          });
          return;
        }

        const idToken = await userCredential.user.getIdToken();
        await handleNextAuthSignIn(idToken);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Send email verification link
        await sendEmailVerification(userCredential.user);
        
        // Sign out of Firebase immediately so NextAuth does not automatically sign them in
        await auth.signOut();
        
        showToast({
          type: "success",
          title: "Verification Link Sent",
          message: "Registration successful! A verification email has been sent to your inbox. Please verify your email before logging in.",
        });
        
        setAuthMode("login");
      }
    } catch (err: any) {
      let msg = err.message || "Authentication failed.";
      if (err.code === "auth/user-not-found") msg = "User account not found. Click Sign Up below.";
      else if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      else if (err.code === "auth/email-already-in-use") msg = "Email already registered. Try logging in.";
      else if (err.code === "auth/weak-password") msg = "Password must be at least 6 characters.";
      
      showToast({
        type: "error",
        title: "Auth Error",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      await handleNextAuthSignIn(idToken);
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        showToast({
          type: "error",
          title: "Google Auth Failed",
          message: err.message || "Failed to sign in with Google.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing-container">
      <div className="dotted-canvas"></div>

      <button 
        type="button" 
        onClick={toggleTheme} 
        className="theme-toggle-btn glass-panel"
        title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      >
        {theme === "light" ? <Moon className="theme-toggle-icon" /> : <Sun className="theme-toggle-icon" />}
      </button>

      <div className="landing-grid">
        {/* Left Side: Branding & Features */}
        <div className="branding-section">
          <div className="logo-badge">
            <img src="/logo.png" alt="CognitoX Logo" className="logo-icon" />
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
              <ImageIcon className="feat-icon text-pink" />
              <div>
                <h3>Premium Image Filters</h3>
                <p>Enhance scans client-side with Canny edge and Sobel filters.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Firebase Authentication Panel */}
        <div className="auth-section">
          <div className="auth-box glass-panel">
            <h2>{authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
            <p className="auth-intro">
              {authMode === "login" ? "Sign in to access your cognitive workspace." : "Register to start your sandboxed workspace."}
            </p>

            <form onSubmit={handleEmailAuth} className="auth-form">
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
                {loading ? "Authenticating..." : authMode === "login" ? "Enter CognitoX" : "Register Account"}
              </button>
            </form>

            <div className="divider-row">
              <span className="divider-line"></span>
              <span className="divider-text">or continue with</span>
              <span className="divider-line"></span>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn} 
              disabled={loading} 
              className="google-signin-btn w-full"
            >
              <div className="google-icon-wrapper">
                <svg className="google-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.77H24v9.03h12.75c-.55 2.89-2.2 5.33-4.66 7l7.25 5.62C43.59 36.65 46.5 30.87 46.5 24z"/>
                  <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.25-5.62c-2.05 1.37-4.67 2.18-8.64 2.18-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              </div>
              <span className="google-btn-text">Continue with Google</span>
            </button>

            <div className="auth-toggle">
              {authMode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <span onClick={() => setAuthMode("signup")} className="toggle-link">
                    Sign Up
                  </span>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <span onClick={() => setAuthMode("login")} className="toggle-link">
                    Log In
                  </span>
                </p>
              )}
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
          background: var(--bg-color);
          overflow: hidden;
          padding: 24px;
          transition: background-color 0.3s ease;
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
          width: fit-content;
          margin-bottom: 8px;
        }
        .logo-icon {
          height: 48px;
          width: auto;
          object-fit: contain;
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
        .divider-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }
        .divider-text {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .google-signin-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #747775;
          color: #1f1f1f;
          border-radius: 8px;
          height: 44px;
          cursor: pointer;
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 0.92rem;
          transition: background-color 0.21s, border-color 0.21s;
          padding: 0 16px;
        }
        .google-signin-btn:hover {
          background-color: #f8fafd;
          border-color: #6c6f6d;
        }
        .google-signin-btn:disabled {
          background-color: #f2f2f2;
          border-color: #e3e3e3;
          color: #9c9c9c;
          cursor: not-allowed;
        }
        .google-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
        }
        .google-icon-svg {
          width: 18px;
          height: 18px;
        }
        .google-btn-text {
          flex-grow: 0;
        }
        .theme-toggle-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid var(--border-color);
          background: var(--glass-bg);
          color: var(--text-primary);
          transition: transform 0.2s, background-color 0.2s;
          z-index: 50;
        }
        .theme-toggle-btn:hover {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.08);
        }
        .theme-toggle-icon {
          width: 20px;
          height: 20px;
        }
        .auth-toggle {
          margin-top: 20px;
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .toggle-link {
          color: var(--accent-primary);
          cursor: pointer;
          font-weight: 600;
        }
        .toggle-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </main>
  );
}
