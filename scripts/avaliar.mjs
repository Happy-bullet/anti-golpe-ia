// Avalia o sistema COMPLETO (IA + regras) chamando a API do app.
// Uso: deixe `npm run dev` rodando e, em outro terminal: npm run avaliar
// Opcional: URL=https://seu-app.vercel.app npm run avaliar
import { lerCSV, gerarRelatorio } from "./metricas.mjs";

const URL_API = (process.env.URL || "http://localhost:3000") + "/api/analisar";
const PAUSA_MS = Number(process.env.PAUSA_MS || 4000); // respeita o limite de 20 pedidos por minuto do app e a cota da IA

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let provedor = "?";
try {
  provedor = (await (await fetch(URL_API)).json()).provedor;
} catch {
  console.error(`\n❌ Não consegui falar com ${URL_API}. O "npm run dev" está rodando?\n`);
  process.exit(1);
}
if (provedor === "offline") console.warn("⚠️  App está em modo offline (sem chave de IA). Vai medir só as regras.");

async function analisar(texto) {
  const r = await fetch(URL_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ texto }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro || `HTTP ${r.status}`);
  return j;
}

const msgs = lerCSV();
const casos = [];
let soRegras = 0;
for (const [i, m] of msgs.entries()) {
  process.stdout.write(`[${i + 1}/${msgs.length}] #${m.id} ${m.rotulo.padEnd(9)} ${String(m.origem).padEnd(9)} → `);
  try {
    let j = await analisar(m.texto);
    // Se a IA não respondeu (cota, rede), espera e tenta mais uma vez antes de aceitar o resultado só das regras.
    if (j.fonte === "regras" && provedor !== "offline") {
      await espera(12000);
      j = await analisar(m.texto);
    }
    if (j.fonte === "regras") soRegras++;
    casos.push({ ...m, risco: j.risco, nivel: j.nivel, tipoDetectado: `${j.tipo}${j.fonte === "regras" ? " (só regras)" : ""}` });
    const certo = (m.rotulo === "golpe") === (j.nivel !== "seguro");
    console.log(`${j.nivel} ${j.risco}% ${certo ? "✅" : "❌"}${j.fonte === "regras" ? " (só regras)" : ""}`);
  } catch (e) {
    console.log(`erro: ${e.message}`);
    await espera(15000);
  }
  await espera(PAUSA_MS);
}
if (soRegras && provedor !== "offline") console.warn(`\n⚠️  ${soRegras} mensagem(ns) foram avaliadas só pelas regras porque a IA não respondeu.`);
if (casos.length < msgs.length) console.warn(`⚠️  ${msgs.length - casos.length} mensagem(ns) ficaram sem resposta e não entraram no relatório.`);

const { destino, resumo } = gerarRelatorio("resultados.md", "Resultados — sistema completo (IA + regras)", casos, `provedor: ${provedor}`);
console.log(`\nAcurácia ${resumo.acuracia} | sensibilidade ${resumo.sensibilidade} | especificidade ${resumo.especificidade}`);
console.log(`Relatório: ${destino}\n`);
