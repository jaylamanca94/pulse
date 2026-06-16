# Pulse Project

## Goals

- Help users see the health of the world.
- Give people a clear place to understand public health and disease outbreak activity when something is happening near them or in a place they care about.
- Bring the clarity of COVID-era case trackers, maps, county/state/country views, and update timestamps to a broader set of public health outbreaks and disease signals.
- Turn live health, environmental, and population data into clear situational awareness.
- Start with official public sources for disease activity, outbreak reports, case counts, air quality, healthcare access, and community well-being.
- Keep the product quiet, practical, and maintainable.
- Start with the smallest working dashboard before adding integrations.

## Product Discipline

Pulse must stay focused on its core job: clear situational awareness for public health, outbreak, environmental, and community health signals.

- Do not broaden Pulse into a general wellness, hospital operations, social network, news, or analytics platform unless the founder explicitly changes the product direction.
- Prefer focused public-health clarity over feature volume.
- Say no or defer when a feature is interesting but does not strengthen the current public health dashboard mission.
- Keep scope decisions grounded in user value, source quality, geographic clarity, freshness, trust, and maintainability.

## Product Positioning

Pulse is an event-driven public health reference dashboard, not a daily wellness app. Users should be able to open it during an outbreak, public health event, or emerging disease concern and quickly answer:

- What is happening?
- Where is it happening?
- How severe or widespread is it?
- When was the data last updated?
- Which source is reporting it?
- What level of geography is available, such as country, state, county, or local area?

## Scope

Current scope is a static dashboard MVP with serverless proxies for first live public data sources and clear pending states for planned sources that are not wired yet.

## Features

- Public health signal summary
- Metric cards for planned health, environmental, access, and population data areas
- Recent WHO Disease Outbreak News notices through a cached serverless proxy
- Per-notice WHO metadata for source publication time, geography, and DON identifier when available
- WHO-derived outbreak geography scan that groups recent notices by affected area, ranked by repeated notice concentration and recency
- WHO multi-area title parsing for affected-area summaries when DON geography uses separators such as `and`, `&`, or `;`
- WHO affected-area metadata showing the latest source publication time when available
- WHO source notice window showing how many recent notices are summarized and the oldest/latest source publication times in that batch when available
- AirNow-ready air quality card using a serverless API route with an unconfigured state when no API key is configured
- User-selectable ZIP code and radius for AirNow current observations
- Highest returned AirNow pollutant AQI and observation timestamp when live observations are available
- AirNow reporting-area match showing which returned area and state backs the selected ZIP/radius query
- AirNow AQI explanation detail showing how many pollutant AQI readings were considered and which pollutant drives the displayed value
- AirNow AQI severity band showing the official category range for the displayed value
- AirNow numeric AQI normalization that derives the official category, severity band, and health guidance when the source omits a category label
- AirNow category-label normalization that keeps severity, health guidance, and color cues available when source labels vary in casing, spacing, or separators
- AirNow category color cues on live AQI text and severity-band details using the official AQI level semantics
- AirNow AQI health guidance derived from the official AQI category when live observations are available
- Distinct AirNow route-unavailable state when the dashboard is opened without the serverless API route
- Local environmental snapshot that summarizes the selected ZIP/radius, returned reporting area, observation time, why the AQI was selected, severity band, and health guidance
- Refresh action for live source checks
- Dashboard-level last-checked timestamp after source refresh
- Dynamic source-readiness summary that shows how many live sources are currently backing the dashboard
- Top-level signal basis rows that distinguish live, no-data, route-unavailable, unconfigured, and pending inputs behind the summary view
- Source coverage rows that show status, scope, freshness, limits, and official-source links for live public data
- Distinct no-data source state when a configured source responds without nearby observations
- WHO-derived signal trend snapshot
- WHO notice trend plain-language summary that mirrors the visual bar chart and names the latest notice represented in the trend
- Priority list for first public data areas
- Pending-source labels so the prototype does not imply live tracking where source wiring is incomplete
- Responsive desktop, tablet, and mobile layout
- Light and dark mode using the user's system setting

## Design Decisions

