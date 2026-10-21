---
version: 1
slug: "src-app-qr-s-logotipom-page-tsx"
primary_target: "src/app/qr-s-logotipom/page.tsx"
related_targets: ["src/components/landing/logo-qr-generator.tsx"]
---

# QR with logo — TZ-10 item 2.2

Scope: local new public landing /qr-s-logotipom, inheriting the homepage and /qr-wifi family. The same turn also applies the user's supplied final scanner copy and exact Description; scanner behavior is unchanged. No deployment or production mutation.

THESIS: Let the visitor put their own logo in a working QR and download it without an account.

OWN-WORLD: DESIGN.md's Manrope, shared wide inset grid, blue actions, white/slate surfaces and flat bordered controls. No new imagery or visual identity.

STORY: Enter a URL, load a local logo, inspect the result, download PNG/SVG and test before printing. H is automatic, not an optional promise of perfect readability.

FIRST VIEWPORT: Shared navigation, breadcrumb, title/description, generator. URL and logo fields left, actual QR preview and export right; narrow screens stack the task. Supporting guide, print advice and FAQ follow the working tool.

FORM: Precisely scoped extension of the user-pinned public template. No concept tournament, generated mock or identity approval needed. Semantic controls plus the real QR renderer provide all visible assets; test logos are explicitly demonstrations.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

Inventory: shared header/footer, public heading, URL validation, upload/replace/remove with filename and thumbnail, H warning, optional colors/contrast guard, labeled example before input, working preview, PNG/SVG/loading/error/success states, no authentication gate, 3 steps, print guidance, 5 FAQ and matching schema, sitemap/canonical/footer link. Existing exported QR and global style defaults are preserved.

PRODUCT.md absent; the supplied TZ, DESIGN.md and incumbent generator establish product facts for this scoped extension. Final landing wording remains reviewable starter copy under TZ's editorial division. Scanner text is separately user-approved final copy, with 11 FAQ and the unchanged title from TZ. User reports scan_success goal already exists (673232137); no goal creation is required.

## System fit — completed implementation

This is an ordinary extension of the existing public design system. Root `DESIGN.md` and `.impeccable/design.json` remain unchanged; the finished route introduces no global tokens or new visual identity.

- **Incumbent shell:** the route uses the shared public wrapper, inset header/footer, breadcrumb and page heading. The main content inherits the homepage outer width and responsive side insets rather than defining another page-wide container.
- **Type and palette:** Manrope and the existing semantic text, link, surface, border and status roles remain authoritative. Strong page and section headings lead into relaxed reading copy; supporting content keeps a narrower inner measure without narrowing the generator's outer grid.
- **Task surface:** a flat, thin-bordered generator panel pairs URL/logo controls with the actual QR preview and PNG/SVG actions. Existing primary and secondary buttons, inputs and native disclosures provide the control language. The panel's local column proportions, padding and mobile stacking serve this tool rather than creating a new reusable system pattern.
- **Responsive behavior:** desktop places inputs beside the preview/export column; below the local tool breakpoint the columns stack. Upload, replace/remove controls, filenames and thumbnails can wrap. The QR preview remains square on a white canvas to preserve its artwork and scan contrast across site themes; that white canvas is QR content, not a replacement theme surface.
- **States and feedback:** URL feedback stays by the URL field. Upload errors are inline in the logo field, with an alert and an accessible description on its controls, so mobile users encounter the error at the action that caused it. Rendering/download errors remain with the output; processing, disabled exports and successful download feedback use the existing semantic treatment. Uploaded artwork and the preview retain their private-content markers.
- **Reading continuation:** the working tool precedes the three-step guide, print cautions, five native FAQ disclosures and related generators. Supporting links and generous section spacing continue the existing public reading language. The scanner's separately approved copy is content for its established surface, not a change to global visual rules.

Evidence: `src/app/qr-s-logotipom/page.tsx`, its `logo-page.module.css`, `src/components/landing/logo-qr-generator.tsx` and `logo-qr-generator.module.css`; final desktop/mobile captures in `outputs/tz10-logo/desktop-logo-final.png` and `mobile-top-final.png`. The finish reviewer closed the upload-error correction as resolved, as recorded in the parent handoff.

Deliberately local: QR rendering/preview dimensions, image normalization and logo limits, the generator's local breakpoint and column ratio, local title/font adjustments and safety copy. These are tool-specific implementation or editorial decisions, not additional global design tokens. No unresolved system-level design decision was identified in this scoped extension; deployment remains outside this local task.
