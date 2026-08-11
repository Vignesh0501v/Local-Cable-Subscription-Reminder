export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Cable Subscription Payments</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page is accessed via the personal payment link sent to you by SMS or WhatsApp each
          month. If you're a customer looking to pay, check your messages for that link.
        </p>
      </div>
    </div>
  )
}
