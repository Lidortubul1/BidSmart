import React from "react";

export default function Box({ children }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        maxWidth: 640,
        margin: "16px auto",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
