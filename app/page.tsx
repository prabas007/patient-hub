export default function Onboarding() {
  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-semibold mb-6">
        Onboarding
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-xl">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Condition
          </label>
          <input className="w-full border p-2 rounded" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Stage
          </label>
          <input className="w-full border p-2 rounded" />
        </div>

        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Continue
        </button>
      </div>
    </div>
  )
}