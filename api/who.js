const {
  getCached,
  getText,
  requestJson,
  safeHttpUrl,
  sendJson,
  setCached
} = require("./_pulse");

const WHO_DON_URL = "https://www.who.int/api/hubs/diseaseoutbreaknews";
const WHO_CACHE_SECONDS = 60 * 30;

function stripHtml(value) {
  return getText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNotice(notice) {
  if (!notice || typeof notice !== "object") {
    return null;
  }

  const title = getText(notice.Title);
  const relativeUrl = getText(notice.ItemDefaultUrl);
  const url = safeHttpUrl(relativeUrl) || safeHttpUrl(`https://www.who.int${relativeUrl || "/emergencies/disease-outbreak-news"}`);

  if (!title) {
    return null;
  }

  return {
    title,
    date: getText(notice.FormattedDate, "Date unavailable"),
    publishedAt: getText(notice.PublicationDateAndTime),
    summary: stripHtml(notice.Summary || notice.Overview) || "No summary available from source.",
    url
  };
}

function normalizeWhoPayload(payload) {
  const notices = (Array.isArray(payload?.value) ? payload.value : [])
    .map(normalizeNotice)
    .filter(Boolean)
    .slice(0, 5);

  return {
    notices,
    source: "WHO Disease Outbreak News"
  };
}

async function requestWhoNotices() {
  const cached = getCached("who:disease-outbreak-news");

  if (cached) {
    return cached;
  }

  const url = new URL(WHO_DON_URL);
  url.searchParams.set("$orderby", "PublicationDateAndTime desc");
  url.searchParams.set("$top", "5");

  const payload = await requestJson(url);
  const normalizedPayload = normalizeWhoPayload(payload);
  setCached("who:disease-outbreak-news", normalizedPayload, WHO_CACHE_SECONDS);
  return normalizedPayload;
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for this endpoint."
      }
    });
    return;
  }

  try {
    const payload = await requestWhoNotices();
    sendJson(response, 200, payload, WHO_CACHE_SECONDS);
  } catch (error) {
    sendJson(response, error.status || 502, error.payload || {
      error: {
        code: "WHO_PROXY_ERROR",
        message: "Could not load WHO Disease Outbreak News."
      }
    });
  }
};
