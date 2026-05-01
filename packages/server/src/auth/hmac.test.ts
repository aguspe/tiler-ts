import { describe, expect, it } from "vitest";
import { signBody, verifyHmac } from "./hmac";

const SECRET = "super-secret";
const BODY = '{"hello":"world"}';

describe("signBody", () => {
  it("returns sha256=<hex> format", () => {
    expect(signBody(SECRET, BODY)).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
  it("is deterministic for the same body+secret", () => {
    expect(signBody(SECRET, BODY)).toBe(signBody(SECRET, BODY));
  });
});

describe("verifyHmac", () => {
  it("accepts a correctly-signed request", () => {
    const sig = signBody(SECRET, BODY);
    expect(verifyHmac(SECRET, BODY, sig)).toBe(true);
  });
  it("rejects a tampered body", () => {
    const sig = signBody(SECRET, BODY);
    expect(verifyHmac(SECRET, `${BODY}X`, sig)).toBe(false);
  });
  it("rejects a signature created with a different secret", () => {
    const sig = signBody("other", BODY);
    expect(verifyHmac(SECRET, BODY, sig)).toBe(false);
  });
  it("rejects a malformed signature header", () => {
    expect(verifyHmac(SECRET, BODY, "not-a-signature")).toBe(false);
    expect(verifyHmac(SECRET, BODY, "sha256=zzz")).toBe(false);
  });
  it("rejects an empty signature", () => {
    expect(verifyHmac(SECRET, BODY, "")).toBe(false);
  });
});
