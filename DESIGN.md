---
name: "QR-S public site"
description: "The homepage's Manrope, blue actions and broad inset grid across the public site."
colors:
  primary: "#1E4FD1"
  primary-hover: "#1840AB"
  primary-subtle: "#EDF2FE"
  on-primary: "#FFFFFF"
  page: "#FFFFFF"
  subtle: "#F5F7FA"
  ink: "#131720"
  text: "#222834"
  muted: "#6B7689"
  border: "#DEE3EB"
  border-subtle: "#ECEFF4"
  focus: "#2F5FE6"
typography:
  headline:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(34px, 4vw, 56px)"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.5vw, 50px)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  reading:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  xs: "4px"
  md: "8px"
  lg: "12px"
  panel: "14px"
  xl: "16px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  plan-card:
    backgroundColor: "{colors.page}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
---

# Design System: QR-S public site

## Overview

**Creative North Star: "One QR-S public site"**

The existing homepage is the visual authority. Its broad inset grid, Manrope typography, blue actions and white/slate surfaces carry through pricing, marketing pages, generators, blog, legal documents and authentication. This is a refinement of the established identity, rather than a new brand direction.

Public screens feel open and practical. Borders and muted surfaces organize information; existing QR and print illustrations explain the product. Reading columns and forms keep their own comfortable measure inside the shared outer grid. Dashboard, administration and user-authored hosted QR designs are outside this document's scope.

**Key Characteristics:**
- A single outer grid with responsive side insets.
- Manrope throughout, with compact labels and strong balanced headings.
- Blue actions and selection states over semantic white/slate surfaces.
- Flat interface panels with restrained borders and visible keyboard focus.
- Existing product illustrations, readable documents and task-focused forms.

## Colors

The public palette pairs clear action blue with cool neutrals; color communicates action, selection and state.

### Primary
- **Action Blue** (`primary`, `primary-hover`): links and primary actions; public accent actions resolve to the same blue family.
- **Blue Tint** (`primary-subtle`): selected navigation, supporting panels and pricing emphasis.
- **On Blue** (`on-primary`): primary action foreground.

### Neutral
- **Page White** (`page`): open page and card surfaces in the default theme.
- **Cool Slate Wash** (`subtle`): footer, supporting sections and table headings.
- **Strong Ink** (`ink`): headings and important labels.
- **Body Slate** (`text`): standard copy.
- **Muted Slate** (`muted`): descriptions, metadata and secondary navigation.
- **Quiet Borders** (`border`, `border-subtle`): card outlines and content dividers.
- **Focus Blue** (`focus`): keyboard and input focus.

The frontmatter records the default light theme. Runtime semantic properties in `colors.css` own theme changes: the dark theme uses deep slate surfaces, pale text and lighter blue links. Components consume semantic properties rather than copying light literals into page modules. Status colors remain semantic success, warning and danger roles; they are not extra marketing accents.

**The One Action Family Rule.** Public primary and accent actions use the established blue family; reserve status colors for their actual meaning.

## Typography

**Display Font:** Manrope with the system fallback stack.
**Body Font:** Manrope with the same fallback stack.

**Character:** One family gives the site a coherent voice. Heavy, tightly tracked headings contrast with regular body text and compact functional labels; numeric comparisons use tabular figures where alignment matters.

### Hierarchy
- **Headline:** the fluid public page title in the frontmatter; balanced wrapping and a bounded measure. Mobile title adjustments remain local to their page role.
- **Section:** the homepage's fluid section heading, with responsive variants for denser secondary sections.
- **Body:** the default text role; marketing descriptions commonly use a more relaxed line height.
- **Reading:** long legal and article text, with more generous leading and underlined inline links. At the smallest breakpoint, reading copy becomes 15px with 1.8 leading.
- **Label:** the base field-label role; header navigation, metadata and compact controls use smaller contextual sizes.

**The One Family Rule.** Keep public headings, controls and prose in Manrope; introduce hierarchy through size, weight, measure and spacing.

## Layout

The shared outer width is `min(1440px, viewport width minus the responsive inset)`. The inset is the total space removed from the viewport, split evenly between both sides: 96px by default, 64px at widths up to 1100px, 48px up to 800px and 32px up to 560px. The shared container has zero additional horizontal padding. At a 1440px viewport its width is 1344px with 48px on each side; at 390px it is 358px with 16px on each side.

