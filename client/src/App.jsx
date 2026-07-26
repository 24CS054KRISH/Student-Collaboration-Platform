import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Register from "./components/Register";

function App() {
  const [currentPage, setCurrentPage] = useState("landing");

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        <Navbar onNavigate={setCurrentPage} />
        <main className="transition-all duration-300">
          {currentPage === "landing" && (
            <>
              <Hero onNavigate={setCurrentPage} />
              <Features />
            </>
          )}
          {currentPage === "login" && (
            <Login onNavigate={setCurrentPage} />
          )}
          {currentPage === "register" && (
            <Register onNavigate={setCurrentPage} />
          )}
        </main>
      </div>
      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}

export default App;