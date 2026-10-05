import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of secret.replaceAll("=", "").toUpperCase()) {
    const digit = alphabet.indexOf(char);
    assert.notEqual(digit, -1, "Auth supplied a valid base32 TOTP secret");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 255);
    }
  }
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(message).digest();
  const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString().padStart(6, "0");
}

export async function verifiedTotpToken(request, aal1Token) {
  const enrolled = await request("/auth/v1/factors", aal1Token, { factor_type: "totp" });
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));
  const challenge = await request(`/auth/v1/factors/${enrolled.body.id}/challenge`,
    aal1Token, {});
  assert.equal(challenge.status, 200, JSON.stringify(challenge.body));
  const verified = await request(`/auth/v1/factors/${enrolled.body.id}/verify`,
    aal1Token, { challenge_id: challenge.body.id, code: totp(enrolled.body.totp.secret) });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  const token = verified.body.access_token;
  assert.equal(JSON.parse(Buffer.from(token.split(".")[1], "base64url")).aal, "aal2");
  return token;
}
