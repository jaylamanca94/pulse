const WHO_DON_URL =
  "https://www.who.int/api/hubs/diseaseoutbreaknews?$orderby=PublicationDateAndTime%20desc&$top=5";

const config = window.PULSE_CONFIG || {};

const fallbackNotices = [
  {
    Title: "WHO Disease Outbreak News source ready",
    FormattedDate: "Fallback",
    Summary: "Live notices will appear here when the public WHO endpoint is reachable.",
    ItemDefaultUrl: "/emergencies/disease-outbreak-news"
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

const formatNotice = (notice) => {
  const summary = stripHtml(notice.Summary || notice.Overview);
  const url = notice.ItemDefaultUrl?.startsWith("http")
    ? notice.ItemDefaultUrl
    : `https://www.who.int${notice.ItemDefaultUrl || "/emergencies/disease-outbreak-news"}`;

  return {
    title: notice.Title || "Untitled WHO notice",
    date: notice.FormattedDate || "Date unavailable",
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
  setText("[data-who-updated]", isLive ? "WHO public API" : "Fallback data");
};

const loadWhoNotices = async () => {
  try {
    const response = await fetch(WHO_DON_URL);
    if (!response.ok) throw new Error(`WHO request failed: ${response.status}`);

    const data = await response.json();
    const notices = Array.isArray(data.value) ? data.value : [];
    renderNotices(notices.length ? notices : fallbackNotices, notices.length > 0);
  } catch (error) {
    renderNotices(fallbackNotices, false);
  }
};

const buildAirNowUrl = () => {
  const params = new URLSearchParams({
    zipCode: config.AIRNOW_ZIP_CODE || "10001",
    distance: String(config.AIRNOW_DISTANCE_MILES || 25)
  });

  return `/api/airnow?${params.toString()}`;
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
    const response = await fetch(buildAirNowUrl());
    if (!response.ok) throw new Error(`AirNow request failed: ${response.status}`);

    const data = await response.json();
    const readings = Array.isArray(data.readings) ? data.readings : [];
    renderAirQuality(normalizeAirNowReading(readings), readings.length > 0);
  } catch (error) {
    renderAirQuality(fallbackAirQuality, false);
  }
};

loadWhoNotices();
loadAirQuality();
