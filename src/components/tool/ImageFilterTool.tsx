"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/providers/ToastProvider";
import ToolsHeading from "./ToolsHeading";
import { Upload, ImageIcon, Trash2, Download, Copy, RotateCcw } from "lucide-react";

export default function ImageFilterTool() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  // Day 2 Filter States
  const [brightness, setBrightness] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!imageFile) {
      setOriginalImage(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      setOriginalImage(img);
    };

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    if (!originalImage) return;
    applyFilters();
  }, [originalImage, brightness]);

  const drawOriginalImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  const applyFilters = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset dimensions and draw
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Apply Brightness Adjustment
    if (brightness !== 0) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + brightness));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // B
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  const handleReset = () => {
    setImageFile(null);
    setFileName("");
    setOriginalImage(null);
    setBrightness(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast({
      type: "info",
      title: "Workspace Reset",
      message: "Canvas cleared and workspace reset.",
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        setFileName(file.name);
      } else {
        showToast({
          type: "error",
          title: "Invalid File Type",
          message: "Please drop an image file (PNG, JPG, WEBP).",
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setFileName(file.name);
    }
  };

  return (
    <section className="tool-view-section">
      <div className="dotted-canvas"></div>
      
      <div className="tool-box-container">
        <ToolsHeading firstPart="Image Filter" secondPart="Studio" />

        {!imageFile ? (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="upload-dropzone glass-panel"
          >
            <Upload className="upload-icon" />
            <p className="upload-prompt">Drag &amp; drop an image scan here to filter</p>
            <span className="upload-separator">or</span>
            <label className="btn-secondary select-label">
              Browse Image
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect} 
                accept="image/*" 
                style={{ display: "none" }} 
              />
            </label>
          </div>
        ) : (
          <div className="editor-grid glass-panel">
            <div className="canvas-column">
              <div className="canvas-wrapper">
                <canvas ref={canvasRef} className="image-canvas" />
              </div>
              <div className="canvas-actions">
                <button onClick={handleReset} className="btn-secondary btn-icon-only" title="Clear Image">
                  <Trash2 className="action-icon" />
                </button>
              </div>
            </div>
            
            <div className="controls-column">
              <h4>Filter Controls</h4>
              <p className="file-info">{fileName}</p>
              
              <div className="control-group">
                <div className="control-label">
                  <span>Brightness</span>
                  <span className="control-value">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="filter-slider"
                />
              </div>
            </div>
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
          max-width: 900px;
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
          padding: 64px 24px;
          text-align: center;
          border: 2px dashed var(--border-color);
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
        .editor-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          padding: 24px;
          min-height: 450px;
        }
        @media (max-width: 768px) {
          .editor-grid {
            grid-template-columns: 1fr;
          }
        }
        .canvas-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          padding: 16px;
          gap: 12px;
        }
        .canvas-wrapper {
          max-width: 100%;
          max-height: 400px;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .image-canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }
        .canvas-actions {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .btn-icon-only {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-icon {
          width: 16px;
          height: 16px;
        }
        .controls-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .controls-column h4 {
          font-size: 1rem;
          font-family: var(--font-display);
          color: var(--text-primary);
        }
        .file-info {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: -12px;
          margin-bottom: 8px;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .control-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .control-value {
          font-family: monospace;
          color: var(--accent-primary);
        }
        .filter-slider {
          width: 100%;
          height: 5px;
          background: rgba(128, 128, 128, 0.2);
          border-radius: 5px;
          outline: none;
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
