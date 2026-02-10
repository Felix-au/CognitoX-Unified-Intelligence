"use client";

import { useEffect, useRef, useState, isValidElement, cloneElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import axios from "axios";
import { Send, Paperclip, Sparkles, X, File, Image as ImageIcon, FileText } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot" | "system";
  type: "text" | "image";
  content: string;
  imageUrl?: string;
  createdAt: string;
  model?: string;
}

export default function ConversationPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  
  // File uploads state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/chat?conversationId=${id}`);
      if (res.data?.success) {
        setMessages(res.data.data);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Load Error",
        message: "Failed to fetch conversation logs.",
      });
      router.push("/chatbot");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMessages();
    }
  }, [id]);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userPrompt = customText !== undefined ? customText : inputText.trim();
    if ((!userPrompt && attachedFiles.length === 0) || sending) return;

    if (customText === undefined) {
      setInputText("");
    }
    setSending(true);

    try {
      const fd = new FormData();
      fd.append("conversationId", id);
      fd.append("content", userPrompt || "Analyze the attached files");
      
      // Pass recent messages for context/history
      const historyContext = messages.slice(-10).map(m => ({
        sender: m.sender,
        content: m.content
      }));
      fd.append("history", JSON.stringify(historyContext));
      
      if (customText === undefined) {
        attachedFiles.forEach(f => {
          fd.append("files", f);
        });
        // Clear uploads on send start
        setAttachedFiles([]);
      }

      // Optimistically show user message
      const tempUserMessage: Message = {
        id: `temp_${Date.now()}`,
        sender: "user",
        type: "text",
        content: userPrompt || "Uploaded files",
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      const res = await axios.post("/api/chat", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        // Replace user message with database saved user message and append bot response
        const { userMessage, botMessage } = res.data.data;
        setMessages((prev) => 
          prev.filter(m => !m.id.startsWith("temp_")).concat(userMessage, botMessage)
        );
      }
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Send Error",
        message: error.response?.data?.message || "Failed to deliver message.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="dotted-canvas"></div>

      {/* Header */}
      <header className="chat-header glass-panel">
        <div className="header-info">
          <Sparkles className="header-icon animate-pulse" />
          <span>Active Session</span>
        </div>
      </header>

      {/* Messages List */}
      <div className="messages-area">
        {loading ? (
          <div className="chat-loader">
            <Sparkles className="loader-spin" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <p>Send a message or attach documents to begin your grounded AI session.</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((m) => (
              <div key={m.id} className={`message-wrapper ${m.sender}`}>
                <div className={`message-bubble ${m.sender} glass-card`}>
                  {m.type === "image" && m.imageUrl ? (
                    <div className="image-message">
                      <img src={m.imageUrl} alt={m.content} className="generated-image" />
                      <p className="image-caption">{m.content}</p>
                    </div>
                  ) : (
                    <div className="markdown-content">
                      {parseMarkdown(m.content, (partNum) => handleSend(undefined, `Generate Part ${partNum}`))}
                    </div>
                  )}
                  {m.model && <span className="message-model-tag">{m.model}</span>}
                </div>
              </div>
            ))}
            
            {sending && (
              <div className="message-wrapper bot">
                <div className="message-bubble bot glass-card typing">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Tray */}
      <div className="input-tray glass-panel">
        <form onSubmit={handleSend} className="input-form">
          {attachedFiles.length > 0 && (
            <div className="attachments-bar">
              {attachedFiles.map((file, index) => (
                <div key={index} className="attachment-chip">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="chip-icon" />
                  ) : (
                    <FileText className="chip-icon" />
                  )}
                  <span className="chip-name">{file.name}</span>
                  <button type="button" onClick={() => removeAttachedFile(index)} className="chip-remove">
                    <X className="chip-remove-icon" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-row">
            <button 
              type="button" 
              onClick={handleAttachClick} 
              className="btn-attach"
              title="Attach PDF, Text, or Images"
            >
              <Paperclip className="attach-icon" />
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
              style={{ display: "none" }}
            />
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask CognitoX anything, or request 'draw a diagram of...'"
              className="chat-input input-field"
              disabled={sending}
            />
            <button type="submit" disabled={sending || (!inputText.trim() && attachedFiles.length === 0)} className="btn-send">
              <Send className="send-icon" />
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          position: relative;
        }
        .chat-header {
          height: var(--navbar-height);
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
          display: flex;
          align-items: center;
          padding: 0 24px;
          z-index: 20;
        }
        .header-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.95rem;
          color: #ffffff;
        }
        .header-icon {
          width: 16px;
          height: 16px;
          color: var(--accent-primary);
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          position: relative;
          z-index: 10;
        }
        .chat-loader, .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary);
          gap: 12px;
        }
        .chat-empty p {
          font-size: 0.88rem;
          max-width: 320px;
          text-align: center;
          line-height: 1.5;
        }
        .loader-spin {
          width: 24px;
          height: 24px;
          color: var(--accent-primary);
          animation: spin 2s linear infinite;
        }
        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }
        .message-wrapper {
          display: flex;
          width: 100%;
        }
        .message-wrapper.user {
          justify-content: flex-end;
        }
        .message-wrapper.bot {
          justify-content: flex-start;
        }
        .message-bubble {
          max-width: 85%;
          padding: 16px 20px;
          line-height: 1.6;
          font-size: 0.9rem;
          position: relative;
        }
        .message-bubble.user {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.bot {
          border-bottom-left-radius: 4px;
          color: var(--text-primary);
        }
        .markdown-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .text-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .md-p {
          margin: 0;
        }
        .md-h1, .md-h2, .md-h3, .md-h4, .md-h5, .md-h6 {
          margin-top: 14px;
          margin-bottom: 4px;
          color: #ffffff;
          font-weight: 600;
          font-family: var(--font-display);
        }
        .md-h1 { font-size: 1.25rem; }
        .md-h2 { font-size: 1.15rem; }
        .md-h3 { font-size: 1.05rem; }
        .bullet-list {
          margin: 0;
          padding-left: 20px;
          list-style-type: disc;
        }
        .bullet-list li {
          margin-bottom: 4px;
        }
        .inline-code {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.82rem;
          color: #f472b6;
        }
        .markdown-link {
          color: #818cf8;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .markdown-link:hover {
          color: #a5b4fc;
        }
        .code-block-wrapper {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin: 10px 0;
          overflow: hidden;
          font-family: monospace;
          font-size: 0.8rem;
          width: 100%;
        }
        .code-block-header {
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--border-color);
          padding: 6px 12px;
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .code-block-content {
          display: block;
          padding: 12px;
          overflow-x: auto;
          color: #e5e7eb;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .generated-image {
          max-width: 100%;
          max-height: 380px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          margin-bottom: 8px;
          display: block;
        }
        .image-caption {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        .message-model-tag {
          position: absolute;
          bottom: -16px;
          right: 8px;
          font-size: 0.62rem;
          color: var(--text-muted);
          font-family: var(--font-display);
          text-transform: uppercase;
        }
        .message-wrapper.bot .message-model-tag {
          left: 8px;
          right: auto;
        }
        .typing-dots {
          display: flex;
          gap: 4px;
          align-items: center;
          height: 20px;
        }
        .typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

        .input-tray {
          padding: 16px 24px;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
          z-index: 20;
          max-width: 840px;
          margin: 0 auto 20px auto;
          width: calc(100% - 48px);
        }
        .input-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .input-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .chat-input {
          flex: 1;
        }
        .btn-attach, .btn-send {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          width: 42px;
          height: 42px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .btn-attach:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }
        .btn-send {
          background: var(--accent-primary);
          border: none;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }
        .btn-send:hover {
          background: var(--accent-primary-hover);
          transform: translateY(-1px);
        }
        .btn-send:disabled {
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-muted);
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }
        .attach-icon, .send-icon {
          width: 18px;
          height: 18px;
        }
        .attachments-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-bottom: 4px;
        }
        .attachment-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.72rem;
          color: var(--text-secondary);
        }
        .chip-icon {
          width: 12px;
          height: 12px;
        }
        .chip-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chip-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 2px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 2px;
        }
        .chip-remove:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        :global(.btn-generate-part) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%);
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
          margin: 6px 0;
          vertical-align: middle;
        }
        :global(.btn-generate-part:hover) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(99, 102, 241, 0.35);
        }
        :global(.btn-generate-part:active) {
          transform: translateY(1px);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}

