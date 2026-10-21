---
version: 1
slug: "src-components-cookie-banner-tsx"
primary_target: "src/components/cookie-banner.tsx"
related_targets: ["src/components/cookie-settings-button.tsx","src/components/ui/modal.tsx","src/components/site-footer.tsx"]
---

# Cookie preferences — TZ-11

Scope: incumbent cookie notice, settings dialog and footer entry. **Visitor mode: Operate.** Audience: a public-site visitor deciding whether analytics may run on this device. Job: understand the categories, change analytics, and return to the page. This is a narrow refinement under `SCOPED_EXISTING_ALLOWED`; PRODUCT.md is absent, and no new product claims or visual identity are introduced.

THESIS: Acknowledging the notice and choosing an analytics preference are separate actions.

OWN-WORLD: Preserve DESIGN.md’s Manrope, semantic light/dark colors, shared public outer grid, Button and Modal. No new global tokens, assets or visual world.

STORY: Compact notice → «Настроить» → two categories → «Сохранить» or «Отмена». «Понятно» only acknowledges the notice. The footer’s «Настройки cookie» button opens settings directly.

FIRST VIEWPORT: Keep the underlying page task visible. The fixed bottom notice uses the public container, with copy beside its two actions on desktop and stacked above them on narrow screens. Its measured height adds body bottom clearance. The shared small Modal presents title/subtitle, category rows, policy link and save/cancel footer; its body can scroll inside the bounded dialog.

FORM: Plain semantic surfaces and borders, existing buttons and native checkbox controls exposed as switches. Necessary functions stay visibly checked and disabled; Analytics is editable. Each 24px checkbox sits in a wrapper at least 44px in both dimensions. The remembered moment is the clear difference between the locked necessary category and the optional analytics category.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

## Shipped behavior and system fit

- The notice and dialog both carry the public semantic scope. The shared Modal accepts `className` on its dialog, so public button foregrounds and focus styling retain contrast in either theme. Existing Modal focus trapping, Escape, background inertness, scroll locking and focus return remain authoritative.
- «Настроить» and the footer entry initialize the editable analytics state from the current preference. Saving writes the choice, acknowledges the notice and closes; cancel/close dismisses the dialog without saving its draft. Existing refusals keep analytics off.
- Category labels and descriptions are programmatically associated with their native controls. The required category describes login, session, payment and preference storage; analytics identifies Яндекс Метрика, Вебвизор and partner transition tracking. Browser storage limitations receive an inline status message when applicable.
- The underlined policy link closes settings before navigating to `/privacy-policy#section-4`, preserving page scrolling and background interaction.
- At 375×667, the reviewed settings layout keeps copy and controls reachable; light and dark captures preserve the same hierarchy. Desktop review uses 1440×900. These are reviewed viewport examples, not new system breakpoints.

Evidence: `src/components/cookie-banner.tsx`, `cookie-settings-button.tsx`, `site-footer.tsx`, `ui/modal.tsx`, the cookie-specific rules at the end of `src/app/globals.css`, and existing modal styles in `src/styles/design-system/components/feedback/feedback.css`. Closed independent findings: `outputs/tz11-local/VERDICT.md` (`remaining: clear`). Final evidence: `outputs/tz11-local/desktop-settings-reviewed.png` (1440×900, light), `mobile-settings-reviewed.png` (375×667, light), and `mobile-settings-final.png` (375×667, dark). The reviewed recaptures supersede earlier screenshot names in the direction contract.

Root `DESIGN.md` and `.impeccable/design.json` remain unchanged: this surface reuses their established system. Notice clearance, category layout, checkbox sizing and cookie choice behavior remain local to this brief. No unresolved design decision remains in this scoped refinement.

## TZ11 completion, 2026-10-21

The existing dialog now has a third independent Advertising category for VK. Necessary remains locked, Analytics and Advertising each initialize from persisted settings and only save on Save. The notice names both services. Reused Button, Modal, labels, checkbox sizing and semantic colors; no new design system. Reviewed at 360x800 and 390x844 with the notice over the generator/scanner. The three-row dialog fits the 360px viewport and uses the incumbent scrollable body. Evidence and remaining verification limits: `outputs/tz11-complete/REPORT.md`. Mechanical detector: no findings. Earlier two-category behavior in this brief is superseded by this extension.
