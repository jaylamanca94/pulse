const {
  getCached,
  normalizeDistance,
  normalizeZipCode,
  requestJson,
  sendMethodNotAllowed,
  sendJson,
  setCached
} = require("./_pulse");

const AIRNOW_BASE_URL = "https://www.airnowapi.org/aq/observation/zipCode/current/";
const AIRNOW_CACHE_SECONDS = 60 * 15;

module.exports = async (request, response) => {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response);
    return;
  }

  const apiKey = process.env.AIRNOW_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      status: "unconfigured",
      message: "AIRNOW_API_KEY is not configured."
    });
    return;
  }

  const zipCode = normalizeZipCode(request.query.zipCode || "10001");
  const distance = normalizeDistance(request.query.distance || "25");
  const cacheKey = `airnow:${zipCode}:${distance}`;
  const cached = getCached(cacheKey);

  if (cached) {
    sendJson(response, 200, cached, AIRNOW_CACHE_SECONDS);
    return;
  }

  const params = new URLSearchParams({
    format: "application/json",
    zipCode,
    distance,
    API_KEY: apiKey
  });

  try {
    const data = await requestJson(`${AIRNOW_BASE_URL}?${params.toString()}`);
    const payload = {
      cacheSeconds: AIRNOW_CACHE_SECONDS,
      fetchedAt: new Date().toISOString(),
      status: "live",
      source: "AirNow",
      zipCode,
      distance,
      readings: Array.isArray(data) ? data : []
    };

    setCached(cacheKey, payload, AIRNOW_CACHE_SECONDS);
    sendJson(response, 200, payload, AIRNOW_CACHE_SECONDS);
  } catch (error) {
    sendJson(response, error.status || 502, error.payload || {
      error: {
        code: "AIRNOW_PROXY_ERROR",
        message: "AirNow request could not be completed."
      }
    });
  }
};
