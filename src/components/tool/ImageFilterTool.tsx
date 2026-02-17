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
  const [contrast, setContrast] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [binarize, setBinarize] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const [blur, setBlur] = useState(0);

  // Day 3 Filter States
  const [sobel, setSobel] = useState(false);
  const [canny, setCanny] = useState(false);

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
  }, [originalImage, brightness, contrast, grayscale, binarize, threshold, blur, sobel, canny]);

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

    const width = originalImage.naturalWidth;
    const height = originalImage.naturalHeight;

    // Reset dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Apply hardware-accelerated Blur if active
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    } else {
      ctx.filter = "none";
    }

    ctx.drawImage(originalImage, 0, 0);
    ctx.filter = "none"; // Reset filter

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Apply Grayscale Conversion (Prerequisite for Sobel and Canny)
    if (grayscale || binarize || sobel || canny) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    // Apply Brightness Adjustment
    if (brightness !== 0) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + brightness));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // B
      }
    }

    // Apply Contrast Adjustment
    if (contrast !== 0) {
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // R
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // G
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // B
      }
    }

    // Apply Binarization (Thresholding)
    if (binarize) {
      for (let i = 0; i < data.length; i += 4) {
        const val = data[i] > threshold ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
    }

    // Apply Sobel Filter
    if (sobel && !canny) {
      const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      
      const grayData = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        grayData[i] = data[i]; // Store grayscale value
      }
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let sumX = 0;
          let sumY = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
              const val = grayData[pixelIdx];
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sumX += val * Gx[kernelIdx];
              sumY += val * Gy[kernelIdx];
            }
          }
          
          const mag = Math.min(255, Math.sqrt(sumX * sumX + sumY * sumY));
          const idx = (y * width + x) * 4;
          data[idx] = mag;
          data[idx + 1] = mag;
          data[idx + 2] = mag;
        }
      }
    }

    // Apply Canny Edge Detection
    if (canny) {
      // Step 1: 5x5 Gaussian Blur for noise reduction
      const gaussianKernel = [
        2,  4,  5,  4, 2,
        4,  9, 12,  9, 4,
        5, 12, 15, 12, 5,
        4,  9, 12,  9, 4,
        2,  4,  5,  4, 2
      ];
      const kernelSum = 159;
      
      const blurred = new Uint8ClampedArray(width * height);
      const tempGray = new Uint8ClampedArray(width * height);
      
      // Store grayscale values in simple 1D array
      for (let i = 0; i < width * height; i++) {
        tempGray[i] = data[i * 4];
      }

      // Perform 5x5 Gaussian convolution
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          let sum = 0;
          for (let ky = -2; ky <= 2; ky++) {
            for (let kx = -2; kx <= 2; kx++) {
              const val = tempGray[(y + ky) * width + (x + kx)];
              const kernelVal = gaussianKernel[(ky + 2) * 5 + (kx + 2)];
              sum += val * kernelVal;
            }
          }
          blurred[y * width + x] = sum / kernelSum;
        }
      }

      // Step 2: Intensity Gradients (Sobel Gx, Gy convolution to find magnitudes and angles)
      const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      
      const magnitudes = new Float32Array(width * height);
      const angles = new Float32Array(width * height);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let sumX = 0;
          let sumY = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const val = blurred[(y + ky) * width + (x + kx)];
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sumX += val * Gx[kernelIdx];
              sumY += val * Gy[kernelIdx];
            }
          }
          
          const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
          magnitudes[y * width + x] = magnitude;

          // Compute angle in radians and normalize to [0, PI]
          let angle = Math.atan2(sumY, sumX);
          if (angle < 0) angle += Math.PI;
          angles[y * width + x] = angle;
        }
      }

      // Output gradient magnitudes temporarily for this commit stage
      for (let i = 0; i < width * height; i++) {
        const val = Math.min(255, magnitudes[i]);
        const idx = i * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `filtered-${fileName.split('.')[0] || "scan"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast({
        type: "success",
        title: "Export Success",
        message: "Filtered scan saved as PNG successfully.",
      });
    } catch (err) {
      console.error(err);
      showToast({
        type: "error",
        title: "Export Failed",
        message: "Failed to download image.",
      });
    }
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Blob conversion failed");
        }
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        showToast({
          type: "success",
          title: "Copied Success",
          message: "Filtered image copied to clipboard.",
        });
      }, "image/png");
    } catch (err) {
      console.error(err);
      showToast({
        type: "error",
        title: "Copy Failed",
        message: "Could not copy image to clipboard due to browser restrictions.",
      });
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setFileName("");
    setOriginalImage(null);
    setBrightness(0);
    setContrast(0);
    setGrayscale(false);
    setBinarize(false);
    setThreshold(128);
    setBlur(0);
    setSobel(false);
    setCanny(false);
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
                <button onClick={handleDownload} className="btn-primary btn-action" title="Download Image">
                  <Download className="action-icon" />
                  <span>Download PNG</span>
                </button>
                <button onClick={handleCopy} className="btn-secondary btn-action" title="Copy to Clipboard">
                  <Copy className="action-icon" />
                  <span>Copy Image</span>
                </button>
                <button onClick={handleReset} className="btn-icon-only btn-danger" title="Clear Image">
                  <Trash2 className="action-icon" />
                </button>
              </div>
            </div>
            
            <div className="controls-column">
              <h4>Filter Controls</h4>
              <p className="file-info">{fileName}</p>
              
              <div className="controls-panel glass-card">
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

                <div className="control-group">
                  <div className="control-label">
                    <span>Contrast</span>
                    <span className="control-value">{contrast > 0 ? `+${contrast}` : contrast}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="filter-slider"
                  />
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Blur</span>
                    <span className="control-value">{blur}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                    className="filter-slider"
                  />
                </div>

                <div className="divider" />

                <div className="control-group-row">
                  <span className="control-label-text">Grayscale</span>
                  <button
                    type="button"
                    onClick={() => setGrayscale(!grayscale)}
                    className={`toggle-switch ${grayscale ? "active" : ""}`}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>

                <div className="control-group-row">
                  <span className="control-label-text">Binarization</span>
                  <button
                    type="button"
                    onClick={() => setBinarize(!binarize)}
                    className={`toggle-switch ${binarize ? "active" : ""}`}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>

                {binarize && (
                  <div className="control-group sub-control animate-fade-in">
                    <div className="control-label">
                      <span>Threshold Value</span>
                      <span className="control-value">{threshold}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      className="filter-slider"
                    />
                  </div>
                )}

                <div className="control-group-row">
                  <span className="control-label-text">Sobel Edges</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSobel(!sobel);
                      if (!sobel) setCanny(false);
                    }}
                    className={`toggle-switch ${sobel ? "active" : ""}`}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>

                <div className="control-group-row">
                  <span className="control-label-text">Canny Edges</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCanny(!canny);
                      if (!canny) setSobel(false);
                    }}
                    className={`toggle-switch ${canny ? "active" : ""}`}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
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
          max-width: 950px;
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
          grid-template-columns: 1.25fr 0.75fr;
          gap: 24px;
          padding: 24px;
          min-height: 480px;
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
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          padding: 20px;
          gap: 16px;
          backdrop-filter: blur(10px);
        }
        .canvas-wrapper {
          max-width: 100%;
          max-height: 420px;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0);
          background-size: 16px 16px;
          border-radius: 8px;
          padding: 10px;
        }
        .image-canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
          border-radius: 4px;
        }
        .canvas-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .btn-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
        }
        .btn-icon-only {
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          transition: all 0.2s;
        }
        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-1px);
        }
        .action-icon {
          width: 16px;
          height: 16px;
        }
        .controls-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .controls-column h4 {
          font-size: 1.05rem;
          font-family: var(--font-display);
          color: var(--text-primary);
          font-weight: 600;
        }
        .file-info {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: -12px;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .controls-panel {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sub-control {
          padding-left: 14px;
          border-left: 2px solid var(--accent-primary);
          margin-top: -6px;
        }
        .control-group-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 0;
        }
        .control-label-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .control-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .control-value {
          font-family: monospace;
          color: var(--accent-primary);
          font-weight: 600;
        }
        .divider {
          height: 1px;
          background: var(--border-color);
          margin: 6px 0;
        }
        .filter-slider {
          width: 100%;
          height: 6px;
          background: rgba(128, 128, 128, 0.15);
          border-radius: 6px;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
        }
        .filter-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent-primary);
          cursor: pointer;
          transition: transform 0.1s, background-color 0.2s;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
        }
        .filter-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: var(--accent-primary-hover);
        }
        .toggle-switch {
          position: relative;
          width: 36px;
          height: 20px;
          background: rgba(128, 128, 128, 0.15);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          outline: none;
          padding: 0;
        }
        .toggle-switch.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }
        .toggle-slider {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          top: 2px;
          left: 2px;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .toggle-switch.active .toggle-slider {
          transform: translateX(16px);
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
