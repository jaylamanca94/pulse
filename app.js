const API = {
  who: "/api/who",
  airnow: "/api/airnow"
};

const config = window.PULSE_CONFIG || {};
const SOURCE_TIMEOUT_MS = 10000;

const fallbackAirQuality = {
  aqi: "--",
  category: "AirNow API key not configured",
  area: "AirNow current observations",
  observedAt: "",
  pollutant: "AQI"
};

const noAirQualityReading = {
  aqi: "--",
  category: "No current observations",
  area: "selected area",
  observedAt: "",
  pollutant: "AQI"
};

const AIRNOW_FALLBACK_STATES = {
  unconfigured: {
    category: fallbackAirQuality.category,
    freshness: "AirNow API key not configured",
    healthGuidance: "Available after AirNow is configured",
    observed: "Available after AirNow is configured",
    areaMatch: "Available after AirNow is configured",
    aqiBasis: "Available after AirNow is configured",
    severityBand: "Available after AirNow is configured",
    statusLabel: "API key needed"
  },
  routeUnavailable: {
    category: "AirNow route unavailable",
    freshness: "Run with server API routes for live AQI",
    healthGuidance: "Available when the AirNow route responds",
    observed: "AirNow route unavailable",
    areaMatch: "AirNow route unavailable",
    aqiBasis: "AirNow route unavailable",
    severityBand: "AirNow route unavailable",
    statusLabel: "Route unavailable"
  },
  unavailable: {
    category: "Live AQI unavailable",
    freshness: "Try refreshing again later",
    healthGuidance: "Unavailable until the source responds",
    observed: "Live observation unavailable",
    areaMatch: "Live reporting area unavailable",
    aqiBasis: "Live AQI explanation unavailable",
    severityBand: "Live AQI severity band unavailable",
    statusLabel: "Unavailable"
  }
};

const normalizeZipCode = (value) => {
  const zipCode = String(value || "").trim();
  return /^\d{5}$/.test(zipCode) ? zipCode : "10001";
};

const normalizeDistance = (value) => {
  const distance = Number(value);
  return Number.isFinite(distance) && distance > 0 && distance <= 250 ? Math.round(distance) : 25;
};

const airNowQuery = {
  zipCode: normalizeZipCode(config.AIRNOW_ZIP_CODE),
  distance: normalizeDistance(config.AIRNOW_DISTANCE_MILES)
};

const stripHtml = (value) => {
  const template = document.createElement("template");
  template.innerHTML = value || "";
  return template.content.textContent.replace(/\s+/g, " ").trim();
};

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};

const setBusy = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.setAttribute("aria-busy", String(value));
};

const setStatusBadge = (label, isWarning = false) => {
  const badge = document.querySelector("[data-status-badge]");
  if (!badge) return;

  badge.textContent = label;
  badge.classList.toggle("is-warning", isWarning);
};

const METRIC_CARD_STATE_CLASSES = ["is-live", "is-warning", "is-pending"];

const setMetricCardState = (metricKey, state = "pending") => {
  const card = document.querySelector(`[data-metric-card="${metricKey}"]`);
  if (!card) return;

  const nextState = METRIC_CARD_STATE_CLASSES.includes(`is-${state}`) ? state : "pending";
  card.classList.remove(...METRIC_CARD_STATE_CLASSES);
  card.classList.add(`is-${nextState}`);
};

const updateSourceReadiness = (liveCount, totalCount) => {
  const value = totalCount > 0 ? `${liveCount}/${totalCount}` : "--";
  const label = totalCount === 0
    ? "checking"
    : liveCount === totalCount
      ? "live"
      : liveCount > 0
        ? "partial"
        : "unavailable";

  setText("[data-source-readiness-value]", value);
  setText("[data-source-readiness-label]", label);
};

const formatCheckedAt = (isoString) => {
  if (!isoString) return "Checked this session";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Checked this session";

  return `Checked ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date)}`;
};

const formatLastChecked = (date = new Date()) => `Last checked ${new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
}).format(date)}`;

