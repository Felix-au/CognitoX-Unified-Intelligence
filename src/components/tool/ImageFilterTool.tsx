"use client";

import { useEffect } from "react";

export default function ImageFilterTool() {
  useEffect(() => {
    document.title = "Image Filter Studio | CognitoX";
  }, []);

  return (
    <section className="tool-view-section">
      <div className="dotted-canvas"></div>
      <div className="tool-box-container" style={{ zIndex: 10 }}>
        <h2>Image Filter Studio Placeholder</h2>
        <p>This is a placeholder for the Image Filter Studio tool.</p>
      </div>
    </section>
  );
}
