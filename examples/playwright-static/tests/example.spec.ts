import { expect, test } from "@playwright/test";

test.describe("checkout", () => {
  test("places order", async () => {
    expect(1 + 1).toBe(2);
  });

  test("validates payment", async () => {
    expect(1 + 1).toBe(3); // intentional fail
  });
});

test.describe("auth", () => {
  test.skip("logs in", async () => {
    /* skipped */
  });

  test("renders signup form", async () => {
    expect("hello".toUpperCase()).toBe("HELLO");
  });
});
