import { describe, expect, it } from "vitest";
import { roundTo90 } from "./price90";
describe("Preço ,90", () => {
  const cases: [number, number][] = [[11.504, 11.9], [8.5, 8.9], [6, 5.9], [12.9, 12.9], [9.90435, 9.9], [14.498667, 14.9], [19.899636, 19.9], [8.898, 8.9], [7.9018, 7.9], [12.50118, 12.9]];
  for (const [v, r] of cases) it(`${v} → ${r}`, () => expect(roundTo90(v)).toBe(r));
  it("rejeita NaN e negativos", () => { expect(() => roundTo90(NaN)).toThrow(); expect(() => roundTo90(-1)).toThrow(); });
});
