export default function GuidelinesPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900 mb-6">
        LINK-CARE Usage Guidelines
      </h2>

      <div className="space-y-6 text-stone-700 max-w-3xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            ⚠ Important Notice
          </h3>
          <p className="text-red-700 font-medium">
            LINK-CARE is NOT a medical provider and MUST NOT be used to
            diagnose, treat, or replace professional medical advice under
            any circumstance.
          </p>
        </div>

        <p>
          LINK-CARE provides AI-generated summaries, community discussions,
          and informational insights based on patient experiences. These
          insights are for educational and support purposes only.
        </p>

        <p>
          You should always consult a licensed healthcare professional
          for medical decisions, diagnosis, or treatment planning.
        </p>

        <p>
          The Care Circle community is a peer-support environment.
          Advice shared by other users may reflect personal experience
          and should not be interpreted as professional medical guidance.
        </p>

        <p>
          If you are experiencing a medical emergency, contact emergency
          services immediately.
        </p>
      </div>
    </div>
  )
}