- Use Bootstrap conventions for layout and components.
- Use pending states until real data sources are selected.
- Use graceful unavailable or no-data states when public APIs are unavailable.
- Keep API-key-dependent sources in a clear configured/unconfigured state.
- Proxy WHO Disease Outbreak News through `/api/who` for normalization, timeout handling, and caching.
- Keep API keys server-side through Vercel Serverless Functions.
- Share API response, timeout, and cache helpers through `api/_pulse.js`.
- Avoid inactive controls that imply unavailable workflows.
- Avoid custom build tooling until the product requires it.
- Use the product foundation colors and spacing scale.
- Favor official public health sources before third-party aggregators.
- Keep positioning broad enough for local, national, and global health signals.
- Make source attribution, freshness, and geographic scope visible anywhere outbreak data appears.
- Keep outbreak notice rows specific enough to show source publication time, affected geography, and source identifier when the upstream source provides them.
- Show the recent notice window behind WHO-derived summaries so users can judge how much of the latest feed the dashboard is using, including oldest/latest source publication time when WHO provides it.
- Surface a compact geography scan from official notices before adding broader map or table workflows.
- Parse obvious multi-area WHO title geography into separate affected-area summary rows, while preserving joined place names such as Trinidad and Tobago.
- Rank affected-area summaries by repeated notice count first and latest publication recency second so the scan favors concentration without hiding fresh one-off events.
- Show the latest source publication time in affected-area summaries when WHO provides the exact timestamp, not only the formatted notice date.
- Keep live, ready, no-data, route-unavailable, unconfigured, and pending data states visible in source coverage details.
- Treat a configured source with no returned records as no-data, not as an unconfigured or failed source.
- Treat a missing serverless source route as route unavailable, not as a temporary source outage.
- Show source observation timing separately from dashboard fetch timing when an upstream response provides both.
- Show AirNow's returned reporting area and state separately from the user-selected ZIP/radius so local relevance is auditable.
- When AirNow returns multiple pollutant observations for a selected area, use the highest numeric AQI as the displayed current severity.
- When displaying the highest AirNow pollutant AQI, show the pollutant-reading count and selected pollutant near source details so users understand why that AQI was selected.
- Show the official AQI severity band beside AirNow details so the displayed category is anchored to its numeric range.
- If AirNow returns a numeric AQI without a category label, derive the official AQI category from the value range before showing severity and health guidance.
- Normalize recognized AirNow category label variants to official AQI categories before showing severity bands, health guidance, or color cues.
- Use official AQI category color cues only on live AQI severity text and details, not on source-readiness status.
- Translate official AQI categories into concise health guidance near the AirNow source details so users can interpret severity without inventing a broader Pulse risk score.
- Surface the selected-place AirNow summary above detailed source coverage so local environmental relevance is visible before users inspect source metadata.
- Prefer visuals that help users compare place, scale, recency, and severity over decorative analytics.
- Show top-level source readiness from current source states before presenting broader health signal levels.
- Do not present aggregate signal levels without nearby source-basis context while the dashboard mixes live and pending inputs.
- Keep user-facing source states plain and audience-facing: use language such as `not connected yet` for planned inputs and `API key not configured` for AirNow, instead of implementation instructions like `add server API key`.
- Label WHO-only summaries as WHO notices or WHO notice trends so they do not read like whole-product signal trends.
- Pair WHO trend visuals with a concise text summary of notice count, publication-day coverage, peak day, and the latest notice title so the chart is understandable without relying on bar height.

## Roadmap

- Add live AirNow API key in deployment environment variables.
- Deploy to Vercel.
- Expand outbreak-focused geography views from the WHO-derived scan into richer country, state, county, or local views as source quality permits.
- Expand user-selectable environmental observations beyond ZIP code and radius when source coverage supports it.
- Add API fetch and normalization layer for each source category.
- Add source attribution and freshness timestamps.
- Cache API responses if source rate limits or reliability require it.
- Add schema validation for API responses.

## Known Limitations

- WHO Disease Outbreak News is live when the serverless route is available; AirNow requires `AIRNOW_API_KEY`; planned CDC, access, well-being, and population sources are still pending.
- No authentication or database exists yet.
- Charts are simple CSS/HTML indicators, not a charting library.
- Public source APIs vary in freshness, coverage, and format.
- Serverless in-memory cache is per warm function instance and may reset.
