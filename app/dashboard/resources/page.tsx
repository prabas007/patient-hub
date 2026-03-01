import Link from "next/link"

const resources = {
  gettingStarted: [
    {
      title: "American Diabetes Association — Newly Diagnosed",
      description: "The go-to starting point: understand your diagnosis, build a care team, and find local support programs.",
      url: "https://diabetes.org/tools-resources",
      badge: "Official",
    },
    {
      title: "CDC — Living with Type 2 Diabetes",
      description: "Plain-language guides on blood sugar monitoring, meal planning, medications, and preventing complications.",
      url: "https://www.cdc.gov/diabetes/index.html",
      badge: "Official",
    },
    {
      title: "Mayo Clinic — Type 2 Diabetes Treatment Guide",
      description: "In-depth overview of treatment options, lifestyle changes, and what to expect at your appointments.",
      url: "https://www.mayoclinic.org/diseases-conditions/type-2-diabetes/diagnosis-treatment/drc-20351199",
      badge: "Medical",
    },
    {
      title: "Beyond Type 2 — Free Beginner's Guide",
      description: "A free downloadable guide specifically for newly diagnosed Type 2 patients, available in English and Spanish.",
      url: "https://beyondtype1.org/",
      badge: "Free Guide",
    },
  ],
  videos: [
    {
      title: "CDC Diabetes Kickstart Video Series",
      description: "7 short animated videos walking you through the essential self-care steps for managing diabetes from day one.",
      url: "https://www.cdc.gov/diabetes/diabetes-tv/diabetes-kickstart.html",
      badge: "Video Series",
    },
    {
      title: "Johns Hopkins — Type 2 Diabetes for Patients",
      description: "Expert endocrinologist-led video series from Johns Hopkins covering diagnosis, insulin, A1C, and preventing complications.",
      url: "https://hopkinsdiabetesinfo.org/videos/",
      badge: "Expert Videos",
    },
    {
      title: "NovoCare Diabetes Education",
      description: "Videos and interactive tools covering blood glucose tracking, carb counting, medications, and nutrition labels.",
      url: "https://diabeteseducation.novocare.com/",
      badge: "Interactive",
    },
  ],
  community: [
    {
      title: "Beyond Type 2 Community",
      description: "A supportive online community to connect with others living with Type 2 diabetes, share experiences, and find encouragement.",
      url: "https://beyondtype1.org/",
      badge: "Community",
    },
    {
      title: "DiaTribe — Making Sense of Diabetes",
      description: "Accessible, science-backed articles on lifestyle, technology, mental health, and the latest in diabetes research.",
      url: "https://diatribe.org/",
      badge: "Publication",
    },
  ],
}

const badgeColors: Record<string, string> = {
  "Official":      "bg-blue-100 text-blue-700",
  "Medical":       "bg-teal-100 text-teal-700",
  "Free Guide":    "bg-green-100 text-green-700",
  "Video Series":  "bg-purple-100 text-purple-700",
  "Expert Videos": "bg-indigo-100 text-indigo-700",
  "Interactive":   "bg-amber-100 text-amber-700",
  "Community":     "bg-rose-100 text-rose-700",
  "Publication":   "bg-stone-100 text-stone-600",
}

function ResourceCard({ title, description, url, badge }: {
  title: string; description: string; url: string; badge: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-4 bg-white border border-stone-200 rounded-xl
                 hover:shadow-md hover:border-stone-300 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold text-sm text-stone-800 group-hover:text-[#5c3d9e] transition-colors leading-snug">
          {title}
        </span>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badgeColors[badge] ?? "bg-stone-100 text-stone-600"}`}>
          {badge}
        </span>
      </div>
      <p className="text-xs text-stone-500 leading-relaxed">{description}</p>
      <span className="text-xs text-[#5c3d9e] mt-auto font-medium group-hover:underline">
        Visit resource →
      </span>
    </a>
  )
}

export default function ResourcesPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900 mb-4">
        Resources
      </h2>

      <p className="text-stone-600 mb-8 max-w-2xl">
        Trusted educational resources and AI-curated treatment guidance.
      </p>

      {/* Guidelines Card */}
      <Link href="/dashboard/resources/guidelines">
        <div className="bg-[#ede8f7] border border-[#c5bde0] rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <h3 className="text-lg font-semibold text-[#3a3030] mb-2">
            Guidelines & Responsible Use
          </h3>
          <p className="text-sm text-[#5c3d9e]">
            Learn how to use LinkCare safely and responsibly.
          </p>
        </div>
      </Link>

      {/* Personalized Resources */}
      <div className="mt-6 space-y-6">

        {/* Context banner */}
        <div className="flex items-center gap-3 bg-[#ede8f7] border border-[#c5bde0] rounded-xl px-4 py-3">
          <span className="text-xl">🩸</span>
          <div>
            <p className="text-sm font-semibold text-[#3a3030]">Type 2 Diabetes · Newly Diagnosed</p>
            <p className="text-xs text-[#5c3d9e]">Resources curated for your condition and stage</p>
          </div>
        </div>

        {/* Getting Started */}
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            Getting Started
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resources.gettingStarted.map((r) => (
              <ResourceCard key={r.url} {...r} />
            ))}
          </div>
        </div>

        {/* Videos */}
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            Videos & Interactive Learning
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resources.videos.map((r) => (
              <ResourceCard key={r.url} {...r} />
            ))}
          </div>
        </div>

        {/* Community & Reading */}
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            Community & Further Reading
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resources.community.map((r) => (
              <ResourceCard key={r.url} {...r} />
            ))}
          </div>
        </div>

        <p className="text-xs text-stone-400 pt-2">
          These resources are for educational purposes only. Always consult your healthcare provider for personalized medical advice.
        </p>
      </div>
    </div>
  )
}