const formatCacheWindow = (seconds) => {
  const duration = Number(seconds);
  if (!Number.isFinite(duration) || duration <= 0) return "";

  const minutes = Math.round(duration / 60);
  return `${minutes} min cache`;
};

const formatWhoNoticeWindow = (windowMeta = {}) => {
  const count = Number(windowMeta.count);
  const noticeCount = Number.isFinite(count) && count > 0 ? Math.round(count) : 0;

  if (!noticeCount) {
    return "No recent notices returned";
  }

  const latestDate = formatWhoWindowDateTime(windowMeta.latestPublishedAt, windowMeta.latestDate || "latest date unavailable");
  const oldestDate = formatWhoWindowDateTime(windowMeta.oldestPublishedAt, windowMeta.oldestDate || "oldest date unavailable");

  if (latestDate === oldestDate) {
    return `${noticeCount} ${noticeCount === 1 ? "notice" : "notices"} from ${latestDate}`;
  }

  return `${noticeCount} ${noticeCount === 1 ? "notice" : "notices"} from ${oldestDate} to ${latestDate}`;
};

const formatWhoWindowDateTime = (isoString, fallback = "Date unavailable") => {
  if (!isoString) return fallback;

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(date);
};

const formatWhoPublishedAt = (isoString, fallback = "Date unavailable") => {
  if (!isoString) return fallback;

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return fallback;

  return `Published ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(date)}`;
};

const formatWhoLatestAt = (isoString, fallback = "Date unavailable") => {
  const label = formatWhoPublishedAt(isoString, fallback);
  return label.startsWith("Published ")
    ? `latest ${label.slice("Published ".length)}`
    : `latest ${label}`;
};

