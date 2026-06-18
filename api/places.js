const {
  getCached,
  getText,
  requestJson,
  sendJson,
  setCached
} = require("./_pulse");

const CDC_PLACES_COUNTY_URL = "https://data.cdc.gov/resource/fu4u-a9bh.json";
const PLACES_CACHE_SECONDS = 60 * 60 * 24;
const DEFAULT_STATE = "NY";
const DEFAULT_COUNTY = "New York";
const MEASURE_IDS = ["LPA", "OBESITY", "MHLTH", "SLEEP"];
const MEASURE_LABELS = {
  LPA: "Physical inactivity",
  OBESITY: "Adult obesity",
  MHLTH: "Frequent mental distress",
  SLEEP: "Short sleep"
};

function normalizeStateAbbr(value) {
  const state = getText(value, DEFAULT_STATE).toUpperCase();
  return /^[A-Z]{2}$/.test(state) ? state : DEFAULT_STATE;
}

function normalizeCountyName(value) {
  return getText(value, DEFAULT_COUNTY).replace(/\s+County$/i, "");
}

function getPlacesValue(row) {
  const value = Number(row?.data_value);
  return Number.isFinite(value) ? value : null;
}

function normalizePlacesRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const value = getPlacesValue(row);
      const measureId = getText(row.measureid);

      if (!measureId || value === null) {
        return null;
      }

      return {
        measureId,
        label: MEASURE_LABELS[measureId] || getText(row.short_question_text, row.measure || measureId),
        measure: getText(row.measure),
        value,
        unit: getText(row.data_value_unit, "%"),
        valueType: getText(row.data_value_type, "Crude prevalence"),
        year: getText(row.year),
        totalPopulation: Number(row.totalpopulation) || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => MEASURE_IDS.indexOf(a.measureId) - MEASURE_IDS.indexOf(b.measureId));
}

function getPlacesSummary(measures) {
  const byId = new Map(measures.map((measure) => [measure.measureId, measure]));
  return [
    byId.get("LPA"),
    byId.get("OBESITY"),
    byId.get("MHLTH"),
    byId.get("SLEEP")
  ]
    .filter(Boolean)
    .map((measure) => `${measure.label} ${measure.value}${measure.unit}`)
    .join("; ");
}

async function requestPlacesCounty({ stateAbbr = DEFAULT_STATE, county = DEFAULT_COUNTY } = {}) {
  const normalizedState = normalizeStateAbbr(stateAbbr);
  const normalizedCounty = normalizeCountyName(county);
  const cacheKey = `places:${normalizedState}:${normalizedCounty.toLowerCase()}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const url = new URL(CDC_PLACES_COUNTY_URL);
  url.searchParams.set("$select", [
    "year",
    "stateabbr",
    "locationname",
    "measureid",
    "measure",
    "short_question_text",
    "data_value",
    "data_value_unit",
    "data_value_type",
    "datavaluetypeid",
    "totalpopulation"
  ].join(","));
  url.searchParams.set("$limit", "20");
  url.searchParams.set("stateabbr", normalizedState);
  url.searchParams.set("locationname", normalizedCounty);
  url.searchParams.set("$where", `measureid in('${MEASURE_IDS.join("','")}') AND datavaluetypeid='CrdPrv'`);

  const rows = await requestJson(url);
  const measures = normalizePlacesRows(rows);
  const year = measures.find((measure) => measure.year)?.year || "";
  const payload = {
    cacheSeconds: PLACES_CACHE_SECONDS,
    fetchedAt: new Date().toISOString(),
    geography: {
      stateAbbr: normalizedState,
      county: `${normalizedCounty} County`,
      locationName: normalizedCounty
    },
    measures,
    primary: measures.find((measure) => measure.measureId === "LPA") || measures[0] || null,
    source: "CDC PLACES county data",
    sourceUrl: "https://www.cdc.gov/places/",
    status: measures.length ? "live" : "no_data",
    summary: getPlacesSummary(measures),
    year
  };

  setCached(cacheKey, payload, PLACES_CACHE_SECONDS);
  return payload;
}

async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for this endpoint."
      }
    });
    return;
  }

  try {
    const payload = await requestPlacesCounty({
      stateAbbr: request.query.state || request.query.stateAbbr,
      county: request.query.county
    });
    sendJson(response, 200, payload, PLACES_CACHE_SECONDS);
  } catch (error) {
    sendJson(response, error.status || 502, error.payload || {
      error: {
        code: "PLACES_PROXY_ERROR",
        message: "Could not load CDC PLACES county measures."
      }
    });
  }
}

module.exports = handler;
module.exports.normalizePlacesRows = normalizePlacesRows;
module.exports.requestPlacesCounty = requestPlacesCounty;
