const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizePlacesRows } = require("./places");

test("CDC PLACES rows normalize crude prevalence measures for dashboard cards", () => {
  const measures = normalizePlacesRows([
    {
      year: "2022",
      measureid: "SLEEP",
      measure: "Short sleep duration among adults",
      short_question_text: "Short Sleep Duration",
      data_value: "35.9",
      data_value_unit: "%",
      data_value_type: "Crude prevalence",
      totalpopulation: "1596273"
    },
    {
      year: "2022",
      measureid: "LPA",
      measure: "No leisure-time physical activity among adults",
      short_question_text: "Physical Inactivity",
      data_value: "20.8",
      data_value_unit: "%",
      data_value_type: "Crude prevalence",
      totalpopulation: "1596273"
    }
  ]);

  assert.equal(measures[0].measureId, "LPA");
  assert.equal(measures[0].label, "Physical inactivity");
  assert.equal(measures[0].value, 20.8);
  assert.equal(measures[1].measureId, "SLEEP");
  assert.equal(measures[1].label, "Short sleep");
});
