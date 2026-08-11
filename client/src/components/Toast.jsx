import { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, fading: false }]);

    // Start fade
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fading: true } : t))
      );
    }, duration - 400);

    // Remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const colors = {
    success: { bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    error: { bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
    info: { bg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    warning: { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          top: "1.25rem",
          right: "1.25rem",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          pointerEvents: "none",
          maxWidth: "360px",
        }}
      >
        {toasts.map((toast) => {
          const style = colors[toast.type] || colors.info;
          return (
            <div
              key={toast.id}
              style={{
                background: style.bg,
                borderRadius: "0.875rem",
                padding: "0.875rem 1.125rem",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
                opacity: toast.fading ? 0 : 1,
                transform: toast.fading ? "translateX(20px)" : "translateX(0)",
                pointerEvents: "auto",
              }}
            >
              <svg
                style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0, opacity: 0.9 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={style.icon}
                />
              </svg>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.4 }}>
                {toast.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
