"use client";

import { useEffect, useRef, useState } from "react";
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || sending) return;

    const userPrompt = inputText.trim();
    setInputText("");
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
      
      attachedFiles.forEach(f => {
        fd.append("files", f);
      });

      // Clear uploads on send start
      setAttachedFiles([]);

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
                      {m.content}
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
        .chip-remove-icon {
          width: 10px;
          height: 10px;
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