const formatAirNowObservedAt = (reading) => {
  const date = typeof reading.DateObserved === "string" ? reading.DateObserved.trim() : "";
  const hour = Number(reading.HourObserved);
  const timeZone = typeof reading.LocalTimeZone === "string" ? reading.LocalTimeZone.trim() : "";

  if (!date || !Number.isFinite(hour) || hour < 0 || hour > 23) {
    return "";
  }

  const hourLabel = `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
  return [date, hourLabel, timeZone].filter(Boolean).join(" ");
};

const joinDetails = (...values) => values.filter(Boolean).join("; ");

const getAirNowScope = () => `ZIP ${airNowQuery.zipCode}, ${airNowQuery.distance}-mile radius`;

const formatAirNowArea = (reading = {}) => {
  const area = typeof reading.area === "string" ? reading.area.trim() : "";
  const stateCode = typeof reading.stateCode === "string" ? reading.stateCode.trim() : "";

  if (!area) return "AirNow reporting area";
  return stateCode ? `${area}, ${stateCode}` : area;
};

const getAqiCategoryFromValue = (aqi) => {
  const value = Number(aqi);
  if (!Number.isFinite(value) || value < 0) return "";

  if (value <= 50) return "Good";
  if (value <= 100) return "Moderate";
  if (value <= 150) return "Unhealthy for Sensitive Groups";
  if (value <= 200) return "Unhealthy";
  if (value <= 300) return "Very Unhealthy";
  return "Hazardous";
};

const normalizeAqiCategory = (category, aqi) => {
  const rawCategory = String(category || "").trim();
  const normalizedCategory = rawCategory
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const categories = {
    good: "Good",
    moderate: "Moderate",
    "unhealthy for sensitive groups": "Unhealthy for Sensitive Groups",
    "unhealthy sensitive": "Unhealthy for Sensitive Groups",
    "sensitive groups": "Unhealthy for Sensitive Groups",
    unhealthy: "Unhealthy",
    "very unhealthy": "Very Unhealthy",
    hazardous: "Hazardous"
  };

  return categories[normalizedCategory] || getAqiCategoryFromValue(aqi) || rawCategory;
};

const getAqiHealthGuidance = (category) => {
  const normalizedCategory = normalizeAqiCategory(category).toLowerCase();
  const guidance = {
    good: "Air quality is satisfactory for most people.",
    moderate: "Acceptable air quality; unusually sensitive people should watch symptoms.",
    "unhealthy for sensitive groups": "Sensitive groups should reduce prolonged or heavy outdoor exertion.",
    unhealthy: "Some people may experience health effects; sensitive groups may be more affected.",
    "very unhealthy": "Health alert; everyone faces increased risk from outdoor air.",
    hazardous: "Emergency conditions; everyone is more likely to be affected."
  };

  return guidance[normalizedCategory] || "";
};

const getAqiSeverityBand = (category) => {
  const normalizedCategory = normalizeAqiCategory(category).toLowerCase();
  const bands = {
    good: "Good, 0-50",
    moderate: "Moderate, 51-100",
    "unhealthy for sensitive groups": "Unhealthy for Sensitive Groups, 101-150",
    unhealthy: "Unhealthy, 151-200",
    "very unhealthy": "Very Unhealthy, 201-300",
    hazardous: "Hazardous, 301+"
  };

  return bands[normalizedCategory] || "";
};

const AQI_TONE_CLASSES = [
  "aqi-good",
  "aqi-moderate",
  "aqi-unhealthy-sensitive",
  "aqi-unhealthy",
  "aqi-very-unhealthy",
  "aqi-hazardous"
];

const getAqiToneClass = (category) => {
  const normalizedCategory = normalizeAqiCategory(category).toLowerCase();
  const tones = {
    good: "aqi-good",
    moderate: "aqi-moderate",
    "unhealthy for sensitive groups": "aqi-unhealthy-sensitive",
    unhealthy: "aqi-unhealthy",
    "very unhealthy": "aqi-very-unhealthy",
    hazardous: "aqi-hazardous"
  };

  return tones[normalizedCategory] || "";
};

const setAqiTone = (selector, category) => {
  const element = document.querySelector(selector);
  if (!element) return;

  element.classList.remove(...AQI_TONE_CLASSES);
  const toneClass = getAqiToneClass(category);
  if (toneClass) element.classList.add(toneClass);
};

const formatAirNowAqiBasis = (reading, isLive) => {
  if (!isLive) {
    return "Available when live AQI observations return";
  }

  const count = Number(reading.aqiReadingCount);
  const pollutantCount = Number.isFinite(count) && count > 0 ? Math.round(count) : 1;
  const pollutant = reading.pollutant && reading.pollutant !== "AQI" ? reading.pollutant : "current pollutant";
  const plural = pollutantCount === 1 ? "reading" : "readings";

  return `${pollutantCount} pollutant AQI ${plural}; displayed ${pollutant} as highest AQI`;
};

const formatAirNowAreaMatch = (reading, isLive) => {
  if (!isLive) {
    return "Available when live AQI observations return";
  }

  return `${formatAirNowArea(reading)} for ${getAirNowScope()}`;
};

const syncAirNowLocationText = () => {
  setText("[data-airnow-source-scope]", getAirNowScope());
  setText("[data-airnow-location-note]", `Showing ${getAirNowScope()}.`);
  setText("[data-airnow-snapshot-scope]", getAirNowScope());
};

const setAirNowZipValidity = (form, zipInput, isValid) => {
  if (!form || !zipInput) return;

  form.classList.toggle("was-validated", !isValid);
  zipInput.setAttribute("aria-invalid", String(!isValid));
  if (!isValid) {
    setText("[data-airnow-location-note]", "Enter a 5-digit ZIP code to update the AirNow area.");
  }
};

const setSourceDetail = (sourceKey, detail) => {
  const status = document.querySelector(`[data-${sourceKey}-source-status]`);
  if (status) {
    status.textContent = detail.status;
    status.classList.toggle("is-live", Boolean(detail.isLive));
    status.classList.toggle("is-warning", Boolean(detail.isWarning));
  }

  setText(`[data-${sourceKey}-source-freshness]`, detail.freshness);
};

const setAirNowSnapshotStatus = (label, isLive) => {
  const status = document.querySelector("[data-airnow-snapshot-status]");
  if (!status) return;

  status.textContent = label;
  status.classList.toggle("is-live", Boolean(isLive));
  status.classList.toggle("is-warning", !isLive);
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeoutId));

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = await response.json().catch(() => null);
    throw error;
  }

  return response.json();
};

const formatNotice = (notice) => {
  const summary = notice.summary || stripHtml(notice.Summary || notice.Overview);
  const sourceUrl = notice.url || notice.ItemDefaultUrl || "/emergencies/disease-outbreak-news";
  const donId = notice.donId || notice.DonId || "WHO DON";
  const url = sourceUrl.startsWith("http")
    ? sourceUrl
    : donId !== "WHO DON"
      ? `https://www.who.int/emergencies/disease-outbreak-news/item/${encodeURIComponent(donId)}`
      : "https://www.who.int/emergencies/disease-outbreak-news";
  const title = notice.title || notice.Title || "Untitled WHO notice";
  const titleParts = title.split(",").map((part) => part.trim()).filter(Boolean);

  return {
    title,
    date: notice.date || notice.FormattedDate || "Date unavailable",
    donId,
    location: notice.location || (titleParts.length > 1 ? titleParts.slice(1).join(", ") : "Location not specified"),
    publishedAt: notice.publishedAt || notice.PublicationDateAndTime || "",
    summary: summary || "No summary available from source.",
    url
  };
};

