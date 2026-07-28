import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingTitle,
} from "./hosted-landing-shell";

type MenuItem = { name?: string; description?: string; price?: string | number };
type Category = { name?: string; items?: MenuItem[] };

type Props = { payload: Record<string, unknown> };

export function MenuLanding({ payload }: Props) {
  const title = (payload.title as string) || "Меню";
  const categories = (payload.categories as Category[] | undefined) ?? [];

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <HostedLandingTitle>{title}</HostedLandingTitle>

        {categories.length === 0 ? (
          <HostedLandingEmpty>Меню пока пусто</HostedLandingEmpty>
        ) : (
          <div className="qrs-hosted-menu">
            {categories.map((cat, ci) => (
              <section key={ci} className="qrs-hosted-menu__section">
                {cat.name ? <h2 className="qrs-hosted-menu__category">{cat.name}</h2> : null}

                <ul className="qrs-hosted-menu__list">
                  {(cat.items ?? []).map((item, ii) => (
                    <li key={ii} className="qrs-hosted-menu__item">
                      <div className="qrs-hosted-menu__item-main">
                        <p className="qrs-hosted-menu__item-name">{item.name}</p>
                        {item.description ? (
                          <p className="qrs-hosted-menu__item-desc">{item.description}</p>
                        ) : null}
                      </div>
                      {item.price != null ? (
                        <span className="qrs-hosted-menu__price">{item.price}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
