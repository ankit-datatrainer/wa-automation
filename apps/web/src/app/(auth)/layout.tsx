export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">WA</span>
          WA Automations
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-bold leading-tight">
            Every WhatsApp conversation, automated.
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Broadcast campaigns, build chatbots, run a shared team inbox and track
            every message — on the official WhatsApp Business API.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-primary-foreground/80">
          <li>Official Meta Cloud API — no unofficial workarounds</li>
          <li>Campaigns, chatbots, flows and catalogue in one place</li>
          <li>Live delivery, read and reply analytics</li>
        </ul>
      </div>
    </div>
  );
}