const formatAreaSummary = (summary) => ({
  area: summary.area || "Location not specified",
  latestDate: summary.latestDate || "Date unavailable",
  latestDonId: summary.latestDonId || "WHO DON",
  latestPublishedAt: summary.latestPublishedAt || "",
  latestTitle: summary.latestTitle || "Untitled WHO notice",
  latestUrl: summary.latestUrl || "https://www.who.int/emergencies/disease-outbreak-news",
  noticeCount: Number.isFinite(summary.noticeCount) ? summary.noticeCount : 1
});

const renderAreaSummary = (areas, isLive, sourceMeta = {}) => {
  const list = document.querySelector("[data-who-area-list]");
  if (!list) return;

  const summaries = areas.map(formatAreaSummary);
  list.innerHTML = "";

  if (!summaries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-copy mb-0";
    empty.textContent = isLive
      ? "No affected areas were available from the current WHO response."
      : "Affected areas are unavailable until WHO notices load.";
    list.append(empty);
  } else {
    summaries.forEach((summary) => {
      const item = document.createElement("article");
      item.className = "area-item";

      const content = document.createElement("div");

      const meta = document.createElement("p");
      meta.className = "area-meta";
      const latest = document.createElement(summary.latestPublishedAt ? "time" : "span");
      latest.textContent = formatWhoLatestAt(summary.latestPublishedAt, summary.latestDate);
      if (summary.latestPublishedAt) {
        latest.dateTime = summary.latestPublishedAt;
      }
      meta.append(
        document.createTextNode(`${summary.noticeCount} ${summary.noticeCount === 1 ? "notice" : "notices"}; `),
        latest,
        document.createTextNode(`; ${summary.latestDonId}`)
      );

      const title = document.createElement("h3");
      title.className = "area-title";
      title.textContent = summary.area;

      const note = document.createElement("p");
      note.className = "area-note";
      note.textContent = summary.latestTitle;

      content.append(meta, title, note);

      const link = document.createElement("a");
      link.className = "source-link";
      link.href = summary.latestUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.innerHTML = `View notice <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>`;

      item.append(content, link);
      list.append(item);
    });
  }

  setText("[data-who-area-updated]", isLive
    ? joinDetails("WHO notice geography", formatCheckedAt(sourceMeta.fetchedAt))
    : sourceMeta.areaStatus || "WHO geography unavailable");
};

const formatTrendLabel = (isoDate) => {
  if (!isoDate) return "No date";

  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
};

const formatTrendAccessibleLabel = (count, isoDate) => {
  const noticeCount = Number(count) || 0;
  return `${noticeCount} ${noticeCount === 1 ? "notice" : "notices"} on ${formatTrendLabel(isoDate)}`;
};

