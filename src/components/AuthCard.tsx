export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-rail px-4">
      {/* Ambient glow, echoes the rail's premium dark surfaces elsewhere. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, rgba(138,144,112,0.25), transparent 60%), radial-gradient(50rem 34rem at 110% 110%, rgba(109,115,86,0.2), transparent 60%)",
        }}
      />

      <div className="animate-pop-in relative w-full max-w-sm rounded-3xl border border-white/10 bg-surface p-8 shadow-[var(--shadow-xl)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-lg text-white shadow-lg shadow-primary/20">
            ✦
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Artisan</p>
            <p className="text-[11px] tracking-widest text-primary-light">
              SALON &amp; SPA
            </p>
          </div>
        </div>

        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-muted">{subtitle}</p>

        {children}

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  );
}
