const {
  getCached,
  getText,
  requestJson,
  safeHttpUrl,
  sendJson,
  setCached
} = require("./_pulse");

const WHO_DON_URL = "https://www.who.int/api/hubs/diseaseoutbreaknews";
const WHO_DON_PAGE_PREFIX = "https://www.who.int/emergencies/disease-outbreak-news/item";
const WHO_CACHE_SECONDS = 60 * 30;
const JOINED_AREA_NAMES = [
  "Antigua and Barbuda",
  "Bosnia and Herzegovina",
  "Saint Kitts and Nevis",
  "Saint Vincent and the Grenadines",
  "Sao Tome and Principe",
  "Trinidad and Tobago",
  "Turks and Caicos Islands",
  "United Kingdom of Great Britain and Northern Ireland",
  "Wallis and Futuna"
];

function stripHtml(value) {
  return getText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocationFromTitle(title) {
  const parts = title.split(",").map((part) => part.trim()).filter(Boolean);

  if (parts.length < 2) {
    return "Location not specified";
  }

  return parts.slice(1).join(", ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAreasFromLocation(location) {
  let cleanLocation = getText(location, "Location not specified");

  if (cleanLocation === "Location not specified") {
    return [cleanLocation];
  }

  const protectedAreas = new Map();

  JOINED_AREA_NAMES.forEach((areaName, index) => {
    const token = `__PULSE_AREA_${index}__`;
    const pattern = new RegExp(`\\b${escapeRegExp(areaName)}\\b`, "gi");
    cleanLocation = cleanLocation.replace(pattern, (match) => {
      protectedAreas.set(token, match);
      return token;
    });
  });

  return cleanLocation
    .split(/\s*(?:[&;]|\band\b)\s*/i)
    .map((part) => protectedAreas.get(part) || part)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getNoticeUrl(relativeUrl, donId) {
  const directUrl = safeHttpUrl(relativeUrl);

  if (directUrl) {
    return directUrl;
  }

  if (donId) {
    return `${WHO_DON_PAGE_PREFIX}/${encodeURIComponent(donId)}`;
  }

  return "https://www.who.int/emergencies/disease-outbreak-news";
}

function getNoticeTime(notice) {
  const time = Date.parse(notice.publishedAt);
  return Number.isNaN(time) ? 0 : time;
}

function normalizeNotice(notice) {
  if (!notice || typeof notice !== "object") {
    return null;
  }

  const title = getText(notice.Title);
  const donId = getText(notice.DonId);
  const relativeUrl = getText(notice.ItemDefaultUrl);
  const url = getNoticeUrl(relativeUrl, donId);

  if (!title) {
    return null;
  }

  return {
    title,
    date: getText(notice.FormattedDate, "Date unavailable"),
    donId: donId || undefined,
    location: getLocationFromTitle(title),
    publishedAt: getText(notice.PublicationDateAndTime),
    summary: stripHtml(notice.Summary || notice.Overview) || "No summary available from source.",
    url
  };
}

function summarizeAreas(notices) {
  const areas = new Map();

  notices.forEach((notice) => {
    const noticeAreas = new Set(getAreasFromLocation(notice.location));
    const noticeTime = getNoticeTime(notice);

    noticeAreas.forEach((area) => {
      const summary = areas.get(area) || {
        area,
        latestDate: notice.date,
        latestDonId: notice.donId,
        latestPublishedAt: notice.publishedAt,
        latestTitle: notice.title,
        latestUrl: notice.url,
        latestTime: 0,
        noticeCount: 0
      };

      summary.noticeCount += 1;

      if (noticeTime >= summary.latestTime) {
        summary.latestDate = notice.date;
        summary.latestDonId = notice.donId;
        summary.latestPublishedAt = notice.publishedAt;
        summary.latestTitle = notice.title;
        summary.latestUrl = notice.url;
        summary.latestTime = noticeTime;
      }

      areas.set(area, summary);
    });
  });

  return Array.from(areas.values())
    .sort((areaA, areaB) => (
      areaB.noticeCount - areaA.noticeCount
      || areaB.latestTime - areaA.latestTime
      || areaA.area.localeCompare(areaB.area)
    ))
    .slice(0, 5)
    .map(({ latestTime, ...area }) => area);
}

function getNoticeWindow(notices) {
  const datedNotices = notices
    .map((notice) => ({
      date: notice.date,
      publishedAt: notice.publishedAt,
      time: getNoticeTime(notice)
    }))
    .filter((notice) => notice.time > 0)
    .sort((noticeA, noticeB) => noticeB.time - noticeA.time);

  return {
    count: notices.length,
    latestDate: datedNotices[0]?.date || "Date unavailable",
    oldestDate: datedNotices[datedNotices.length - 1]?.date || "Date unavailable"
  };
}

function normalizeWhoPayload(payload) {
  const notices = (Array.isArray(payload?.value) ? payload.value : [])
    .map(normalizeNotice)
    .filter(Boolean)
    .slice(0, 5);

  return {
    areas: summarizeAreas(notices),
    cacheSeconds: WHO_CACHE_SECONDS,
    fetchedAt: new Date().toISOString(),
    noticeWindow: getNoticeWindow(notices),
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
