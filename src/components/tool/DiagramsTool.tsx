"use client";

import { useState } from "react";
import ToolsHeading from "./ToolsHeading";
import MermaidChart from "../MermaidChart";
import { useToast } from "@/providers/ToastProvider";
import axios from "axios";
import { Sparkles, Play, Code, MessageSquare, Edit2, RotateCcw } from "lucide-react";

export default function DiagramsTool() {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<"visual" | "code">("visual");
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const { showToast } = useToast();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);

    try {
      let convId = conversationId;
      if (!convId) {
        // Create diagram_tool conversation session
        const convRes = await axios.post("/api/conversation", {
          title: `Diagram Studio - ${new Date().toLocaleDateString()}`,
          variant: "diagram_tool",
        });

        if (!convRes.data?.success) {
          throw new Error(convRes.data?.message || "Failed to start diagram session");
        }

        convId = convRes.data.data.id;
        setConversationId(convId);
      }

      // Call tool chat API
      const chatRes = await axios.post("/api/tool-chat", {
        conversationId: convId,
        content: prompt.trim(),
        history: [] // session history can be loaded later
      });

      if (!chatRes.data?.success) {
        throw new Error(chatRes.data?.message || "Failed to generate diagram");
      }

      const generatedCode = chatRes.data.data.botMessage.content;
      setCode(generatedCode);
      setPrompt("");
      showToast({
        type: "success",
        title: "Diagram Staged",
        message: "Mermaid script generated and rendered successfully.",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Generation Failure",
        message: error.response?.data?.message || error.message || "Failed to compile diagram.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode("");
    setPrompt("");
    setConversationId(null);
    showToast({
      type: "info",
      title: "Workspace Reset",
      message: "Studio canvas has been cleared.",
    });
  };

  return (
    <div className="diagram-studio-container">
      <div className="dotted-canvas"></div>

      <div className="studio-workspace z-10">
        <header className="studio-header">
          <ToolsHeading firstPart="Diagram" secondPart="Studio" />
          
          <div className="studio-actions">
            {code && (
              <>
                <div className="mode-toggle glass-panel">
                  <button 
                    onClick={() => setEditMode("visual")} 
                    className={editMode === "visual" ? "active" : ""}
                  >
                    <MessageSquare className="action-icon" />
                    <span>Visual</span>
                  </button>
                  <button 
                    onClick={() => setEditMode("code")} 
                    className={editMode === "code" ? "active" : ""}
                  >
                    <Code className="action-icon" />
                    <span>Code Editor</span>
                  </button>
                </div>

                <button onClick={handleReset} className="btn-secondary btn-icon-only" title="Reset Canvas">
                  <RotateCcw className="action-icon-reset" />
                </button>
              </>
            )}
          </div>
        </header>

        <div className="studio-main">
          {code ? (
            <div className={`canvas-grid ${editMode === "code" ? "has-editor" : ""}`}>
              {/* Left Side: Visual Render */}
              <div className="canvas-viewer">
                <MermaidChart code={code} />
              </div>

              {/* Right Side: Manual Code Editor if active */}
              {editMode === "code" && (
                <div className="code-editor-panel glass-panel">
                  <div className="panel-header">
                    <Edit2 className="panel-icon" />
                    <span>Mermaid.js Source</span>
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="code-textarea"
                    placeholder="Enter Mermaid syntax..."
                  />
                  <div className="panel-tip">
                    Editing code directly updates the live chart canvas.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-studio glass-panel">
              <Sparkles className="empty-icon animate-pulse" />
              <h3>Visual Workspace Empty</h3>
              <p>
                Describe the flowchart, sequence, ERD, or architecture diagram you want below.
                CognitoX will write the Mermaid script and render it instantly.
              </p>
            </div>
          )}
        </div>

        <footer className="studio-footer glass-panel">
          <form onSubmit={handleGenerate} className="studio-input-form">
            <input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={code ? "Describe refinements (e.g. 'Add a state check node to the end')" : "e.g., Draw a flowchart representing OAuth authorization flow"}
              className="input-field studio-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !prompt.trim()}
              className="btn-primary studio-submit-btn"
            >
              {loading ? "Compiling..." : code ? "Refine Diagram" : "Draw Diagram"}
            </button>
          </form>
        </footer>
      </div>

      <style jsx>{`
        .diagram-studio-container {
          height: 100%;
          width: 100%;
          display: flex;
          position: relative;
          padding: 24px;
        }
        .studio-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .studio-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .studio-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .mode-toggle {
          display: flex;
          padding: 3px;
          border-radius: 8px;
        }
        .mode-toggle button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-family: var(--font-display);
          font-size: 0.78rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .mode-toggle button.active {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }
        .action-icon {
          width: 14px;
          height: 14px;
        }
        .action-icon-reset {
          width: 15px;
          height: 15px;
        }
        .btn-icon-only {
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .studio-main {
          flex: 1;
          min-height: 0;
        }
        .canvas-grid {
          display: grid;
          grid-template-columns: 1fr;
          height: 100%;
        }
        .canvas-grid.has-editor {
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
        }
        .canvas-grid:only-child, .canvas-viewer:only-child {
          grid-template-columns: 1fr;
          width: 100%;
          height: 100%;
        }
        /* Fallback if code editor is closed */
        .canvas-viewer {
          height: 100%;
          overflow: hidden;
        }
        .code-editor-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 16px;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 12px;
          font-family: var(--font-display);
        }
        .panel-icon {
          width: 14px;
          height: 14px;
          color: var(--accent-primary);
        }
        .code-textarea {
          flex: 1;
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: #e5e7eb;
          font-family: monospace;
          font-size: 0.78rem;
          padding: 12px;
          resize: none;
          outline: none;
        }
        .code-textarea:focus {
          border-color: var(--accent-primary);
        }
        .panel-tip {
          font-size: 0.68rem;
          color: var(--text-muted);
          margin-top: 8px;
        }
        .empty-studio {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          text-align: center;
        }
        .empty-icon {
          width: 48px;
          height: 48px;
          color: var(--accent-primary);
          margin-bottom: 16px;
        }
        .empty-studio h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
          font-family: var(--font-display);
        }
        .empty-studio p {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 400px;
        }
        .studio-footer {
          padding: 16px 20px;
        }
        .studio-input-form {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .studio-input {
          flex: 1;
        }
        .studio-submit-btn {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
