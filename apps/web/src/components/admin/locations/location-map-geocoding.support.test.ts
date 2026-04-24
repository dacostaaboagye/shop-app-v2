import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildForwardGeocodeQueries,
  parseLocationSearchInput,
} from "./location-map-geocoding.support.js";

describe("parseLocationSearchInput", () => {
  it("parses direct coordinate input", () => {
    assert.deepEqual(parseLocationSearchInput("5.6037, -0.1870"), {
      kind: "coordinates",
      latitude: 5.6037,
      longitude: -0.187,
    });
  });

  it("parses google maps urls with embedded coordinates", () => {
    assert.deepEqual(
      parseLocationSearchInput(
        "https://www.google.com/maps/place/Accra/@5.6037,-0.187,17z",
      ),
      {
        kind: "coordinates",
        latitude: 5.6037,
        longitude: -0.187,
      },
    );
  });

  it("falls back to place text from map urls", () => {
    assert.deepEqual(
      parseLocationSearchInput(
        "https://www.google.com/maps/place/Kwame+Nkrumah+Memorial+Park/",
      ),
      {
        kind: "text",
        query: "Kwame Nkrumah Memorial Park",
      },
    );
  });
});

describe("buildForwardGeocodeQueries", () => {
  it("normalizes textual queries for fallback searches", () => {
    assert.deepEqual(
      buildForwardGeocodeQueries("  East Legon,+Accra (Ghana)  "),
      ["East Legon,+Accra (Ghana)", "East Legon, Accra Ghana"],
    );
  });
});
