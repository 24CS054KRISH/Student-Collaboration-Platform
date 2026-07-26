export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Logo and Description */}
          <div className="space-y-6 xl:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5.5 w-5.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                  />
                </svg>
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                CollabGrad
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 max-w-sm">
              Connecting students with the right skills to build teams, share ideas, and drive innovation across campuses worldwide.
            </p>
            <div className="flex gap-4">
              {/* Github Icon */}
              <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              {/* Twitter Icon */}
              <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 18.43" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">Platform</h3>
                <ul role="list" className="mt-4 space-y-3">
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Browse Projects
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Find Teammates
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Submit Idea
                    </a>
                  </li>
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">Support</h3>
                <ul role="list" className="mt-4 space-y-3">
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Guidelines
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      API Status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-1 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">Legal</h3>
                <ul role="list" className="mt-4 space-y-3">
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom copyright */}
        <div className="mt-12 border-t border-slate-100 pt-8 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} CollabGrad. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
