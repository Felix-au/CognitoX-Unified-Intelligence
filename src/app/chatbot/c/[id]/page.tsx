"use client";

import { useEffect, useRef, useState, isValidElement, cloneElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import axios from "axios";
import { Send, Paperclip, Sparkles, X, File, Image as ImageIcon, FileText, Copy, Check, Loader2 } from "lucide-react";
import MermaidChart from "@/components/MermaidChart";

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
  const [isResearching, setIsResearching] = useState(false);
  const [researchStep, setResearchStep] = useState(0);

  useEffect(() => {
    if (isResearching) {
      setResearchStep(0);
      const timers = [
        setTimeout(() => setResearchStep(1), 1500),
        setTimeout(() => setResearchStep(2), 3500),
        setTimeout(() => setResearchStep(3), 5500),
        setTimeout(() => setResearchStep(4), 7500),
      ];
      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [isResearching]);

  const getResearchText = () => {
    switch (researchStep) {
      case 0: return "Firing up web crawlers";
      case 1: return "Searching Wikipedia";
      case 2: return "Searching arXiv";
      case 3: return "Compiling research";
      case 4: return "Synthesizing response";
      default: return "Analyzing";
    }
  };

  // File uploads state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/chat?conversationId=${id}`);
      if (res.data?.success) {
        setMessages(res.data.data);
        if (res.data.conversation?.title) {
          document.title = `${res.data.conversation.title} | CognitoX`;
        }
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
      document.title = "Chat Session | CognitoX";
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

    const isFirstMessage = messages.length === 0;
    const hasFiles = attachedFiles.length > 0;
    const webSearchEnabled = localStorage.getItem("webSearchEnabled") !== "false";
    const researching = (isFirstMessage || hasFiles) && webSearchEnabled;
    setIsResearching(researching);

    setSending(true);

    try {
      const fd = new FormData();
      fd.append("conversationId", id);
      fd.append("content", userPrompt || "Analyze the attached files");
      fd.append("webSearchEnabled", String(webSearchEnabled));

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
        // Dispatch event to refresh the sidebar chat history (e.g. for dynamic titles)
        window.dispatchEvent(new Event("refresh-history"));
      }
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Send Error",
        message: error.response?.data?.message || "Failed to deliver message.",
      });
    } finally {
      setSending(false);
      setIsResearching(false);
    }
  };

  // Find if the last message is a bot message suggesting to generate the next part
  const getLastBotPartSuggestion = () => {
    if (messages.length === 0) return null;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.sender !== "bot") return null;

    // Check if the content suggests generating the next part, e.g. "Generate Part 2"
    const match = lastMsg.content.match(/generate\s+part\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  const nextPart = getLastBotPartSuggestion();

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
            <div className="cognitive-spinner">
              <div className="spinner-outer"></div>
              <div className="spinner-inner"></div>
              <div className="spinner-center"></div>
            </div>
            <span className="shimmer-text">Loading messages...</span>
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
                      {parseMarkdown(m.content)}
                    </div>
                  )}
                  {m.model && <span className="message-model-tag">{m.model}</span>}
                </div>
                {m.sender === "bot" && m.type !== "image" && (
                  <div className="message-actions-tray">
                    <CopyButton text={m.content} />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="message-wrapper bot">
                <div className="message-bubble bot glass-card typing">
                  {isResearching ? (
                    <div className="research-status">
                      <span className="research-text animate-dots">{getResearchText()}</span>
                    </div>
                  ) : (
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {nextPart && (
        <div className="next-part-actions z-10">
          <div className="next-part-container glass-panel">
            <button
              type="button"
              onClick={() => handleSend(undefined, `Generate Part ${nextPart}`)}
              className="btn-primary btn-next-part"
              disabled={sending}
            >
              <Sparkles className="action-sparkle" />
              <span>Generate Part {nextPart}</span>
            </button>
          </div>
        </div>
      )}

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
          color: var(--text-primary);
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
        .chat-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .cognitive-spinner {
          position: relative;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-outer {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid transparent;
          border-top-color: var(--accent-primary);
          border-bottom-color: var(--accent-secondary);
          border-radius: 50%;
          animation: spin-clockwise 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
        }
        .spinner-inner {
          position: absolute;
          width: 70%;
          height: 70%;
          border: 2px solid transparent;
          border-left-color: var(--accent-primary);
          border-right-color: var(--accent-secondary);
          border-radius: 50%;
          animation: spin-counter 0.9s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
          opacity: 0.8;
        }
        .spinner-center {
          width: 10px;
          height: 10px;
          background: var(--accent-primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-primary);
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        .shimmer-text {
          font-family: var(--font-display);
          font-size: 0.9rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          animation: text-pulse 1.8s ease-in-out infinite;
        }
        .chat-empty {
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
          50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 14px var(--accent-primary); }
        }
        @keyframes text-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
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
        .message-actions-tray {
          display: flex;
          align-items: center;
          margin-left: 14px;
          align-self: flex-end;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        :global(.btn-copy-msg) {
          background: var(--btn-secondary-bg);
          border: 1px solid var(--border-color);
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-secondary);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        :global(.btn-copy-msg:hover) {
          background: var(--btn-secondary-hover-bg);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.18);
        }
        :global(.btn-copy-msg:active) {
          transform: translateY(0) scale(0.95);
        }
        :global(.btn-copy-msg.copied-success) {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.45);
          color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
        :global(.copy-icon-svg) {
          width: 15px;
          height: 15px;
          transition: transform 0.2s ease;
        }
        :global(.btn-copy-msg:hover .copy-icon-svg) {
          transform: scale(1.05);
        }
        .message-bubble.user {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%);
          border: none;
          color: #ffffff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
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
          color: var(--text-primary);
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
          background: var(--code-inline-bg);
          border: 1px solid var(--border-color);
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
        .markdown-content :global(.table-wrapper) {
          width: 100%;
          overflow-x: auto;
          margin: 16px 0;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--table-bg);
        }
        .markdown-content :global(table) {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.8rem;
          color: var(--text-primary);
        }
        .markdown-content :global(th),
        .markdown-content :global(td) {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .markdown-content :global(th) {
          background: var(--table-header-bg);
          font-family: var(--font-display);
          font-weight: 600;
          color: var(--text-primary);
        }
        .markdown-content :global(tr:last-child td) {
          border-bottom: none;
        }
        .markdown-content :global(tr:hover td) {
          background: rgba(255, 255, 255, 0.015);
        }
        .markdown-content :global(.code-block-in-cell) {
          display: block;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 0.8rem;
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          padding: 8px 12px !important;
          border-radius: 6px;
          margin: 6px 0;
          color: #e5e7eb !important;
        }
        .markdown-content :global(.md-hr) {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 16px 0;
          width: 100%;
        }
        .markdown-content :global(.ordered-list) {
          margin: 0;
          padding-left: 20px;
          list-style-type: decimal;
        }
        .markdown-content :global(.ordered-list li) {
          margin-bottom: 4px;
        }
        .code-block-header {
          background: var(--table-header-bg);
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
        .btn-attach {
          background: var(--input-bg);
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
          background: var(--border-color);
          color: var(--text-primary);
        }
        .btn-send {
          background: var(--accent-primary);
          border: none;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          width: 42px;
          height: 42px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #ffffff;
          flex-shrink: 0;
        }
        .btn-send:hover {
          background: var(--accent-primary-hover);
          transform: translateY(-1px);
        }
        .btn-send:disabled {
          background: var(--input-bg);
          opacity: 0.4;
          color: var(--text-muted);
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
          border: 1px solid var(--border-color);
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
          background: var(--input-bg);
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
          background: var(--border-color);
          color: var(--text-primary);
        }
        .next-part-actions {
          display: flex;
          justify-content: center;
          padding: 0 24px;
          margin-bottom: -4px;
        }
        .next-part-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 12px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: var(--glass-backdrop);
          box-shadow: var(--glass-shadow);
        }
        .next-part-tip {
          font-size: 0.76rem;
          color: var(--text-secondary);
          font-family: var(--font-body);
        }
        .btn-next-part {
          padding: 6px 14px;
          font-size: 0.74rem;
          border-radius: 6px;
          height: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .action-sparkle {
          width: 13px;
          height: 13px;
          color: #ffffff;
        }


        .research-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 2px 4px;
        }
        .research-icon {
          width: 15px;
          height: 15px;
          color: var(--accent-primary);
        }
        .animate-spin {
          animation: spin 1.2s linear infinite;
        }
        .research-text {
          font-family: var(--font-display);
          font-size: 0.85rem;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }
        .animate-dots::after {
          content: '';
          display: inline-block;
          width: 12px;
          text-align: left;
          animation: dots-cycle 1.5s steps(4, end) infinite;
        }
        @keyframes dots-cycle {
          0%, 100% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
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

function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(^```[\s\S]*?^```)/gm);
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
      const lines = part.split("\n");
      const renderedElements: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // Check for Markdown table
        const isTableRow = (l: string) => l.trim().startsWith("|");
        const isSeparatorRow = (l: string) => /^\|?\s*[:\-]+[:\-\s|]*\|?$/.test(l.trim());

        if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
          const headerLine = line;
          const separatorLine = lines[i + 1];
          const tableRows: string[] = [];
          
          i += 2; // skip header and separator
          
          while (i < lines.length && isTableRow(lines[i])) {
            tableRows.push(lines[i]);
            i++;
          }

          // Extract headers
          const headers = headerLine.split("|").map(h => h.trim()).filter((h, idx, arr) => {
            if (idx === 0 && h === "") return false;
            if (idx === arr.length - 1 && h === "") return false;
            return true;
          });

          // Extract rows data
          const rowsData = tableRows.map(row => {
            return row.split("|").map(c => c.trim()).filter((c, idx, arr) => {
              if (idx === 0 && c === "") return false;
              if (idx === arr.length - 1 && c === "") return false;
              return true;
            });
          });

          renderedElements.push(
            <div key={`table-${i}`} className="table-wrapper glass-panel">
              <table>
                <thead>
                  <tr>
                    {headers.map((h, idx) => (
                      <th key={idx}>{parseInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsData.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{parseInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
          continue;
        }

        // Header parsing
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const title = headerMatch[2];
          const Tag = `h${level}` as any;
          renderedElements.push(<Tag key={`h-${i}`} className={`md-h${level}`}>{parseInline(title)}</Tag>);
          i++;
          continue;
        }

        // Horizontal Rule parsing
        if (line.trim() === "---") {
          renderedElements.push(<hr key={`hr-${i}`} className="md-hr" />);
          i++;
          continue;
        }

        // Numbered/Ordered list parsing
        const numListMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numListMatch) {
          renderedElements.push(
            <ol key={`ol-${i}`} className="ordered-list" start={parseInt(numListMatch[1], 10)}>
              <li>{parseInline(numListMatch[2])}</li>
            </ol>
          );
          i++;
          continue;
        }

        // Bullet list parsing
        const listMatch = line.match(/^([\-*+])\s+(.+)$/);
        if (listMatch) {
          renderedElements.push(
            <ul key={`ul-${i}`} className="bullet-list">
              <li>{parseInline(listMatch[2])}</li>
            </ul>
          );
          i++;
          continue;
        }

        // Empty line parsing
        if (line.trim() === "") {
          renderedElements.push(<div key={`empty-${i}`} className="empty-line" />);
          i++;
          continue;
        }

        // Standard paragraph parsing
        renderedElements.push(<p key={`p-${i}`} className="md-p">{parseInline(line)}</p>);
        i++;
      }

      return (
        <div key={index} className="text-section">
          {renderedElements}
        </div>
      );
    }
  });
}

function parseInline(text: string): React.ReactNode[] {
  let parts: React.ReactNode[] = [text];

  // 1. Parse triple backticks (embedded code blocks)
  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/(\`\`\`[a-zA-Z0-9]*[\s\S]*?\`\`\`)/g);
    return segments.map((seg, idx) => {
      if (seg.startsWith("```") && seg.endsWith("```")) {
        let inner = seg.slice(3, -3);
        let lang = "code";
        const match = inner.match(/^([a-zA-Z0-9]+)(?:\r\n|\n|\\n|\s)/);
        if (match) {
          lang = match[1];
          inner = inner.substring(match[0].length);
        }
        // Normalize literal \n or escaped newlines to actual newlines
        const codeText = inner.replace(/\\n/g, "\n").trim();
        return (
          <code key={idx} className="inline-code code-block-in-cell">
            {codeText}
          </code>
        );
      }
      return seg;
    });
  });

  // 2. Parse inline code (single backticks)
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

  // 3. Parse links
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

  // 4. Parse bold (**text**)
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

  // 5. Parse italics (*text*)
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

  // 6. Convert literal \n or escaped newlines to <br /> elements
  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const segments = part.split(/\\n|\n/g);
    return segments.flatMap((seg, idx) => {
      if (idx > 0) {
        return [<br key={`br-${idx}`} />, seg];
      }
      return [seg];
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

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast({
        type: "success",
        title: "Copied",
        message: "Message copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast({
        type: "error",
        title: "Copy Failed",
        message: "Failed to copy message.",
      });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn-copy-msg ${copied ? "copied-success" : ""}`}
      title="Copy message to clipboard"
    >
      {copied ? (
        <Check className="copy-icon-svg" />
      ) : (
        <Copy className="copy-icon-svg" />
      )}
    </button>
  );
}
