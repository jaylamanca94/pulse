const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const htmlPages = [
  "index.html",
  "environment.html",
  "disease.html",
  "sources.html",
  "model.html"
];

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

function runAppBeforeBoot(expression) {
  const source = fs.readFileSync("app.js", "utf8");
  const helperSource = source.split('\ndocument.querySelector("#refreshButton")')[0];
  const context = {
    window: {
      PULSE_CONFIG: {}
    }
  };

  return vm.runInNewContext(`${helperSource}\n${expression}`, context);
}

test("HTML pages request the current shared app assets", () => {
  htmlPages.forEach((page) => {
    const html = fs.readFileSync(page, "utf8");

    assert.match(html, /styles\.css\?v=20260620-dock-placement/);
    assert.match(html, /app\.js\?v=20260620-visual/);
  });
});

test("Dashboard keeps a visible source freshness timestamp", () => {
  const html = fs.readFileSync("index.html", "utf8");

  assert.match(html, /data-dashboard-checked/);
  assert.match(html, /Not checked yet/);
});

test("Mobile dock keeps safe-area positioning and visible keyboard focus", () => {
  const css = fs.readFileSync("styles.css", "utf8");

  assert.match(css, /\.pulse-primary-nav\.acadia-mobile-dock\s*\{[^}]*bottom:\s*calc\(var\(--acadia-mobile-tabbar-bottom,\s*1\.25rem\) \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.pulse-primary-nav\.acadia-mobile-dock\s*\{[^}]*top:\s*auto/s);
  assert.match(css, /\.pulse-primary-nav\.acadia-mobile-dock \.acadia-nav-item:focus-visible\s*\{[^}]*var\(--acadia-focus-ring\)/s);
  assert.match(css, /\.pulse-primary-nav\.acadia-mobile-dock \.acadia-nav-item:focus-visible\s*\{[^}]*outline:\s*0/s);
});

test("Dashboard signal cards keep state rails and evidence row surfaces", () => {
  const css = fs.readFileSync("styles.css", "utf8");

  assert.match(css, /\.pulse-signal-card::before\s*\{[^}]*height:\s*0\.1875rem/s);
  assert.match(css, /\.pulse-signal-card\.is-warning::before\s*\{[^}]*var\(--acadia-color-warning\)/s);
  assert.match(css, /\.pulse-signal-card\.is-live \.pulse-card-icon\s*\{[^}]*var\(--acadia-color-success-bg\)/s);
  assert.match(css, /\.pulse-watch-list li\s*\{[^}]*border-radius:\s*var\(--acadia-radius-md\)/s);
  assert.match(css, /\.pulse-watch-list li\s*\{[^}]*box-shadow:\s*var\(--acadia-shadow-control\)/s);
});

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

test("WHO notice window uses exact publication time when available", () => {
  const result = runAppHelper(`(() => formatWhoNoticeWindow({
    count: 4,
    latestDate: "10 June 2026",
    latestPublishedAt: "2026-06-10T09:15:00Z",
    oldestDate: "29 May 2026",
    oldestPublishedAt: "2026-05-29T12:00:00Z"
  }))()`);

  assert.match(result, /^4 notices from /);
  assert.match(result, /2026/);
  assert.match(result, /UTC/);
  assert.doesNotMatch(result, /29 May 2026 to 10 June 2026/);
});

test("Disease snapshot elevates signal context over source metadata", () => {
  const result = runAppHelper(`(() => getDiseaseSnapshot([
    formatNotice({
      title: "Ebola disease caused by Bundibugyo virus, Democratic Republic of the Congo and Uganda",
      date: "13 June 2026",
      donId: "2026-DON607",
      location: "Democratic Republic of the Congo",
      publishedAt: "2026-06-13T08:06:00Z",
      summary: "New outbreak update.",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON607"
    }),
    formatNotice({
      title: "Hantavirus outbreak linked to cruise ship travel, Multi-country",
      date: "13 May 2026",
      donId: "2026-DON601",
      location: "Multi-country",
      publishedAt: "2026-05-13T18:00:00Z",
      summary: "Multi-country event.",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON601"
    }),
    formatNotice({
      title: "Ebola disease caused by Bundibugyo virus, Uganda",
      date: "28 May 2026",
      donId: "2026-DON604",
      location: "Uganda",
      publishedAt: "2026-05-28T18:00:00Z",
      summary: "Outbreak update.",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON604"
    })
  ], {
    areas: [
      {
        area: "Location not specified",
        latestDate: "21 May 2026",
        noticeCount: 12
      },
      {
        area: "Democratic Republic of the Congo",
        latestDate: "13 June 2026",
        noticeCount: 4
      }
    ],
    trend: [
      { count: 1, date: "2026-05-13" },
      { count: 1, date: "2026-05-16" },
      { count: 1, date: "2026-05-21" },
      { count: 1, date: "2026-05-28" },
      { count: 1, date: "2026-06-13" }
    ]
  }, true))()`);
  const topicFromDash = runAppHelper(`(() => getDiseaseTopic("Ebola disease caused by Bundibugyo virus – Democratic Republic of the Congo"))()`);

  assert.equal(result.mostActive, "Democratic Republic of the Congo");
  assert.equal(result.frequency, "5 publication days; 5 notices");
  assert.match(result.mostRecent, /Jun 13, 2026/);
  assert.match(result.mostRecent, /Ebola disease caused by Bundibugyo virus/);
  assert.equal(result.primaryTopic, "Ebola disease caused by Bundibugyo virus");
  assert.equal(topicFromDash, "Ebola disease caused by Bundibugyo virus");
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

test("Community brief translates connected source states into qualitative synthesis", () => {
  const result = runAppHelper(`(() => {
    communityBriefState.airnow = {
      isLive: true,
      category: "Good",
      area: "New York City Region, NY",
      statusLabel: "Live"
    };
    communityBriefState.who = {
      isLive: true,
      noticeCount: 5,
      statusLabel: "WHO notices live"
    };
    const partial = getCommunityBrief();

    communityBriefState.healthcare = {
      accessStatus: "Access constrained",
      isLive: true,
      primaryCount: 22,
      totalDesignations: 65,
      statusLabel: "Live"
    };
    communityBriefState.places = {
      isLive: true,
      primaryLabel: "Physical inactivity",
      primaryValue: 20.8,
      summary: "Physical inactivity 20.8%; adult obesity 20.9%",
      statusLabel: "Live"
    };
    communityBriefState.population = {
      isLive: true,
      changeLabel: "Growing",
      changePercent: 1.68,
      county: "New York County",
      population: 1660664,
      statusLabel: "Live"
    };
    const mixed = getCommunityBrief();

    communityBriefState.airnow = {
      isLive: true,
      category: "Unhealthy",
      area: "New York City Region, NY",
      statusLabel: "Live"
    };
    const pressured = getCommunityBrief();

    return {
      pressuredStatus: pressured.status,
      pressuredSummary: pressured.summary,
      mixedCurrent: mixed.current,
      mixedStatus: mixed.status,
      mixedSummary: mixed.summary,
      partialStatus: partial.status,
      partialSummary: partial.summary
    };
  })()`);

  assert.equal(result.partialStatus, "Mixed");
  assert.match(result.partialSummary, /Air Quality Good/);
  assert.equal(result.mixedStatus, "Mixed");
  assert.match(result.mixedSummary, /Air Quality Good/);
  assert.match(result.mixedSummary, /Healthcare Access constrained/);
  assert.match(result.mixedSummary, /Well-Being 20.8% inactive adults/);
  assert.match(result.mixedCurrent, /Air quality is Good/);
  assert.match(result.mixedCurrent, /healthcare is access constrained/i);
  assert.match(result.mixedCurrent, /physical inactivity 20.8%/i);
  assert.equal(result.pressuredStatus, "Under Pressure");
  assert.match(result.pressuredSummary, /Air Quality Unhealthy/);
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

test("WHO trend bars expose notice counts to assistive technology", () => {
  const result = runAppHelper(`(() => {
    const makeElement = (tagName) => ({
      tagName,
      attributes: new Map(),
      children: [],
      classList: {
        add() {},
        remove() {}
      },
      className: "",
      style: {},
      textContent: "",
      append(...nodes) {
        this.children.push(...nodes);
      },
      setAttribute(name, value) {
        this.attributes.set(name, value);
      },
      set innerHTML(value) {
        this.children = [];
      }
    });
    const grid = makeElement("div");
    const targets = new Map();

    globalThis.document = {
      createElement: makeElement,
      querySelector(selector) {
        if (selector === "[data-who-trend-grid]") return grid;
        if (!targets.has(selector)) {
          targets.set(selector, makeElement("span"));
        }

        return targets.get(selector);
      }
    };

    renderWhoTrend([
      {
        count: 2,
        date: "2026-06-10",
        latestTitle: "Marburg virus disease, Germany"
      }
    ], true, {
      fetchedAt: "2026-06-12T09:00:00Z"
    });

    const bar = grid.children[0];
    const fill = bar.children[0];
    const summary = targets.get("[data-who-trend-summary]");

    return {
      ariaLabel: bar.attributes.get("aria-label"),
      fillAriaHidden: fill.attributes.get("aria-hidden"),
      fillTitle: fill.title,
      role: bar.attributes.get("role"),
      summary: summary.textContent,
      visibleCount: bar.children[2].textContent
    };
  })()`);

  assert.equal(result.role, "listitem");
  assert.match(result.ariaLabel, /^2 notices on /);
  assert.match(result.ariaLabel, /latest notice: Marburg virus disease, Germany$/);
  assert.equal(result.fillAriaHidden, "true");
  assert.equal(result.fillTitle, result.ariaLabel);
  assert.match(result.summary, /^2 notices across 1 publication day; peak 2 on /);
  assert.match(result.summary, /latest .*: Marburg virus disease, Germany$/);
  assert.equal(result.visibleCount, "2");
});

test("WHO trend empty state collapses chart spacing", () => {
  const result = runAppHelper(`(() => {
    const classes = new Set();
    const makeElement = (tagName) => ({
      tagName,
      children: [],
      className: "",
      textContent: "",
      append(...nodes) {
        this.children.push(...nodes);
      },
      classList: {
        add(name) {
          classes.add(name);
        },
        remove(name) {
          classes.delete(name);
        }
      },
      set innerHTML(value) {
        this.children = [];
      }
    });
    const grid = makeElement("div");
    const targets = new Map();

    globalThis.document = {
      createElement: makeElement,
      querySelector(selector) {
        if (selector === "[data-who-trend-grid]") return grid;
        if (!targets.has(selector)) {
          targets.set(selector, makeElement("span"));
        }

        return targets.get(selector);
      }
    };

    renderWhoTrend([], false, {});

    return {
      classes: Array.from(classes),
      emptyText: grid.children[0].textContent,
      summary: targets.get("[data-who-trend-summary]").textContent
    };
  })()`);

  assert.equal(JSON.stringify(result.classes), JSON.stringify(["is-empty"]));
  assert.equal(result.emptyText, "WHO notice trend is unavailable until live notices load.");
  assert.equal(result.summary, "WHO notice trend is unavailable until live notices load.");
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

test("AirNow snapshot summarizes the selected place and live reading", () => {
  const result = runAppHelper(`(() => {
    const targets = new Map();
    const makeElement = () => {
      const classes = new Set();

      return {
        textContent: "",
        classList: {
          classes,
          add(...names) {
            names.forEach((name) => classes.add(name));
          },
          remove(...names) {
            names.forEach((name) => classes.delete(name));
          },
          toggle(name, force) {
            if (force) {
              classes.add(name);
            } else {
              classes.delete(name);
            }
          }
        }
      };
    };

    globalThis.document = {
      querySelector(selector) {
        if (!targets.has(selector)) {
          targets.set(selector, makeElement());
        }

        return targets.get(selector);
      }
    };

    airNowQuery.zipCode = "60601";
    airNowQuery.distance = 25;

    const reading = normalizeAirNowReading([
      {
        AQI: 135,
        Category: { Name: "Unhealthy for Sensitive Groups" },
        DateObserved: "2026-06-12",
        HourObserved: 14,
        LocalTimeZone: "CST",
        ParameterName: "PM2.5",
        ReportingArea: "Chicago",
        StateCode: "IL"
      }
    ]);

    renderAirQuality(reading, true, {
      cacheSeconds: 900,
      fetchedAt: "2026-06-12T19:00:00Z"
    });

    const snapshotStatus = targets.get("[data-airnow-snapshot-status]");
    const snapshotCategory = targets.get("[data-airnow-snapshot-category]");
    const snapshotBand = targets.get("[data-airnow-snapshot-band]");

    return {
      aqi: targets.get("[data-airnow-snapshot-aqi]").textContent,
      area: targets.get("[data-airnow-snapshot-area]").textContent,
      basis: targets.get("[data-airnow-snapshot-basis]").textContent,
      category: snapshotCategory.textContent,
      categoryClasses: Array.from(snapshotCategory.classList.classes),
      health: targets.get("[data-airnow-snapshot-health]").textContent,
      observed: targets.get("[data-airnow-snapshot-observed]").textContent,
      scope: targets.get("[data-airnow-snapshot-scope]").textContent,
      severityBand: snapshotBand.textContent,
      severityClasses: Array.from(snapshotBand.classList.classes),
      status: snapshotStatus.textContent,
      statusClasses: Array.from(snapshotStatus.classList.classes)
    };
  })()`);

  assert.equal(result.status, "Live");
  assert.equal(JSON.stringify(result.statusClasses), JSON.stringify(["is-live"]));
  assert.equal(result.aqi, "135");
  assert.equal(result.category, "PM2.5: Unhealthy for Sensitive Groups");
  assert.equal(JSON.stringify(result.categoryClasses), JSON.stringify(["aqi-unhealthy-sensitive"]));
  assert.equal(result.scope, "ZIP 60601, 25-mile radius");
  assert.equal(result.area, "Chicago, IL");
  assert.equal(result.observed, "2026-06-12 2:00 PM CST");
  assert.equal(result.basis, "1 pollutant AQI reading; displayed PM2.5 as highest AQI");
  assert.equal(result.severityBand, "Unhealthy for Sensitive Groups, 101-150");
  assert.equal(JSON.stringify(result.severityClasses), JSON.stringify(["aqi-unhealthy-sensitive"]));
  assert.equal(result.health, "Sensitive groups should reduce prolonged or heavy outdoor exertion.");
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
  assert.equal(result.statusLabel, "API key needed");
});

test("AirNow fallback state keeps source outages distinct from setup states", () => {
  const result = runAppHelper(`(() => getAirNowFallbackState({ status: 502 }))()`);

  assert.equal(result.category, "Live AQI unavailable");
  assert.equal(result.freshness, "Try refreshing again later");
  assert.equal(result.healthGuidance, "Unavailable until the source responds");
  assert.equal(result.observed, "Live observation unavailable");
  assert.equal(result.statusLabel, "Unavailable");
});

test("AirNow ZIP validation exposes persistent form feedback", () => {
  const result = runAppHelper(`(() => {
    const note = { textContent: "" };
    const formClasses = new Set();
    const attributes = new Map();
    const form = {
      classList: {
        toggle(name, force) {
          if (force) {
            formClasses.add(name);
          } else {
            formClasses.delete(name);
          }
        }
      }
    };
    const zipInput = {
      setAttribute(name, value) {
        attributes.set(name, value);
      }
    };

    globalThis.document = {
      querySelector(selector) {
        return selector === "[data-airnow-location-note]" ? note : null;
      }
    };

    setAirNowZipValidity(form, zipInput, false);
    const invalidState = {
      ariaInvalid: attributes.get("aria-invalid"),
      classes: Array.from(formClasses),
      note: note.textContent
    };

    setAirNowZipValidity(form, zipInput, true);

    return {
      invalidState,
      validState: {
        ariaInvalid: attributes.get("aria-invalid"),
        classes: Array.from(formClasses)
      }
    };
  })()`);

  assert.equal(result.invalidState.ariaInvalid, "true");
  assert.equal(JSON.stringify(result.invalidState.classes), JSON.stringify(["was-validated"]));
  assert.equal(result.invalidState.note, "Enter a 5-digit ZIP code to update the AirNow area.");
  assert.equal(result.validState.ariaInvalid, "false");
  assert.equal(JSON.stringify(result.validState.classes), JSON.stringify([]));
});

test("AirNow form initialization binds invalid ZIP feedback before submit", () => {
  const result = runAppBeforeBoot(`(() => {
    const targets = new Map();
    const events = {};
    const formClasses = new Set();
    const makeElement = () => ({ textContent: "" });
    const zipInput = {
      value: "",
      attributes: new Map(),
      addEventListener(type, handler) {
        events["zip:" + type] = handler;
      },
      checkValidity() {
        return false;
      },
      setAttribute(name, value) {
        this.attributes.set(name, value);
      }
    };
    const distanceInput = {
      value: "25"
    };
    const form = {
      classList: {
        toggle(name, force) {
          if (force) {
            formClasses.add(name);
          } else {
            formClasses.delete(name);
          }
        }
      },
      elements: {
        namedItem(name) {
          return name === "zipCode" ? zipInput : distanceInput;
        }
      },
      addEventListener(type, handler) {
        events["form:" + type] = handler;
      }
    };

    globalThis.document = {
      querySelector(selector) {
        if (selector === "[data-airnow-form]") return form;
        if (!targets.has(selector)) {
          targets.set(selector, makeElement());
        }

        return targets.get(selector);
      }
    };

    initializeAirNowForm();
    events["zip:invalid"]();

    return {
      ariaInvalid: zipInput.attributes.get("aria-invalid"),
      classes: Array.from(formClasses),
      hasInvalidHandler: typeof events["zip:invalid"] === "function",
      note: targets.get("[data-airnow-location-note]").textContent
    };
  })()`);

  assert.equal(result.hasInvalidHandler, true);
  assert.equal(result.ariaInvalid, "true");
  assert.equal(JSON.stringify(result.classes), JSON.stringify(["was-validated"]));
  assert.equal(result.note, "Enter a 5-digit ZIP code to update the AirNow area.");
});

test("AirNow form submit does not replace an invalid ZIP with the default", () => {
  const result = runAppBeforeBoot(`(() => {
    const targets = new Map();
    const events = {};
    const formClasses = new Set();
    const makeElement = () => ({ textContent: "" });
    const zipInput = {
      value: "abc",
      attributes: new Map(),
      reportValidityCalled: false,
      addEventListener(type, handler) {
        events["zip:" + type] = handler;
      },
      checkValidity() {
        return false;
      },
      reportValidity() {
        this.reportValidityCalled = true;
      },
      setAttribute(name, value) {
        this.attributes.set(name, value);
      }
    };
    const distanceInput = {
      value: "50"
    };
    const form = {
      classList: {
        toggle(name, force) {
          if (force) {
            formClasses.add(name);
          } else {
            formClasses.delete(name);
          }
        }
      },
      elements: {
        namedItem(name) {
          return name === "zipCode" ? zipInput : distanceInput;
        }
      },
      addEventListener(type, handler) {
        events["form:" + type] = handler;
      }
    };

    globalThis.document = {
      querySelector(selector) {
        if (selector === "[data-airnow-form]") return form;
        if (!targets.has(selector)) {
          targets.set(selector, makeElement());
        }

        return targets.get(selector);
      }
    };

    airNowQuery.zipCode = "60601";
    airNowQuery.distance = 25;
    initializeAirNowForm();
    zipInput.value = "abc";
    distanceInput.value = "50";
    events["form:submit"]({ preventDefault() {} });

    return {
      ariaInvalid: zipInput.attributes.get("aria-invalid"),
      classes: Array.from(formClasses),
      distance: airNowQuery.distance,
      note: targets.get("[data-airnow-location-note]").textContent,
      reportValidityCalled: zipInput.reportValidityCalled,
      zipCode: airNowQuery.zipCode
    };
  })()`);

  assert.equal(result.ariaInvalid, "true");
  assert.equal(JSON.stringify(result.classes), JSON.stringify(["was-validated"]));
  assert.equal(result.distance, 25);
  assert.equal(result.note, "Enter a 5-digit ZIP code to update the AirNow area.");
  assert.equal(result.reportValidityCalled, true);
  assert.equal(result.zipCode, "60601");
});

test("AirNow radius changes preview the pending selected scope", () => {
  const result = runAppBeforeBoot(`(() => {
    const targets = new Map();
    const events = {};
    const makeElement = () => ({ textContent: "" });
    const zipInput = {
      value: "60601",
      addEventListener(type, handler) {
        events["zip:" + type] = handler;
      },
      checkValidity() {
        return true;
      },
      setAttribute() {}
    };
    const distanceInput = {
      value: "25",
      addEventListener(type, handler) {
        events["distance:" + type] = handler;
      }
    };
    const form = {
      classList: {
        toggle() {}
      },
      elements: {
        namedItem(name) {
          return name === "zipCode" ? zipInput : distanceInput;
        }
      },
      addEventListener(type, handler) {
        events["form:" + type] = handler;
      }
    };

    globalThis.document = {
      querySelector(selector) {
        if (selector === "[data-airnow-form]") return form;
        if (!targets.has(selector)) {
          targets.set(selector, makeElement());
        }

        return targets.get(selector);
      }
    };

    airNowQuery.zipCode = "10001";
    airNowQuery.distance = 25;
    initializeAirNowForm();
    distanceInput.value = "100";
    events["distance:change"]();

    return {
      activeDistance: airNowQuery.distance,
      activeZipCode: airNowQuery.zipCode,
      hasChangeHandler: typeof events["distance:change"] === "function",
      note: targets.get("[data-airnow-location-note]").textContent
    };
  })()`);

  assert.equal(result.hasChangeHandler, true);
  assert.equal(result.activeDistance, 25);
  assert.equal(result.activeZipCode, "10001");
  assert.equal(result.note, "Ready to update to ZIP 10001, 100-mile radius.");
});
