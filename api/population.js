const {
  getCached,
  getText,
  parseCsv,
  requestText,
  sendMethodNotAllowed,
  sendJson,
  setCached
} = require("./_pulse");

const CENSUS_COUNTY_TOTALS_URL = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv";
const POPULATION_CACHE_SECONDS = 60 * 60 * 24;
const DEFAULT_STATE = "New York";
const DEFAULT_COUNTY = "New York County";

function normalizeCountyName(value) {
  const county = getText(value, DEFAULT_COUNTY);
  return /\bCounty$/i.test(county) ? county : `${county} County`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getChangeLabel(changePercent) {
  if (!Number.isFinite(changePercent)) return "Context";
  if (changePercent > 0.2) return "Growing";
  if (changePercent < -0.2) return "Declining";
  return "Stable";
}

function normalizePopulationRecord(row) {
  const population = toNumber(row.POPESTIMATE2024);
  const previousPopulation = toNumber(row.POPESTIMATE2023);
  const change = toNumber(row.NPOPCHG2024);
  const changePercent = population !== null && previousPopulation
    ? (population - previousPopulation) / previousPopulation * 100
    : null;
  const births = toNumber(row.BIRTHS2024);
  const deaths = toNumber(row.DEATHS2024);
  const internationalMigration = toNumber(row.INTERNATIONALMIG2024);
  const domesticMigration = toNumber(row.DOMESTICMIG2024);

  return {
    births,
    change,
    changeLabel: getChangeLabel(changePercent),
    changePercent,
    county: getText(row.CTYNAME),
    deaths,
    domesticMigration,
    internationalMigration,
    naturalChange: births !== null && deaths !== null ? births - deaths : null,
    netMigration: internationalMigration !== null && domesticMigration !== null
      ? internationalMigration + domesticMigration
      : null,
    population,
    previousPopulation,
    state: getText(row.STNAME),
    year: "2024"
  };
}

async function requestCountyPopulation({ state = DEFAULT_STATE, county = DEFAULT_COUNTY } = {}) {
  const normalizedState = getText(state, DEFAULT_STATE);
  const normalizedCounty = normalizeCountyName(county);
  const cacheKey = `population:${normalizedState.toLowerCase()}:${normalizedCounty.toLowerCase()}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const csv = await requestText(CENSUS_COUNTY_TOTALS_URL);
  const rows = parseCsv(csv);
  const row = rows.find((item) => (
    item.STNAME.toLowerCase() === normalizedState.toLowerCase()
    && item.CTYNAME.toLowerCase() === normalizedCounty.toLowerCase()
  ));

  if (!row) {
    const payload = {
      cacheSeconds: POPULATION_CACHE_SECONDS,
      fetchedAt: new Date().toISOString(),
      geography: {
        county: normalizedCounty,
        state: normalizedState
      },
      record: null,
      source: "U.S. Census Population Estimates Program",
      sourceUrl: CENSUS_COUNTY_TOTALS_URL,
      status: "no_data"
    };

    setCached(cacheKey, payload, POPULATION_CACHE_SECONDS);
    return payload;
  }

  const record = normalizePopulationRecord(row);
  const payload = {
    cacheSeconds: POPULATION_CACHE_SECONDS,
    fetchedAt: new Date().toISOString(),
    record,
    source: "U.S. Census Population Estimates Program",
    sourceUrl: CENSUS_COUNTY_TOTALS_URL,
    status: record.population !== null ? "live" : "no_data"
  };

  setCached(cacheKey, payload, POPULATION_CACHE_SECONDS);
  return payload;
}

async function handler(request, response) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response);
    return;
  }

  try {
    const payload = await requestCountyPopulation({
      state: request.query.state,
      county: request.query.county
    });
    sendJson(response, 200, payload, POPULATION_CACHE_SECONDS);
  } catch (error) {
    sendJson(response, error.status || 502, error.payload || {
      error: {
        code: "POPULATION_PROXY_ERROR",
        message: "Could not load Census population estimates."
      }
    });
  }
}

module.exports = handler;
module.exports.normalizePopulationRecord = normalizePopulationRecord;
module.exports.parseCsv = parseCsv;
module.exports.requestCountyPopulation = requestCountyPopulation;