const formatWhoTrendSummary = (trend = []) => {
  const datedTrend = trend
    .map((item) => ({
      count: Number(item.count) || 0,
      date: item.date || ""
    }))
    .filter((item) => item.date);

  if (!datedTrend.length) {
    return "No dated WHO notices were available for the trend.";
  }

  const total = datedTrend.reduce((sum, item) => sum + item.count, 0);
  const peak = datedTrend.reduce((highest, item) => (
    item.count > highest.count
    || (item.count === highest.count && item.date.localeCompare(highest.date) > 0)
      ? item
      : highest
  ), datedTrend[0]);
  const latest = datedTrend.reduce((newest, item) => (
    item.date.localeCompare(newest.date) > 0 ? item : newest
  ), datedTrend[0]);
  const noticeLabel = total === 1 ? "notice" : "notices";
  const dayLabel = datedTrend.length === 1 ? "publication day" : "publication days";

  return `${total} ${noticeLabel} across ${datedTrend.length} ${dayLabel}; peak ${peak.count} on ${formatTrendLabel(peak.date)}; latest ${formatTrendLabel(latest.date)}`;
};

const renderWhoTrend = (trend = [], isLive, sourceMeta = {}) => {
  const grid = document.querySelector("[data-who-trend-grid]");
  if (!grid) return;

  grid.innerHTML = "";

  if (!isLive || !trend.length) {
    grid.classList?.add("is-empty");
    const summary = isLive
      ? "No dated WHO notices were available for the trend."
      : "WHO notice trend is unavailable until live notices load.";
    const empty = document.createElement("p");
    empty.className = "empty-copy mb-0";
    empty.textContent = summary;
    grid.append(empty);
    setText("[data-who-trend-summary]", summary);
    setText("[data-who-trend-updated]", isLive ? "No dated notices" : "Source unavailable");
    return;
  }

  grid.classList?.remove("is-empty");
  setText("[data-who-trend-summary]", formatWhoTrendSummary(trend));
  const maxCount = Math.max(...trend.map((item) => Number(item.count) || 0), 1);

  trend.forEach((item) => {
    const count = Number(item.count) || 0;
    const bar = document.createElement("div");
    bar.className = "trend-day";
    bar.setAttribute("role", "listitem");
    bar.setAttribute("aria-label", formatTrendAccessibleLabel(count, item.date));

    const fill = document.createElement("span");
    fill.style.height = `${Math.max(18, Math.round((count / maxCount) * 100))}%`;
    fill.title = formatTrendAccessibleLabel(count, item.date);
    fill.setAttribute("aria-hidden", "true");

    const label = document.createElement("small");
    label.textContent = formatTrendLabel(item.date);

    const value = document.createElement("strong");
    value.textContent = String(count);

    bar.append(fill, label, value);
    grid.append(bar);
  });

  setText("[data-who-trend-updated]", joinDetails("WHO notice dates", formatCheckedAt(sourceMeta.fetchedAt)));
};

