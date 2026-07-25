import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css"

const App = lazy(() => import("./App"));

function StartupFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#131114",
        color: "#d9d2c7",
        fontFamily: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(217, 210, 199, 0.14)",
          background: "rgba(26, 23, 28, 0.55)",
          borderRadius: "12px",
          padding: "10px 14px",
          fontSize: "12px",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        Loading LitePost...
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<StartupFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>,
);
