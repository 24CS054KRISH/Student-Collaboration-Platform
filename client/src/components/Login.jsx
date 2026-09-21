import { useState } from "react";
import { loginUser } from "../api/authApi";
import { useToast } from "./Toast";

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const showToast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUnverifiedEmail("");
    
    try {
      // Validate email and password
      if (!email || !password) {
        showToast("Email and password are required.", "error");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast("Please enter a valid email address.", "error");
        return;
      }

      const response = await loginUser({ email, password });
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      showToast("Login Successful — Welcome back!", "success");

      // Navigate to Dashboard
      if (onNavigate) onNavigate("dashboard");
    } catch (error) {
      if (error.response?.data?.isUnverified) {
        const targetEmail = error.response.data.email || email;
        setUnverifiedEmail(targetEmail);
        const errorMsg = error.response.data.message || "Your email is not verified yet. Please enter your verification code.";
        showToast(errorMsg, "error");
        return;
      }
      const errorMessage = error.response?.data?.message || error.message || "Login failed";
      showToast(errorMessage, "error");
    }
  };

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
        <div
          className="aspect-1155/678 w-[50rem] bg-gradient-to-tr from-blue-400 to-indigo-600 opacity-10"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Card Wrapper */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-900/5 p-8 sm:p-10 transition-all duration-300">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-normal">
              Sign in to connect and collaborate with peers
            </p>
          </div>

          {/* Unverified Email Warning Banner */}
          {unverifiedEmail && (
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200/80 p-4 text-xs text-amber-800 flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="font-medium leading-relaxed">
                  Your email (<span className="font-semibold">{unverifiedEmail}</span>) is not verified yet.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("verify-email", { email: unverifiedEmail })}
                className="self-start mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
              >
                Verify Email Now &rarr;
              </button>
            </div>
          )}

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="you@university.edu"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 hover:bg-blue-700 hover:shadow-blue-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>



          {/* Footer Link */}
          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500 font-normal">
              Don't have an account?{" "}
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate("register");
              }}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
