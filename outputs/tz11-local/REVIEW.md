PRODUCT.md, an approved generated comp, and a standalone QUALITY BAR card are absent; the supplied SCOPED_EXISTING_ALLOWED exception and DIRECTION.md explicitly permit this incumbent refinement without them.

## persistence
pass — Existing DESIGN.md describes the Manrope, semantic light/dark surfaces, restrained borders and blue actions visible in the three final captures. DIRECTION.md records the scoped exception, behavior and verification sizes; no new world or seed is required.

## fidelity
| Element | Classification | Evidence |
|---|---|---|
| TYPE | match | Manrope character, compact bold category labels, regular explanatory copy and incumbent modal heading remain consistent with DESIGN.md. |
| MATERIAL | match | Plain white/deep-slate surfaces, restrained dividers and native checkboxes implement the documented incumbent material. |
| Dialog topology | match | Heading and explanation precede Necessary, Analytics, policy link and right-aligned Cancel/Save; desktop and both mobile captures preserve this order. |
| Necessary state | match | Checked, disabled native control and explicit “Всегда включены” text agree. |
| Analytics state | match | Selected blue native control remains distinct from the disabled necessary control in both themes. |
| Responsive form | adaptation | At 375×667 the shared modal narrows and text wraps while all controls fit; this is explicitly required by FIRST VIEWPORT. |
| Notice and footer entry | match, source verified | Настроить/Понятно separate preference from acknowledgment; footer event directly opens settings. The supplied final captures show the dialog rather than the notice. |
| Policy navigation | contradicted | The information link changes the route without closing the persistent root-layout dialog, leaving its destination blurred, inert and scroll locked. |

## ceiling
reached — No additional ornament, material, motion or lettering device is required by the bounded incumbent quality bar. Both mobile themes retain the complete form and footer controls without visible clipping.

## material_fixes
1. [P2] Close the settings dialog when following “Что собирает аналитика” in src/components/cookie-banner.tsx:67: CookieBanner persists in the root layout, so the current Link navigates behind the still-open modal and prevents reading the promised policy information.
2. [P2] Guard document.cookie reads and writes in src/lib/cookie-consent.ts: readCookieChoice accesses it before its try/catch, and saveCookieChoice calls the unguarded syncAnalyticsOptOut before storage persistence/event dispatch; a SecurityError in a restricted cookie context can crash preference rendering or abort saving. Preserve the documented fail-closed/session fallback and verify with throwing cookie getter/setter cases.

## keep
Keep acknowledgment separate from preference, locked necessary functions, optional analytics, old refusals surviving policy revisions, direct footer access, and the existing light/dark modal hierarchy.
