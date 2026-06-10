const cache = new Map();
const DEFAULT_TIMEOUT_MS = 10000;

function sendJson(response, statusCode, payload, maxAgeSeconds = 0) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");

  if (maxAgeSeconds > 0 && statusCode >= 200 && statusCode < 300) {
    response.setHeader("Cache-Control", `s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds}`);
  } else {
    response.setHeader("Cache-Control", "no-store");
  }

  response.end(JSON.stringify(payload));
}

function getCached(cacheKey) {
  const cached = cache.get(cacheKey);

  if (!cached || cached.expiresAt <= Date.now()) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

function setCached(cacheKey, payload, ttlSeconds) {
  cache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

function getText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (error) {
    return "";
  }
}

async function requestJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(url, {
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload || {
      error: {
        code: "UPSTREAM_REQUEST_FAILED",
        message: "Upstream request failed."
      }
    };
    throw error;
  }

  return payload;
}

module.exports = {
  getCached,
  getText,
  requestJson,
  safeHttpUrl,
  sendJson,
  setCached
};
