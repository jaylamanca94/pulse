const AIRNOW_BASE_URL = "https://www.airnowapi.org/aq/observation/zipCode/current/";

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
  response.end(JSON.stringify(payload));
};

module.exports = async (request, response) => {
  const apiKey = process.env.AIRNOW_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      status: "unconfigured",
      message: "AIRNOW_API_KEY is not configured."
    });
    return;
  }

  const zipCode = request.query.zipCode || "10001";
  const distance = request.query.distance || "25";
  const params = new URLSearchParams({
    format: "application/json",
    zipCode,
    distance,
    API_KEY: apiKey
  });

  try {
    const airnowResponse = await fetch(`${AIRNOW_BASE_URL}?${params.toString()}`);

    if (!airnowResponse.ok) {
      sendJson(response, airnowResponse.status, {
        status: "error",
        message: "AirNow request failed."
      });
      return;
    }

    const data = await airnowResponse.json();
    sendJson(response, 200, {
      status: "live",
      source: "AirNow",
      readings: Array.isArray(data) ? data : []
    });
  } catch (error) {
    sendJson(response, 502, {
      status: "error",
      message: "AirNow request could not be completed."
    });
  }
};
