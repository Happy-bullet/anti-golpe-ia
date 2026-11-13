// Avalia o sistema COMPLETO (IA + regras) chamando a API do app.
// Uso: deixe `npm run dev` rodando e, em outro terminal: npm run avaliar
// Opcional: URL=https://seu-app.vercel.app npm run avaliar
import { lerCSV, gerarRelatorio } from "./metricas.mjs";

const URL_API = (process.env.URL || "http://localhost:3000") + "/api/analisar";
const PAUSA_MS = Number(process.env.PAUSA_MS || 1500); // respeita limite do plano grátis

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let provedor = "?";
try {
  provedor = (await (await fetch(URL_API)).json()).provedor;
} catch {
  console.error(`\n❌ Não consegui falar com ${URL_API}. O "npm run dev" está rodando?\n`);
  process.exit(1);
}
if (provedor === "offline") console.warn("⚠️  App está em modo offline (sem chave de IA). Vai medir só as regras.");

const msgs = lerCSV();
const casos = [];
for (const [i, m] of msgs.entries()) {
  process.stdout.write(`[${i + 1}/${msgs.length}] #${m.id} ${m.rotulo.padEnd(9)} → `);
  try {
    const r = await fetch(URL_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texto: m.texto }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro);
    casos.push({ ...m, risco: j.risco, nivel: j.nivel, tipoDetectado: `${j.tipo}${j.fonte === "regras" ? " (regras)" : ""}` });
    const certo = (m.rotulo === "golpe") === (j.nivel !== "seguro");
    console.log(`${j.nivel} ${j.risco}% ${certo ? "✅" : "❌"}`);
  } catch (e) {
    console.log(`erro: ${e.message}`);
  }
  await espera(PAUSA_MS);
}

const { destino, resumo } = gerarRelatorio("resultados.md", "Resultados — sistema completo (IA + regras)", casos, `provedor: ${provedor}`);
console.log(`\nAcurácia ${resumo.acuracia} | sensibilidade ${resumo.sensibilidade} | especificidade ${resumo.especificidade}`);
console.log(`Relatório: ${destino}\n`);
