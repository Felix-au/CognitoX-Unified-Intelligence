"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import ToolsHeading from "./ToolsHeading";
import axios from "axios";
import { FileText, Upload, X } from "lucide-react";

export default function NotesTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const selected = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (!files.length || extracting) return;
    setExtracting(true);

    try {
      // Create notes_tool conversation session
      const convRes = await axios.post("/api/conversation", {
        title: `Notes OCR - ${new Date().toLocaleDateString()}`,
        variant: "notes_tool",
      });

      if (!convRes.data?.success) {
        throw new Error(convRes.data?.message || "Failed to start notes session");
      }

      const convId = convRes.data.data.id;

      const fd = new FormData();
      fd.append("conversationId", convId);
      fd.append("content", "Perform high-fidelity OCR on these uploaded files and compile clean, structured markdown notes.");
      fd.append("history", JSON.stringify([]));
      files.forEach((f) => fd.append("files", f));

      const chatRes = await axios.post("/api/tool-chat", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!chatRes.data?.success) {
        throw new Error(chatRes.data?.message || "Failed to parse OCR notes");
      }

      showToast({
        type: "success",
        title: "Notes Compiled",
        message: "Text extracted successfully. Loading notes workspace...",
      });

      router.push(`/chatbot/c/${convId}`);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "OCR Failure",
        message: error.response?.data?.message || error.message || "Extraction failed.",
      });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <section className="tool-view-section">
      <div className="dotted-canvas"></div>
      
      <div className="tool-box-container">
        <ToolsHeading firstPart="Smart Notes" secondPart="OCR" />

        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="upload-dropzone glass-panel"
        >
          <Upload className="upload-icon" />
          <p className="upload-prompt">Drag &amp; drop handwritten notes, PDFs, or scan sheets here</p>
          <span className="upload-separator">or</span>
          <label className="btn-secondary select-label">
            Browse Files
            <input 
              type="file" 
              multiple 
              onChange={handleFileSelect} 
              accept=".pdf,.png,.jpg,.jpeg,.webp" 
              style={{ display: "none" }} 
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="selected-files-list glass-panel">
            <h4>Uploaded Assets ({files.length})</h4>
            <div className="files-grid">
              {files.map((file, idx) => (
                <div key={idx} className="file-chip">
                  <FileText className="file-chip-icon" />
                  <span className="file-chip-name">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="file-chip-remove">
                    <X className="remove-icon" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={handleExtract}
              disabled={extracting}
              className="btn-primary start-extract-btn"
            >
              {extracting ? "Extracting..." : "Compile Notes"}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .tool-view-section {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }
        .tool-box-container {
          max-width: 600px;
          width: 100%;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .upload-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }
        .upload-dropzone:hover {
          border-color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.03);
        }
        .upload-icon {
          width: 42px;
          height: 42px;
          color: var(--accent-primary);
          margin-bottom: 16px;
        }
        .upload-prompt {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .upload-separator {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .select-label {
          cursor: pointer;
        }
        .selected-files-list {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .selected-files-list h4 {
          font-size: 0.9rem;
          font-family: var(--font-display);
          color: #ffffff;
        }
        .files-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 160px;
          overflow-y: auto;
        }
        .file-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .file-chip-icon {
          width: 16px;
          height: 16px;
          color: var(--accent-primary);
        }
        .file-chip-name {
          flex: 1;
          font-size: 0.8rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-chip-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }
        .file-chip-remove:hover {
          color: #ffffff;
        }
        .remove-icon {
          width: 14px;
          height: 14px;
        }
        .start-extract-btn {
          width: 100%;
        }
      `}</style>
    </section>
  );
}
