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

## Planned Data Sources

- CDC National Notifiable Diseases Surveillance System data
- CDC National Outbreak Reporting System data
- WHO Disease Outbreak News, proxied through `/api/who`
- AirNow current observations, proxied through `/api/airnow`
- Healthcare access and community well-being datasets

## Configuration

`config.js` controls optional live API settings for the static prototype.
These values set the default AirNow location; users can change the ZIP code and radius in the dashboard.

```js
window.PULSE_CONFIG = {
  AIRNOW_ZIP_CODE: "10001",
  AIRNOW_DISTANCE_MILES: 25
};
```

WHO notices are loaded through `/api/who`, which normalizes and caches the public source response and derives a compact affected-area summary from recent notices.

AirNow requires an API key. The dashboard calls `/api/airnow`, which reads the key from a server-side environment variable.

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
