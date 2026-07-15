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

function sendMethodNotAllowed(response) {
  sendJson(response, 405, {
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Use GET for this endpoint."
    }
  });
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

function getQueryValue(query, key, fallback = "") {
  const value = query?.[key];
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  return getText(normalizedValue, fallback);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function parseCsvRecords(text) {
  const records = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === "\"") {
      current += character;

      if (inQuotes && text[index + 1] === "\"") {
        current += text[index + 1];
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (current) {
        records.push(current);
        current = "";
      }

      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      current += character;
    }
  }

  if (current) {
    records.push(current);
  }

  return records;
}

function parseCsv(text) {
  const lines = parseCsvRecords(getText(text));
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function normalizeZipCode(value, fallback = "10001") {
  return /^\d{5}$/.test(String(value || "").trim()) ? String(value).trim() : fallback;
}

function normalizeDistance(value, fallback = "25") {
  const distance = Number(value);
  return Number.isFinite(distance) && distance > 0 && distance <= 250 ? String(Math.round(distance)) : fallback;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (error) {
    return "";
  }
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetchWithTimeout(url, timeoutMs);
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

async function requestText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetchWithTimeout(url, timeoutMs);
  const payload = await response.text().catch(() => "");

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = {
      error: {
        code: "UPSTREAM_REQUEST_FAILED",
        message: payload || "Upstream request failed."
      }
    };
    throw error;
  }

  return payload;
}

module.exports = {
  getCached,
  getQueryValue,
  getText,
  normalizeDistance,
  normalizeZipCode,
  parseCsv,
  parseCsvLine,
  requestJson,
  requestText,
  safeHttpUrl,
  sendMethodNotAllowed,
  sendJson,
  setCached
};
