"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import ToolsHeading from "./ToolsHeading";
import axios from "axios";
import { Upload, Sliders, ArrowRight, Image as ImageIcon, Check } from "lucide-react";

export default function ImageFilterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Sliders state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [threshold, setThreshold] = useState(0); // 0 = inactive, 1-255 = threshold value
  const [edges, setEdges] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();
  const router = useRouter();

  // Handle Drag & Drop
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Redraw Canvas when sliders update
  useEffect(() => {
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Scale canvas to fit image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Apply CSS-based filters (brightness, contrast, grayscale, blur)
      let filterString = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;
      if (blur > 0) filterString += ` blur(${blur}px)`;
      ctx.filter = filterString;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none"; // reset

      // Apply pixel-level algorithms (binarization or edge detection)
      if (threshold > 0 || edges) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        if (edges) {
          // Sobel Edge Detection Filter
          const width = canvas.width;
          const height = canvas.height;
          const grayData = new Uint8ClampedArray(width * height);
          
          // Grayscale values helper
          for (let i = 0; i < data.length; i += 4) {
            grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }

          const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
          const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              let pixelX = 0;
              let pixelY = 0;

              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const val = grayData[(y + ky) * width + (x + kx)];
                  const kIdx = (ky + 1) * 3 + (kx + 1);
                  pixelX += val * sobelX[kIdx];
                  pixelY += val * sobelY[kIdx];
                }
              }

              const magnitude = Math.min(255, Math.sqrt(pixelX * pixelX + pixelY * pixelY));
              const idx = (y * width + x) * 4;
              
              // Set pixels
              data[idx] = magnitude;     // R
              data[idx + 1] = magnitude; // G
              data[idx + 2] = magnitude; // B
            }
          }
        } else if (threshold > 0) {
          // Otsu-style Binarization Thresholding
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const val = gray >= threshold ? 255 : 0;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }
    };
  }, [file, brightness, contrast, blur, grayscale, threshold, edges]);

  const handleSendToChat = async () => {
    const canvas = canvasRef.current;
    if (!canvas || processing) return;

    setProcessing(true);

    try {
      // Convert canvas to image blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
      });

      if (!blob) throw new Error("Failed to capture filtered canvas.");

      const filteredFile = new File([blob], "filtered_notes.jpg", { type: "image/jpeg" });

      // Create conversation
      const convRes = await axios.post("/api/conversation", {
        title: `Filtered Scans Chat`,
        variant: "chat", // Redirect to a RAG chat session
      });

      if (!convRes.data?.success) {
        throw new Error(convRes.data?.message || "Failed to start conversation");
      }

      const convId = convRes.data.data.id;

      // Post the image to chat
      const fd = new FormData();
      fd.append("conversationId", convId);
      fd.append("content", "Describe this preprocessed scan and summarize its equations and content.");
      fd.append("history", JSON.stringify([]));
      fd.append("files", filteredFile);

      const chatRes = await axios.post("/api/chat", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (!chatRes.data?.success) {
        throw new Error(chatRes.data?.message || "Failed to submit filtered image.");
      }

      showToast({
        type: "success",
        title: "Export Complete",
        message: "Filtered scan exported to chat workspace successfully.",
      });

      router.push(`/chatbot/c/${convId}`);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Export Failure",
        message: error.response?.data?.message || error.message || "Failed to send image.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleResetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setBlur(0);
    setGrayscale(0);
    setThreshold(0);
    setEdges(false);
  };

  return (
    <section className="tool-view-section">
      <div className="dotted-canvas"></div>

      <div className="filter-workspace z-10">
        <header className="filter-header">
          <ToolsHeading firstPart="Canvas Image" secondPart="Filters" />
        </header>

        {file ? (
          <div className="filter-grid">
            {/* Left Column: Interactive Canvas */}
            <div className="canvas-view-panel glass-panel">
              <canvas ref={canvasRef} className="filter-canvas" />
            </div>

            {/* Right Column: Sliders Editor */}
            <div className="sliders-control-panel glass-panel">
              <div className="panel-title">
                <Sliders className="panel-title-icon" />
                <span>Adjust Parameters</span>
              </div>

              <div className="sliders-list">
                {/* Brightness */}
                <div className="slider-group">
                  <div className="slider-meta">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input 
                    type="range" min="50" max="150" value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                {/* Contrast */}
                <div className="slider-group">
                  <div className="slider-meta">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input 
                    type="range" min="50" max="150" value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                {/* Blur */}
                <div className="slider-group">
                  <div className="slider-meta">
                    <span>Blur (Denoising)</span>
                    <span>{blur}px</span>
                  </div>
                  <input 
                    type="range" min="0" max="8" value={blur}
                    onChange={(e) => setBlur(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                {/* Grayscale */}
                <div className="slider-group">
                  <div className="slider-meta">
                    <span>Grayscale</span>
                    <span>{grayscale}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={grayscale}
                    onChange={(e) => setGrayscale(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                {/* Binarization Threshold */}
                <div className="slider-group">
                  <div className="slider-meta">
                    <span>Binarization (Threshold)</span>
                    <span>{threshold === 0 ? "Off" : threshold}</span>
                  </div>
                  <input 
                    type="range" min="0" max="255" value={threshold}
                    onChange={(e) => {
                      setThreshold(Number(e.target.value));
                      if (Number(e.target.value) > 0) setEdges(false); // mutually exclusive
                    }}
                    className="slider-input"
                  />
                </div>

                {/* Sobel Edge Detection */}
                <div className="toggle-group">
                  <span>Sobel Edge Detection</span>
                  <input 
                    type="checkbox"
                    checked={edges}
                    onChange={(e) => {
                      setEdges(e.target.checked);
                      if (e.target.checked) setThreshold(0); // mutually exclusive
                    }}
                    className="toggle-checkbox"
                  />
                </div>
              </div>

              <div className="panel-actions">
                <button onClick={handleResetFilters} className="btn-secondary w-full">
                  Reset Filters
                </button>
                <button 
                  onClick={handleSendToChat} 
                  disabled={processing}
                  className="btn-primary w-full"
                >
                  {processing ? "Exporting..." : (
                    <>
                      <span>Send to Chat</span>
                      <ArrowRight className="btn-arrow-icon" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-filter glass-panel">
            <Upload className="empty-filter-icon" />
            <h3>No Scan Uploaded</h3>
            <p>Drag and drop a scanned document, or click browse to start editing images client-side.</p>
            <label className="btn-primary select-btn-label">
              Upload Image
              <input 
                type="file" 
                onChange={handleFileSelect} 
                accept="image/*" 
                style={{ display: "none" }} 
              />
            </label>
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
        .filter-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
          height: 100%;
          min-height: 0;
        }
        .canvas-view-panel {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow: auto;
          background: var(--canvas-bg);
        }
        .filter-canvas {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }
        .sliders-control-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: 100%;
          overflow-y: auto;
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 600;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .panel-title-icon {
          width: 18px;
          height: 18px;
          color: var(--accent-primary);
        }
        .sliders-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
        }
        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .slider-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .slider-input {
          width: 100%;
          accent-color: var(--accent-primary);
          cursor: pointer;
        }
        .toggle-group {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .toggle-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--accent-primary);
          cursor: pointer;
        }
        .panel-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .btn-arrow-icon {
          width: 14px;
          height: 14px;
        }
        .empty-filter {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          text-align: center;
        }
        .empty-filter-icon {
          width: 48px;
          height: 48px;
          color: var(--accent-primary);
          margin-bottom: 16px;
        }
        .empty-filter h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          font-family: var(--font-display);
        }
        .empty-filter p {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 380px;
          margin-bottom: 20px;
        }
        .select-btn-label {
          cursor: pointer;
        }
        .w-full {
          width: 100%;
        }
      `}</style>
    </section>
  );
}
