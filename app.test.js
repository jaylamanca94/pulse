const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function runAppHelper(expression) {
  const source = fs.readFileSync("app.js", "utf8");
  const helperSource = source.split("const loadAirQuality = async () => {")[0];
  const context = {
    window: {
      PULSE_CONFIG: {}
    }
  };

  return vm.runInNewContext(`${helperSource}\n${expression}`, context);
}

test("AirNow reading normalization selects the highest AQI observation", () => {
  const result = runAppHelper(`(() => {
    const reading = normalizeAirNowReading([
    {
      AQI: 42,
      Category: { Name: "Good" },
      DateObserved: "2026-06-12",
      HourObserved: 9,
      LocalTimeZone: "EST",
      ParameterName: "OZONE",
      ReportingArea: "New York"
    },
    {
      AQI: 151,
      Category: { Name: "Unhealthy" },
      DateObserved: "2026-06-12",
      HourObserved: 10,
      LocalTimeZone: "EST",
      ParameterName: "PM2.5",
      ReportingArea: "New York"
    }
    ]);

    return {
      reading,
      basis: formatAirNowAqiBasis(reading, true),
      severityBand: getAqiSeverityBand(reading.category)
    };
  })()`);
  const { basis, reading, severityBand } = result;

  assert.equal(reading.aqi, 151);
  assert.equal(reading.category, "Unhealthy");
  assert.equal(reading.pollutant, "PM2.5");
  assert.equal(reading.observedAt, "2026-06-12 10:00 AM EST");
  assert.equal(reading.aqiReadingCount, 2);
  assert.equal(basis, "2 pollutant AQI readings; displayed PM2.5 as highest AQI");
  assert.equal(severityBand, "Unhealthy, 151-200");
});

test("AirNow severity band follows official AQI category ranges", () => {
  const result = runAppHelper(`(() => ([
    getAqiSeverityBand("Good"),
    getAqiSeverityBand("Moderate"),
    getAqiSeverityBand("Unhealthy for Sensitive Groups"),
    getAqiSeverityBand("Very Unhealthy"),
    getAqiSeverityBand("Hazardous"),
    getAqiSeverityBand("Unknown")
  ]))()`);

  assert.equal(JSON.stringify(result), JSON.stringify([
    "Good, 0-50",
    "Moderate, 51-100",
    "Unhealthy for Sensitive Groups, 101-150",
    "Very Unhealthy, 201-300",
    "Hazardous, 301+",
    ""
  ]));
});

test("AirNow category tone classes follow official AQI levels", () => {
  const result = runAppHelper(`(() => ([
    getAqiToneClass("Good"),
    getAqiToneClass("Moderate"),
    getAqiToneClass(" unhealthy-sensitive "),
    getAqiToneClass("Unhealthy for Sensitive Groups"),
    getAqiToneClass("Unhealthy"),
    getAqiToneClass("Very Unhealthy"),
    getAqiToneClass("Hazardous"),
    getAqiToneClass("Unknown")
  ]))()`);

  assert.equal(JSON.stringify(result), JSON.stringify([
    "aqi-good",
    "aqi-moderate",
    "aqi-unhealthy-sensitive",
    "aqi-unhealthy-sensitive",
    "aqi-unhealthy",
    "aqi-very-unhealthy",
    "aqi-hazardous",
    ""
  ]));
});

test("AirNow reading derives official category from numeric AQI when missing", () => {
  const result = runAppHelper(`(() => {
    const reading = normalizeAirNowReading([
      {
        AQI: 214,
        DateObserved: "2026-06-12",
        HourObserved: 16,
        LocalTimeZone: "EST",
        ParameterName: "PM2.5",
        ReportingArea: "New York"
      }
    ]);

    return {
      category: reading.category,
      healthGuidance: reading.healthGuidance,
      severityBand: getAqiSeverityBand(reading.category)
    };
  })()`);

  assert.equal(result.category, "Very Unhealthy");
  assert.equal(result.healthGuidance, "Health alert; everyone faces increased risk from outdoor air.");
  assert.equal(result.severityBand, "Very Unhealthy, 201-300");
});

test("AirNow reading normalizes source category labels before deriving meaning", () => {
  const result = runAppHelper(`(() => {
    const reading = normalizeAirNowReading([
      {
        AQI: 135,
        Category: { Name: " unhealthy-sensitive " },
        DateObserved: "2026-06-12",
        HourObserved: 11,
        LocalTimeZone: "EST",
        ParameterName: "OZONE",
        ReportingArea: "New York"
      }
    ]);

    return {
      category: reading.category,
      healthGuidance: reading.healthGuidance,
      severityBand: getAqiSeverityBand(reading.category),
      toneClass: getAqiToneClass(reading.category)
    };
  })()`);

  assert.equal(result.category, "Unhealthy for Sensitive Groups");
  assert.equal(result.healthGuidance, "Sensitive groups should reduce prolonged or heavy outdoor exertion.");
  assert.equal(result.severityBand, "Unhealthy for Sensitive Groups, 101-150");
  assert.equal(result.toneClass, "aqi-unhealthy-sensitive");
});

test("AirNow reading uses numeric AQI when source category label is not recognized", () => {
  const result = runAppHelper(`(() => {
    const reading = normalizeAirNowReading([
      {
        AQI: 82,
        Category: { Name: "Not Available" },
        DateObserved: "2026-06-12",
        HourObserved: 12,
        LocalTimeZone: "EST",
        ParameterName: "PM2.5",
        ReportingArea: "New York"
      }
    ]);

    return {
      category: reading.category,
      severityBand: getAqiSeverityBand(reading.category)
    };
  })()`);

  assert.equal(result.category, "Moderate");
  assert.equal(result.severityBand, "Moderate, 51-100");
});

