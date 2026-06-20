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

      {/* Floating Neon Glow Backdrop */}
      <div className="landing-glow-orb orb-purple"></div>
      <div className="landing-glow-orb orb-cyan"></div>

      {/* Large Rotating Background 3D Neural Construct Core */}
      <div className="construct-container">
        <div className="construct-3d">
          <div className="construct-core"></div>
          <div className="construct-ring ring-1">
            <div className="node node-1"></div>
            <div className="node node-2"></div>
          </div>
          <div className="construct-ring ring-2">
            <div className="node node-3"></div>
            <div className="node node-4"></div>
          </div>
          <div className="construct-ring ring-3">
            <div className="node node-5"></div>
          </div>
          <svg className="construct-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="var(--grad-opacity)" />
                <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="var(--grad-opacity)" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="90" stroke="url(#grad1)" strokeWidth="1" fill="none" strokeDasharray="5,5" className="svg-ring-1" />
            <circle cx="100" cy="100" r="65" stroke="url(#grad1)" strokeWidth="1.5" fill="none" className="svg-ring-2" />
            <circle cx="100" cy="100" r="40" stroke="url(#grad1)" strokeWidth="0.5" fill="none" strokeDasharray="3,3" className="svg-ring-3" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="var(--accent-primary)" strokeOpacity="var(--line-opacity)" strokeWidth="1" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="var(--accent-primary)" strokeOpacity="var(--line-opacity)" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Top-Left: Rotating Triple Ring with Core */}
      <div className="sub-construct sub-construct-top-left">
        <div className="double-ring-3d">
          <div className="sub-core"></div>
          <div className="sub-ring ring-a">
            <div className="sub-node node-a1"></div>
          </div>
          <div className="sub-ring ring-b">
            <div className="sub-node node-b1"></div>
          </div>
          <div className="sub-ring ring-c">
            <div className="sub-node node-c1"></div>
          </div>
        </div>
      </div>

      {/* Top-Right: Rotating Wireframe Cube */}
      <div className="sub-construct sub-construct-top-right">
        <div className="cube-3d">
          <div className="cube-face face-front"></div>
          <div className="cube-face face-back"></div>
          <div className="cube-face face-left"></div>
          <div className="cube-face face-right"></div>
          <div className="cube-face face-top"></div>
          <div className="cube-face face-bottom"></div>
        </div>
      </div>

      {/* Bottom-Left: Four Intersecting Rings with Core */}
      <div className="sub-construct sub-construct-bottom-left">
        <div className="triple-ring-3d">
          <div className="sub-core"></div>
          <div className="sub-ring ring-x">
            <div className="sub-node node-x1"></div>
          </div>
          <div className="sub-ring ring-y">
            <div className="sub-node node-y1"></div>
          </div>
          <div className="sub-ring ring-z">
            <div className="sub-node node-z1"></div>
          </div>
          <div className="sub-ring ring-w">
            <div className="sub-node node-w1"></div>
          </div>
        </div>
      </div>

      {/* Bottom-Right: 3D Rotating DNA Double Helix */}
      <div className="sub-construct sub-construct-bottom-right">
        <div className="helix-3d">
          <div className="helix-rung rung-1">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-2">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-3">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-4">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-5">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-6">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-7">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-8">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-9">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
          <div className="helix-rung rung-10">
            <div className="helix-node node-l"></div>
            <div className="helix-bar"></div>
            <div className="helix-node node-r"></div>
          </div>
        </div>
      </div>

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
          <div className="landing-brand-header">
            <img src="/logo.png" alt="CognitoX Logo" className="logo-icon" />
            <h1 className="hero-title">
              Unified Intelligence across <br />
              <span className="gradient-text">Web, Media, Notes &amp; Visuals</span>
            </h1>
          </div>

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
          <div className="auth-box">
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
          
          /* Visual variables (Dark Space theme default) */
          --grad-opacity: 0.18;
          --line-opacity: 0.04;
          --node-bg: #ffffff;
          --ring-border: rgba(255, 255, 255, 0.05);
          --net-line-color: var(--accent-secondary);
          --core-bg-1: #ffffff;
          --core-bg-2: var(--accent-secondary);
          --core-shadow-1: var(--accent-secondary);
          --core-shadow-2: var(--accent-primary);
        }
        
        :global([data-theme="light"]) .landing-container {
          --grad-opacity: 0.55;
          --line-opacity: 0.22;
          --node-bg: #dc2626; /* Sun-like vibrant red nodes */
          --ring-border: rgba(220, 38, 38, 0.18);
          --net-line-color: #dc2626;
          --core-bg-1: #ffedd5; /* Warm light-orange core inner */
          --core-bg-2: #ea580c; /* Warm orange core outer */
          --core-shadow-1: rgba(234, 88, 12, 0.6);
          --core-shadow-2: rgba(220, 38, 38, 0.4);
          --accent-primary: #dc2626; /* Rose override */
          --accent-secondary: #f97316; /* Sun-like orange override */
        }
        
        :global([data-theme="light"]) .orb-purple {
          background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%);
        }
        
        :global([data-theme="light"]) .orb-cyan {
          background: radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 70%);
        }
        
        /* Floating Neon Glow Backdrop */
        .landing-glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.15;
          z-index: 1;
          pointer-events: none;
        }
        .orb-purple {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--accent-primary) 0%, transparent 70%);
          top: -100px;
          left: -100px;
          animation: floatOrb 25s ease-in-out infinite alternate;
        }
        .orb-cyan {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%);
          bottom: -150px;
          right: -100px;
          animation: floatOrb 30s ease-in-out infinite alternate-reverse;
        }
        @keyframes floatOrb {
          0% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(80px, 40px) scale(1.1);
          }
          100% {
            transform: translate(-40px, 80px) scale(0.9);
          }
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
        .landing-brand-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 8px;
        }
        .logo-icon {
          height: 120px;
          width: auto;
          object-fit: contain;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .landing-brand-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
        }
        .hero-title {
          font-size: 2.2rem;
          line-height: 1.2;
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        /* 3D Neural Construct Visual in Background */
        .construct-container {
          position: absolute;
          top: 50%;
          left: 30%;
          transform: translate(-50%, -50%);
          width: 580px;
          height: 580px;
          perspective: 1200px;
          z-index: 2;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.65;
          transition: all 0.4s ease;
        }
        @media (max-width: 968px) {
          .construct-container {
            top: 40%;
            left: 50%;
            width: 480px;
            height: 480px;
            opacity: 0.4;
          }
        }
        .construct-3d {
          width: 480px;
          height: 480px;
          position: relative;
          transform-style: preserve-3d;
          animation: rotateConstruct 25s linear infinite;
        }
        @media (max-width: 968px) {
          .construct-3d {
            width: 380px;
            height: 380px;
          }
        }
        .construct-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: radial-gradient(circle, var(--core-bg-1) 0%, var(--core-bg-2) 50%, transparent 100%);
          border-radius: 50%;
          box-shadow: 0 0 30px var(--core-shadow-1), 0 0 60px var(--core-shadow-2);
          animation: pulseCore 3s ease-in-out infinite alternate;
          z-index: 5;
        }
        .construct-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 1.5px solid var(--ring-border);
          border-radius: 50%;
          transform-style: preserve-3d;
        }
        .ring-1 {
          transform: rotateX(70deg) rotateY(20deg);
          animation: spinRing1 12s linear infinite;
        }
        .ring-2 {
          transform: rotateX(45deg) rotateY(-45deg);
          animation: spinRing2 16s linear infinite;
        }
        .ring-3 {
          transform: rotateX(-30deg) rotateY(60deg);
          animation: spinRing3 20s linear infinite;
        }
        .node {
          position: absolute;
          width: 8px;
          height: 8px;
          background-color: var(--node-bg);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--node-bg), 0 0 20px var(--accent-secondary);
        }
        .node-1 { top: 0; left: 50%; transform: translate(-50%, -50%); }
        .node-2 { bottom: 0; left: 50%; transform: translate(-50%, 50%); }
        .node-3 { top: 50%; left: 0; transform: translate(-50%, -50%); }
        .node-4 { top: 50%; right: 0; transform: translate(50%, -50%); }
        .node-5 { top: 15%; left: 15%; }
        
        .construct-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          transform: translateZ(-20px);
        }
        .svg-ring-1 {
          animation: rotateSVG1 25s linear infinite;
          transform-origin: center;
        }
        .svg-ring-2 {
          animation: rotateSVG2 15s linear infinite reverse;
          transform-origin: center;
        }

        /* Secondary Background 3D Constructs */
        .sub-construct {
          position: absolute;
          pointer-events: none;
          z-index: 2;
          opacity: 0.35;
          transition: all 0.4s ease;
        }
        .sub-construct-top-left {
          top: 10%;
          left: 4%;
          width: 150px;
          height: 150px;
          perspective: 450px;
        }
        .sub-construct-top-right {
          top: 10%;
          right: 8%;
          width: 130px;
          height: 130px;
          perspective: 450px;
        }
        .sub-construct-bottom-left {
          bottom: 12%;
          left: 4%;
          width: 150px;
          height: 150px;
          perspective: 500px;
        }
        .sub-construct-bottom-right {
          bottom: 2%;
          right: 2%;
          width: 200px;
          height: 200px;
          perspective: 600px;
        }
        @media (max-width: 968px) {
          .sub-construct-top-left,
          .sub-construct-bottom-left,
          .sub-construct-bottom-right {
            display: none;
          }
          .sub-construct-top-right {
            top: 4%;
            right: 4%;
          }
        }
        
        /* 3D Shapes Inner Animations */
        .cube-3d {
          width: 80px;
          height: 80px;
          position: relative;
          transform-style: preserve-3d;
          animation: spinCube 15s linear infinite;
        }
        .cube-face {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 1px solid var(--ring-border);
          background: rgba(99, 102, 241, 0.015);
        }
        :global([data-theme="light"]) .cube-face {
          background: rgba(220, 38, 38, 0.03);
        }
        .face-front  { transform: translateZ(40px); }
        .face-back   { transform: rotateY(180deg) translateZ(40px); }
        .face-left   { transform: rotateY(-90deg) translateZ(40px); }
        .face-right  { transform: rotateY(90deg) translateZ(40px); }
        .face-top    { transform: rotateX(90deg) translateZ(40px); }
        .face-bottom { transform: rotateX(-90deg) translateZ(40px); }
        
        .double-ring-3d {
          width: 100px;
          height: 100px;
          position: relative;
          transform-style: preserve-3d;
          animation: spinDoubleRing 18s linear infinite;
        }
        .sub-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: radial-gradient(circle, #ffffff 0%, var(--accent-secondary) 60%, transparent 100%);
          border-radius: 50%;
          box-shadow: 0 0 12px var(--accent-secondary), 0 0 24px var(--accent-primary);
          animation: pulseSubCore 3s ease-in-out infinite alternate;
          z-index: 4;
        }
        :global([data-theme="light"]) .sub-core {
          background: radial-gradient(circle, #ffedd5 0%, var(--accent-primary) 60%, transparent 100%);
          box-shadow: 0 0 12px var(--core-shadow-1), 0 0 24px var(--core-shadow-2);
        }
        @keyframes pulseSubCore {
          0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }
        .sub-ring {
          position: absolute;
          width: 100px;
          height: 100px;
          border: 1.5px solid var(--ring-border);
          border-radius: 50%;
          transform-style: preserve-3d;
        }
        .ring-a { transform: rotateX(60deg) rotateY(30deg); }
        .ring-b { transform: rotateX(-60deg) rotateY(-30deg); }
        .ring-c { transform: rotateX(30deg) rotateY(70deg); }
        .sub-node {
          position: absolute;
          width: 6px;
          height: 6px;
          background-color: var(--node-bg);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--node-bg), 0 0 16px var(--accent-secondary);
        }
        .node-a1 { top: 0; left: 50%; transform: translate(-50%, -50%); }
        .node-b1 { bottom: 0; left: 50%; transform: translate(-50%, 50%); }
        .node-c1 { top: 50%; right: 0; transform: translate(50%, -50%); }
        
        /* Triple/Quadruple Ring Visual */
        .triple-ring-3d {
          width: 100px;
          height: 100px;
          position: relative;
          transform-style: preserve-3d;
          animation: spinTripleRing 22s linear infinite;
        }
        .ring-x { transform: rotateX(60deg) rotateY(30deg); }
        .ring-y { transform: rotateX(-60deg) rotateY(-30deg); }
        .ring-z { transform: rotateY(90deg) rotateZ(45deg); }
        .ring-w { transform: rotateX(-45deg) rotateY(45deg); }
        .node-x1 { top: 0; left: 50%; transform: translate(-50%, -50%); }
        .node-y1 { bottom: 0; left: 50%; transform: translate(-50%, 50%); }
        .node-z1 { top: 50%; right: 0; transform: translate(50%, -50%); }
        .node-w1 { top: 50%; left: 0; transform: translate(-50%, -50%); }
        
        /* 3D Helix Visual */
        .helix-3d {
          width: 120px;
          height: 180px;
          position: relative;
          transform-style: preserve-3d;
          animation: spinHelix 15s linear infinite;
        }
        .helix-rung {
          position: absolute;
          width: 100%;
          height: 16px;
          transform-style: preserve-3d;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .helix-node {
          position: absolute;
          width: 8px;
          height: 8px;
          background-color: var(--node-bg);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--node-bg), 0 0 16px var(--accent-secondary);
        }
        .node-l {
          left: 15px;
        }
        .node-r {
          right: 15px;
        }
        .helix-bar {
          position: absolute;
          left: 20px;
          right: 20px;
          height: 1px;
          background: var(--ring-border);
        }
        
        /* Translate and rotate each rung to form the helix */
        .rung-1  { transform: translateY(0px) rotateY(0deg); }
        .rung-2  { transform: translateY(18px) rotateY(36deg); }
        .rung-3  { transform: translateY(36px) rotateY(72deg); }
        .rung-4  { transform: translateY(54px) rotateY(108deg); }
        .rung-5  { transform: translateY(72px) rotateY(144deg); }
        .rung-6  { transform: translateY(90px) rotateY(180deg); }
        .rung-7  { transform: translateY(108px) rotateY(216deg); }
        .rung-8  { transform: translateY(126px) rotateY(252deg); }
        .rung-9  { transform: translateY(144px) rotateY(288deg); }
        .rung-10 { transform: translateY(162px) rotateY(324deg); }
        
        @keyframes rotateConstruct {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          100% { transform: rotateY(360deg) rotateX(360deg); }
        }
        @keyframes pulseCore {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes spinRing1 {
          0% { transform: rotateX(70deg) rotateY(20deg) rotateZ(0deg); }
          100% { transform: rotateX(70deg) rotateY(20deg) rotateZ(360deg); }
        }
        @keyframes spinRing2 {
          0% { transform: rotateX(45deg) rotateY(-45deg) rotateZ(360deg); }
          100% { transform: rotateX(45deg) rotateY(-45deg) rotateZ(0deg); }
        }
        @keyframes spinRing3 {
          0% { transform: rotateX(-30deg) rotateY(60deg) rotateZ(0deg); }
          100% { transform: rotateX(-30deg) rotateY(60deg) rotateZ(360deg); }
        }
        @keyframes rotateSVG1 {
          to { transform: rotate(360deg); }
        }
        @keyframes rotateSVG2 {
          to { transform: rotate(360deg); }
        }
        @keyframes spinCube {
          0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes spinDoubleRing {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          100% { transform: rotateY(-360deg) rotateX(360deg); }
        }
        @keyframes spinTripleRing {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          100% { transform: rotateY(360deg) rotateX(-360deg); }
        }
        @keyframes spinHelix {
          0% { transform: rotateY(0deg) rotateX(10deg); }
          100% { transform: rotateY(360deg) rotateX(10deg); }
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 12px;
          perspective: 1000px;
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
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.3s, border-color 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-6px) rotateX(4deg) rotateY(-4deg) translateZ(10px);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3), 0 0 15px rgba(99, 102, 241, 0.1);
        }
        .feat-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          margin-top: 2px;
          transform: translateZ(20px);
        }
        .text-indigo { color: #818cf8; }
        .text-cyan { color: #22d3ee; }
        .text-green { color: #34d399; }
        .text-pink { color: #f472b6; }
        
        .feature-card h3 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-primary);
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
        
        /* Auth Box with Premium Neon Border on Hover */
        .auth-box {
          width: 100%;
          max-width: 400px;
          padding: 32px;
          position: relative;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-backdrop);
          -webkit-backdrop-filter: var(--glass-backdrop);
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow);
          border-radius: 16px;
          transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .auth-box:hover {
          border-color: transparent;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.2);
          transform: translateY(-4px);
        }
        .auth-box::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 16px;
          padding: 1.5px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          -webkit-mask: 
             linear-gradient(#fff 0 0) content-box, 
             linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .auth-box:hover::after {
          opacity: 1;
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
