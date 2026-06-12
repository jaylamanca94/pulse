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
  const reading = runAppHelper(`normalizeAirNowReading([
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
  ])`);

  assert.equal(reading.aqi, 151);
  assert.equal(reading.category, "Unhealthy");
  assert.equal(reading.pollutant, "PM2.5");
  assert.equal(reading.observedAt, "2026-06-12 10:00 AM EST");
});
