import { describe, expect, it } from "vitest";
import { parseMoney, previewProducts, productMetrics, zeroCostUpdates } from "./product-rules";
import { buildThermalTicket, buildWhatsappMessage, type TicketOrder } from "./order-text";
import { buildReport } from "./report";
describe("Regras de produtos", () => {
  it("edição em lote preenche somente custos zerados sem enviar preços de venda", () => {
    const products = [{ id: "zero", cost_price: 0, sale_price: 11.5 }, { id: "existing", cost_price: 5.22, sale_price: 20 }];
    expect(zeroCostUpdates(products, { zero: "R$ 6,50", existing: "9,00" })).toEqual([{ id: "zero", update: { cost_price: 6.5 } }]);
    expect(products[0]?.sale_price).toBe(11.5);
    expect(products[1]?.sale_price).toBe(20);
  });
  it("mantém custos em branco sem alteração", () => {
    expect(zeroCostUpdates([{ id: "blank", cost_price: 0 }], { blank: " " })).toEqual([]);
  });
  it("rejeita custos inválidos, negativos ou zero antes de salvar em lote", () => {
    for (const value of ["abc", "-1,00", "0,00"]) expect(() => zeroCostUpdates([{ id: "zero", cost_price: 0 }], { zero: value })).toThrow();
  });
  it("aceita preço com símbolo e vírgula", () => { expect(parseMoney("R$ 11,50")).toBe(11.5); expect(parseMoney("11,50")).toBe(11.5); });
  it("calcula lucro como venda menos custo", () => { expect(productMetrics(11.5,5.22).profit).toBeCloseTo(6.28); });
  it("calcula margem sobre a venda, inclusive negativa", () => { expect(productMetrics(10,12).margin).toBe(-20); });
  it("calcula equivalente por kg de pote de 400 g", () => { expect(productMetrics(10,6,400).perKg).toBe(25); });
  it("exige peso apenas em unitários", () => { const r = previewProducts([["Frutas","Mix","","Unitário","",10,6],["Frutas","Banana","","Por kg","",10,6]],[]); expect(r[0]?.errors).toContain("Peso (g) obrigatório para Unitário"); expect(r[1]?.errors).toEqual([]); });
  it("atualiza produto na mesma categoria sem duplicar", () => { const r=previewProducts([[" frutas "," BANANA ","","Por kg","",10,6]],[{id:"1",name:"Banana",category:"Frutas"}]);expect(r[0]?.existingId).toBe("1"); });
  it("aceita categoria nova", () => { expect(previewProducts([["Nova","Mix","","Por kg","",10,6]],[])[0]?.errors).toEqual([]); });
  it("ignora lucro e margem da planilha", () => {const r=previewProducts([["Frutas","Mix","","Por kg","",10,6,999,999]],[])[0];expect(r && productMetrics(r.product.sale_price,r.product.cost_price).profit).toBe(4);});
  it("marca linhas duplicadas como erro",()=>{const r=previewProducts([["A","B","","Por kg","",10,6],["A","B","","Por kg","",10,6]],[]);expect(r[1]?.errors).toContain("Produto repetido nesta planilha");});
});
const order: TicketOrder = { number:1, created_at:"2026-11-01T00:00:00Z",customer_name:"Cliente",customer_phone:"",notes:"",total:10,items:[{product_name:"Mix",description:"Banana e manga",unit:"un",quantity:1,subtotal:10}] };
it("leva descrição ao WhatsApp sem alterar o TXT térmico", () => {expect(buildWhatsappMessage(order)).toContain("Banana e manga");expect(buildThermalTicket(order,{width:32})).not.toContain("Banana e manga");});
it("preserva descrição nos relatórios",()=>{const r=buildReport([{created_at:order.created_at,total:10,total_cost:6,profit:4,order_items:[{...order.items[0],product_name:"Mix",unit:"un",quantity:1,subtotal:10,subtotal_cost:6}]}]);expect(r.topSold[0]?.description).toBe("Banana e manga");});
import { matchProductByFilename as matchFile } from "./product-rules";
describe("Sugestão de produto pelo nome do arquivo", () => {
  const ps = [{ id: "1", name: "Banana Prata" }, { id: "2", name: "Banana" }, { id: "3", name: "Maçã Fuji" }];
  it("ignora acentos, maiúsculas, hífens, underscores e extensão", () => {
    expect(matchFile("banana-prata.jpg", ps)).toBe("1");
    expect(matchFile("MACA_FUJI.JPEG", ps)).toBe("3");
  });
  it("retorna null quando nenhum produto combina", () => {
    expect(matchFile("IMG_2024.jpg", ps)).toBeNull();
  });
});
describe("Tamanho e arredondamento ,90", () => {
  it("Unitário com Tamanho e sem peso é válido", () => { const r = previewProducts([["Sucos","Laranja","","Unitário","",10,6,"","","300 ml"]],[])[0]; expect(r?.errors).toEqual([]); expect(r?.product.size_label).toBe("300 ml"); });
  it("Unitário sem peso e sem tamanho é inválido", () => { expect(previewProducts([["Sucos","Laranja","","Unitário","",10,6]],[])[0]?.errors.length).toBeGreaterThan(0); });
  it("arredonda venda para ,90 só quando a opção está ligada", () => {
    expect(previewProducts([["A","B","","Por kg","",11.504,6]],[],{ round90: true })[0]?.product.sale_price).toBe(11.9);
    expect(previewProducts([["A","B","","Por kg","",11.504,6]],[],{ round90: false })[0]?.product.sale_price).toBe(11.504);
  });
});
