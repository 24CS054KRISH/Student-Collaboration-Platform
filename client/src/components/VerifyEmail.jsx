import { useState, useEffect, useRef } from "react";
import { verifyEmail, resendVerificationOtp } from "../api/authApi";
import { useToast } from "./Toast";

export default function VerifyEmail({ email: initialEmail = "", onNavigate }) {
  const showToast = useToast();

  const [email, setEmail] = useState(() => {
    return initialEmail || localStorage.getItem("pendingVerificationEmail") || "";
  });
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail && !localStorage.getItem("pendingVerificationEmail"));
  const [tempEmail, setTempEmail] = useState(email);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const [cooldown, setCooldown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [inlineSuccess, setInlineSuccess] = useState("");

  // Update localStorage when email changes
  useEffect(() => {
    if (email) {
      localStorage.setItem("pendingVerificationEmail", email);
      setTempEmail(email);
    }
  }, [email]);

  // Sync prop changes
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setTempEmail(initialEmail);
      setIsEditingEmail(false);
    }
  }, [initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus the first empty OTP input on load
  useEffect(() => {
    if (!isEditingEmail && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isEditingEmail]);

  const handleOtpChange = (index, value) => {
    setInlineError("");
    setInlineSuccess("");

    // Only allow digits
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length === 0) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    // Handle single digit input
    const digit = cleaned[cleaned.length - 1];
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);

    // Auto-advance to next box if available
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move to previous box if current is empty
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setInlineError("");
    setInlineSuccess("");
    const pastedData = e.clipboardData.getData("text").trim();
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);

    if (!digits) return;

    const updated = [...otp];
    for (let i = 0; i < 6; i++) {
      updated[i] = digits[i] || "";
    }
    setOtp(updated);

    // Focus on the next empty box or the last box
    const nextEmptyIndex = updated.findIndex((d) => !d);
    if (nextEmptyIndex !== -1 && inputRefs.current[nextEmptyIndex]) {
      inputRefs.current[nextEmptyIndex].focus();
    } else if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
  };

  const handleSaveEmail = (e) => {
    e.preventDefault();
    const clean = tempEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || !emailRegex.test(clean)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    setEmail(clean);
    setIsEditingEmail(false);
    showToast(`Verification target set to ${clean}`, "info");
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setInlineError("");
    setInlineSuccess("");

    if (!email) {
      setInlineError("Please provide an email address.");
      showToast("Please provide an email address.", "error");
      setIsEditingEmail(true);
      return;
    }

    const fullOtp = otp.join("");
    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setInlineError("Please enter all 6 digits of the verification code.");
      showToast("Please enter the complete 6-digit verification code.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await verifyEmail({ email, otp: fullOtp });

      if (response && response.token) {
        localStorage.setItem("token", response.token);
        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
        }
        localStorage.removeItem("pendingVerificationEmail");
        showToast("Email verified successfully! Welcome to SkillSync.", "success");
        if (onNavigate) {
          onNavigate("dashboard");
        }
      } else {
        setInlineSuccess(response.message || "Email verified successfully!");
        showToast(response.message || "Email verified successfully!", "success");
        if (onNavigate) {
          onNavigate("login");
        }
      }
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Verification failed. Please check your code and try again.";
      setInlineError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    if (!email) {
      showToast("Please provide an email address first.", "error");
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setInlineError("");
    setInlineSuccess("");

    try {
      const response = await resendVerificationOtp({ email });
      setCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      if (inputRefs.current[0]) inputRefs.current[0].focus();

      const successMsg = response.message || "A new 6-digit code has been sent to your email!";
      setInlineSuccess(successMsg);
      showToast(successMsg, "success");
    } catch (error) {
      if (error.response?.data?.remainingSeconds) {
        setCooldown(error.response.data.remainingSeconds);
      }
      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to resend verification code. Please try again.";
      setInlineError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsResending(false);
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

      <div className="w-full max-w-md space-y-6">
        {/* Card Wrapper */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-900/5 p-8 sm:p-10 transition-all duration-300">
          {/* Header Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Verify Your Email
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-normal">
              We sent a 6-digit verification code to
            </p>

            {/* Email Address Display / Edit */}
            {isEditingEmail ? (
              <form onSubmit={handleSaveEmail} className="mt-3 flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none"
                  placeholder="Enter your registered email"
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100/60">
                <span className="truncate max-w-[220px]">{email || "No email specified"}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="ml-1 text-blue-600 hover:text-blue-800 underline decoration-dotted transition-colors cursor-pointer"
                  title="Change email address"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Inline Feedback Alerts */}
          {inlineError && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200/70 p-3 text-xs text-red-700 flex items-start gap-2 animate-fadeIn">
              <svg className="h-4 w-4 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{inlineError}</span>
            </div>
          )}

          {inlineSuccess && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200/70 p-3 text-xs text-green-700 flex items-start gap-2 animate-fadeIn">
              <svg className="h-4 w-4 shrink-0 mt-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{inlineSuccess}</span>
            </div>
          )}

          {/* OTP Input Form */}
          <form className="mt-6 space-y-6" onSubmit={handleVerify}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider text-center mb-3">
                Enter 6-Digit Code
              </label>

              {/* 6 Digits Boxes */}
              <div
                className="flex items-center justify-between gap-2 sm:gap-2.5"
                onPaste={handlePaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`h-12 sm:h-14 w-full text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none select-none ${
                      digit
                        ? "border-blue-600 bg-blue-50/20 text-blue-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                Code expires in 10 minutes
              </p>
            </div>

            {/* Verify Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || otp.some((d) => !d)}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 hover:bg-blue-700 hover:shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify Email"
                )}
              </button>
            </div>

            {/* Resend OTP Section with 60s Cooldown */}
            <div className="text-center pt-1">
              <p className="text-xs text-slate-500">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {isResending
                    ? "Sending..."
                    : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend Code"}
                </button>
              </p>
            </div>
          </form>

          {/* Navigation Links */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("register")}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              &larr; Back to Register
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("login")}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
