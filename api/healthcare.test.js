const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizeHpsaRows,
  summarizeDiscipline
} = require("./healthcare");

test("HRSA HPSA rows normalize active county designations", () => {
  const csv = [
    "HPSA Name,HPSA ID,Designation Type,HPSA Discipline Class,HPSA Score,HPSA Status,Common County Name,Common State County FIPS Code,Common State Name,HPSA Designation Population,HPSA Shortage,HPSA Designation Last Update Date",
    "\"THE INSTITUTE FOR FAMILY HEALTH\",\"136999363E\",\"Federally Qualified Health Center\",\"Primary Care\",\"18\",\"Designated\",\"New York County, NY\",\"36061\",\"New York\",\"941429.0\",\"\",\"09/22/2025\"",
    "\"Withdrawn Example\",\"1369990000\",\"Geographic HPSA\",\"Primary Care\",\"7\",\"Withdrawn\",\"New York County, NY\",\"36061\",\"New York\",\"1000.0\",\"\",\"01/01/2020\"",
    "\"Other County\",\"1369991111\",\"Geographic HPSA\",\"Primary Care\",\"10\",\"Designated\",\"Kings County, NY\",\"36047\",\"New York\",\"1000.0\",\"\",\"01/01/2025\""
  ].join("\n");

  const records = normalizeHpsaRows(csv, {
    code: "PC",
    label: "Primary care",
    scoreMax: 25
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].hpsaId, "136999363E");
  assert.equal(records[0].name, "THE INSTITUTE FOR FAMILY HEALTH");
  assert.equal(records[0].score, 18);
  assert.equal(records[0].population, 941429);
});

test("HRSA HPSA summaries expose count, score, and latest update", () => {
  const summary = summarizeDiscipline({
    code: "DH",
    label: "Dental health",
    scoreMax: 26
  }, [
    {
      hpsaId: "a",
      lastUpdated: "09/22/2025",
      name: "A",
      score: 25
    },
    {
      hpsaId: "b",
      lastUpdated: "01/02/2024",
      name: "B",
      score: 12
    }
  ]);

  assert.equal(summary.count, 2);
  assert.equal(summary.maxScore, 25);
  assert.equal(summary.latestUpdate, "09/22/2025");
  assert.equal(summary.topDesignations.length, 2);
});
