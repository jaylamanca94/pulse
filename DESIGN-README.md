# Design README

Use this file as the visual and interaction source of truth for Pulse. Keep this document updated as Pulse evolves.

This file is intentionally separate because design standards and utilities will grow over time.

## Product Feel

The interface should feel quiet, practical, trustworthy, and easy to scan during a human health, environmental, public health, care access, well-being, or population event.

- Prefer Acadia primitives before custom UI patterns.
- Keep visual decisions simple enough for a solo product builder to maintain.
- Prefer evergreen design patterns and utilities that can scale with the product without becoming fragile or overly custom.
- Use familiar, predictable interface patterns.
- Prioritize clarity, speed, and maintainability over visual novelty.
- Avoid adding decorative complexity unless it directly improves the product experience.
- Make update timestamps, source attribution, location, geographic level, and severity easy to find.
- Keep notice-level publication time, geography, and source identifiers visible as compact metadata, not buried in paragraph text.
- Keep source-window metadata visible when a source surface summarizes only the latest batch of notices or observations, and use exact oldest/latest source publication time when available.
- Show dashboard-level source check timestamps near refresh status so users can judge recency at a glance.
- Use the hero score position for source readiness until Pulse has enough live inputs to support a real aggregate health signal.
- Keep top-level signal summaries close to a compact source-basis explanation when the view mixes live, no-data, route-unavailable, unconfigured, and pending inputs.
- Use compact source detail rows when a data surface mixes live, ready, no-data, route-unavailable, unconfigured, or pending states.
- Distinguish missing serverless source routes from live-source outages so static-preview states do not imply a temporary public-data failure.
- Keep outbreak geography summaries as compact rows with affected area, notice count, latest source publication time when available, source identifier, and a direct source link.
- Order outbreak geography summaries by repeated notice count first and recency second so users can scan for concentration and fresh signals.
- When source-normalized geography splits one WHO notice into multiple affected areas, keep the rows visually identical and let notice count plus latest source metadata explain why repeated areas rank first.
- Keep official-source links close to source status, freshness, and limits when the dashboard depends on external public data.
- Keep source-specific controls, such as location or radius selectors, close to the source detail they affect.
- Show upstream observation times near source freshness when a live source provides both values.
- Show source-returned location matches near source details when a user-selected place is resolved through a reporting area.
- Show source-specific calculation basis near source details when a displayed value selects from multiple returned observations.
- Use a compact local environmental snapshot when source details can answer what the selected place means at a glance before the user reaches the full source coverage panel.
- Use audience-facing section labels that distinguish current source status, live evidence, and planned coverage; avoid implementation phrases such as aggregate scoring in visible UI copy.
- Use plain source-state labels: `not connected yet` for planned data, `API key not configured` for unconfigured API-key sources, and `route unavailable` for missing serverless routes.
- Do not label missing serverless routes as `route missing` in the UI; use `route unavailable` so the state matches the rest of the dashboard language.
- Use `Limit` for source constraints in compact metadata rows; reserve technical caveats for documentation.
- Show official severity bands near environmental source details when a source returns a recognized AQI category.
- When a live environmental source returns a numeric AQI without a category label, show the category and health guidance derived from the official numeric band rather than leaving those rows unavailable.
- Normalize source category label variants to official AQI categories before applying severity text, health guidance, or color cues.
- Use official AQI category color cues as restrained text emphasis on live AQI category and severity-band details, while keeping source-readiness status visually separate.
- Show concise health guidance near environmental source details when a source returns an official severity category, while keeping source readiness separate from aggregate health-risk scoring.
- Use maps, tables, trend lines, and status summaries when they clarify outbreak scale, spread, freshness, or local relevance.
- Visual data summaries, including trend bars and future chart-like elements, must expose the same values through text or accessible names so they do not rely on color, height, or hover-only labels.
- WHO notice trend visuals should include a short visible text summary of total notices, publication-day coverage, peak day, and latest notice title before the bars.

## UI Foundation

Use this file as the visual source of truth for `Pulse`. Update it whenever spacing, color, typography, icon sizing, form layout, interaction feel, accessibility, or reusable utilities change.

### Acadia Adapter

Pulse treats `../Acadia` as its default design system. Before adding or changing UI, check Acadia's live docs, foundations, and CSS primitives for the needed layout, control, surface, state, icon, or responsive behavior.

Pulse vendors the current Acadia CSS primitives into `acadia.css` for deployment safety. Product work should consume those `.acadia-*` primitives first, then use `styles.css` only as a thin product adapter for Pulse identity, AQI tones, public-health source semantics, and source-specific data visualizations.

