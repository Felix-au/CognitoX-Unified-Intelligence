"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/providers/ToastProvider";
import { 
  Sparkles, Plus, MessageSquare, LogOut, FileText, 
  Youtube, Terminal, Image, ChevronRight, Archive, Settings, Trash2,
  Sun, Moon
} from "lucide-react";

interface SidebarConversation {
  id: string;
  title: string;
  variant: string;
}

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [urlConversationId, setUrlConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "dark";
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const currentId = params.get("conversationId");
      if (currentId !== urlConversationId) {
        setUrlConversationId(currentId);
      }
    }
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchHistory = async () => {
    if (status !== "authenticated") return;
    setLoadingHistory(true);
    try {
      const res = await axios.get("/api/conversation");
      if (res.data?.success) {
        const filtered = res.data.data.filter((c: any) => c.variant !== "image_filter_tool");
        setConversations(filtered);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [status, pathname]); // Reload history on navigations/saves

  useEffect(() => {
    const handleRefresh = () => {
      fetchHistory();
    };
    window.addEventListener("refresh-history", handleRefresh);
    return () => {
      window.removeEventListener("refresh-history", handleRefresh);
    };
  }, [status]);

  const handleNewConversation = async (variant: string = "chat") => {
    try {
      const title = variant === "chat" ? "New Chat" : undefined;
      const res = await axios.post("/api/conversation", { variant, title });
      if (res.data?.success) {
        showToast({
          type: "success",
          title: "Session Initialized",
          message: "New workspace initialized successfully.",
        });
        const id = res.data.data.id;
        if (variant === "chat") {
          router.push(`/chatbot/c/${id}`);
        } else {
          // Open the specific tool page
          let routeName = "notes-tool";
          if (variant === "youtube_tool") routeName = "youtube-video-tool";
          else if (variant === "diagram_tool") routeName = "diagrams-tool";
          else if (variant === "image_filter_tool") routeName = "image-filter-tool";
          
          router.push(`/chatbot/t/${routeName}`);
        }
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Workspace Error",
        message: "Failed to initialize new session.",
      });
    }
  };
  
  const handleDeleteConversation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      const res = await axios.delete("/api/conversation", { data: { conversationId: id } });
      if (res.data?.success) {
        showToast({
          type: "success",
          title: "Session Deleted",
          message: "Conversation has been successfully deleted.",
        });
        if (pathname?.includes(`/c/${id}`)) {
          router.push("/chatbot");
        } else {
          fetchHistory();
        }
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Delete Error",
        message: "Failed to delete conversation.",
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="loader-container">
        <div className="cognitive-spinner">
          <div className="spinner-outer"></div>
          <div className="spinner-inner"></div>
          <div className="spinner-center"></div>
        </div>
        <span className="loader-text">Loading CognitoX...</span>
        <style jsx>{`
          .loader-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-color);
            color: var(--text-primary);
            gap: 24px;
          }
          .cognitive-spinner {
            position: relative;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .spinner-outer {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 2.5px solid transparent;
            border-top-color: var(--accent-primary);
            border-bottom-color: var(--accent-secondary);
            border-radius: 50%;
            animation: spin-clockwise 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
          }
          .spinner-inner {
            position: absolute;
            width: 70%;
            height: 70%;
            border: 2.5px solid transparent;
            border-left-color: var(--accent-primary);
            border-right-color: var(--accent-secondary);
            border-radius: 50%;
            animation: spin-counter 0.9s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
            opacity: 0.8;
          }
          .spinner-center {
            width: 12px;
            height: 12px;
            background: var(--accent-primary);
            border-radius: 50%;
            box-shadow: 0 0 12px var(--accent-primary);
            animation: pulse-glow 1.5s ease-in-out infinite;
          }
          .loader-text {
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            color: var(--text-secondary);
            letter-spacing: 0.06em;
            animation: text-pulse 1.8s ease-in-out infinite;
          }

          @keyframes spin-clockwise {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spin-counter {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes pulse-glow {
            0%, 100% { transform: scale(0.9); opacity: 0.6; box-shadow: 0 0 4px var(--accent-primary); }
            50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 16px var(--accent-primary); }
          }
          @keyframes text-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="layout-root">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="logo-area" onClick={() => router.push("/chatbot")}>
            <img src="/logo.png" alt="CognitoX Logo" className="logo-sparkle" />
          </div>
          <button onClick={() => handleNewConversation("chat")} className="btn-new-chat">
            <Plus className="btn-icon" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sidebar Nav section: Specialized Tools */}
        <div className="nav-section">
          <h3 className="section-title">Cognitive Tools</h3>
          <ul className="nav-list">
            <li 
              className={pathname?.includes("notes-tool") ? "active" : ""}
              onClick={() => router.push("/chatbot/t/notes-tool")}
            >
              <FileText className="nav-icon text-indigo" />
              <span>Smart Notes OCR</span>
            </li>
            <li 
              className={pathname?.includes("youtube-video-tool") ? "active" : ""}
              onClick={() => router.push("/chatbot/t/youtube-video-tool")}
            >
              <Youtube className="nav-icon text-cyan" />
              <span>YouTube Video</span>
            </li>
            <li 
              className={pathname?.includes("diagrams-tool") ? "active" : ""}
              onClick={() => router.push("/chatbot/t/diagrams-tool")}
            >
              <Terminal className="nav-icon text-green" />
              <span>Diagram Studio</span>
            </li>
            <li 
              className={pathname?.includes("image-filter-tool") ? "active" : ""}
              onClick={() => router.push("/chatbot/t/image-filter-tool")}
            >
              <Image className="nav-icon text-pink" />
              <span>Image Filter Canvas</span>
            </li>
          </ul>
        </div>

        {/* Sidebar Nav section: Chat History */}
        <div className="history-section">
          <div className="history-header">
            <h3 className="section-title">Conversations</h3>
          </div>
          
          {loadingHistory ? (
            <div className="history-loader">
              <div className="history-spinner"></div>
              <span>Loading sessions...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="history-empty">No active sessions.</div>
          ) : (
            <ul className="history-list">
              {conversations.map((conv) => {
                const isDiagram = conv.variant === "diagram_tool";
                const isActive = isDiagram 
                  ? (pathname?.includes("/t/diagrams-tool") && urlConversationId === conv.id)
                  : pathname?.includes(`/c/${conv.id}`);
                
                const handleRoute = () => {
                  if (isDiagram) {
                    router.push(`/chatbot/t/diagrams-tool?conversationId=${conv.id}`);
                  } else {
                    router.push(`/chatbot/c/${conv.id}`);
                  }
                };

                return (
                  <li 
                    key={conv.id}
                    className={isActive ? "active" : ""}
                    onClick={handleRoute}
                    title={conv.title}
                  >
                    <MessageSquare className="history-icon" />
                    <span className="history-title">{conv.title}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="btn-delete-conv"
                      title="Delete Conversation"
                    >
                      <Trash2 className="delete-icon" />
                    </button>
                    <ChevronRight className="history-arrow" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* User profile footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <img 
              src={session?.user?.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80"} 
              alt={session?.user?.name || "User"} 
              className="user-avatar"
            />
            <div className="user-meta">
              <span className="user-name">{session?.user?.name}</span>
              <span className="user-email">{session?.user?.email}</span>
            </div>
          </div>
          <div className="footer-actions">
            <button 
              type="button"
              onClick={toggleTheme} 
              className="btn-footer btn-theme-toggle"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="footer-action-icon" /> : <Sun className="footer-action-icon" />}
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn-footer btn-logout"
              title="Sign Out"
            >
              <LogOut className="footer-action-icon" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace content */}
      <div className="workspace-main">
        {children}
      </div>

      <style jsx global>{`
        .layout-root {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-color);
        }
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          border-left: none;
          display: flex;
          flex-direction: column;
          padding: 16px;
          flex-shrink: 0;
          z-index: 50;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 24px;
        }
        .logo-area {
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .logo-area:hover {
          transform: scale(1.02);
        }
        .logo-sparkle {
          height: 32px;
          width: auto;
          max-width: 90px;
          object-fit: contain;
        }
        .btn-new-chat {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px dashed rgba(99, 102, 241, 0.35);
          color: var(--accent-primary);
          padding: 8px 12px;
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .btn-new-chat:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.6);
        }
        .btn-icon {
          width: 16px;
          height: 16px;
        }
        .nav-section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 10px;
          font-family: var(--font-display);
          font-weight: 600;
        }
        .nav-list, .history-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-list li, .history-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .nav-list li:hover, .history-list li:hover {
          background: var(--sidebar-hover-bg);
          color: var(--text-primary);
        }
        .nav-list li.active, .history-list li.active {
          background: var(--sidebar-active-bg);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: var(--sidebar-active-text);
          font-weight: 600;
        }
        .nav-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .text-indigo { color: #818cf8; }
        .text-cyan { color: #22d3ee; }
        .text-green { color: #34d399; }
        .text-pink { color: #f472b6; }
        .history-section {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 20px;
        }
        .history-loader {
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: text-pulse 1.8s ease-in-out infinite;
        }
        .history-empty {
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 10px 12px;
        }
        .history-spinner {
          width: 12px;
          height: 12px;
          border: 1.5px solid transparent;
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin-clockwise 0.8s linear infinite;
        }
        .history-icon {
          width: 15px;
          height: 15px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .history-title {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .history-arrow {
          width: 12px;
          height: 12px;
          opacity: 0;
          transition: opacity 0.2s;
          color: var(--text-muted);
        }
        .history-list li:hover .history-arrow {
          display: none;
        }
        .btn-delete-conv {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: none;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .history-list li:hover .btn-delete-conv {
          display: flex;
        }
        .btn-delete-conv:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--accent-danger);
        }
        .delete-icon {
          width: 14px;
          height: 14px;
        }
        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          flex: 1;
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .user-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .user-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-email {
          font-size: 0.68rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .footer-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-footer {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-footer:hover {
          background: rgba(128, 128, 128, 0.15);
          color: var(--text-primary);
        }
        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-danger);
        }
        .footer-action-icon {
          width: 16px;
          height: 16px;
        }
        .workspace-main {
          flex: 1;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
        @keyframes spin-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes text-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
