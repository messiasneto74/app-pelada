import { describe, expect, it } from "vitest";
import { CORE_VERSION } from "./index.js";

describe("@pelada/core bootstrap", () => {
  it("exposes CORE_VERSION for monorepo wiring", () => {
    expect(CORE_VERSION).toBe(1);
  });
});
