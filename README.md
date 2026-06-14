# Pulse

Pulse is an event-driven public health dashboard for understanding outbreaks, disease activity, environmental health signals, and population-level risk when something is happening near you or in a place you care about.

Tagline: See the health of the world.

## Tech Stack

- Static HTML, CSS, and JavaScript
- Bootstrap 5 via CDN
- Font Awesome Free via CDN
- WHO Disease Outbreak News public API
- AirNow current observations API, when configured
- Vercel Serverless Functions for cached public and API-key-backed sources

## Data Sources

- WHO Disease Outbreak News, live when `/api/who` is available
- AirNow current observations, live when `/api/airnow` has `AIRNOW_API_KEY`
- CDC National Notifiable Diseases Surveillance System data, not connected yet
- CDC National Outbreak Reporting System data, not connected yet
- Healthcare access and community well-being datasets, not connected yet

## Configuration

`config.js` controls optional live API settings for the static prototype.
These values set the default AirNow location; users can change the ZIP code and radius in the dashboard.

```js
window.PULSE_CONFIG = {
  AIRNOW_ZIP_CODE: "10001",
  AIRNOW_DISTANCE_MILES: 25
};
```

WHO notices are loaded through `/api/who`, which normalizes and caches the public source response, reports the recent notice window being summarized, and derives a compact affected-area summary from recent notices. Recent notice rows, affected-area rows, and source-window summaries show the source publication timestamp when available. Obvious multi-area title geography is split into separate summary rows when the source uses separators such as `and`, `&`, or `;`, while joined place names such as Trinidad and Tobago stay intact. Affected areas are ranked by repeated notice count, then latest publication recency.

AirNow requires an API key. The dashboard calls `/api/airnow`, which reads the key from a server-side environment variable. Until that key is present, the product should say the AirNow API key is not configured instead of asking dashboard users to add a server key.
When live AirNow observations are available, the dashboard shows the highest returned pollutant AQI and upstream observation time separately from the dashboard fetch time.
It also shows the returned AirNow reporting area and state that backs the selected ZIP/radius query.
It also shows how many pollutant AQI readings were considered and which pollutant drives the displayed highest-AQI value.
It also shows the official AQI severity band for the returned category.
If AirNow returns a numeric AQI without a category label, Pulse derives the official category from the AQI value so the severity band and health guidance stay available.
Pulse also normalizes recognized AirNow category label variants before showing severity bands, health guidance, or color cues.
When live AirNow observations are available, Pulse uses restrained official AQI category color cues on the metric note and severity-band detail.
It also translates the returned AQI category into concise health guidance in the local environmental snapshot and source coverage panel.
The local environmental snapshot summarizes the selected ZIP/radius, returned reporting area, observation time, why the AQI was selected, severity band, and health guidance before users inspect the full source metadata.

The hero readiness score is computed from current WHO and AirNow source states, such as `2/2 live`, `1/2 partial`, or `0/2 unavailable`, so the prototype does not imply a synthetic public-health risk score before enough live inputs exist.

## Local Setup

Install dependencies when working with the serverless API route:

```sh
npm install
```

Create a local environment file:

```sh
cp .env.example .env.local
```

Add your AirNow key to `.env.local` when available:

```text
AIRNOW_API_KEY=your_key_here
```

For the full local app with `/api/airnow`:

```sh
npm run dev
```

For a direct static preview, open `index.html` in a browser.
Static previews do not run serverless API routes, so API-backed source rows may show a route-unavailable state.

For a local web preview:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`. The static preview does not run Vercel API routes.

Check JavaScript syntax:

```sh
npm run check
```

Run helper tests:

```sh
npm test
```

## Environment Variables

- `AIRNOW_API_KEY`: AirNow API key used by `/api/airnow`

## File Overview

- `AGENT-README.md` - Pulse product-agent workflow, approval rules, work modes, and output format
- `PRODUCT-README.md` - Pulse mission, goals, scope, decisions, roadmap, and known limitations
- `DESIGN-README.md` - Pulse design standards, UI utilities, and interaction guidance
- `index.html` - dashboard markup
- `styles.css` - dashboard styling
- `app.js` - frontend data loading and rendering
- `assets/favicon.svg` - vector heart-pulse favicon/app icon with theme-aware gradient background
- `site.webmanifest` - browser app manifest pointing to the SVG icon
- `config.js` - optional static prototype API configuration
- `api/_pulse.js` - shared API helper, timeout, response, and cache utilities
- `api/who.js` - serverless WHO Disease Outbreak News proxy and geography summary normalizer
- `api/airnow.js` - serverless AirNow proxy
- `vercel.json` - Vercel function runtime configuration

## Caching

The serverless API routes include lightweight in-memory and Vercel edge caching:

- WHO Disease Outbreak News: 30 minutes
- AirNow current observations: 15 minutes

This reduces rate-limit pressure and keeps the dashboard usable during normal traffic. The in-memory cache is per warm function instance and may reset.

## Deployment

This version can be deployed as a static site on Vercel.

1. Connect this repository to Vercel.
2. Add `AIRNOW_API_KEY` in Vercel environment variables.
3. Use the default static site settings.
4. Deploy.
