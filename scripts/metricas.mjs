// Funções compartilhadas pelos scripts de avaliação.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
// Na pasta do projeto a base fica em "05 - Testes"; no repositório do GitHub, em "testes".
const PASTA_LOCAL = path.resolve(AQUI, "../../05 - Testes");
export const PASTA_TESTES = existsSync(PASTA_LOCAL) ? PASTA_LOCAL : path.resolve(AQUI, "../testes");

/** Parser de CSV simples com suporte a aspas e quebras de linha. */
export function lerCSV(arquivo = path.join(PASTA_TESTES, "mensagens.csv")) {
  const bruto = readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < bruto.length; i++) {
    const c = bruto[i];
    if (aspas) {
      if (c === '"' && bruto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && bruto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); if (linha.some((x) => x.trim())) linhas.push(linha); }
  const [cab, ...dados] = linhas;
  return dados.map((l) => Object.fromEntries(cab.map((k, i) => [k.trim(), (l[i] ?? "").trim()])));
}

/** Previsto como golpe = nível "golpe" ou "suspeito". */
export function calcular(casos) {
  const m = { vp: 0, vn: 0, fp: 0, fn: 0 };
  for (const c of casos) {
    const real = c.rotulo === "golpe";
    const prev = c.nivel !== "seguro";
    if (real && prev) m.vp++;
    else if (!real && !prev) m.vn++;
    else if (!real && prev) m.fp++;
    else m.fn++;
  }
  const total = casos.length || 1;
  const pct = (x) => (isFinite(x) ? `${(x * 100).toFixed(1)}%` : "—");
  return {
    ...m,
    total: casos.length,
    acuracia: pct((m.vp + m.vn) / total),
    precisao: pct(m.vp / (m.vp + m.fp)),
    sensibilidade: pct(m.vp / (m.vp + m.fn)),
    especificidade: pct(m.vn / (m.vn + m.fp)),
  };
}

function bloco(titulo, casos) {
  const r = calcular(casos);
  return `### ${titulo} (${r.total} mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **${r.acuracia}** | acertos no total |
| Sensibilidade | ${r.sensibilidade} | dos golpes, quantos pegamos |
| Especificidade | ${r.especificidade} | das legítimas, quantas liberamos |
| Precisão | ${r.precisao} | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | ${r.vp} ✅ | ${r.fn} ❌ (pior erro) |
| **Era legítima** | ${r.fp} ⚠️ | ${r.vn} ✅ |
`;
}

export function gerarRelatorio(nomeArquivo, titulo, casos, extra = "") {
  const reais = casos.filter((c) => c.origem === "real");
  const sint = casos.filter((c) => c.origem !== "real");
  const erros = casos.filter((c) => (c.rotulo === "golpe") !== (c.nivel !== "seguro"));

  let md = `# ${titulo}\n\nGerado em ${new Date().toLocaleString("pt-BR")}${extra ? ` · ${extra}` : ""}\n\n`;
  md += bloco("Todas", casos) + "\n";
  if (reais.length) md += bloco("Só mensagens REAIS (usar no banner)", reais) + "\n";
  if (sint.length) md += bloco("Só exemplos sintéticos", sint) + "\n";
  md += `## Erros (${erros.length})\n\n`;
  md += erros.length
    ? erros.map((c) => `- **#${c.id}** era *${c.rotulo}* (${c.tipo}), saiu *${c.nivel}* com risco ${c.risco}% → "${c.texto.slice(0, 120)}${c.texto.length > 120 ? "..." : ""}"`).join("\n")
    : "Nenhum 🎉";
  md += "\n\n## Todas as respostas\n\n| # | Rótulo | Origem | Nível | Risco | Tipo detectado |\n|---|---|---|---|---|---|\n";
  md += casos.map((c) => `| ${c.id} | ${c.rotulo} | ${c.origem} | ${c.nivel} | ${c.risco} | ${String(c.tipoDetectado || "").replace(/\|/g, "/")} |`).join("\n");
  md += "\n";

  const destino = path.join(PASTA_TESTES, nomeArquivo);
  writeFileSync(destino, md, "utf8");

  // A avaliação do sistema completo também alimenta a página "Como funciona" do app.
  if (nomeArquivo === "resultados.json" || nomeArquivo === "resultados.md") {
    const json = {
      geradoEm: new Date().toLocaleDateString("pt-BR"),
      provedor: extra.replace(/^provedor: /, ""),
      reais: reais.length ? calcular(reais) : null,
      sinteticos: sint.length ? calcular(sint) : null,
    };
    writeFileSync(path.resolve(AQUI, "../lib/resultados.json"), JSON.stringify(json, null, 2) + "\n", "utf8");
  }
  return { destino, resumo: calcular(casos) };
}