- Use Acadia primitives for shared product language: controls, select arrows, search inputs, card padding, raised rows, focus rings, motion, table/form patterns, and Font Awesome Free icon sizing.
- Create custom Pulse components only when an Acadia primitive cannot support a clearly product-specific public-health need.
- When custom UI is necessary, keep the component visually and behaviorally aligned with Acadia tokens, spacing, radius, focus, motion, accessibility, and responsive rules.
- Keep Pulse-specific choices local when they express public-health semantics, source-state language, severity, data shape, or product accent behavior.
- Map Pulse variables onto Acadia-style adapter variables in `styles.css` before creating a new one-off component rule.
- If a Pulse pattern becomes useful for another product, graduate the neutral part into Acadia and keep the Pulse wording/data treatment here.

## Color

Default to Acadia's system theme behavior and token names. Use the Acadia light/dark icon toggle as a header utility, separate from source refresh and status controls.

- Page background: `--acadia-color-page`
- Content surface: `--acadia-color-surface`
- Muted surface: `--acadia-color-surface-muted`
- Text: `--acadia-color-text`
- Muted text: `--acadia-color-text-muted`
- Pulse action/accent: mapped through the Acadia product adapter variables in `styles.css`

## Layout Grid

Use Acadia's responsive page frame and dashboard density rules.

- Pulse follows an Apollo-style information architecture: the home page is an at-a-glance dashboard that should fit the important current state into one compact scan, while richer evidence lives on dedicated pages.
- Dashboard page: lead with a large qualitative Community Brief, then show Air Quality, Disease Activity, Healthcare Access, Well-Being, Population, Watch Areas, and What Changed. Keep framework and source coverage explanation secondary to the live dashboard story.
- Environment detail page: own AirNow location controls, AQI basis, severity band, health guidance, and source-specific metadata.
- Disease detail page: own WHO affected-area rows, notice trend, recent notice list, and WHO source context.
- Sources detail page: own source readiness, freshness, limits, API-key/route states, and future source coverage.
- Framework detail page: own the five-signal community health framework and future source roadmap.
- Ultra desktop and desktop: `128px` page margin.
- Small desktop: `64px` page margin.
- Tablet: `32px` page margin.
- Phone: `16px` page margin.
- Dashboard and source panels use Acadia dense section padding, `24px` desktop and `16px` mobile.
- Use `.acadia-shell`, `.acadia-stack`, `.acadia-grid`, Acadia page headers, and Acadia surface/card primitives before introducing local layout rules.
- Header navigation uses Acadia's no-capsule treatment on desktop: transparent nav group, 8px active/hover targets, visible focus, and `aria-current="page"` on the active page. On phone widths, those same destinations use Acadia's safe-area-aware floating glass dock with icon-first tabs and a visible keyboard focus ring. Pages that render the fixed phone dock must opt into `viewport-fit=cover` and keep the main shell padded below the dock so final content remains reachable above device safe areas.
- Header utilities keep the theme toggle as a 40px icon action before source status and refresh controls. On small phones, the refresh control may collapse to its icon-only form with an `aria-label` so the status badge keeps enough room to remain legible.

## Spacing Scale

Use 8px spacing increments whenever possible.

- XS: `8px`
- SM: `16px`
- MD: `24px`
- LG: `32px`
- XL: `40px`
- XXL: `48px`
- XXXL: `64px`

## Typography

Typography values are defined as font size and line height.

| Style | Font Size | Line Height |
| --- | ---: | ---: |
| Display | `48px` | `56px` |
| Page Title | `40px` | `48px` |
| Large Heading | `32px` | `40px` |
| Heading | `24px` | `32px` |
| Lead | `20px` | `24px` |
| Body | `16px` | `24px` |
| Small | `14px` | `16px` |
| Caption | `12px` | `16px` |

## Radius

- XS: `2px`
- SM: `4px`
- MD: `8px`
- LG: `16px`
- XL: `24px`

Use `8px` or less for normal cards and repeated list items unless a larger container treatment is explicitly requested.

## Surface Treatment

