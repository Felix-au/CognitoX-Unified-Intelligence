"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/providers/ToastProvider";
import { 
  Sparkles, Plus, MessageSquare, LogOut, FileText, 
  Youtube, Terminal, Image, ChevronRight, Archive, Settings, Trash2
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
  const searchParams = useSearchParams();
  const urlConversationId = searchParams ? searchParams.get("conversationId") : null;
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
        setConversations(res.data.data);
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
        <Sparkles className="loader-icon animate-pulse" />
        <span className="loader-text">Loading CognitoX...</span>
        <style jsx>{`
          .loader-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #030712;
            color: #ffffff;
            gap: 16px;
          }
          .loader-icon {
            width: 40px;
            height: 40px;
            color: var(--accent-primary);
          }
          .loader-text {
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            color: var(--text-secondary);
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
            <Sparkles className="logo-sparkle" />
            <span>CognitoX</span>
          </div>
        </div>

        <button onClick={() => handleNewConversation("chat")} className="btn-new-chat">
          <Plus className="btn-icon" />
          <span>New AI Chat</span>
        </button>

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
            <div className="history-loader">Loading sessions...</div>
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
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn-logout"
            title="Sign Out"
          >
            <LogOut className="logout-icon" />
          </button>
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
          background: #030712;
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
          margin-bottom: 20px;
        }
        .logo-area {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.3rem;
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .logo-area:hover {
          transform: scale(1.02);
        }
        .logo-sparkle {
          width: 20px;
          height: 20px;
          color: var(--accent-primary);
        }
        .btn-new-chat {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px dashed rgba(99, 102, 241, 0.35);
          color: #ffffff;
          padding: 12px;
          border-radius: 10px;
          font-family: var(--font-display);
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          margin-bottom: 24px;
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
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
        }
        .nav-list li.active, .history-list li.active {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: #ffffff;
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
        .history-loader, .history-empty {
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 10px 12px;
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
          border: 1px solid rgba(255, 255, 255, 0.1);
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
          color: #ffffff;
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
        .btn-logout {
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
        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-danger);
        }
        .logout-icon {
          width: 16px;
          height: 16px;
        }
        .workspace-main {
          flex: 1;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
      `}</style>
    </div>
  );
}
