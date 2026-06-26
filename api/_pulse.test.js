const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getCached,
  getText,
  normalizeDistance,
  normalizeZipCode,
  parseCsv,
  parseCsvLine,
  safeHttpUrl,
  setCached
} = require("./_pulse");

test("getText trims strings and falls back for empty values", () => {
  assert.equal(getText("  AirNow  "), "AirNow");
  assert.equal(getText("   ", "fallback"), "fallback");
  assert.equal(getText(null, "fallback"), "fallback");
});

test("CSV parser preserves quoted commas and escaped quotes", () => {
  assert.deepEqual(parseCsvLine('"New York County","a, b","Health ""A"""'), [
    "New York County",
    "a, b",
    "Health \"A\""
  ]);

  assert.deepEqual(parseCsv('STATE,CTYNAME,NOTE\r\n36,"New York County","a, b"\r\n'), [
    {
      STATE: "36",
      CTYNAME: "New York County",
      NOTE: "a, b"
    }
  ]);
});

test("normalizes AirNow ZIP codes", () => {
  assert.equal(normalizeZipCode(" 10001 "), "10001");
  assert.equal(normalizeZipCode("abcde"), "10001");
  assert.equal(normalizeZipCode("1234"), "10001");
  assert.equal(normalizeZipCode("abcde", "90210"), "90210");
});

test("normalizes AirNow distance values", () => {
  assert.equal(normalizeDistance("24.6"), "25");
  assert.equal(normalizeDistance(250), "250");
  assert.equal(normalizeDistance(0), "25");
  assert.equal(normalizeDistance(251), "25");
  assert.equal(normalizeDistance("bad", "10"), "10");
});

test("safeHttpUrl allows only http and https URLs", () => {
  assert.equal(safeHttpUrl("https://www.who.int/path"), "https://www.who.int/path");
  assert.equal(safeHttpUrl("http://example.com/"), "http://example.com/");
  assert.equal(safeHttpUrl("javascript:alert(1)"), "");
  assert.equal(safeHttpUrl("not a url"), "");
});

test("cache returns live entries and removes expired entries", async () => {
  setCached("test:live", { status: "live" }, 1);
  assert.deepEqual(getCached("test:live"), { status: "live" });

  setCached("test:expired", { status: "expired" }, 0);
  assert.equal(getCached("test:expired"), null);
});
