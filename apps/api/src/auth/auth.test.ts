import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";
import { hashRefreshToken, issueAccessToken, newRefreshToken, verifyAccessToken } from "./tokens.js";

describe("identity primitives", () => {
  it("hashes passwords and rejects a different password", async () => {
    const hash = await hashPassword("a-strong-test-password");
    expect(hash).not.toBe("a-strong-test-password");
    await expect(verifyPassword("a-strong-test-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("incorrect-password", hash)).resolves.toBe(false);
  });
  it("issues verifiable, tenant-scoped access claims", () => {
    const claims = { sub: "user-1", tenantId: "tenant-1", role: "owner", sid: "session-1" };
    expect(verifyAccessToken(issueAccessToken(claims))).toMatchObject(claims);
  });
  it("generates opaque refresh tokens and one-way hashes", () => {
    const first = newRefreshToken();
    const second = newRefreshToken();
    expect(first).not.toBe(second);
    expect(hashRefreshToken(first)).not.toBe(first);
    expect(hashRefreshToken(first)).toHaveLength(64);
  });
});
