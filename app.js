const API = {
  who: "/api/who",
  airnow: "/api/airnow"
};

const config = window.PULSE_CONFIG || {};
const SOURCE_TIMEOUT_MS = 10000;

const fallbackNotices = [
  {
    title: "WHO Disease Outbreak News source ready",
    date: "Fallback",
    summary: "Live notices will appear here when the public WHO endpoint is reachable.",
    url: "https://www.who.int/emergencies/disease-outbreak-news"
  }
];

const fallbackAirQuality = {
  aqi: "--",
  category: "AirNow key not configured",
  area: "AirNow current observations"
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

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeoutId));

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

const formatNotice = (notice) => {
  const summary = notice.summary || stripHtml(notice.Summary || notice.Overview);
  const sourceUrl = notice.url || notice.ItemDefaultUrl || "/emergencies/disease-outbreak-news";
  const url = sourceUrl.startsWith("http")
    ? sourceUrl
    : `https://www.who.int${sourceUrl}`;

  return {
    title: notice.title || notice.Title || "Untitled WHO notice",
    date: notice.date || notice.FormattedDate || "Date unavailable",
    summary: summary || "No summary available from source.",
    url
  };
};

const renderNotices = (notices, isLive) => {
  const list = document.querySelector("[data-who-list]");
  if (!list) return;

  list.innerHTML = "";
  notices.map(formatNotice).forEach((notice) => {
    const article = document.createElement("article");
    article.className = "notice-item";

    const meta = document.createElement("p");
    meta.className = "notice-meta";
    meta.textContent = notice.date;

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
  setText("[data-who-note]", isLive ? "Live WHO notices" : "Fallback sample");
  setText("[data-status-badge]", isLive ? "Live source" : "Sample fallback");
  setText("[data-who-updated]", isLive ? "WHO proxy cache" : "Fallback data");
};

const loadWhoNotices = async () => {
  try {
    setBusy("[data-who-list]", true);
    const data = await fetchJson(API.who);
    const notices = Array.isArray(data.notices) ? data.notices : [];
    const isLive = notices.length > 0;
    renderNotices(isLive ? notices : fallbackNotices, isLive);
    return isLive;
  } catch (error) {
    renderNotices(fallbackNotices, false);
    return false;
  } finally {
    setBusy("[data-who-list]", false);
  }
};

const buildAirNowUrl = () => {
  const params = new URLSearchParams({
    zipCode: config.AIRNOW_ZIP_CODE || "10001",
    distance: String(config.AIRNOW_DISTANCE_MILES || 25)
  });

  return `${API.airnow}?${params.toString()}`;
};

const renderAirQuality = (reading, isLive) => {
  setText("[data-airnow-aqi]", String(reading.aqi));
  setText("[data-airnow-note]", isLive ? `${reading.category} near ${reading.area}` : reading.category);
  setText("[data-airnow-status]", isLive ? "Live" : "Ready");

  const status = document.querySelector("[data-airnow-status]");
  if (status) {
    status.classList.toggle("is-live", isLive);
  }
};

const normalizeAirNowReading = (items) => {
  const reading = items.find((item) => Number.isFinite(item.AQI)) || items[0];
  if (!reading) return fallbackAirQuality;

  return {
    aqi: reading.AQI ?? "--",
    category: reading.Category?.Name || "Category unavailable",
    area: reading.ReportingArea || "AirNow reporting area"
  };
};

const loadAirQuality = async () => {
  try {
    const data = await fetchJson(buildAirNowUrl());
    const readings = Array.isArray(data.readings) ? data.readings : [];
    const isLive = readings.length > 0;
    renderAirQuality(normalizeAirNowReading(readings), isLive);
    return isLive;
  } catch (error) {
    renderAirQuality(fallbackAirQuality, false);
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

const loadDashboard = async () => {
  setRefreshState(true);
  setText("[data-dashboard-status]", "Refreshing sources");

  try {
    const results = await Promise.allSettled([
      loadWhoNotices(),
      loadAirQuality()
    ]);
    const fallbackCount = results.filter((result) => result.status === "rejected" || !result.value).length;

    setText("[data-dashboard-status]", fallbackCount ? "Some sources unavailable" : "Sources refreshed");
  } finally {
    setRefreshState(false);
  }
};

document.querySelector("#refreshButton")?.addEventListener("click", loadDashboard);
loadDashboard();