test("WHO notice helpers preserve exact source publication time", () => {
  const result = runAppHelper(`(() => {
    const notice = formatNotice({
      title: "Marburg virus disease, Germany",
      date: "10 June 2026",
      donId: "2026-DON607",
      location: "Germany",
      publishedAt: "2026-06-10T09:15:00Z",
      summary: "New event reported.",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON607"
    });

    return {
      label: formatWhoPublishedAt(notice.publishedAt, notice.date),
      publishedAt: notice.publishedAt
    };
  })()`);

  assert.equal(result.publishedAt, "2026-06-10T09:15:00Z");
  assert.match(result.label, /^Published /);
  assert.match(result.label, /2026/);
  assert.match(result.label, /UTC/);
});

test("WHO notice rows render source publication time as datetime metadata", () => {
  const result = runAppHelper(`(() => {
    const makeElement = (tagName) => ({
      tagName,
      children: [],
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      set innerHTML(value) {
        this.children = [];
      }
    });
    const targets = new Map();

    globalThis.document = {
      createElement: makeElement,
      querySelector(selector) {
        if (!targets.has(selector)) {
          targets.set(selector, makeElement("div"));
        }

        return targets.get(selector);
      }
    };

    renderNotices([
      {
        title: "Marburg virus disease, Germany",
        date: "10 June 2026",
        donId: "2026-DON607",
        location: "Germany",
        publishedAt: "2026-06-10T09:15:00Z",
        summary: "New event reported.",
        url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON607"
      }
    ], true, {
      areas: [],
      fetchedAt: "2026-06-12T09:00:00Z",
      noticeWindow: {
        count: 1,
        latestDate: "10 June 2026",
        oldestDate: "10 June 2026"
      }
    });

    const list = targets.get("[data-who-list]");
    const article = list.children[0];
    const metaRow = article.children[0];
    const published = metaRow.children[0];

    return {
      dateTime: published.dateTime,
      tagName: published.tagName,
      text: published.textContent
    };
  })()`);

  assert.equal(result.tagName, "time");
  assert.equal(result.dateTime, "2026-06-10T09:15:00Z");
  assert.match(result.text, /^Published /);
});

test("WHO area summaries render latest source publication time", () => {
  const result = runAppHelper(`(() => {
    const makeElement = (tagName) => ({
      tagName,
      children: [],
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      set innerHTML(value) {
        this.children = [];
      }
    });
    const targets = new Map();

    globalThis.document = {
      createElement: makeElement,
      createTextNode(textContent) {
        return { tagName: "#text", textContent };
      },
      querySelector(selector) {
        if (!targets.has(selector)) {
          targets.set(selector, makeElement("div"));
        }

        return targets.get(selector);
      }
    };

    renderAreaSummary([
      {
        area: "Uganda",
        latestDate: "8 June 2026",
        latestDonId: "2026-DON606",
        latestPublishedAt: "2026-06-08T12:35:09Z",
        latestTitle: "Ebola disease caused by Bundibugyo virus, Uganda",
        latestUrl: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON606",
        noticeCount: 2
      }
    ], true, {
      fetchedAt: "2026-06-12T09:00:00Z"
    });

    const list = targets.get("[data-who-area-list]");
    const item = list.children[0];
    const content = item.children[0];
    const meta = content.children[0];
    const latest = meta.children[1];

    return {
      dateTime: latest.dateTime,
      tagName: latest.tagName,
      text: latest.textContent
    };
  })()`);

  assert.equal(result.tagName, "time");
  assert.equal(result.dateTime, "2026-06-08T12:35:09Z");
  assert.match(result.text, /^latest /);
  assert.match(result.text, /UTC/);
});

test("AirNow area match keeps the reporting area distinct from the request scope", () => {
  const result = runAppHelper(`(() => {
    airNowQuery.zipCode = "10001";
    airNowQuery.distance = 50;

    const reading = normalizeAirNowReading([
      {
        AQI: 74,
        Category: { Name: "Moderate" },
        DateObserved: "2026-06-12",
        HourObserved: 13,
        LocalTimeZone: "EST",
        ParameterName: "OZONE",
        ReportingArea: "New York City Region",
        StateCode: "NY"
      }
    ]);

    return {
      area: formatAirNowArea(reading),
      match: formatAirNowAreaMatch(reading, true)
    };
  })()`);

  assert.equal(result.area, "New York City Region, NY");
  assert.equal(result.match, "New York City Region, NY for ZIP 10001, 50-mile radius");
});

test("AirNow fallback state distinguishes missing API routes from source outages", () => {
  const result = runAppHelper(`(() => getAirNowFallbackState({ status: 404 }))()`);

  assert.equal(result.category, "AirNow route unavailable");
  assert.equal(result.freshness, "Run with server API routes for live AQI");
  assert.equal(result.observed, "AirNow route unavailable");
  assert.equal(result.statusLabel, "Route unavailable");
});

test("WHO fallback state uses route-unavailable status language", () => {
  const result = runAppHelper(`(() => getWhoUnavailableState({ status: 404 }))()`);

  assert.equal(result.areaStatus, "WHO route unavailable");
  assert.equal(result.freshness, "Run with server API routes for WHO notices");
  assert.equal(result.sourceWindow, "WHO route unavailable");
  assert.equal(result.statusLabel, "Route unavailable");
});

test("AirNow fallback state uses audience-facing unconfigured language", () => {
  const result = runAppHelper(`(() => getAirNowFallbackState({ status: 503, payload: { status: "unconfigured" } }))()`);

  assert.equal(result.category, "AirNow API key not configured");
  assert.equal(result.freshness, "AirNow API key not configured");
  assert.equal(result.observed, "Available after AirNow is configured");
  assert.equal(result.statusLabel, "Key needed");
});
