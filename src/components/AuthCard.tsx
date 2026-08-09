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
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-lg text-white">
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
