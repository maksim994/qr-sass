---
version: 1
slug: "src-app-skaner-qr-koda-page-tsx"
primary_target: "src/app/skaner-qr-koda/page.tsx"
related_targets: ["src/components/qr-scanner/qr-scanner.tsx"]
---

# QR scanner — implementation contract

Scope: TZ-10 item 2.1, Operate with supporting Read sections. Local delivery, no deployment. Stage 1 has already shipped. Subsequent items remain in the staged queue in docs/TZ-10.md.

THESIS: Inspect a QR before following it. A working browser tool is the first action.

OWN-WORLD: Inherit DESIGN.md, the homepage and the /qr-wifi family. Manrope, blue controls, white/slate semantic surfaces and the shared public outer grid. No new identity or imagery.

STORY: Pick camera or photo, read the result, explicitly copy or open it. Wi-Fi and vCard become readable fields. Camera and image data stay on the device; the result never becomes an automatic request.

FIRST VIEWPORT: Shared header, breadcrumb, H1 and one-line description; Camera / Photo tabs; one working panel; three requested assurance labels. No prices, banners or custom popups inside the tool.

FORM: Precisely specified extension of the existing public template. User supplied the composition and tool states, so no identity/concept tournament or image comp is needed. DOM controls, CSS and a real camera preview carry the interface. No raster asset production required.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

DESIGN.md already records the incumbent system; this extension does not replace it. PRODUCT.md is absent; the supplied TZ and existing implementation establish the task facts. Editorial copy is a reviewable starter, as requested. No external drafts, channel admins or SEO specialists are messaged by this task.

Inventory: shared header/footer; 34–56px public title; two keyboard tabs; camera permission/connecting/live/error/stopped states; photo select/drop/paste/processing/error; result with large actual hostname, raw text, copy/open/reset controls, Wi-Fi/vCard fields; four supporting reading sections and eleven matching FAQ entries/schema items. New global rules are unnecessary.

Primary implementation references: jsQR README https://github.com/cozmo/jsQR; MDN getUserMedia https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia; MDN BarcodeDetector https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector. BarcodeDetector is optional; bundled jsQR is the cross-browser fallback.

## System fit

The implemented scanner inherits the shared public container, header, footer, page heading, Manrope family and semantic blue/slate palette. Its flat camera and photo panels use the established panel radius and neutral border; shared buttons and inputs retain their existing focus and theme behavior. Camera/photo tabs expose keyboard selection, decoding states remain in the working panel, and the result requires an explicit copy or open action. Supporting prose keeps a readable inner measure, while mobile fields and actions reflow within the common outer grid. These are scanner-specific behaviors, not new global visual rules: `DESIGN.md` and `.impeccable/design.json` remain unchanged. The scanner's viewfinder dimensions, local type sizes and device-preview treatment are intentionally not promoted to design-system tokens.