function parseMarkdown(text: string, onPartClick?: (partNum: number) => void): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const lines = part.slice(3, -3).trim().split("\n");
      let language = "text";
      if (lines.length > 0 && !lines[0].includes(" ") && lines[0].length < 20) {
        language = lines[0].trim();
        lines.shift();
      }
      const code = lines.join("\n");
      return (
        <pre key={index} className="code-block-wrapper">
          <div className="code-block-header">
            <span>{language}</span>
          </div>
          <code className="code-block-content">{code}</code>
        </pre>
      );
    } else {
      return (
        <div key={index} className="text-section">
          {part.split("\n").map((line, lineIdx) => {
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
              const level = headerMatch[1].length;
              const title = headerMatch[2];
              const Tag = `h${level}` as any;
              return <Tag key={lineIdx} className={`md-h${level}`}>{parseInline(title, onPartClick)}</Tag>;
            }

            const listMatch = line.match(/^([\-*+])\s+(.+)$/);
            if (listMatch) {
              return (
                <ul key={lineIdx} className="bullet-list">
                  <li>{parseInline(listMatch[2], onPartClick)}</li>
                </ul>
              );
            }

            if (line.trim() === "") return <div key={lineIdx} className="empty-line" />;
            return <p key={lineIdx} className="md-p">{parseInline(line, onPartClick)}</p>;
          })}
        </div>
      );
    }
  });
}

