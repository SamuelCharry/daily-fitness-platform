---
name: Cool for the Summer
description: A warm personal training journal with spreadsheet comfort.
colors:
  bg: "#f7f5f1"
  bg-alt: "#fffefa"
  bg-raised: "#efede8"
  border: "#e4dfd6"
  border2: "#cfc7bc"
  input-bg: "#fffefa"
  text: "#302c28"
  text-strong: "#26221f"
  text-body: "#454039"
  text-muted: "#696259"
  text-dim: "#736b61"
  text-faint: "#736b61"
  accent: "#b6382b"
  accent-hover: "#96291e"
  accent-text: "#fffefa"
  accent-soft: "#f7e7e0"
  danger: "#a52a22"
  nav-inactive: "#696259"
  hover-bg: "#efece5"
  chart-muted: "#aaa095"
  success: "#27654b"
  dark-bg: "#292521"
  dark-bg-alt: "#322d28"
  dark-bg-raised: "#3b352e"
  dark-border: "#50483f"
  dark-border2: "#776a5b"
  dark-input-bg: "#322d28"
  dark-text: "#f4eee3"
  dark-text-strong: "#fff7ec"
  dark-text-body: "#e4d9ca"
  dark-text-muted: "#c8bba8"
  dark-text-dim: "#b9ab97"
  dark-text-faint: "#b9ab97"
  dark-accent: "#f3947f"
  dark-accent-hover: "#ffb19e"
  dark-accent-text: "#32241f"
  dark-accent-soft: "#50372e"
  dark-danger: "#ffab96"
  dark-nav-inactive: "#c8bba8"
  dark-hover-bg: "#433b33"
  dark-chart-muted: "#af9d87"
  dark-success: "#9fc9a8"
typography:
  display:
    fontFamily: "Inter Tight, sans-serif"
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Inter Tight, sans-serif"
    fontSize: "24px"
    fontWeight: 600
  title:
    fontFamily: "Inter Tight, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-.015em"
  metric:
    fontFamily: "Inter Tight, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
  button:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
  table:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
rounded:
  segmented-option: "4px"
  tag: "5px"
  chip: "6px"
  input: "7px"
  control: "8px"
  sheet: "10px"
  panel: "12px"
spacing:
  compact: "8px"
  control: "12px"
  inner: "16px"
  mobile-panel: "18px"
  form: "20px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-text}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-ghost-hover:
    backgroundColor: "{colors.hover-bg}"
    textColor: "{colors.text-strong}"
  input:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.input}"
    padding: "11px 12px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.chip}"
    padding: "6px 12px"
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
  panel:
    backgroundColor: "{colors.bg-alt}"
    rounded: "{rounded.panel}"
    padding: "24px"
  navigation:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "12px"
  navigation-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  sheet-cell:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.table}"
    padding: "14px 12px"
    width: "102px"
  exercise-tab:
    backgroundColor: "{colors.bg-alt}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  exercise-tab-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  rest-bar:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
---

# Design System: Cool for the Summer

## Overview

**Creative North Star: "The Personal Training Journal"**

Warm paper, compact controls and clear numbers give the athlete a practical place to work each day. The user-confirmed direction is spreadsheet comfort, red without black, and a session flow inspired by MacroFactor Workouts. The built interface expresses this through direct cell editing, quiet navigation and explicit set confirmation.

The default theme is light. An optional warm brown dark theme preserves the same semantic roles and geometry; system mode follows the operating system. Personal utility governs the visual density: table rows and exercise targets stay compact while headings and section gaps make the working hierarchy clear.

**Key Characteristics:**

- Warm surfaces and brick-red actions.
- Flat containers and visible table dividers.
- Inter Tight headings, Inter controls and tabular numbers.
- Explicit selection, focus and save states.

Source evidence: `frontend/src/index.css`, `frontend/index.html`, `frontend/src/components/Layout.tsx`, `frontend/src/pages/DailyLog.tsx`, `frontend/src/pages/Session.tsx`, `frontend/src/theme/ThemeContext.tsx` and `frontend/src/hooks/useIsMobile.ts`. Product authority: `PRODUCT.md` and `.impeccable/direction.md`.

## Colors

Warm white and warm ink carry the working surface; red identifies actions and selected contexts.

### Primary

- **Brick red** (`accent`): primary actions, links, chart trend, selected navigation text and caret.
- **Deep brick** (`accent-hover`): primary-button hover.
- **Blush paper** (`accent-soft`): selected navigation, training container, completed sets and focused journal cells.
- **Action paper** (`accent-text`): text on filled red controls.

