"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface PageLoaderProps {
  children: React.ReactNode;
}

export default function PageLoader({ children }: PageLoaderProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Disable scrolling on body while loader is active
    document.body.style.overflow = "hidden";

    // Set loading to false once the client has mounted and hydrated
    setLoading(false);

    // Re-enable scrolling after the loader starts fading out
    const timer = setTimeout(() => {
      document.body.style.overflow = "";
    }, 350);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* 
        Always render children so search engines can index the HTML.
        The absolute loader overlay sits on top of this content.
      */}
      {children}

      <AnimatePresence>
        {loading && (
          <motion.div
            key="page-loader-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              backgroundColor: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "all",
            }}
          >
            {/* Center Logo with Breathing/Pulse loop */}
            <motion.div
              animate={{ 
                opacity: [0.35, 1, 0.35],
                scale: [0.92, 1.08, 0.92],
                filter: [
                  "drop-shadow(0 0 10px rgba(6, 182, 212, 0.25))",
                  "drop-shadow(0 0 30px rgba(6, 182, 212, 0.75))",
                  "drop-shadow(0 0 10px rgba(6, 182, 212, 0.25))"
                ]
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src="/logo.png"
                alt="CognitoX Logo"
                width={80}
                height={80}
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
