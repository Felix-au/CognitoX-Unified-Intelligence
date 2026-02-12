"use client";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download, Copy, FileCode, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "var(--font-body)",
});

export default function MermaidChart({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pan and Zoom States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [currentTheme, setCurrentTheme] = useState("dark");
  
  // Export Dropdown State
  const [exportOpen, setExportOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Set initial theme
    const initialTheme = document.documentElement.getAttribute("data-theme") || "dark";
    setCurrentTheme(initialTheme);

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const val = document.documentElement.getAttribute("data-theme") || "dark";
          setCurrentTheme(val);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!exportOpen) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".export-container")) {
        setExportOpen(false);
      }
    };
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [exportOpen]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    showToast({
      type: "success",
      title: "Code Copied",
      message: "Mermaid script copied to clipboard.",
    });
  };

  const exportSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diagram.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({
      type: "success",
      title: "SVG Exported",
      message: "Diagram vector SVG saved successfully.",
    });
  };

  const exportPng = () => {
    if (!svg) return;
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;

    // Get clean client dimensions
    const width = svgEl.clientWidth || svgEl.getBoundingClientRect().width || 800;
    const height = svgEl.clientHeight || svgEl.getBoundingClientRect().height || 600;

    const canvas = document.createElement("canvas");
    const scaleFactor = 2; // high resolution scale
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply background matching theme
    ctx.fillStyle = currentTheme === "light" ? "#ffffff" : "#030712";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const svgXml = new XMLSerializer().serializeToString(svgEl);
    
    // Convert to base64 Data URL to prevent canvas tainting SecurityError
    const base64Svg = window.btoa(unescape(encodeURIComponent(svgXml)));
    const url = `data:image/svg+xml;base64,${base64Svg}`;

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "diagram.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast({
          type: "success",
          title: "PNG Exported",
          message: "Diagram PNG image saved successfully.",
        });
      } catch (err) {
        console.error("Failed to export PNG:", err);
        showToast({
          type: "error",
          title: "Export Failure",
          message: "Could not export PNG due to browser security constraints. Try exporting as SVG instead.",
        });
      }
    };
    img.src = url;
  };

  useEffect(() => {
    if (!code) return;
    
    setLoading(true);
    setError(null);
    setSvg(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });

    const renderChart = async () => {
      try {
        const isLightTheme = currentTheme === "light";
        mermaid.initialize({
          startOnLoad: false,
          theme: isLightTheme ? "default" : "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-body)",
          themeVariables: isLightTheme ? {
            background: "#ffffff",
            primaryColor: "#e0e7ff",
            primaryTextColor: "#1e1b4b",
            lineColor: "#6366f1",
          } : undefined
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error("Mermaid rendering error:", err);
        setError("Mermaid syntax error. Render failed. Please refine your diagram description.");
        const badNodes = document.querySelectorAll('[id^="dmermaid"]');
        badNodes.forEach(node => node.remove());
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(renderChart, 100);
    return () => clearTimeout(timer);
  }, [code, currentTheme]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 1.1;
    let newScale = scale;
    if (e.deltaY < 0) {
      newScale = Math.min(scale * zoomFactor, 5);
    } else {
      newScale = Math.max(scale / zoomFactor, 0.15);
    }
    setScale(newScale);
  };

  const zoomIn = () => setScale(s => Math.min(s * 1.25, 5));
  const zoomOut = () => setScale(s => Math.max(s / 1.25, 0.15));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      className="mermaid-chart-container glass-panel"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {loading && (
        <div className="chart-loader">
          <div className="cognitive-spinner">
            <div className="spinner-outer"></div>
            <div className="spinner-inner"></div>
            <div className="spinner-center"></div>
          </div>
          <span>Compiling diagram canvas...</span>
        </div>
      )}

      {error ? (
        <div className="chart-error">
          <p>{error}</p>
          <pre className="raw-code-fallback">{code}</pre>
        </div>
      ) : (
        svg && (
          <>
            <div className="zoom-controls glass-card">
              <button type="button" onClick={zoomIn} title="Zoom In">+</button>
              <button type="button" onClick={zoomOut} title="Zoom Out">-</button>
              <button type="button" onClick={resetZoom} title="Reset Zoom">Reset</button>
              <span className="scale-display">{Math.round(scale * 100)}%</span>
              
              <div className="divider"></div>
              
              <div className="export-container">
                <button 
                  type="button" 
                  onClick={() => setExportOpen(!exportOpen)} 
                  className="btn-export"
                  title="Export Diagram Options"
                >
                  <Download className="icon-sm" />
                  <span>Export</span>
                </button>
                
                {exportOpen && (
                  <div className="export-menu glass-card">
                    <button type="button" onClick={() => { copyCode(); setExportOpen(false); }}>
                      <Copy className="menu-icon" />
                      <span>Copy Code</span>
                    </button>
                    <button type="button" onClick={() => { exportSvg(); setExportOpen(false); }}>
                      <FileCode className="menu-icon" />
                      <span>Export SVG</span>
                    </button>
                    <button type="button" onClick={() => { exportPng(); setExportOpen(false); }}>
                      <ImageIcon className="menu-icon" />
                      <span>Export PNG</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div 
              ref={containerRef} 
              className="mermaid-rendered-svg-wrapper"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
              dangerouslySetInnerHTML={{ __html: svg }} 
            />
          </>
        )
      )}

      <style jsx>{`
        .mermaid-chart-container {
          width: 100%;
          height: 100%;
          min-height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow: hidden;
          position: relative;
          background: var(--bg-card);
          user-select: none;
        }
        .chart-loader {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(3, 7, 18, 0.4);
          backdrop-filter: blur(4px);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-family: var(--font-display);
          gap: 16px;
          z-index: 5;
        }
        .chart-loader .cognitive-spinner {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chart-loader .spinner-outer {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 1.8px solid transparent;
          border-top-color: var(--accent-primary);
          border-bottom-color: var(--accent-secondary);
          border-radius: 50%;
          animation: spin-clockwise 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
        }
        .chart-loader .spinner-inner {
          position: absolute;
          width: 70%;
          height: 70%;
          border: 1.8px solid transparent;
          border-left-color: var(--accent-primary);
          border-right-color: var(--accent-secondary);
          border-radius: 50%;
          animation: spin-counter 0.9s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
          opacity: 0.8;
        }
        .chart-loader .spinner-center {
          width: 8px;
          height: 8px;
          background: var(--accent-primary);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--accent-primary);
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        .chart-loader span {
          animation: text-pulse 1.8s ease-in-out infinite;
          letter-spacing: 0.04em;
        }
        .chart-error {
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: var(--accent-danger);
          font-size: 0.85rem;
          max-width: 500px;
          text-align: center;
          width: 100%;
          z-index: 5;
        }
        .raw-code-fallback {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 12px;
          border-radius: 8px;
          text-align: left;
          font-family: monospace;
          font-size: 0.75rem;
          overflow-x: auto;
          color: var(--text-secondary);
        }
        .zoom-controls {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          z-index: 10;
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .zoom-controls button {
          background: rgba(128, 128, 128, 0.1);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.8rem;
          padding: 4px 10px;
          border-radius: 4px;
          font-family: var(--font-display);
          transition: background 0.2s;
        }
        .zoom-controls button:hover {
          background: rgba(128, 128, 128, 0.25);
        }
        .scale-display {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-family: monospace;
          margin-left: 4px;
        }
        .divider {
          width: 1px;
          height: 16px;
          background: var(--border-color);
          margin: 0 8px;
        }
        .export-container {
          position: relative;
          display: inline-block;
        }
        .btn-export {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(128, 128, 128, 0.1);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.8rem;
          padding: 4px 10px;
          border-radius: 4px;
          font-family: var(--font-display);
          transition: background 0.2s;
        }
        .btn-export:hover {
          background: rgba(128, 128, 128, 0.25);
        }
        .icon-sm {
          width: 13px;
          height: 13px;
        }
        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 140px;
          box-shadow: var(--glass-shadow);
          backdrop-filter: var(--glass-backdrop);
          z-index: 50;
        }
        .export-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          width: 100%;
          text-align: left;
          cursor: pointer;
          border-radius: 4px;
          font-size: 0.78rem;
          font-family: var(--font-display);
          transition: all 0.2s;
        }
        .export-menu button:hover {
          background: var(--sidebar-hover-bg);
          color: var(--text-primary);
        }
        .menu-icon {
          width: 14px;
          height: 14px;
        }
        .mermaid-rendered-svg-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
        }
        .mermaid-rendered-svg-wrapper :global(svg) {
          max-width: none !important;
          max-height: none !important;
          width: auto !important;
          height: auto !important;
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
          50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 12px var(--accent-primary); }
        }
        @keyframes text-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