### Neutral

- **Warm paper** (`bg`): page canvas, empty-chart well and table headings.
- **Cream paper** (`bg-alt`, `input-bg`): sidebar, panels and fields.
- **Pressed paper** (`bg-raised`): segmented-control track and sticky journal headings.
- **Soft divider / firm divider** (`border`, `border2`): table and container borders / input and outlined-button borders.
- **Warm ink / strong ink / body ink** (`text`, `text-strong`, `text-body`): default content / headings / descriptive training copy.
- **Muted ink / dim ink** (`text-muted`, `text-dim`, `text-faint`, `nav-inactive`): supporting text, placeholders and secondary navigation.
- **Hover paper / chart taupe** (`hover-bg`, `chart-muted`): hover surfaces / secondary chart line.
- **Error brick / success green** (`danger`, `success`): error feedback / personal-space status dot. These are semantic status colors, not additional brand accents.

The `dark-` entries are exact alternate-theme values for the corresponding CSS variables. Dark mode uses brown surfaces and salmon actions. Theme selection is stored under `df_theme`; absence of a saved preference defaults to light. System mode removes `data-theme` and enables the CSS dark preference query.

**The Warm Surface Rule.** Use the existing warm semantic surfaces and red action roles; preserve the confirmed red-without-black identity.

## Typography

**Display Font:** Inter Tight, with sans-serif fallback.
**Body Font:** Inter, with system-ui and sans-serif fallbacks.

The pairing is compact and functional. Display lettering is moderately tight, while body and control lettering stays untracked. Fonts load in `frontend/index.html`; Inter weights 400/500/600 and Inter Tight weights 500/600/700 are supplied.

### Hierarchy

- **Display:** responsive page heading, weight 600, line-height 1.15; no oversized marketing display.
- **Headline:** exercise/training heading, weight 600; program-day headings reduce to 18px.
- **Title:** section heading, weight 600; reduces to 18px at the mobile breakpoint.
- **Metric:** summary value and compact page-title variant; summary values reduce to 25px at 1150px and become 27px at 760px.
- **Body:** paragraphs use line-height 1.65; page descriptions are 13px, reducing to 12px on mobile. The global body does not set an explicit font size.
- **Label:** supporting labels use 11px; table headings and chart metadata often use 10px. Small metadata remains supporting content, not the primary reading layer.
- **Controls and data:** buttons use the button role; journal cells and read tables use the table role. Workout set values use 14px, with input text reducing to 13px on mobile.

**The Stable Numbers Rule.** Use tabular numerals for measurements, tables, summaries, set history and timer digits so changing values do not shift their columns.

## Layout

The desktop shell has a sticky full-height sidebar (232px), with a flexible workspace. Main content and footer cap at 1400px. Main padding is 38px 40px 28px with a 26px section gap; the header is 70px high. Panels use 24px internal padding. The dashboard uses a 1.7:1 grid with a minimum 260px secondary column and a 24px gap; forms use two equal columns and 20px gaps.

At `max-width: 1150px`, the sidebar becomes 200px, main padding becomes 28px 24px, header/footer use 24px inline padding and dashboard panels stack. At `max-width: 760px`, the shell becomes a single column with a compact top navigation that scrolls horizontally; sidebar supporting blocks disappear. The header becomes 48px, main padding is 26px 18px with a 22px gap, ordinary panel padding is 18px and the summary becomes a two-column strip. Preparation stacks, program days use two columns and the page heading wraps.

The journal retains horizontal scrolling, a sticky header and a sticky date column, inside a container capped at 65vh. Read-only tables preserve a 560px minimum width. Session targets and set columns compact at 760px; the exercise panel uses 16px 10px padding. The standalone session wrapper, where used, caps at 900px with 32px 24px padding, reducing to 24px 12px on mobile.

The existing `useIsMobile` hook defaults to 640px and is used by the routine editor. This separate legacy component threshold is recorded as implementation evidence, not a replacement for the shell's 760px breakpoint.

The dashboard weight chart measures its rendered width with ResizeObserver and uses that width with a fixed 225-unit SVG height. Its axis labels use 12px text so mobile rendering retains readable labels instead of scaling a fixed desktop viewBox. The SVG exposes an accessible trend description.

## Elevation & Depth

The global system uses no box shadows. Depth comes from warm tonal layers, thin dividers and selected blush surfaces. Sticky dates, headings and the rest bar sit above scrolling content using z-index rather than decorative elevation. Navigation and primary/ghost buttons transition background color over 140ms with ease-out only when reduced motion is not requested.