- Dashboard surfaces use a restrained `1px` border with a soft shadow to separate content from the page background without creating heavy elevation.
- The hero summary surface may use a narrow accent rail when it helps establish the primary page hierarchy.
- Metric cards keep neutral Acadia card borders; use matching icon tones, badges, and copy so users can distinguish live, attention-needed, and pending sources without reading every note. Use Pulse accent for live source status, warning tone for unavailable or unconfigured live sources, and muted treatment for planned sources that are not connected yet.
- Top-level signal cards use a quiet 3px state rail and a matching icon-chip background/border so live, attention-needed, and pending states read as intentional without becoming separate alert cards.
- Dashboard summary cards should stay compact and navigational. Use a short state summary plus a compact detail link instead of duplicating full detail-page evidence.
- Dense evidence rows, such as outbreak geography, WHO notices, and source coverage, should use low-contrast row panels with `8px` radius, restrained borders, and short hover/focus transitions so metadata feels grouped without becoming decorative.
- Dashboard watch and movement lists should use compact raised evidence-row panels, not plain divider lists, when the rows carry operational status or source-backed interpretation.
- Long official notice summaries may be visually clamped in repeated rows to preserve scan density while keeping source links prominent.
- Compact chart visuals, such as the WHO notice trend, should sit in low-contrast chart wells with `8px` radius, a restrained border, and mobile-specific height reduction so the data view feels intentional without overpowering surrounding evidence rows.
- Metadata groups should use dividers, spacing, and compact labels before adding nested card treatments.

## Icons

- Use Font Awesome Free for icons when needed.
- Header navigation and account utility icons: `16px`
- Card and list summary icons: `20px`
- Media artwork icons and thumbnails should follow the media artwork treatment, not utility icon sizing.
- Standard spacing between utility icons and text: `8px`
- Caption-sized or very small UI may use tighter spacing when needed.

## Favicon And App Icon

- Pulse uses a Font Awesome heart-pulse mark for its favicon/app icon because it represents human health signals and source readiness.
- App icons and favicons must be vector-first, not screenshots.
- The icon background uses a theme-aware vertical gradient: Dark Mode moves from slightly lighter gray on top to very dark black on bottom; Light Mode moves from very light gray on top to slightly darker light gray on bottom.
- The centered heart-pulse mark uses Pulse green in Light Mode and white in Dark Mode for contrast.
- Every web or mobile product should eventually have a simple recognizable favicon/app icon.
- Use a Font Awesome Free icon as the preferred starting point when it fits the product.
- Pick an icon that represents the product mission, not a generic decoration.
- Keep the icon simple enough to work at small sizes.
- Include standard browser favicon support when the product has a web app scaffold.
- Add mobile/app touch icon support when the product is ready for mobile polish.
- Document the icon choice in `DESIGN-README.md` or `README.md`.

## Forms

- Form sections use `48px` padding on desktop.
- Form rows should span the available section width.
- Desktop form rows use 4 columns with `24px` gaps.
- Two related lookup or input fields may span 2 of 4 desktop columns.
- Add/remove buttons should span 1 desktop column when placed in a form row.
- Keep field labels close to their fields.
- Avoid crowding action buttons into data-entry space.

## Interaction Feel

- Clickable cards and list rows should have clear pointer, hover, and keyboard focus states.
- User navigation should use a compact icon/name control when account actions are needed.
- Add buttons should add a new row below the current section or item type.
- Remove buttons are destructive, clearly labeled, and use red styling.
- Reorder handles should have generous tap targets and feel easy to grab.
- Interactive elements should feel obvious without adding unnecessary instructional text.

## Accessibility And Responsiveness

- Support keyboard navigation for interactive controls.
- Provide a visible-on-focus skip link on every top-level Pulse page so keyboard and switch users can bypass repeated header and dock navigation.
- Preserve visible focus states.
- Use semantic HTML whenever practical.
- Keep text readable in both light and dark mode.
- Ensure layouts work across desktop, tablet, and mobile.
- Avoid text overflow, cramped controls, and overlapping UI.

## Utility Guidance

Add reusable utilities here when a pattern is reusable across this product.

Good utility candidates:

- Layout wrappers
- Spacing helpers
- Responsive grid helpers
- Form row patterns
- Empty, loading, success, and error state patterns
- Reusable icon treatments
- Focus and hover state patterns
- Light and dark mode helpers

Avoid utilities for:

- One-off product-specific components
- Temporary workarounds
- Visual treatments that only make sense for one product
- Custom patterns that Acadia already handles well

## Maintenance Rule

This file is the living design standards README for Pulse.

When a UX detail, UI pattern, visual utility, component behavior, accessibility expectation, responsive rule, or product-specific design convention changes, update this file in the same work.

Keep making this file more relevant to the product as design choices, utilities, UI conventions, and quality expectations become clearer.

Do not update it just for the sake of changing it. Update it when there is meaningful new design context, a confirmed convention, a recurring UI pattern, or a clearer way to preserve product design intent.

This file should remain the source of truth for baseline UX/UI decisions and reusable design utilities.
