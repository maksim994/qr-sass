"use client";

import { Button } from "@/components/ui/button";

/** UI-only newsletter block — no backend collection (future stage). */
export function NewsletterBlock() {
  return (
    <section style={{ paddingBottom: "var(--section-y)" }}>
      <div className="fk-container">
        <div
          className="qrs-news-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: "32px",
            alignItems: "center",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "clamp(28px, 4vw, 48px)",
          }}
        >
          <div>
            <h2 style={{ font: "var(--fw-bold) clamp(1.4rem, 3vw, 1.9rem)/1.2 var(--font-display)", letterSpacing: "-0.02em", color: "var(--text-strong)" }}>
              Дайджест раз в месяц
            </h2>
            <p style={{ marginTop: "12px", maxWidth: "44ch", font: "var(--fw-regular) 1rem/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
              Новые гайды и кейсы по QR-маркетингу — без спама, только по делу. Отписаться можно в один клик.
            </p>
          </div>
          <form
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
            onSubmit={(e) => e.preventDefault()}
            aria-label="Подписка на дайджест (скоро)"
          >
            <input
              type="email"
              name="email"
              placeholder="email@example.com"
              disabled
              aria-disabled="true"
              title="Подписка скоро будет доступна"
              style={{
                flex: 1,
                minWidth: "180px",
                height: "48px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-default)",
                background: "var(--surface-card)",
                color: "var(--text-subtle)",
                font: "var(--fw-regular) 15px/1 var(--font-sans)",
                opacity: 0.7,
              }}
            />
            <Button type="button" variant="accent" size="md" disabled title="Подписка скоро будет доступна">
              Подписаться
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