**The Flat Paper Rule.** Separate containers through semantic surfaces and thin borders, as the existing journal and panels do.

## Shapes

Panels use gently rounded corners (12px); journal shells use 10px. Buttons, navigation, exercise tabs and rest bars use 8px; fields use 7px; chips and segmented tracks use 6px; phase tags and row-save controls use 5px; segmented options use 4px. Journal cell fields are square and borderless so grid dividers define the cell boundary. Avatars and small status dots are circular. Borders are generally 1px; outlines provide a separate keyboard focus boundary.

## Components

### Buttons

Compact and direct. Primary and ghost variants share 12px 17px padding, 8px corners and the button type role. Primary uses accent/action-paper with deep-brick hover; ghost uses a firm divider, transparent fill and warm-ink text, gaining hover paper on hover. Quiet controls use transparent fill, no border and 8px padding. Disabled buttons use opacity .55 and default cursor. Global keyboard focus is a 2px accent outline with 3px offset. There is no distinct custom pressed-state style in the current build.

### Chips

Outlined compact filters use 6px corners, 6px 12px padding and muted ink. Active chips fill red with action-paper text and accent border. Phase tags are informational: 5px corners, 5px 8px padding and 10px text on hover paper. Exercise selectors are a separate horizontal navigation pattern, not chip filters.

### Cards / Containers

Cream-paper containers use a soft divider, 12px corners and 24px padding, reducing to 18px on mobile. Cards space children by 16px. The training container uses blush paper without the ordinary panel border. Empty charts use warm paper and centered supporting copy. Containers remain flat.

### Inputs / Fields

Cream-paper fields use a firm divider, 7px corners, 11px 12px padding, 14px text and accent caret. Placeholders use dim ink. Labels remain visible independently of placeholders. Inputs use the global focus outline; journal cells instead show blush fill with a 2px accent inset outline (`outline-offset: -2px`). Error feedback is textual and uses error brick; error banners have 14px padding and 8px corners, with alert semantics. Buttons expose disabled feedback; a separate global disabled-input visual treatment is not defined.

### Navigation

Sidebar items use muted ink, 13px medium text, 12px padding and 8px corners. Hover gains hover paper; selection gains blush fill and red text. Icons are inline stroke SVG, not text glyphs. Mobile items become 11px with 9px padding and 16px SVG icons. The main navigation has an accessible label; routing exposes the current page. Exercise-selector buttons expose `aria-pressed` and selected styling.

The circular header link labeled “Yo” opens personal preferences and stays visible on mobile; preferences provide access to the exercise library after the supporting sidebar links disappear.

### Editable journal

The grid is the signature working surface. Cell fields use 102px width, 14px 12px padding and tabular numerals; notes expand to 250px. Date cells remain sticky with a 105px minimum width, and today's date receives blush fill plus a textual marker. Row hover uses warm paper. Each field's accessible name combines the measurement and date; the scroll region is labeled and focusable. Save controls and status text distinguish pending and saved rows, and live status messages confirm completion. Empty cells display a dash rather than invented data.

### Session workspace

Horizontal exercise selectors lead into one bordered exercise panel. Target bands use 18px vertical padding and 28px gaps; mobile gaps become 18px. The set table aligns numeric entry with previous values and explicit confirmation. Completed rows use blush fill while retaining an Edit action. The square save control is 42px with 8px corners and an inline SVG check. The sticky rest bar uses red fill and action-paper text, a 24px tabular timer, and a text skip/continue action. Selection and status are also communicated with text and accessible state.

## Do's and Don'ts

### Do:

- **Do** reuse semantic warm surfaces, accent roles and existing control geometry.
- **Do** keep tabular numerals and persistent column alignment in measurement views.
- **Do** preserve labeled fields, visible keyboard focus, explicit confirmation and textual status.
- **Do** keep wide journals scrollable with sticky dates while compact navigation adapts to mobile.
- **Do** restrict short background transitions to the existing reduced-motion preference condition.

### Don't:

- **Don't** restore black surfaces or the previous red-and-black identity.
- **Don't** add decorative elevation to the flat paper containers.
- **Don't** replace labels and save states with color alone.
- **Don't** invent a new breakpoint or rounded scale when the existing component pattern applies.

Not canonized: the legacy routine-editor threshold differs from the shell threshold, and some supporting metadata is only 9–10px. These implementation details do not establish a new global breakpoint or a minimum readable-text rule; this documentation pass does not repair them.