The inset header, page title and broad content sections align to this grid. Header controls have their own internal padding. Legal pages place contents beside a reading column capped at 72ch, with the main column capped at 760px; contents become a native disclosure below 800px. Authentication uses the same outer grid with a centered form capped at 400–420px and a supporting illustration on larger screens. Compact utility/status screens retain a centered task measure. These internal measures do not redefine the site's outer width.

Spacing follows the existing four-pixel base scale. Use open sections and purposeful grid gaps, then reduce density and stack columns at the established breakpoints. Pricing cards stack below 800px; comparison tables scroll within their own region rather than expanding the page. Preserve sticky-header clearance for anchor targets (112px in the shared public layer).

**The One Outer Grid Rule.** Derive public width and side insets from the shared public properties. Do not add a second container max-width or horizontal padding that narrows an entire public page.

## Elevation & Depth

Public interface surfaces are flat at rest. Borders, blue tint and alternating slate surfaces provide hierarchy; cards and buttons do not need a floating shadow to communicate interaction. Product illustrations retain their own physical shadows and rotations where those describe printed material. That illustration treatment is not an interface-card style.

Focus remains explicit: inputs use the existing soft focus ring, while public links, buttons and disclosure controls receive a visible outline with an offset. State transitions are brief color or border changes. The shared public layer disables animation, transitions and smooth scrolling for reduced-motion preference.

**The Flat Interface Rule.** Use tonal layering and restrained borders for public interface panels; keep physical depth within the existing product artwork.

## Shapes

Controls use gently curved corners (`md`). Larger panels and cards use the established `lg`, `panel` and `xl` family; the inset desktop header and plan cards share the `panel` radius. The mobile header tightens to `lg`. Borders are generally thin and cool-toned. Badges, circular indicators and QR artwork keep their native geometry rather than inheriting a blanket radius rule.

## Components

### Buttons

Clear, stable actions. Primary uses Action Blue and its semantic foreground; secondary uses a card surface and stronger border; ghost uses blue text with a tinted hover surface. Standard height is 44px, with compact header and larger form variants. Public controls use the shared control radius, medium-heavy weight and visible focus. Disabled states reduce opacity and remove motion. Allow text to wrap when constrained instead of clipping a mobile CTA.

### Inputs / Fields

Plain card surfaces with a thin neutral border, strong text and muted placeholders. Hover strengthens the border; focus uses Focus Blue and the existing ring. Labels stay outside the control, with hints and actual validation messages below. Authentication preserves its 47px control variant and readable mobile input text.

### Navigation

A bordered inset island, rather than an edge-to-edge navigation strip. Desktop navigation is centered between the logo and account actions. Current routes use a blue tint and blue text. At 1100px the navigation and actions collapse into the mobile menu; the theme control remains available. Keep keyboard focus and the existing Escape/focus-return behavior.

### Chips / Categories

Compact, softly rounded selection controls. Unselected options use neutral surfaces and text; selected options use blue tint and blue text. Keep the current selection meaningful with accessible state, rather than relying on color alone.

### Cards / Containers

Use thin neutral borders and the established panel radius. Pricing offers align as equal columns, with content and CTAs arranged consistently; a blue-tinted panel highlights Pro. Blog cards change border color on hover without lifting. Legal prose stays in an open reading column instead of a decorative enclosing card.

### Disclosures / Contents

Native disclosures organize FAQs and mobile contents. Rows use quiet dividing rules, a clear summary and visible focus. FAQ plus indicators rotate when open; legal contents preserve their anchor targets and sticky-header clearance.

## Do's and Don'ts

### Do:
- **Do** align public headers, titles and broad content to the shared outer grid.
- **Do** keep readable inner measures for prose and forms within that grid.
- **Do** use semantic colors so light and dark themes retain the same hierarchy.
- **Do** preserve visible focus, native disclosure behavior and reduced-motion support.
- **Do** keep embedded titles and QR details in article artwork visible at mobile sizes.

### Don't:
- **Don't** add a second page-wide max-width or double horizontal padding inside the public container.
- **Don't** introduce a separate font, action palette or legacy header treatment for an individual public route.
- **Don't** transfer physical illustration shadows and rotations to ordinary interface cards.
- **Don't** crop meaningful text or QR details merely to fill an image frame.
- **Don't** extend these public-only rules into dashboard, administration or customer-authored QR layouts without reviewing those surfaces.
