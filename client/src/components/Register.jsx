import { useState } from "react";
import { registerUser } from "../api/authApi";

export default function Register({ onNavigate }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    department: "",
    year: "",
    skills: "",
    interests: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { fullName, email, department, year, skills, interests, password, confirmPassword } = formData;

    // Validate that all required fields are filled
    if (!fullName || !email || !department || !year || !skills || !interests || !password || !confirmPassword) {
      alert("All fields are required.");
      return;
    }

    // Validate password === confirmPassword
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const response = await registerUser({
        fullName,
        email,
        department,
        year,
        skills,
        interests,
        password
      });

      // Save response.token into localStorage as "token"
      localStorage.setItem("token", response.token);

      // Save response.user into localStorage as "user"
      localStorage.setItem("user", JSON.stringify(response.user));

      alert("Registration Successful");

      // Navigate to Dashboard
      if (onNavigate) onNavigate("dashboard");
    } catch (error) {
      // If backend returns an error: Show alert(error.response.data.message)
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      alert(errorMessage);
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

      <div className="w-full max-w-2xl space-y-8">
        {/* Card Wrapper */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-900/5 p-8 sm:p-10 transition-all duration-300">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Create Your Account
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-normal">
              Join CollabGrad to collaborate on projects and find teams
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* College Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700"
                >
                  College Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="john.doe@university.edu"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Department
                </label>
                <div className="mt-1">
                  <input
                    id="department"
                    name="department"
                    type="text"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              {/* Year */}
              <div>
                <label
                  htmlFor="year"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Year
                </label>
                <div className="mt-1">
                  <select
                    id="year"
                    name="year"
                    required
                    value={formData.year}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                  >
                    <option value="" disabled>Select Year</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                </div>
              </div>

              {/* Skills */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="skills"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Skills
                </label>
                <div className="mt-1">
                  <input
                    id="skills"
                    name="skills"
                    type="text"
                    required
                    value={formData.skills}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="React, Node.js, Python, UI Design"
                  />
                </div>
              </div>

              {/* Interests */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="interests"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Interests
                </label>
                <div className="mt-1">
                  <input
                    id="interests"
                    name="interests"
                    type="text"
                    required
                    value={formData.interests}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="Web Apps, Machine Learning, Open Source"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Register Submit Button */}
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 hover:bg-blue-700 hover:shadow-blue-500/20 active:scale-[0.99] transition-all duration-200 cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500 font-normal">
              Already have an account?{" "}
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate("login");
              }}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
