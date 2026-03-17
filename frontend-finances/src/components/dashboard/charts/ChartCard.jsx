const ChartCard = ({ eyebrow, title, meta, children }) => (
  <section className="app-panel">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="app-eyebrow">{eyebrow}</p>
        <h3 className="font-serif text-xl font-semibold text-[var(--color-ink-strong)]">
          {title}
        </h3>
      </div>
      {meta ? (
        <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-2 text-sm text-[var(--color-muted)]">
          {meta}
        </span>
      ) : null}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

export default ChartCard;
