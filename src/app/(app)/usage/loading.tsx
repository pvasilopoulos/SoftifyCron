export default function UsageLoading() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Workspace</p>
        <h1 className="mt-2 font-display text-4xl">Usage</h1>
        <p className="mt-2 text-sm text-ink-dim">How much this tenant is running and storing.</p>
      </div>
      <div className="stat-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <article key={i} className="card p-5">
            <div className="h-3 w-20 rounded bg-bg-mute" />
            <div className="mt-3 h-8 w-16 rounded bg-bg-mute" />
          </article>
        ))}
      </div>
      <section className="card p-5">
        <div className="h-7 w-48 rounded bg-bg-mute" />
        <div className="mt-4 h-32 rounded-2xl bg-bg-mute" />
      </section>
    </div>
  );
}
