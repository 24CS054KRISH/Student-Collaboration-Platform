import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import { verifyMe } from "./api/authApi";

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const savedToken = localStorage.getItem("token");
    const savedPage = localStorage.getItem("currentPage");
    if (savedToken) {
      return savedPage || "dashboard";
    }
    return savedPage && savedPage !== "dashboard" ? savedPage : "landing";
  });

  const [isVerifying, setIsVerifying] = useState(() => {
    return !!localStorage.getItem("token");
  });

  useEffect(() => {
    const checkAuthSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsVerifying(false);
        const savedPage = localStorage.getItem("currentPage");
        if (savedPage === "dashboard") {
          handleNavigate("login");
        }
        return;
      }

      try {
        const response = await verifyMe();
        if (response && response.success && response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
          const savedPage = localStorage.getItem("currentPage");
          if (!savedPage || savedPage === "login" || savedPage === "register") {
            handleNavigate("dashboard");
          } else {
            handleNavigate(savedPage);
          }
        } else {
          throw new Error("Invalid session response");
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("currentPage");
        localStorage.removeItem("activeTab");
        handleNavigate("login");
      } finally {
        setIsVerifying(false);
      }
    };

    checkAuthSession();
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    localStorage.setItem("currentPage", page);
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-semibold text-slate-500">Restoring session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        {currentPage !== "dashboard" && <Navbar onNavigate={handleNavigate} />}
        <main className="transition-all duration-300">
          {currentPage === "landing" && (
            <>
              <Hero onNavigate={handleNavigate} />
              <Features />
            </>
          )}
          {currentPage === "login" && (
            <Login onNavigate={handleNavigate} />
          )}
          {currentPage === "register" && (
            <Register onNavigate={handleNavigate} />
          )}
          {currentPage === "dashboard" && (
            <Dashboard onNavigate={handleNavigate} />
          )}
        </main>
      </div>
      {currentPage !== "dashboard" && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}

export default App;