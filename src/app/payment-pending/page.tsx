export default function PaymentPendingPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">

        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          <span className="text-3xl">⏳</span>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          Fitwish
        </p>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Payment Renewal Required
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/60 sm:text-base">
          Access to Fitwish is temporarily unavailable because the service
          renewal payment is currently pending.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">
              Service status
            </span>

            <span className="text-sm font-medium text-amber-400">
              Payment Pending
            </span>
          </div>

          <div className="my-4 h-px bg-white/10" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">
              Application access
            </span>

            <span className="text-sm font-medium text-red-400">
              Temporarily Blocked
            </span>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <p className="text-sm leading-6 text-white/60">
            Please renew the pending service payment to restore access to
            your Fitwish application.
          </p>
        </div>

        <p className="mt-8 text-xs text-white/30">
          Access will be restored once the renewal payment has been completed.
        </p>

      </div>
    </main>
  );
}