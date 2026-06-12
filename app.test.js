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
