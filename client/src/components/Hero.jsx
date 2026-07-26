export default function Hero({ onNavigate }) {
  const handleActionClick = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate("login");
  };

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-32">
      {/* Background Decorative Elements */}
      <div className="absolute inset-y-0 right-1/2 -z-10 -mr-96 w-[200%] origin-top-right skew-x-[-30deg] bg-white shadow-xl shadow-blue-600/5 ring-1 ring-blue-50 sm:-mr-80 lg:-mr-96" />
      
      <div className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
        <div
          className="aspect-1155/678 w-[72.1875rem] bg-gradient-to-tr from-blue-400 to-indigo-600 opacity-15"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Empowering Student Innovation
          </div>

          {/* Title */}
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight sm:leading-none">
            Find the Right{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Teammates
            </span>{" "}
            for Your Next Project
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Connect with students, build teams, and collaborate on hackathons,
            semester projects, startup ideas, and open-source projects.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleActionClick}
              className="group relative flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Find Team
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
            
            <button
              onClick={handleActionClick}
              className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200 cursor-pointer"
            >
              Explore Projects
            </button>
          </div>

          {/* Quick Metrics / Social Proof */}
          <div className="mt-20 border-t border-slate-100 pt-10 sm:mt-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trusted by tech leaders of tomorrow
            </p>
            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 grayscale opacity-60">
              <span className="text-sm font-bold text-slate-800 tracking-wider">HACKATHONS</span>
              <span className="text-sm font-bold text-slate-800 tracking-wider">DEV CLUBS</span>
              <span className="text-sm font-bold text-slate-800 tracking-wider">STARTUP LABS</span>
              <span className="text-sm font-bold text-slate-800 tracking-wider">OPEN SOURCE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
