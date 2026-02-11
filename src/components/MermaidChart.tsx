"use client";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

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
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-family: var(--font-display);
          z-index: 5;
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
      `}</style>
    </div>
  );
}
