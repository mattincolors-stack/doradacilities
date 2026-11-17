import { expect, it } from "vitest";
import { logoPublicUrl } from "./brand";
it("URL da logo: null sem caminho e URL pública com caminho", () => {
  expect(logoPublicUrl(null, "https://x.co")).toBeNull();
  expect(logoPublicUrl("", "https://x.co")).toBeNull();
  expect(logoPublicUrl("logo-1.webp", "https://x.co/")).toBe("https://x.co/storage/v1/object/public/brand/logo-1.webp");
});