function parseInline(text: string, onPartClick?: (partNum: number) => void): React.ReactNode[] {
  let parts: React.ReactNode[] = [text];

  // Look for Generate Part X or **Generate Part X** and map them to interactive buttons
  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/(\*\*Generate Part \d+\*\*|Generate Part \d+)/i);
    return segments.map((seg, idx) => {
      const partMatch = seg.match(/\*\*Generate Part (\d+)\*\*|Generate Part (\d+)/i);
      if (partMatch) {
        const partNum = parseInt(partMatch[1] || partMatch[2], 10);
        return (
          <button
            key={idx}
            onClick={() => onPartClick?.(partNum)}
            className="btn-generate-part"
            type="button"
          >
            Generate Part {partNum}
          </button>
        );
      }
      return seg;
    });
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/(`[^`]+`)/g);
    return segments.map((seg, idx) => {
      if (seg.startsWith("`") && seg.endsWith("`")) {
        return <code key={idx} className="inline-code">{seg.slice(1, -1)}</code>;
      }
      return seg;
    });
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/(\[[^\]]+\]\([^\)]+\))/g);
    return segments.map((seg, idx) => {
      const match = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return <a key={idx} href={match[2]} target="_blank" rel="noopener noreferrer" className="markdown-link">{match[1]}</a>;
      }
      return seg;
    });
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/(\*\*[^*]+\*\*)/g);
    return segments.map((seg, idx) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return <strong key={idx}>{seg.slice(2, -2)}</strong>;
      }
      return seg;
    });
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/(\*[^*]+\*)/g);
    return segments.map((seg, idx) => {
      if (seg.startsWith("*") && seg.endsWith("*")) {
        return <em key={idx}>{seg.slice(1, -1)}</em>;
      }
      return seg;
    });
  });

  // Re-map keys dynamically to ensure absolute uniqueness and prevent React duplication warning
  return parts.map((part, idx) => {
    if (isValidElement(part)) {
      return cloneElement(part, { key: idx });
    }
    return part;
  });
}
