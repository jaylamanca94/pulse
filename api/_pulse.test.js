const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getCached,
  getText,
  normalizeDistance,
  normalizeZipCode,
  parseCsv,
  parseCsvLine,
  requestJson,
  requestText,
  safeHttpUrl,
  sendMethodNotAllowed,
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

test("CSV parser preserves quoted newlines inside records", () => {
  assert.deepEqual(parseCsv('ID,NOTE,VALUE\n1,"line one\nline two",ok\n2,plain,done\n'), [
    {
      ID: "1",
      NOTE: "line one\nline two",
      VALUE: "ok"
    },
    {
      ID: "2",
      NOTE: "plain",
      VALUE: "done"
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

test("sendMethodNotAllowed returns the shared GET-only route error", () => {
  const headers = {};
  let body = "";
  const response = {
    setHeader(name, value) {
      headers[name] = value;
    },
    end(payload) {
      body = payload;
    }
  };

  sendMethodNotAllowed(response);

  assert.equal(response.statusCode, 405);
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["Cache-Control"], "no-store");
  assert.deepEqual(JSON.parse(body), {
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Use GET for this endpoint."
    }
  });
});

test("requestJson preserves upstream error payloads", async () => {
  const originalFetch = global.fetch;
  const upstreamPayload = {
    error: {
      code: "UPSTREAM_BUSY",
      message: "Try again later."
    }
  };

  global.fetch = async (url, options) => {
    assert.equal(url, "https://example.test/data.json");
    assert.ok(options.signal instanceof AbortSignal);

    return {
      ok: false,
      status: 503,
      json: async () => upstreamPayload
    };
  };

  try {
    await assert.rejects(
      () => requestJson("https://example.test/data.json"),
      (error) => {
        assert.equal(error.status, 503);
        assert.deepEqual(error.payload, upstreamPayload);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("requestText wraps upstream text errors consistently", async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url, options) => {
    assert.equal(url, "https://example.test/data.csv");
    assert.ok(options.signal instanceof AbortSignal);

    return {
      ok: false,
      status: 502,
      text: async () => "Gateway unavailable"
    };
  };

  try {
    await assert.rejects(
      () => requestText("https://example.test/data.csv"),
      (error) => {
        assert.equal(error.status, 502);
        assert.deepEqual(error.payload, {
          error: {
            code: "UPSTREAM_REQUEST_FAILED",
            message: "Gateway unavailable"
          }
        });
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});
