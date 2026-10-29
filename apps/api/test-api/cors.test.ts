import { describe, expect, test } from "bun:test";

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error("BASE_URL is not set. Run these tests with `bun run test:api`.");
}

describe("CORS", () => {
  test("GET responses allow any origin without credentials", async () => {
    const response = await fetch(new URL("/search?q=c:fury", baseUrl), {
      headers: { Origin: "https://riftkeeper.example" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });
});
