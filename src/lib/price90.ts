/** Arredonda para o valor mais próximo terminado em ,90 (2 casas). */
export function roundTo90(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Preço inválido para arredondar");
  return Math.round((Math.round(value - 0.9) + 0.9) * 100) / 100;
}
