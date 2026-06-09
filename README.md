# Pulse

Pulse is a public health and wellness dashboard that turns live health, environmental, and population data into actionable insights.

Tagline: See the health of the world.

## Tech Stack

- Static HTML, CSS, and JavaScript
- Bootstrap 5 via CDN
- Font Awesome Free via CDN
- WHO Disease Outbreak News public API
- AirNow current observations API, when configured
- Vercel Serverless Functions for API-key-backed sources

## Planned Data Sources

- CDC National Notifiable Diseases Surveillance System data
- CDC National Outbreak Reporting System data
- WHO Disease Outbreak News: `https://www.who.int/api/hubs/diseaseoutbreaknews`
- AirNow current observations: `https://www.airnowapi.org/aq/observation/zipCode/current/`
- Healthcare access and community well-being datasets

## Configuration

`config.js` controls optional live API settings for the static prototype.

```js
window.PULSE_CONFIG = {
  AIRNOW_ZIP_CODE: "10001",
  AIRNOW_DISTANCE_MILES: 25
};
```

AirNow requires an API key. The dashboard calls `/api/airnow`, which reads the key from a server-side environment variable.

## Local Setup

Install dependencies when working with the serverless API route:

```sh
npm install
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

## Environment Variables

- `AIRNOW_API_KEY`: AirNow API key used by `/api/airnow`

## File Overview

- `PRODUCT-README.md` - Pulse mission, goals, scope, decisions, roadmap, and known limitations
- `index.html` - dashboard markup
- `styles.css` - dashboard styling
- `app.js` - frontend data loading and rendering
- `config.js` - optional static prototype API configuration
- `api/airnow.js` - serverless AirNow proxy
- `vercel.json` - Vercel function runtime configuration

## Deployment

This version can be deployed as a static site on Vercel.

1. Connect this repository to Vercel.
2. Add `AIRNOW_API_KEY` in Vercel environment variables.
3. Use the default static site settings.
4. Deploy.
