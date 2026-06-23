"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface PageLoaderProps {
  children: React.ReactNode;
}

export default function PageLoader({ children }: PageLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    // Disable scrolling on body while loader is active
    document.body.style.overflow = "hidden";

    // Trigger the fade-out transition after mounting
    setFaded(true);

    // Completely unmount the loader after the transition finishes (350ms)
    const timer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 350);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!visible) return <>{children}</>;

  return (
    <>
      {/* 
        Always render children so search engines can index the HTML.
        The absolute loader overlay sits on top of this content.
      */}
      {children}

      <div
        className="page-loader-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          backgroundColor: "var(--bg-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "all",
          opacity: faded ? 0 : 1,
          transition: "opacity 0.35s ease-in-out",
        }}
      >
        {/* Center Logo with breathing scale & outline shadow glow */}
        <div className="pulse-glow-logo">
          <Image
            src="/logo.png"
            alt="CognitoX Logo"
            width={80}
            height={80}
            priority
          />
        </div>

        <style>{`
          @keyframes pulseGlow {
            0%, 100% {
              opacity: 0.35;
              transform: scale(0.92);
              filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.25));
            }
            50% {
              opacity: 1;
              transform: scale(1.08);
              filter: drop-shadow(0 0 30px rgba(6, 182, 212, 0.75));
            }
          }
          .pulse-glow-logo {
            animation: pulseGlow 2.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    </>
  );
}
