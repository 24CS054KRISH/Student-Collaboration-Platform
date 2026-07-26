import { useState } from "react";

export default function Navbar({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleHomeClick = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate("landing");
    setIsOpen(false);
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate("login");
    setIsOpen(false);
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate("register");
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div
            onClick={handleHomeClick}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              CollabGrad
            </span>
          </div>

          {/* Desktop Links & CTAs */}
          <div className="hidden md:flex md:items-center md:gap-8">
            <div className="flex gap-6">
              <a
                href="#"
                onClick={handleHomeClick}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200"
              >
                Home
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200"
              >
                About
              </a>
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLoginClick}
                className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={handleRegisterClick}
                className="rounded-lg bg-blue-600 px-4 h-9 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 transition-all duration-200 cursor-pointer"
              >
                Register
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none cursor-pointer"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-60 border-t border-slate-100 bg-white" : "max-h-0"
        }`}
      >
        <div className="space-y-1 px-4 py-3">
          <a
            href="#"
            onClick={handleHomeClick}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            Home
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            About
          </a>
          <div className="my-2 border-t border-slate-100"></div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleLoginClick}
              className="w-full rounded-lg px-3 py-2 text-left text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={handleRegisterClick}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-center text-base font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
