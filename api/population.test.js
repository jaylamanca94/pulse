const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizePopulationRecord,
  parseCsv,
  requestCountyPopulation
} = require("./population");

test("Census county CSV parsing preserves quoted fields", () => {
  const rows = parseCsv('STATE,CTYNAME,NOTE\n36,"New York County","a, b"\n');

  assert.deepEqual(rows, [
    {
      STATE: "36",
      CTYNAME: "New York County",
      NOTE: "a, b"
    }
  ]);
});

test("Census county row normalizes population change context", () => {
  const record = normalizePopulationRecord({
    STNAME: "New York",
    CTYNAME: "New York County",
    POPESTIMATE2023: "1633229",
    POPESTIMATE2024: "1660664",
    NPOPCHG2024: "27435",
    BIRTHS2024: "13030",
    DEATHS2024: "10442",
    INTERNATIONALMIG2024: "30106",
    DOMESTICMIG2024: "-5225"
  });

  assert.equal(record.population, 1660664);
  assert.equal(record.change, 27435);
  assert.equal(record.changeLabel, "Growing");
  assert.equal(record.naturalChange, 2588);
  assert.equal(record.netMigration, 24881);
  assert.ok(record.changePercent > 1.6);
  assert.ok(record.changePercent < 1.8);
});

test("Census county lookup returns no_data instead of route-style 404 when absent", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    text: async () => [
      "STNAME,CTYNAME,POPESTIMATE2023,POPESTIMATE2024,NPOPCHG2024,BIRTHS2024,DEATHS2024,INTERNATIONALMIG2024,DOMESTICMIG2024",
      "New York,New York County,1633229,1660664,27435,13030,10442,30106,-5225"
    ].join("\n")
  });

  try {
    const payload = await requestCountyPopulation({
      state: "New York",
      county: "Missing"
    });

    assert.equal(payload.status, "no_data");
    assert.equal(payload.record, null);
    assert.equal(payload.geography.county, "Missing County");
    assert.equal(payload.geography.state, "New York");
  } finally {
    global.fetch = originalFetch;
  }
});
