const {
  getCached,
  getText,
  parseCsv,
  requestText,
  sendMethodNotAllowed,
  sendJson,
  setCached
} = require("./_pulse");

const HRSA_BASE_URL = "https://data.hrsa.gov/DataDownload/DD_Files";
const HEALTHCARE_CACHE_SECONDS = 60 * 60 * 24;
const DEFAULT_STATE = "New York";
const DEFAULT_COUNTY = "New York County";
const DEFAULT_COUNTY_FIPS = "36061";
const DISCIPLINES = [
  {
    code: "PC",
    label: "Primary care",
    scoreMax: 25,
    url: `${HRSA_BASE_URL}/BCD_HPSA_FCT_DET_PC.csv`
  },
  {
    code: "DH",
    label: "Dental health",
    scoreMax: 26,
    url: `${HRSA_BASE_URL}/BCD_HPSA_FCT_DET_DH.csv`
  },
  {
    code: "MH",
    label: "Mental health",
    scoreMax: 25,
    url: `${HRSA_BASE_URL}/BCD_HPSA_FCT_DET_MH.csv`
  }
];

function decodeHtml(value) {
  return getText(value)
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getDateTime(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function getLatestDate(values) {
  return values
    .filter(Boolean)
    .sort((dateA, dateB) => getDateTime(dateB) - getDateTime(dateA))[0] || "";
}

function normalizeCountyName(value) {
  const county = getText(value, DEFAULT_COUNTY);
  return /\bCounty$/i.test(county) ? county : `${county} County`;
}

function normalizeHpsaRecord(row, discipline) {
  const score = toNumber(row["HPSA Score"]);
  const population = toNumber(row["HPSA Designation Population"]);
  const shortage = toNumber(row["HPSA Shortage"]);

  return {
    county: getText(row["Common County Name"]),
    designationType: getText(row["Designation Type"]),
    discipline: discipline.label,
    hpsaId: getText(row["HPSA ID"]),
    lastUpdated: getText(row["HPSA Designation Last Update Date"]),
    name: decodeHtml(row["HPSA Name"]),
    population,
    score,
    scoreMax: discipline.scoreMax,
    shortage,
    status: getText(row["HPSA Status"])
  };
}

function normalizeHpsaRows(text, discipline, filters = {}) {
  const rows = parseCsv(text);
  if (!rows.length) return [];

  const countyFips = getText(filters.countyFips, DEFAULT_COUNTY_FIPS);
  const stateName = getText(filters.state, DEFAULT_STATE).toLowerCase();
  const countyName = normalizeCountyName(filters.county).toLowerCase();
  const recordsById = new Map();

  rows.forEach((row) => {
    const rowCountyFips = getText(row["Common State County FIPS Code"]);
    const rowState = getText(row["Common State Name"]).toLowerCase();
    const rowCounty = getText(row["County Equivalent Name"]);
    const rowCommonCounty = getText(row["Common County Name"]).toLowerCase();

    const isSelectedCounty = rowCountyFips === countyFips
      || (rowState === stateName && (`${rowCounty} county`).toLowerCase() === countyName)
      || rowCommonCounty === `${countyName}, ${filters.stateAbbr || "NY"}`.toLowerCase();

    if (!isSelectedCounty || row["HPSA Status"] !== "Designated") {
      return;
    }

    const record = normalizeHpsaRecord(row, discipline);
    if (!record.hpsaId || recordsById.has(record.hpsaId)) {
      return;
    }

    recordsById.set(record.hpsaId, record);
  });

  return Array.from(recordsById.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0) || a.name.localeCompare(b.name));
}

function summarizeDiscipline(discipline, records) {
  const scores = records.map((record) => record.score).filter((score) => Number.isFinite(score));
  const maxScore = scores.length ? Math.max(...scores) : null;
  const latestUpdate = getLatestDate(records.map((record) => record.lastUpdated));

  return {
    code: discipline.code,
    count: records.length,
    label: discipline.label,
    latestUpdate,
    maxScore,
    scoreMax: discipline.scoreMax,
    topDesignations: records.slice(0, 3)
  };
}

function getAccessStatus(totalDesignations, summaries) {
  const highScore = summaries.some((summary) => Number(summary.maxScore) >= 20);

  if (!totalDesignations) return "No active shortage designations";
  if (highScore) return "Access constrained";
  return "Shortage watch";
}

async function requestHealthcareAccess(filters = {}) {
  const state = getText(filters.state, DEFAULT_STATE);
  const county = normalizeCountyName(filters.county);
  const countyFips = getText(filters.countyFips, DEFAULT_COUNTY_FIPS);
  const cacheKey = `healthcare:${state.toLowerCase()}:${county.toLowerCase()}:${countyFips}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const sourceTexts = await Promise.all(DISCIPLINES.map((discipline) => requestText(discipline.url)));
  const summaries = DISCIPLINES.map((discipline, index) => {
    const records = normalizeHpsaRows(sourceTexts[index], discipline, {
      ...filters,
      county,
      countyFips,
      state
    });
    return summarizeDiscipline(discipline, records);
  });
  const totalDesignations = summaries.reduce((sum, summary) => sum + summary.count, 0);
  const latestUpdate = getLatestDate(summaries.map((summary) => summary.latestUpdate));
  const payload = {
    accessStatus: getAccessStatus(totalDesignations, summaries),
    cacheSeconds: HEALTHCARE_CACHE_SECONDS,
    fetchedAt: new Date().toISOString(),
    geography: {
      county,
      countyFips,
      state
    },
    latestUpdate,
    source: "HRSA Health Professional Shortage Areas",
    sourceUrl: "https://data.hrsa.gov/data/download",
    status: totalDesignations > 0 ? "live" : "no_data",
    summaries,
    totalDesignations
  };

  setCached(cacheKey, payload, HEALTHCARE_CACHE_SECONDS);
  return payload;
}

async function handler(request, response) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response);
    return;
  }

  try {
    const payload = await requestHealthcareAccess({
      county: request.query.county,
      countyFips: request.query.countyFips,
      state: request.query.state,
      stateAbbr: request.query.stateAbbr
    });
    sendJson(response, 200, payload, HEALTHCARE_CACHE_SECONDS);
  } catch (error) {
    sendJson(response, error.status || 502, error.payload || {
      error: {
        code: "HEALTHCARE_PROXY_ERROR",
        message: "Could not load HRSA Health Professional Shortage Areas."
      }
    });
  }
}

module.exports = handler;
module.exports.normalizeHpsaRows = normalizeHpsaRows;
module.exports.requestHealthcareAccess = requestHealthcareAccess;
module.exports.summarizeDiscipline = summarizeDiscipline;