const renderNotices = (notices, isLive, sourceMeta = {}) => {
  const list = document.querySelector("[data-who-list]");
  if (!list) return;

  list.innerHTML = "";
  const formattedNotices = notices.map(formatNotice);

  if (!formattedNotices.length) {
    const empty = document.createElement("p");
    empty.className = "empty-copy mb-0";
    empty.textContent = isLive
      ? "No WHO Disease Outbreak News notices were returned."
      : "WHO notices are unavailable right now.";
    list.append(empty);
  }

  formattedNotices.forEach((notice) => {
    const article = document.createElement("article");
    article.className = "notice-item";

    const meta = document.createElement("p");
    meta.className = "notice-meta-row";

    const published = document.createElement(notice.publishedAt ? "time" : "span");
    published.className = "notice-meta";
    published.textContent = notice.publishedAt
      ? formatWhoPublishedAt(notice.publishedAt, notice.date)
      : notice.date;
    if (notice.publishedAt) {
      published.dateTime = notice.publishedAt;
    }
    meta.append(published);

    [notice.location, notice.donId].forEach((value) => {
      const item = document.createElement("span");
      item.className = "notice-meta";
      item.textContent = value;
      meta.append(item);
    });

    const title = document.createElement("h3");
    title.className = "notice-title";

    const link = document.createElement("a");
    link.href = notice.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = notice.title;
    title.append(link);

    const summary = document.createElement("p");
    summary.className = "notice-summary";
    summary.textContent = notice.summary;

    article.append(meta, title, summary);
    list.append(article);
  });

  setText("[data-who-count]", String(notices.length));
  setText("[data-who-note]", isLive ? "Live WHO notices" : sourceMeta.statusLabel || "No live WHO data");
  const whoNote = document.querySelector("[data-who-note]");
  if (whoNote) {
    whoNote.classList.toggle("text-warning", !isLive);
    whoNote.classList.toggle("text-secondary", isLive);
  }
  setMetricCardState("who", isLive ? "live" : "warning");
  setText("[data-who-updated]", isLive ? "WHO proxy cache" : sourceMeta.freshness || "Source unavailable");
  setText("[data-who-signal-basis]", isLive ? "Live event notices" : sourceMeta.statusLabel || "Source unavailable");
  setText("[data-who-source-window]", isLive
    ? formatWhoNoticeWindow(sourceMeta.noticeWindow)
    : sourceMeta.sourceWindow || "No live notice window");
  setSourceDetail("who", {
    freshness: isLive
      ? joinDetails(formatCheckedAt(sourceMeta.fetchedAt), formatCacheWindow(sourceMeta.cacheSeconds))
      : sourceMeta.freshness || "WHO source unavailable",
    isLive,
    isWarning: !isLive,
    status: isLive ? "Live" : sourceMeta.statusLabel || "Unavailable"
  });
  renderAreaSummary(
    Array.isArray(sourceMeta.areas) ? sourceMeta.areas : [],
    isLive,
    sourceMeta
  );
  renderWhoTrend(Array.isArray(sourceMeta.trend) ? sourceMeta.trend : [], isLive, sourceMeta);
};

const getWhoUnavailableState = (error = {}) => {
  const isRouteUnavailable = error.status === 404;

  return {
    areaStatus: isRouteUnavailable ? "WHO route unavailable" : "WHO geography unavailable",
    freshness: isRouteUnavailable ? "Run with server API routes for WHO notices" : "Try refreshing again later",
    sourceWindow: isRouteUnavailable ? "WHO route unavailable" : "Live notice window unavailable",
    statusLabel: isRouteUnavailable ? "Route unavailable" : "Unavailable"
  };
};

const loadWhoNotices = async () => {
  try {
    setBusy("[data-who-list]", true);
    const data = await fetchJson(API.who);
    const notices = Array.isArray(data.notices) ? data.notices : [];
    const isLive = notices.length > 0;
    renderNotices(notices, isLive, {
      ...data,
      areaStatus: isLive ? undefined : "No affected areas returned",
      freshness: isLive
        ? undefined
        : joinDetails(formatCheckedAt(data.fetchedAt), formatCacheWindow(data.cacheSeconds)) || "No notices returned",
      sourceWindow: isLive ? undefined : "No notices returned",
      statusLabel: isLive ? undefined : "No data"
    });
    return isLive;
  } catch (error) {
    const unavailable = getWhoUnavailableState(error);
    renderNotices([], false, unavailable);
    return false;
  } finally {
    setBusy("[data-who-list]", false);
  }
};

const buildAirNowUrl = () => {
  const params = new URLSearchParams({
    zipCode: airNowQuery.zipCode,
    distance: String(airNowQuery.distance)
  });

  return `${API.airnow}?${params.toString()}`;
};

