function HeroQrPreview() {
  const cell = 8;
  const size = 21;
  const modules = Array.from({ length: size * size }, (_, index) => {
    const x = index % size;
    const y = Math.floor(index / size);
    const inFinder =
      (x < 7 && y < 7) ||
      (x >= size - 7 && y < 7) ||
      (x < 7 && y >= size - 7);

    if (inFinder) return null;

    const filled =
      (x * y + x + y) % 3 === 0 ||
      (x + y * 2) % 5 === 0 ||
      ((x >> 1) + y) % 4 === 0;

    return filled ? { x, y } : null;
  }).filter(Boolean) as Array<{ x: number; y: number }>;

  function Finder({ x, y }: { x: number; y: number }) {
    return (
      <g transform={`translate(${x * cell} ${y * cell})`}>
        <rect width={7 * cell} height={7 * cell} rx="10" fill="#131720" />
        <rect x={cell} y={cell} width={5 * cell} height={5 * cell} rx="7" fill="#fff" />
        <rect x={2 * cell} y={2 * cell} width={3 * cell} height={3 * cell} rx="4" fill="#131720" />
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${size * cell} ${size * cell}`} width="100%" height="100%" aria-hidden="true">
      <rect width={size * cell} height={size * cell} fill="#fff" />
      <Finder x={0} y={0} />
      <Finder x={size - 7} y={0} />
      <Finder x={0} y={size - 7} />
      {modules.map(({ x, y }, i) => (
        <rect key={i} x={x * cell} y={y * cell} width={cell * 0.86} height={cell * 0.86} rx="1.5" fill="#131720" />
      ))}
    </svg>
  );
}

export function HomeHeroVisual() {
  return (
    <div className="qrs-hero-visual">
      <div style={{ position: "relative", width: "min(100%, 420px)" }}>
        <div
          className="absolute -top-[8%] -right-[6%] w-[62%] h-[62%] z-0 blur-lg"
          style={{
            background: "radial-gradient(circle at 60% 40%, color-mix(in srgb, var(--color-accent) 22%, transparent), transparent 70%)",
          }}
        />
        <div
          className="relative z-[1] p-[26px]"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          <div className="flex items-center justify-between mb-[18px]">
            <div>
              <div style={{ font: "var(--fw-bold) 15px/1.2 var(--font-display)", color: "var(--text-strong)" }}>
                Меню ресторана
              </div>
              <div style={{ font: "var(--fw-medium) 12px/1.2 var(--font-sans)", color: "var(--text-muted)", marginTop: "3px" }}>
                Динамический · активен
              </div>
            </div>
            <span
              className="fk-badge fk-badge--success fk-badge--lg"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span className="fk-badge__dot" />
              Online
            </span>
          </div>
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--neutral-100)", padding: "18px" }}>
            <HeroQrPreview />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-[18px]">
            <div style={{ background: "var(--surface-subtle)", borderRadius: "10px", padding: "12px 14px" }}>
              <div className="tnum" style={{ font: "var(--fw-extra) 22px/1 var(--font-display)", color: "var(--text-strong)" }}>
                1 248
              </div>
              <div style={{ font: "var(--fw-medium) 11px/1.2 var(--font-sans)", color: "var(--text-muted)", marginTop: "4px" }}>
                сканирований
              </div>
            </div>
            <div style={{ background: "var(--surface-subtle)", borderRadius: "10px", padding: "12px 14px" }}>
              <div className="tnum" style={{ font: "var(--fw-extra) 22px/1 var(--font-display)", color: "var(--color-success)" }}>
                +34%
              </div>
              <div style={{ font: "var(--fw-medium) 11px/1.2 var(--font-sans)", color: "var(--text-muted)", marginTop: "4px" }}>
                за неделю
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
