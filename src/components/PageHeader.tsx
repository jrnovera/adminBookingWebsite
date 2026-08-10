export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sticky top-14 z-20 border-b border-line bg-surface/85 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {/* Actions scroll horizontally on narrow screens instead of wrapping
            into a tall stack that pushes content off the fold. */}
        {action && (
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
