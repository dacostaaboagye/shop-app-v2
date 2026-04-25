import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReservationStatusLabel,
  getSupplyRequestStatusPresentation,
} from "./stock-status";

test("maps operational supply request statuses to user-facing labels", () => {
  assert.equal(getSupplyRequestStatusPresentation("pending").label, "Pending");
  assert.equal(
    getSupplyRequestStatusPresentation("approved").label,
    "Approved",
  );
  assert.equal(
    getSupplyRequestStatusPresentation("dispatched").label,
    "In transit",
  );
  assert.equal(
    getSupplyRequestStatusPresentation("received").label,
    "Received",
  );
  assert.equal(
    getSupplyRequestStatusPresentation("rejected").label,
    "Rejected",
  );
  assert.equal(
    getSupplyRequestStatusPresentation("cancelled").label,
    "Cancelled",
  );
});

test("maps reservation states to user-facing language", () => {
  assert.equal(formatReservationStatusLabel("active"), "Reserved at source");
  assert.equal(
    formatReservationStatusLabel("confirmed"),
    "Consumed on dispatch",
  );
  assert.equal(formatReservationStatusLabel("released"), "Released");
  assert.equal(formatReservationStatusLabel(null), "Not reserved");
});
