const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizePopulationRecord,
  parseCsv
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
