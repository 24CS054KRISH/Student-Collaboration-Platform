export default function Features() {
  const featuresList = [
    {
      title: "Find Teammates",
      description:
        "Filter and discover the perfect partners by skills, major, interests, or project type. Building your dream team is just a few clicks away.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6 text-blue-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 8.625 21c-1.89 0-3.675-.462-5.25-1.285v-.109A12.18 12.18 0 0 1 8.625 18c1.638 0 3.195.321 4.62.902m0-3.07a8.514 8.514 0 0 0-4.62-1.332c-1.89 0-3.675.462-5.25 1.285m12.929-1.285A9.094 9.094 0 0 0 18 11.25c0-1.24-.25-2.41-.697-3.484M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
          />
        </svg>
      ),
    },
    {
      title: "Create Projects",
      description:
        "Post your ideas, set guidelines, specify exact skill sets needed, and manage incoming applications. Keep your project organized from day one.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6 text-blue-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      title: "AI Recommendations",
      description:
        "Our intelligent system analyses your profile, skills, and interests to suggest the most matching projects and teammates automatically.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6 text-blue-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 21l3.75-2.25L16.5 21l-.813-5.096L20 12.75l-5.11-.742L12 7.5 9.11 12.008 4 12.75l4.187 3.154zM12 2v2.25M12 19.75V22M22 12h-2.25M4.25 12H2M19.07 4.93l-1.59 1.59M6.52 17.48l-1.59 1.59M19.07 19.07l-1.59-1.59M6.52 6.52L4.93 4.93"
          />
        </svg>
      ),
    },
    {
      title: "Team Collaboration",
      description:
        "Engage with your team through dedicated group chat, task management boards, and updates to keep everyone aligned and productive.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6 text-blue-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 8.511c.084.29.125.597.125.904 0 2.224-2.14 4.027-4.78 4.027a5.19 5.19 0 0 1-2.02-.408 5.61 5.61 0 0 1-1.074.821 5.198 5.198 0 0 1-2.234.619 5.25 5.25 0 0 1-.774-.058 5.483 5.483 0 0 0 2.127-1.777c.452-.647.746-1.391.868-2.169A5.875 5.875 0 0 0 15.6 9.415c0-2.224-2.14-4.027-4.78-4.027a5.18 5.18 0 0 0-3.327 1.2A5.845 5.845 0 0 0 4.125 9.415c0 .307.041.614.125.904A4.027 4.027 0 0 1 2 13.43c0 2.225 2.14 4.027 4.78 4.027a5.19 5.19 0 0 0 2.02-.408 5.61 5.61 0 0 0 1.074.821 5.198 5.198 0 0 0 2.234.619c.26 0 .52-.02.774-.058a5.483 5.483 0 0 1-2.127-1.777 5.26 5.26 0 0 1-.868-2.169 5.875 5.875 0 0 1-2.907-1.042c0 2.224 2.14 4.027 4.78 4.027a5.18 5.18 0 0 0 3.327-1.2 5.845 5.845 0 0 0 3.368-2.813Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold uppercase tracking-wider text-blue-600">
            Everything you need
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Streamlined Collaboration for Students
          </p>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            A comprehensive suite of tools built specifically to bridge the gap
            between project ideas and execution.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
            {featuresList.map((feature, index) => (
              <div
                key={index}
                className="group relative flex flex-col rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5"
              >
                {/* Icon Wrapper */}
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 transition-colors duration-300 group-hover:bg-blue-600/10">
                  {feature.icon}
                </div>
                
                {/* Feature Title */}
                <dt className="text-lg font-bold leading-7 text-slate-900 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </dt>
                
                {/* Feature Description */}
                <dd className="mt-2 flex flex-auto flex-col text-sm leading-relaxed text-slate-500 font-normal">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
