# Pulse Project

## Goals

- Help users see the health of the world.
- Turn live health, environmental, and population data into actionable insights.
- Start with official public sources for disease activity, outbreak reports, air quality, healthcare access, and community well-being.
- Keep the product quiet, practical, and maintainable.
- Start with the smallest working dashboard before adding integrations.

## Scope

Current scope is a static dashboard MVP with sample public health and wellness metrics plus serverless proxies for first live public data sources.

## Features

- Public health signal summary
- Metric cards for planned health, environmental, access, and population data areas
- Recent WHO Disease Outbreak News notices through a cached serverless proxy
- AirNow-ready air quality card using a serverless API route with fallback state when no API key is configured
- Refresh action for live source checks
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

## Roadmap

- Add live AirNow API key in deployment environment variables.
- Deploy to Vercel.
- Add user-selectable location for air quality observations.
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
