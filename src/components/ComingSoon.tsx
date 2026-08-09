import PageHeader from "./PageHeader";

export default function ComingSoon({
  title,
  description,
  planned,
}: {
  title: string;
  description: string;
  planned: string[];
}) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <main className="flex-1 p-6">
        <section className="card border-dashed p-8">
          <p className="text-sm text-muted">
            This section is not built yet. Planned functionality:
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {planned.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">•</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
