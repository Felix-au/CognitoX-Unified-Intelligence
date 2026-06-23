"use client";

import { useState, useEffect, useRef } from "react";
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
  const [activeSection, setActiveSection] = useState("hero-section");

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedFaqCategory, setSelectedFaqCategory] = useState("General");

  // Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMail, setSendingMail] = useState(false);

  // Neural Mesh Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const themeRef = useRef<"light" | "dark">("dark");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please fill out all fields.",
      });
      return;
    }
    setSendingMail(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          type: "success",
          title: "Message Sent",
          message: "Your message has been dispatched successfully!",
        });
        setContactName("");
        setContactEmail("");
        setContactMessage("");
      } else {
        showToast({
          type: "error",
          title: "Dispatch Failed",
          message: data.message || "Failed to send email.",
        });
      }
    } catch (err) {
      console.error(err);
      showToast({
        type: "error",
        title: "Network Error",
        message: "Could not connect to the mail gateway.",
      });
    } finally {
      setSendingMail(false);
    }
  };

  const faqCategories = [
    { id: "General", label: "General Info" },
    { id: "Chats", label: "Chat Features" },
    { id: "Tools", label: "Workspace Tools" },
    { id: "Security", label: "Security & Privacy" }
  ];

  const faqData = [
    {
      question: "What is CognitoX?",
      answer: "CognitoX is a premium unified intelligence workspace and cognitive AI sandbox that combines document OCR, YouTube transcript analysis, interactive Mermaid.js diagram studio, and client-side canvas filters in one single interface.",
      tags: ["General"]
    },
    {
      question: "How do I get started with CognitoX?",
      answer: "Simply create an account using your email address or sign in instantly with Google. Once verified, you will be redirected to the main dashboard where all cognitive workspace tools are ready to use.",
      tags: ["General"]
    },
    {
      question: "Is there a free trial or usage limits?",
      answer: "CognitoX offers complete access to all features for free.",
      tags: ["General"]
    },
    {
      question: "How do I switch between dark and light themes?",
      answer: "Click the sun/moon button in the top-right corner of the workspace screen to toggle instantly between the premium Pitch-Black theme and the high-contrast light theme.",
      tags: ["General"]
    },
    {
      question: "Can I rename or edit my chatbot conversations?",
      answer: "Yes. In the sidebar panel, hover over any active conversation and click the edit (pencil) icon to rename it in real-time.",
      tags: ["Chats"]
    },
    {
      question: "How do I archive chats I no longer need?",
      answer: "Hover over any conversation in the sidebar and click the archive (box) icon. You can toggle between viewing active and archived chats using the tabs at the top of the history tray.",
      tags: ["Chats"]
    },
    {
      question: "Does CognitoX share my chat history with external model providers?",
      answer: "No. All prompt histories and document contexts are stored privately in your personal database. We do not use user histories to train public AI models.",
      tags: ["Chats"]
    },
    {
      question: "Can I permanently delete individual chats?",
      answer: "Yes. You can permanently delete individual conversation histories from your dashboard sidebar with a single click, completely removing them from your cache.",
      tags: ["Chats"]
    },
    {
      question: "How do I start a new chat session?",
      answer: "Click the '+' or 'New Session' button at the top of the sidebar. This will initialize a clean chat context where you can query the AI or activate custom workspace tools.",
      tags: ["Chats"]
    },
    {
      question: "What tools are available in the CognitoX workspace?",
      answer: "CognitoX integrates a rich set of cognitive sandboxes: a Markdown Notes panel with local OCR, a YouTube transcript analyzer, an interactive Mermaid.js Diagram Studio, and an Image Filter panel.",
      tags: ["Tools"]
    },
    {
      question: "How does the YouTube Analyzer work?",
      answer: "Paste any public YouTube video URL into the video tool to retrieve its transcripts. You can generate outlines, extract summaries, and compile interactive preparation tests in seconds.",
      tags: ["Tools"]
    },
    {
      question: "Can I render and view diagrams inside the studio?",
      answer: "Yes. The Diagram Studio compiles code descriptions into visual, interactive Mermaid.js flowcharts, mindmaps, and user journey outlines rendered directly in the workspace.",
      tags: ["Tools"]
    },
    {
      question: "What happens if my Mermaid diagram code has a syntax error?",
      answer: "Our real-time compiler detects mermaid rendering exceptions, displays a clear line-by-line syntax alert banner under the editor, and points out the exact line of code causing the issue.",
      tags: ["Tools"]
    },
    {
      question: "How does the Notes OCR protect my data privacy?",
      answer: "Unlike typical cloud-based scanners, CognitoX extracts text from document scans directly on your browser using a local Canvas drawing engine and image shaders. No document files are uploaded to third-party services.",
      tags: ["Security"]
    },
    {
      question: "Are my note summaries and diagram drafts saved?",
      answer: "Yes. All note summaries, chat sessions, mindmaps, and mock tests are safely written to your custom MongoDB Atlas cluster collections via our high-performance client for persistence.",
      tags: ["Security"]
    },
    {
      question: "Is my login credentials and authentication secure?",
      answer: "CognitoX integrates Firebase Authentication and Next-Auth. All session tokens are handled securely, and password rules require email verification on signup to prevent unauthorized access.",
      tags: ["Security"]
    },
    {
      question: "Is my session data encrypted in transit?",
      answer: "Yes, all communications between the CognitoX frontend and backend API endpoints are encrypted in transit using industry-standard TLS 1.3 encryption protocols.",
      tags: ["Security"]
    }
  ];

  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "dark";
    setTheme(activeTheme);

    // IntersectionObserver to track active scrolling section for nav-dots
    const sections = ["hero-section", "faq-section", "contact-section"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) {
          obs.observer.unobserve(obs.el);
        }
      });
    };
  }, []);

  // Keep themeRef in sync with theme state for canvas animation loop
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Interactive Neural Mesh particle simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const NODE_COUNT = 72;
    const CONNECT_DIST = 140;
    const MOUSE_REVEAL_RADIUS = 195;
    const MIN_SPEED = 0.3;
    const MAX_SPEED = 1.4;

    interface MeshNode {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
    }

    const nodes: MeshNode[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      r: Math.random() * 1.6 + 1.4,
    }));

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const tick = () => {
      const isDark = themeRef.current === "dark";
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, W, H);

      // Helix is bottom-right (fixed: bottom 2%, right 2%, 220×220px container)
      const helixCX = W * 0.98 - 110;
      const helixCY = H * 0.98 - 110;
      const HELIX_AVOID_R = 150;

      // Update positions — brownian drift + helix avoidance, speed in [MIN_SPEED, MAX_SPEED]
      for (const n of nodes) {
        // Tiny random walk so direction evolves naturally over time
        n.vx += (Math.random() - 0.5) * 0.008;
        n.vy += (Math.random() - 0.5) * 0.008;
        // Repel from helix construct area
        const hdx = n.x - helixCX;
        const hdy = n.y - helixCY;
        const hd2 = hdx * hdx + hdy * hdy;
        if (hd2 < HELIX_AVOID_R * HELIX_AVOID_R && hd2 > 0) {
          const hd = Math.sqrt(hd2);
          const force = (1 - hd / HELIX_AVOID_R) * 0.28;
          n.vx += (hdx / hd) * force;
          n.vy += (hdy / hd) * force;
        }
        // Enforce speed band: never stop, never sprint
        const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (spd > 0) {
          const clamped = Math.min(Math.max(spd, MIN_SPEED), MAX_SPEED);
          n.vx = (n.vx / spd) * clamped;
          n.vy = (n.vy / spd) * clamped;
        } else {
          n.vx = MIN_SPEED;
          n.vy = 0;
        }
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x = W; else if (n.x > W) n.x = 0;
        if (n.y < 0) n.y = H; else if (n.y > H) n.y = 0;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < CONNECT_DIST * CONNECT_DIST) {
            const alpha = (1 - Math.sqrt(d2) / CONNECT_DIST);
            if (isDark) {
              ctx.shadowBlur = 0;
              ctx.strokeStyle = `rgba(6,182,212,${alpha * 0.18})`;
              ctx.lineWidth = 0.8;
            } else {
              // Light mode: same cyan as dark so all bg elements are unified
              ctx.shadowBlur = 0;
              ctx.strokeStyle = `rgba(6,182,212,${alpha * 0.18})`;
              ctx.lineWidth = 0.8;
            }
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Mouse-reveal pass — draw glowing lines from cursor to nearby nodes
      // Nodes never move toward cursor; only lines are revealed
      if (mx > -100) {
        for (const n of nodes) {
          const rdx = mx - n.x;
          const rdy = my - n.y;
          const rd = Math.sqrt(rdx * rdx + rdy * rdy);
          if (rd < MOUSE_REVEAL_RADIUS) {
            const a = 1 - rd / MOUSE_REVEAL_RADIUS;
            if (isDark) {
              ctx.shadowBlur = 8;
              ctx.shadowColor = `rgba(6,182,212,${a * 0.55})`;
              ctx.strokeStyle = `rgba(6,182,212,${a * 0.6})`;
              ctx.lineWidth = 1.0;
            } else {
              ctx.shadowBlur = 8;
              ctx.shadowColor = `rgba(6,182,212,${a * 0.55})`;
              ctx.strokeStyle = `rgba(6,182,212,${a * 0.6})`;
              ctx.lineWidth = 1.0;
            }
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mx, my);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        if (isDark) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(6,182,212,0.65)";
          ctx.fillStyle = "rgba(6,182,212,0.88)";
        } else {
          // Light mode: same cyan as dark
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(6,182,212,0.65)";
          ctx.fillStyle = "rgba(6,182,212,0.88)";
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
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
      {/* Interactive Neural Mesh Canvas */}
      <canvas ref={canvasRef} className="neural-mesh-canvas" />

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

      {/* Floating Dot Navigation Indicators */}
      <div className="nav-dots">
        <a
          href="#hero-section"
          className={`nav-dot ${activeSection === "hero-section" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("hero-section")?.scrollIntoView({ behavior: "smooth" });
            setActiveSection("hero-section");
          }}
          title="Branding & Login"
        ></a>
        <a
          href="#faq-section"
          className={`nav-dot ${activeSection === "faq-section" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
            setActiveSection("faq-section");
          }}
          title="Frequently Asked Questions"
        ></a>
        <a
          href="#contact-section"
          className={`nav-dot ${activeSection === "contact-section" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" });
            setActiveSection("contact-section");
          }}
          title="Contact Developer"
        ></a>
      </div>

      {/* Persistent & Glassmorphic Footer */}
      <footer className="landing-footer glass-panel">
        <div className="footer-left"></div>
        <div className="footer-mid">
          <span>© 2026 CognitoX. All rights reserved.</span>
        </div>
        <div className="footer-right">
          <a
            href="https://github.com/Felix-au/CognitoX-Unified-Intelligence"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg
              className="github-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="github-text">GitHub</span>
          </a>
        </div>
      </footer>

      {/* Section 1: Hero & Authentication */}
      <section className="landing-section" id="hero-section">
        <div className="landing-grid">
          {/* Left Side: Branding & Features */}
          <div className="branding-section">
            <header className="landing-brand-header">
              <img src="/logo.png" width="48" height="48" alt="CognitoX Logo" className="logo-icon" />
              <h1 className="hero-title">
                Unified Intelligence across <br />
                <span className="gradient-text">Web, Media, Notes &amp; Visuals</span>
              </h1>
            </header>

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
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.77H24v9.03h12.75c-.55 2.89-2.2 5.33-4.66 7l7.25 5.62C43.59 36.65 46.5 30.87 46.5 24z" />
                    <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.25-5.62c-2.05 1.37-4.67 2.18-8.64 2.18-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
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
      </section>

      {/* Section 2: FAQ Accordion */}
      <section className="landing-section" id="faq-section">
        <div className="faq-container glass-panel">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Learn more about CognitoX's unified intelligence capabilities</p>

          <div className="faq-categories">
            {faqCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedFaqCategory(cat.id);
                  setActiveFaq(null);
                }}
                className={`faq-category-btn ${selectedFaqCategory === cat.id ? "active" : ""}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="accordion">
            {faqData
              .filter((item) => item.tags.includes(selectedFaqCategory))
              .map((item, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div key={index} className={`accordion-item ${isOpen ? 'active' : ''}`}>
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="accordion-header"
                      type="button"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="star-prefix">✦</span>
                        <span>{item.question}</span>
                      </span>
                      <span className="accordion-icon">{isOpen ? "−" : "+"}</span>
                    </button>
                    <div className="accordion-content">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* SEO FAQ Schema Dynamic Injection */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
              }
            }))
          })
        }} />
      </section>

      {/* Section 3: Contact Developer Form */}
      <section className="landing-section" id="contact-section">
        <div className="contact-container glass-panel">
          <h2>Contact Developer</h2>
          <p className="contact-intro">Submit a request to developers or report an issue in the workspace</p>

          <form onSubmit={handleContactSubmit} className="contact-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your Name"
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help you?"
                className="input-field textarea-field"
                rows={4}
                required
              ></textarea>
            </div>

            <button type="submit" disabled={sendingMail} className="btn-primary w-full">
              {sendingMail ? "Sending Message..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>

      <style jsx>{`
        .landing-container {
          height: 100vh;
          width: 100vw;
          position: relative;
          background: var(--bg-color);
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          transition: background-color 0.3s ease;
          
          /* Visual variables — Dark mode: synced to cyan neural mesh palette */
          --grad-opacity: 0.32;
          --line-opacity: 0.09;
          --node-bg: rgba(6, 182, 212, 0.85);
          --ring-border: rgba(6, 182, 212, 0.24);
          --net-line-color: var(--accent-secondary);
          --helix-bar-color: rgba(6, 182, 212, 0.7);
          --core-bg-1: #cffafe;
          --core-bg-2: var(--accent-secondary);
          --core-shadow-1: var(--accent-secondary);
          --core-shadow-2: var(--accent-primary);
        }
        .dotted-canvas {
          position: fixed !important;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          pointer-events: none;
        }
        
        :global([data-theme="light"]) .landing-container {
          /* Construct geometry uses same cyan palette as dark mode — page bg stays light */
          --grad-opacity: 0.32;
          --line-opacity: 0.09;
          --node-bg: rgba(6, 182, 212, 0.85);
          --ring-border: rgba(6, 182, 212, 0.24);
          --net-line-color: rgba(6, 182, 212, 0.6);
          --helix-bar-color: rgba(6, 182, 212, 0.7);
          --core-bg-1: #cffafe;
          --core-bg-2: #06b6d4;
          --core-shadow-1: rgba(6, 182, 212, 0.7);
          --core-shadow-2: rgba(99, 102, 241, 0.4);
          --accent-primary: #dc2626; /* Keep UI crimson for buttons/links */
          --accent-secondary: #f97316; /* Keep UI orange for UI accents */
        }
        
        :global([data-theme="light"]) .orb-purple {
          background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%);
        }
        
        :global([data-theme="light"]) .orb-cyan {
          background: radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 70%);
        }

        :global([data-theme="light"]) .node,
        :global([data-theme="light"]) .sub-node,
        :global([data-theme="light"]) .helix-node {
          /* Same cyan as dark mode — strong pulse */
          background: radial-gradient(circle at 35% 35%, #cffafe, rgba(6,182,212,0.9) 75%) !important;
          animation: strongNodeGlow 1.8s ease-in-out infinite alternate !important;
        }

        :global([data-theme="light"]) .construct-svg line {
          stroke: rgba(6, 182, 212, 0.09) !important;
          stroke-opacity: 1 !important;
        }

        :global([data-theme="light"]) .construct-svg circle {
          stroke: rgba(6, 182, 212, 0.32) !important;
        }

        :global([data-theme="light"]) .construct-svg .svg-ring-2 {
          stroke: rgba(6, 182, 212, 0.18) !important;
        }
        
        /* Floating Neon Glow Backdrop */
        .landing-glow-orb {
          position: fixed;
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
        @media (max-width: 968px) {
          .landing-brand-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
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
          position: fixed;
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
          width: 46px;
          height: 46px;
          /* Off-center highlight → true 3D sphere illusion */
          background: radial-gradient(circle at 30% 25%, var(--core-bg-1) 0%, var(--core-bg-2) 42%, #0e7490 78%, transparent 100%);
          border-radius: 50%;
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
          width: 10px;
          height: 10px;
          background: radial-gradient(circle at 35% 35%, #cffafe, rgba(6,182,212,0.9) 75%);
          border-radius: 50%;
          animation: strongNodeGlow 1.8s ease-in-out infinite alternate;
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
          position: fixed;
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
          animation: cubeGlowContainer 9s ease-in-out infinite;
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
          width: 220px;
          height: 220px;
          perspective: 660px;
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
          border: 1px solid rgba(6, 182, 212, 0.22);
          background: rgba(6, 182, 212, 0);
          animation: cubeFaceGlow 9s ease-in-out infinite;
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
          width: 18px;
          height: 18px;
          /* 3D sphere: off-center highlight + dark shadow side */
          background: radial-gradient(circle at 30% 25%, #e0f7fa 0%, #06b6d4 42%, #0e7490 78%, transparent 100%);
          border-radius: 50%;
          animation: pulseSubCore 3s ease-in-out infinite alternate;
          z-index: 4;
        }
        :global([data-theme="light"]) .sub-core {
          background: radial-gradient(circle at 30% 25%, #cffafe 0%, #06b6d4 42%, #0e7490 78%, transparent 100%);
        }
        @keyframes pulseSubCore {
          0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.85; box-shadow: 0 0 10px rgba(6,182,212,0.65), 0 0 22px rgba(6,182,212,0.35); }
          100% { transform: translate(-50%,-50%) scale(1.45); opacity: 1;    box-shadow: 0 0 26px rgba(6,182,212,1),    0 0 52px rgba(6,182,212,0.65), 0 0 78px rgba(6,182,212,0.3); }
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
          width: 8px;
          height: 8px;
          background: radial-gradient(circle at 35% 35%, #cffafe, rgba(6,182,212,0.9) 75%);
          border-radius: 50%;
          animation: strongNodeGlow 2.2s ease-in-out infinite alternate;
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
        
        /* 3D Helix Visual — 10% bigger */
        .helix-3d {
          width: 132px;
          height: 198px;
          position: relative;
          transform-style: preserve-3d;
          animation: spinHelix 12s cubic-bezier(0.25, 0, 0.25, 1) infinite;
        }
        .helix-rung {
          position: absolute;
          width: 100%;
          height: 18px;
          transform-style: preserve-3d;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .helix-node {
          position: absolute;
          width: 10px;
          height: 10px;
          background: radial-gradient(circle at 35% 35%, #cffafe, rgba(6,182,212,0.9) 75%);
          border-radius: 50%;
          animation: strongNodeGlow 1.6s ease-in-out infinite alternate;
        }
        .node-l {
          left: 17px;
        }
        .node-r {
          right: 17px;
        }
        .helix-bar {
          position: absolute;
          left: 22px;
          right: 22px;
          height: 2px;
          background: var(--helix-bar-color);
          border-radius: 1px;
        }
        
        /* Translate and rotate each rung to form the helix (10% bigger) */
        .rung-1  { transform: translateY(0px)   rotateY(0deg); }
        .rung-2  { transform: translateY(20px)  rotateY(36deg); }
        .rung-3  { transform: translateY(40px)  rotateY(72deg); }
        .rung-4  { transform: translateY(59px)  rotateY(108deg); }
        .rung-5  { transform: translateY(79px)  rotateY(144deg); }
        .rung-6  { transform: translateY(99px)  rotateY(180deg); }
        .rung-7  { transform: translateY(119px) rotateY(216deg); }
        .rung-8  { transform: translateY(139px) rotateY(252deg); }
        .rung-9  { transform: translateY(158px) rotateY(288deg); }
        .rung-10 { transform: translateY(178px) rotateY(324deg); }
        
        @keyframes rotateConstruct {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          100% { transform: rotateY(360deg) rotateX(360deg); }
        }
        @keyframes pulseCore {
          0%   { transform: scale(0.85); opacity: 0.85; box-shadow: 0 0 22px rgba(6,182,212,0.7),  0 0 50px rgba(6,182,212,0.4); }
          100% { transform: scale(1.3);  opacity: 1;    box-shadow: 0 0 55px rgba(6,182,212,1),   0 0 110px rgba(6,182,212,0.65), 0 0 155px rgba(6,182,212,0.25); }
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
          0% { transform: rotateY(0deg) rotateX(15deg); }
          100% { transform: rotateY(360deg) rotateX(15deg); }
        }
        /* ── Glow Pulse Keyframes for Node Spheres ──────────────────── */
        @keyframes nodeGlow {
          0%   { box-shadow: 0 0 8px var(--node-bg), 0 0 16px var(--accent-secondary); }
          100% { box-shadow: 0 0 18px var(--node-bg), 0 0 34px var(--accent-secondary), 0 0 50px rgba(6,182,212,0.22); }
        }
        @keyframes crimsonGlow {
          0%   { box-shadow: 0 0 8px rgba(153,27,27,0.6), 0 0 16px rgba(220,38,38,0.3); }
          100% { box-shadow: 0 0 16px rgba(153,27,27,0.9), 0 0 30px rgba(220,38,38,0.55), 0 0 44px rgba(153,27,27,0.2); }
        }
        /* ── Strong Pulse for Helix & Orbit Nodes ─────────────────── */
        @keyframes strongNodeGlow {
          0%   { box-shadow: 0 0 12px var(--node-bg), 0 0 26px var(--accent-secondary), 0 0 42px rgba(6,182,212,0.4); transform: scale(1); }
          100% { box-shadow: 0 0 28px var(--node-bg), 0 0 58px var(--accent-secondary), 0 0 88px rgba(6,182,212,0.7), 0 0 120px rgba(6,182,212,0.3); transform: scale(1.25); }
        }
        /* ── Cube Glow/Outline Animation Cycles ───────────────────── */
        @keyframes cubeGlowContainer {
          /* --- 1. Flicker Phase (0s to 1s -> 0% to 11.11%) --- */
          0% { opacity: 0.55; filter: brightness(1.0) drop-shadow(none); }
          1.85% { opacity: 1.0; filter: brightness(2.6) drop-shadow(0 0 12px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 28px rgba(6, 182, 212, 0.65)); }
          3.7% { opacity: 0.15; filter: brightness(0.4) drop-shadow(none); }
          5.56% { opacity: 1.0; filter: brightness(2.6) drop-shadow(0 0 12px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 28px rgba(6, 182, 212, 0.65)); }
          7.41% { opacity: 0.1; filter: brightness(0.3) drop-shadow(none); }
          9.26% { opacity: 1.0; filter: brightness(2.6) drop-shadow(0 0 12px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 28px rgba(6, 182, 212, 0.65)); }
          11.11% { opacity: 0.55; filter: brightness(1.0) drop-shadow(none); }
          
          /* --- 2. Outline Only Phase (1s to 2s -> 11.11% to 22.22%) --- */
          22.22% { opacity: 0.55; filter: brightness(1.0) drop-shadow(none); }
          
          /* --- 3. Glow State Phase (2s to 4s -> 22.22% to 44.44%) --- */
          24% { opacity: 1.0; filter: brightness(2.6) drop-shadow(0 0 14px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 30px rgba(6, 182, 212, 0.7)) drop-shadow(0 0 50px rgba(6, 182, 212, 0.4)); }
          42% { opacity: 1.0; filter: brightness(2.6) drop-shadow(0 0 14px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 30px rgba(6, 182, 212, 0.7)) drop-shadow(0 0 50px rgba(6, 182, 212, 0.4)); }
          44.44% { opacity: 0.55; filter: brightness(1.0) drop-shadow(none); }
          
          /* --- 4. Soothing Glow State Phase (4s to 9s -> 44.44% to 100%) --- */
          66.67% { opacity: 1.0; filter: brightness(2.2) drop-shadow(0 0 14px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 30px rgba(6, 182, 212, 0.7)); }
          100% { opacity: 0.55; filter: brightness(1.0) drop-shadow(none); }
        }

        @keyframes cubeFaceGlow {
          0% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
          1.85% { background: rgba(6, 182, 212, 0.18); border-color: rgba(6, 182, 212, 0.95); }
          3.7% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
          5.56% { background: rgba(6, 182, 212, 0.18); border-color: rgba(6, 182, 212, 0.95); }
          7.41% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
          9.26% { background: rgba(6, 182, 212, 0.18); border-color: rgba(6, 182, 212, 0.95); }
          11.11% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
          
          22.22% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
          
          24% { background: rgba(6, 182, 212, 0.18); border-color: rgba(6, 182, 212, 0.95); }
          42% { background: rgba(6, 182, 212, 0.18); border-color: rgba(6, 182, 212, 0.95); }
          44.44% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
          
          66.67% { background: rgba(6, 182, 212, 0.18); border-color: rgba(6, 182, 212, 0.95); }
          100% { background: rgba(6, 182, 212, 0); border-color: rgba(6, 182, 212, 0.22); }
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
          background: rgba(10, 10, 10, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          border-radius: 16px;
          transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        :global([data-theme="light"]) .auth-box {
          background: rgba(255, 255, 255, 0.45);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }
        .auth-box:hover {
          border-color: transparent;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.2);
          transform: translateY(-4px);
        }
        :global([data-theme="light"]) .auth-box:hover {
          box-shadow: 0 20px 40px rgba(31, 38, 135, 0.15), 0 0 30px rgba(99, 102, 241, 0.15);
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
          position: fixed;
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

        /* Full Page Scroll-Snap Sections */
        .landing-section {
          width: 100%;
          height: 100vh;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          position: relative;
          padding: 80px 24px 64px 24px;
          z-index: 10;
          box-sizing: border-box;
          overflow: hidden;
        }
        @media (max-width: 968px) {
          .landing-container {
            scroll-snap-type: none;
          }
          .landing-section {
            padding: 80px 16px 64px 16px;
            overflow-y: auto;
            align-items: flex-start;
            height: auto;
            min-height: 100vh;
            scroll-snap-align: none;
          }
        }

        /* Sidebar Dots Navigation */
        .nav-dots {
          position: fixed;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 100;
        }
        .nav-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        :global([data-theme="light"]) .nav-dot {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .nav-dot:hover {
          transform: scale(1.3);
          background: var(--accent-primary);
        }
        .nav-dot.active {
          transform: scale(1.4);
          background: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-primary);
        }

        /* FAQ Accordion Section styles */
        .faq-container {
          max-width: 800px;
          width: 100%;
          padding: 40px;
          z-index: 10;
        }
        .faq-categories {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .faq-category-btn {
          padding: 8px 20px;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-family: var(--font-display);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }
        .faq-category-btn:hover {
          color: var(--text-primary);
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(255, 255, 255, 0.05);
        }
        :global([data-theme="light"]) .faq-category-btn:hover {
          background: rgba(0, 0, 0, 0.03);
        }
        .faq-category-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .star-prefix {
          color: var(--accent-primary);
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .faq-container {
            padding: 24px 16px;
          }
        }
        .section-title {
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 8px;
          font-family: var(--font-display);
        }
        .section-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-align: center;
          margin-bottom: 32px;
        }
        .accordion {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .accordion-item {
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          overflow: hidden;
          transition: border-color 0.3s, background-color 0.3s;
        }
        :global([data-theme="light"]) .accordion-item {
          background: rgba(0, 0, 0, 0.01);
        }
        .accordion-item:hover {
          border-color: rgba(99, 102, 241, 0.2);
          background: rgba(255, 255, 255, 0.02);
        }
        :global([data-theme="light"]) .accordion-item:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        .accordion-item.active {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        :global([data-theme="light"]) .accordion-item.active {
          background: rgba(255, 255, 255, 0.8);
          box-shadow: var(--glass-shadow);
        }
        .accordion-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          gap: 16px;
        }
        .accordion-icon {
          font-size: 1.2rem;
          color: var(--accent-primary);
          transition: transform 0.3s;
        }
        .accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s;
          padding: 0 24px;
        }
        .accordion-item.active .accordion-content {
          max-height: 200px;
          padding: 0 24px 20px 24px;
        }
        .accordion-content p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Contact Section styles */
        .contact-container {
          max-width: 500px;
          width: 100%;
          padding: 40px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .contact-container {
            padding: 24px 16px;
          }
        }
        .contact-container h2 {
          font-size: 1.8rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 4px;
        }
        .contact-intro {
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-align: center;
          margin-bottom: 24px;
          line-height: 1.4;
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .textarea-field {
          min-height: 110px;
          resize: none;
        }

        /* ── Neural Mesh Canvas ───────────────────────────────────── */
        .neural-mesh-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
          pointer-events: none;
          display: block;
        }
        .landing-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          background: rgba(10, 10, 10, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1.5px solid rgba(6, 182, 212, 0.45);
          box-shadow: 0 -4px 20px rgba(6, 182, 212, 0.35);
          z-index: 90;
          font-size: 0.78rem;
          color: var(--text-secondary);
          box-sizing: border-box;
        }
        :global([data-theme="light"]) .landing-footer {
          background: rgba(255, 255, 255, 0.12);
          border-top: 1.5px solid rgba(6, 182, 212, 0.45);
          box-shadow: 0 -4px 20px rgba(6, 182, 212, 0.25);
        }
        .footer-left {
          flex: 1;
        }
        .footer-mid {
          flex: 1;
          text-align: center;
          font-weight: 500;
        }
        .footer-right {
          flex: 1;
          display: flex;
          justify-content: flex-end;
        }
        .github-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          transition: color 0.2s, transform 0.2s;
          text-decoration: none;
        }
        .github-link:hover {
          color: var(--accent-primary);
          transform: translateY(-1px);
        }
        .github-icon {
          width: 16px;
          height: 16px;
        }
        .github-text {
          font-weight: 600;
        }
        @media (max-width: 640px) {
          .landing-footer {
            padding: 0 16px;
            font-size: 0.72rem;
          }
          .github-text {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
