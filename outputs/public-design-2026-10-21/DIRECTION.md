# Public design unification — direction contract

Original request: unify all other pages with the current homepage, including pricing and legal documents. Work locally first and provide a report; deployment requires the user's later review. Confirmed scope: public pages and login/registration only, excluding dashboard and admin. Follow-up: pricing must have the same outer width as the homepage.

THESIS: One QR-S public site. A visitor should recognize the homepage's type, blue actions, inset navigation and spacing on every public route.

OWN-WORLD: Preserve the established Manrope/fk identity and the actual homepage as visual authority: white/slate surfaces, blue actions, restrained borders, 8 px controls, broad outer grid. No rebrand, new palette, font or generated imagery. Existing product illustrations remain.

STORY: Pricing supports comparison and choosing an existing plan. Legal pages support reading and section navigation. Blog supports discovery and reading. Generators keep their working forms. Auth keeps its task-focused form and existing product illustration.

FIRST VIEWPORT: Consistent inset header and outer alignment. Pricing has a clear title, unchanged prices/limits and three plan cards with Pro emphasized. Legal text is not trapped in a card; its title, revision and contents establish the reading hierarchy. Mobile sections stack without page overflow.

FORM: User-pinned homepage, existing-world refinement; no concept seed or composition tournament applies. Desktop outer width min(1440px, viewport - 96px), responsive insets 64/48/32px. Remove legacy max-width and double container padding; narrow only the reading column. Use semantic fk tokens, shared public CSS and existing components. Preserve legal text/versions/anchors, metadata, prices, route behavior, auth/CSRF, QR payloads and article content. New preview database qr_design is local and disposable; its nine articles are labeled demonstrations, not production content.

PRODUCT.md: absent. The skill context explicitly permits scoped incumbent refinement without init. Product truth is in src/lib/commercial-config.ts, plans.ts, legal-documents.ts and the existing page source. DESIGN.md is to be documented from the finished implementation.

Visual reference and quality bar: after/home-reference.png. There is no new approved image comp: the user explicitly pinned the existing homepage. Screenshots cover desktop 1440x960 and mobile 390x844; dark theme and interactive checks are also recorded. Detector findings: design-detector.json ([]).
