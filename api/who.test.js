const assert = require("node:assert/strict");
const test = require("node:test");

const handler = require("./who");

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = value;
    }
  };
}

test("WHO proxy normalizes notice metadata and canonical URLs", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      value: [
        {
          DonId: "2026-DON606",
          FormattedDate: "8 June 2026",
          ItemDefaultUrl: "/2026-DON606",
          PublicationDateAndTime: "2026-06-08T12:35:09Z",
          Summary: "<p>Confirmed cases reported.</p>",
          Title: "Ebola disease caused by Bundibugyo virus, Democratic Republic of the Congo & Uganda"
        }
      ]
    })
  });

  try {
    const response = createResponse();
    await handler({ method: "GET" }, response);

    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.notices[0].donId, "2026-DON606");
    assert.equal(payload.notices[0].location, "Democratic Republic of the Congo & Uganda");
    assert.deepEqual(payload.areas.map((area) => area.area), [
      "Democratic Republic of the Congo",
      "Uganda"
    ]);
    assert.equal(payload.areas[0].latestDonId, "2026-DON606");
    assert.equal(payload.areas[0].noticeCount, 1);
    assert.equal(
      payload.notices[0].url,
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON606"
    );
  } finally {
    global.fetch = originalFetch;
  }
});
