export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          Use the link sent to you by SMS or WhatsApp to view your subscription.
        </p>
      </div>
    </div>
  )
}
