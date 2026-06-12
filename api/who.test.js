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
          DonId: "2026-DON607",
          FormattedDate: "10 June 2026",
          ItemDefaultUrl: "/2026-DON607",
          PublicationDateAndTime: "2026-06-10T09:15:00Z",
          Summary: "<p>New event reported.</p>",
          Title: "Marburg virus disease, Germany"
        },
        {
          DonId: "2026-DON606",
          FormattedDate: "8 June 2026",
          ItemDefaultUrl: "/2026-DON606",
          PublicationDateAndTime: "2026-06-08T12:35:09Z",
          Summary: "<p>Confirmed cases reported.</p>",
          Title: "Ebola disease caused by Bundibugyo virus, Democratic Republic of the Congo and Uganda"
        },
        {
          DonId: "2026-DON605",
          FormattedDate: "1 June 2026",
          ItemDefaultUrl: "/2026-DON605",
          PublicationDateAndTime: "2026-06-01T16:00:00Z",
          Summary: "<p>Earlier update.</p>",
          Title: "Measles, Uganda"
        },
        {
          DonId: "2026-DON604",
          FormattedDate: "29 May 2026",
          ItemDefaultUrl: "/2026-DON604",
          PublicationDateAndTime: "2026-05-29T12:00:00Z",
          Summary: "<p>Named area should stay intact.</p>",
          Title: "Dengue, Trinidad and Tobago"
        }
      ]
    })
  });

  try {
    const response = createResponse();
    await handler({ method: "GET" }, response);

    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.notices[1].donId, "2026-DON606");
    assert.equal(payload.notices[1].location, "Democratic Republic of the Congo and Uganda");
    assert.deepEqual(payload.areas.map((area) => area.area), [
      "Uganda",
      "Germany",
      "Democratic Republic of the Congo",
      "Trinidad and Tobago",
    ]);
    assert.equal(payload.areas[0].latestDonId, "2026-DON606");
    assert.equal(payload.areas[0].latestPublishedAt, "2026-06-08T12:35:09Z");
    assert.equal(payload.areas[0].noticeCount, 2);
    assert.deepEqual(payload.noticeWindow, {
      count: 4,
      latestDate: "10 June 2026",
      oldestDate: "29 May 2026"
    });
    assert.equal(
      payload.notices[1].url,
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON606"
    );
  } finally {
    global.fetch = originalFetch;
  }
});