const renderAirQuality = (reading, isLive, sourceMeta = {}) => {
  syncAirNowLocationText();
  const areaLabel = formatAirNowArea(reading);
  const pollutantLabel = reading.pollutant && reading.pollutant !== "AQI"
    ? `${reading.pollutant}: ${reading.category}`
    : reading.category;
  const healthGuidance = isLive
    ? reading.healthGuidance || getAqiHealthGuidance(reading.category) || "Health guidance unavailable for this AQI category"
    : sourceMeta.healthGuidance || "Available when live AQI is returned";
  const severityBand = isLive
    ? getAqiSeverityBand(reading.category) || "Severity band unavailable for this AQI category"
    : sourceMeta.severityBand || "Available when live AQI is returned";
  const observed = isLive
    ? reading.observedAt || "Observation time unavailable"
    : sourceMeta.observed || "Waiting for live observations";
  const areaMatch = sourceMeta.areaMatch || formatAirNowAreaMatch(reading, isLive);
  const aqiBasis = sourceMeta.aqiBasis || formatAirNowAqiBasis(reading, isLive);
  const statusLabel = isLive ? "Live" : sourceMeta.statusLabel || "API key needed";

  setText("[data-airnow-aqi]", String(reading.aqi));
  setText("[data-airnow-note]", isLive ? `${pollutantLabel} near ${areaLabel}` : reading.category);
  setText("[data-airnow-signal-basis]", isLive ? `Live near ${areaLabel}` : sourceMeta.statusLabel || "API key needed");
  setText("[data-airnow-source-observed]", observed);
  setText("[data-airnow-area-match]", areaMatch);
  setText("[data-airnow-aqi-basis]", aqiBasis);
  setText("[data-airnow-severity-band]", severityBand);
  setText("[data-airnow-health-guidance]", healthGuidance);
  setText("[data-airnow-snapshot-aqi]", String(reading.aqi));
  setText("[data-airnow-snapshot-category]", isLive ? pollutantLabel : reading.category);
  setText("[data-airnow-snapshot-area]", isLive ? areaLabel : areaMatch);
  setText("[data-airnow-snapshot-observed]", observed);
  setText("[data-airnow-snapshot-basis]", aqiBasis);
  setText("[data-airnow-snapshot-band]", severityBand);
  setText("[data-airnow-snapshot-health]", healthGuidance);
  setAirNowSnapshotStatus(statusLabel, isLive);
  setAqiTone("[data-airnow-note]", isLive ? reading.category : "");
  setAqiTone("[data-airnow-severity-band]", isLive ? reading.category : "");
  setAqiTone("[data-airnow-snapshot-category]", isLive ? reading.category : "");
  setAqiTone("[data-airnow-snapshot-band]", isLive ? reading.category : "");
  setMetricCardState("airnow", isLive ? "live" : "warning");
  setSourceDetail("airnow", {
    freshness: isLive
      ? joinDetails(formatCheckedAt(sourceMeta.fetchedAt), formatCacheWindow(sourceMeta.cacheSeconds))
      : sourceMeta.freshness || "AirNow API key not configured",
    isLive,
    isWarning: !isLive,
    status: statusLabel
  });
};

const normalizeAirNowReading = (items) => {
  const readingsWithAqi = items.filter((item) => Number.isFinite(item.AQI));
  const reading = readingsWithAqi.length
    ? readingsWithAqi.reduce((highest, item) => (item.AQI > highest.AQI ? item : highest))
    : items[0];
  if (!reading) return fallbackAirQuality;

  const category = normalizeAqiCategory(reading.Category?.Name, reading.AQI) || "Category unavailable";

  return {
    aqi: reading.AQI ?? "--",
    observedAt: formatAirNowObservedAt(reading),
    category,
    healthGuidance: getAqiHealthGuidance(category),
    area: reading.ReportingArea || "AirNow reporting area",
    stateCode: reading.StateCode || "",
    pollutant: reading.ParameterName || "AQI",
    aqiReadingCount: readingsWithAqi.length || items.length
  };
};

const getAirNowFallbackState = (error = {}) => {
  const isUnconfigured = error.status === 503 || error.payload?.status === "unconfigured";
  const isRouteUnavailable = error.status === 404;

  if (isUnconfigured) {
    return { ...AIRNOW_FALLBACK_STATES.unconfigured };
  }

  if (isRouteUnavailable) {
    return { ...AIRNOW_FALLBACK_STATES.routeUnavailable };
  }

  return { ...AIRNOW_FALLBACK_STATES.unavailable };
};

