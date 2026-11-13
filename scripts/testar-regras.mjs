// Testa SÓ as regras locais em toda a base (não precisa de internet nem servidor).
// Uso: npm run testar-regras
import { analisarComRegras, nivelDoRisco } from "../lib/regras.mjs";
import { lerCSV, gerarRelatorio } from "./metricas.mjs";

const msgs = lerCSV();
const casos = msgs.map((m) => {
  const r = analisarComRegras(m.texto);
  return { ...m, risco: r.risco, nivel: nivelDoRisco(r.risco), tipoDetectado: r.regrasAtivadas.join(", ") };
});

const { destino, resumo } = gerarRelatorio("resultados-regras.md", "Resultados — só regras locais (modo offline)", casos);
console.log(`\nRegras locais: acurácia ${resumo.acuracia} | sensibilidade ${resumo.sensibilidade} | especificidade ${resumo.especificidade}`);
console.log(`VP ${resumo.vp}  FN ${resumo.fn}  FP ${resumo.fp}  VN ${resumo.vn}`);
console.log(`Relatório: ${destino}\n`);
