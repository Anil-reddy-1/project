const crypto = require('crypto');

/**
 * OTP helpers shared by the order/delivery workflow.
 *
 * - Pickup OTP: supervisor → delivery partner, proves the partner collected the parcel.
 * - Delivery OTP: buyer → delivery partner, proves the parcel reached the buyer.
 */

const PICKUP_OTP_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const DELIVERY_OTP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Minimum gap between two buyer-initiated delivery OTP regenerations
const BUYER_REGENERATE_COOLDOWN_MS = 60 * 1000;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function isExpired(expiresAt) {
  return !!expiresAt && new Date(expiresAt) < new Date();
}

/** True when the OTP is missing or past its expiry and should be (re)issued. */
function needsNewOtp(otp, expiresAt) {
  return !otp || isExpired(expiresAt);
}

module.exports = {
  PICKUP_OTP_TTL_MS,
  DELIVERY_OTP_TTL_MS,
  BUYER_REGENERATE_COOLDOWN_MS,
  generateOtp,
  isExpired,
  needsNewOtp,
};
