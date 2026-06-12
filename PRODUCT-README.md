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

Current scope is a static dashboard MVP with sample public health and wellness metrics plus serverless proxies for first live public data sources.

## Features

- Public health signal summary
- Metric cards for planned health, environmental, access, and population data areas
- Recent WHO Disease Outbreak News notices through a cached serverless proxy
- Per-notice WHO metadata for date, geography, and DON identifier when available
- WHO-derived outbreak geography scan that groups recent notices by affected area, ranked by repeated notice concentration and recency
- WHO source notice window showing how many recent notices are summarized and the oldest/latest notice dates in that batch
- AirNow-ready air quality card using a serverless API route with fallback state when no API key is configured
- User-selectable ZIP code and radius for AirNow current observations
- Highest returned AirNow pollutant AQI and observation timestamp when live observations are available
- AirNow AQI health meaning derived from the official AQI category when live observations are available
- Refresh action for live source checks
- Dashboard-level last-checked timestamp after source refresh
- Dynamic source-readiness summary that shows how many live sources are currently backing the dashboard
- Top-level signal basis rows that distinguish live, fallback, no-data, and sample inputs behind the summary view
- Source coverage rows that show status, scope, freshness, caveats, and official-source links for live public data
- Distinct no-data source state when a configured source responds without nearby observations
- Signal trend snapshot
- Priority list for first public data areas
- Sample data label so the prototype does not imply live tracking
- Responsive desktop, tablet, and mobile layout
- Light and dark mode using the user's system setting

## Design Decisions

- Use Bootstrap conventions for layout and components.
- Use simple static data until real data sources are selected.
- Use graceful fallback content when public APIs are unavailable.
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
- Keep outbreak notice rows specific enough to show event date, affected geography, and source identifier when the upstream source provides them.
- Show the recent notice window behind WHO-derived summaries so users can judge how much of the latest feed the dashboard is using.
- Surface a compact geography scan from official notices before adding broader map or table workflows.
- Rank affected-area summaries by repeated notice count first and latest publication recency second so the scan favors concentration without hiding fresh one-off events.
- Keep live, fallback, ready, and sample data states visible in source coverage details.
- Treat a configured source with no returned records as no-data, not as an unconfigured or failed source.
- Show source observation timing separately from dashboard fetch timing when an upstream response provides both.
- When AirNow returns multiple pollutant observations for a selected area, use the highest numeric AQI as the displayed current severity.
- Translate official AQI categories into concise health meaning near the AirNow source details so users can interpret severity without inventing a broader Pulse risk score.
- Prefer visuals that help users compare place, scale, recency, and severity over decorative analytics.
- Show top-level source readiness from current source states before presenting broader health signal levels.
- Do not present aggregate signal levels without nearby source-basis context while the dashboard mixes live and sample inputs.

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

- Data is currently sample-only.
- No authentication or database exists yet.
- Charts are simple CSS/HTML indicators, not a charting library.
- Public source APIs vary in freshness, coverage, and format.
- Serverless in-memory cache is per warm function instance and may reset.
