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
    // Deliberately NOT sticky: pinning this pushed a tall banner over the
    // content on every scroll (and ate most of the fold on a phone). Only the
    // slim Topbar stays pinned; section headers pin inside their own panes.
    <div className="border-b border-line bg-surface px-4 py-4 sm:px-6 sm:py-5">
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
