// Phone number validation for staff join.
//
// Ethiopia mobile numbers: 9 digits after +251, starting with
// 7 or 9. We do not verify ownership (no OTP in v1).
//
// This is intentionally a separate module from the rest of
// permissions/joinCode so the client and server share it.

const ETHIOPIAN_MOBILE_REGEX = /^[79]\d{8}$/;

/**
 * Validate a 9-digit Ethiopian mobile number (no country code).
 * Returns true if the digits are well-formed.
 */
export function isValidEthiopianMobile(digits: string): boolean {
  if (typeof digits !== "string") return false;
  return ETHIOPIAN_MOBILE_REGEX.test(digits);
}

/**
 * Normalize a phone number to canonical form: "+251" + 9 digits.
 * Accepts: "9XXXXXXXX", "+2519XXXXXXXX", "2519XXXXXXXX", with
 * spaces/dashes. Returns null if not a valid Ethiopian mobile.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const stripped = trimmed.replace(/[\s\-()]/g, "");
  // Accept +251XXXXXXXXX, 251XXXXXXXXX, 0XXXXXXXXX (leading 0), 9XXXXXXXXX
  let digits: string;
  if (stripped.startsWith("+251") && stripped.length === 13) {
    digits = stripped.slice(4);
  } else if (stripped.startsWith("251") && stripped.length === 12) {
    digits = stripped.slice(3);
  } else if (stripped.startsWith("0") && stripped.length === 10) {
    digits = stripped.slice(1);
  } else if (stripped.length === 9) {
    digits = stripped;
  } else {
    return null;
  }
  return isValidEthiopianMobile(digits) ? `+251${digits}` : null;
}

/**
 * Mask a phone number for safe display in audit logs and shared
 * surfaces. Shows the country code and the last 3 digits.
 * "+251912345678" -> "+2519XX...678"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 8) return "";
  const last3 = normalized.slice(-3);
  return `+2519XX...${last3}`;
}

/**
 * Compare two phone numbers ignoring the country code prefix.
 * Returns true if both normalize to the same +251XXXXXXXXX.
 * Used by the rejoin-binding logic.
 */
export function phonesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === null && nb === null) return true; // both absent
  if (na === null || nb === null) return false;
  return na === nb;
}
