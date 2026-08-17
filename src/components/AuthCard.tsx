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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      {/* Soft brand-colored glow on the light page background — replaces the
          previous near-black rail backdrop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50rem 34rem at 12% -8%, rgba(138,144,112,0.22), transparent 60%), radial-gradient(42rem 30rem at 108% 108%, rgba(109,115,86,0.16), transparent 60%)",
        }}
      />

      <div className="animate-pop-in relative w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-[var(--shadow-xl)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-lg text-white shadow-lg shadow-primary/20">
            ✦
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">Template</p>
            <p className="text-[11px] tracking-widest text-primary-dark">
              SALON &amp; SPA
            </p>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mb-6 text-sm text-muted">{subtitle}</p>

        {children}

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  );
}