const loadAirQuality = async () => {
  try {
    const data = await fetchJson(buildAirNowUrl());
    const readings = Array.isArray(data.readings) ? data.readings : [];
    const isLive = readings.length > 0;
    renderAirQuality(isLive ? normalizeAirNowReading(readings) : noAirQualityReading, isLive, {
      ...data,
      freshness: isLive
        ? undefined
        : joinDetails(formatCheckedAt(data.fetchedAt), formatCacheWindow(data.cacheSeconds)) || "No observations returned",
      areaMatch: isLive ? undefined : "No reporting area returned for selected scope",
      statusLabel: isLive ? undefined : "No data",
      severityBand: isLive ? undefined : "No AQI severity band returned for selected scope"
    });
    return isLive;
  } catch (error) {
    const fallback = getAirNowFallbackState(error);
    renderAirQuality({
      ...fallbackAirQuality,
      category: fallback.category
    }, false, {
      freshness: fallback.freshness,
      healthGuidance: fallback.healthGuidance,
      observed: fallback.observed,
      areaMatch: fallback.areaMatch,
      aqiBasis: fallback.aqiBasis,
      severityBand: fallback.severityBand,
      statusLabel: fallback.statusLabel
    });
    return false;
  }
};

const setRefreshState = (isRefreshing) => {
  const button = document.querySelector("#refreshButton");
  if (!button) return;

  button.disabled = isRefreshing;
  button.innerHTML = isRefreshing
    ? `<i class="fa-solid fa-rotate me-2" aria-hidden="true"></i>Refreshing`
    : `<i class="fa-solid fa-rotate me-2" aria-hidden="true"></i>Refresh`;
};

const setAirNowFormState = (isRefreshing) => {
  const form = document.querySelector("[data-airnow-form]");
  if (!form) return;

  form.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = isRefreshing;
  });
};

const loadDashboard = async () => {
  setRefreshState(true);
  setAirNowFormState(true);
  updateSourceReadiness(0, 0);
  setStatusBadge("Checking sources");
  setText("[data-dashboard-status]", "Refreshing sources");

  try {
    const results = await Promise.allSettled([
      loadWhoNotices(),
      loadAirQuality()
    ]);
    const fallbackCount = results.filter((result) => result.status === "rejected" || !result.value).length;
    const liveCount = results.length - fallbackCount;
    const isPartial = liveCount > 0 && fallbackCount > 0;
    const hasNoLiveSources = liveCount === 0;

    updateSourceReadiness(liveCount, results.length);
    setText("[data-dashboard-status]", fallbackCount ? "Some sources need attention" : "Sources refreshed");
    setStatusBadge(liveCount ? `${liveCount}/${results.length} live sources` : "No live sources", isPartial || hasNoLiveSources);
    setText("[data-dashboard-checked]", formatLastChecked());
  } finally {
    setRefreshState(false);
    setAirNowFormState(false);
  }
};

const initializeAirNowForm = () => {
  const form = document.querySelector("[data-airnow-form]");
  if (!form) return;

  const zipInput = form.elements.namedItem("zipCode");
  const distanceInput = form.elements.namedItem("distance");

  if (zipInput) zipInput.value = airNowQuery.zipCode;
  if (distanceInput) distanceInput.value = String(airNowQuery.distance);
  syncAirNowLocationText();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    setAirNowZipValidity(form, zipInput, true);

    airNowQuery.zipCode = normalizeZipCode(zipInput?.value);
    airNowQuery.distance = normalizeDistance(distanceInput?.value);
    syncAirNowLocationText();
    loadDashboard();
  });

  zipInput?.addEventListener("invalid", () => {
    setAirNowZipValidity(form, zipInput, false);
  });

  zipInput?.addEventListener("input", () => {
    if (zipInput.checkValidity()) {
      setAirNowZipValidity(form, zipInput, true);
      setText(
        "[data-airnow-location-note]",
        `Ready to update to ZIP ${zipInput.value.trim()}, ${normalizeDistance(distanceInput?.value)}-mile radius.`
      );
    }
  });
};

document.querySelector("#refreshButton")?.addEventListener("click", loadDashboard);
initializeAirNowForm();
loadDashboard();
