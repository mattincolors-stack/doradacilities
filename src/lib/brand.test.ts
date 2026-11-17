import { expect, it } from "vitest";
import { logoUrl } from "./brand";
it("URL da logo: null sem caminho e URL do arquivo com caminho", async () => {
  const sign = async (p: string) => `https://x.co/storage/v1/object/sign/brand/${p}?token=t`;
  expect(await logoUrl(null, sign)).toBeNull();
  expect(await logoUrl(" ", sign)).toBeNull();
  expect(await logoUrl("logo-1.webp", sign)).toBe("https://x.co/storage/v1/object/sign/brand/logo-1.webp?token=t");
});
