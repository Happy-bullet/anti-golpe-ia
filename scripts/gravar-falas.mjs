// Grava em MP3 todas as falas fixas da Vó Zilda (abertura, roteiro, desvios e "hummm...").
// Os arquivos vão para public/falas/ e passam a tocar sem gastar crédito e sem internet.
//
// A gravação é feita PELO SITE PUBLICADO (rota /api/voz/roteiro), então a chave da ElevenLabs
// fica só na Vercel. Uso (PowerShell, dentro de app/):
//   node scripts/gravar-falas.mjs                       -> usa https://anti-golpe-ia.vercel.app
//   node scripts/gravar-falas.mjs http://localhost:3000  -> usa o servidor local (precisa da chave no .env.local)
//   node scripts/gravar-falas.mjs --refazer              -> grava de novo mesmo o que já existe (ex.: trocou a voz)
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = join(RAIZ, "public", "falas");
const MAPA = join(RAIZ, "lib", "falas-gravadas.json");

const args = process.argv.slice(2);
const refazer = args.includes("--refazer");
const base = (args.find((a) => a.startsWith("http")) || "https://anti-golpe-ia.vercel.app").replace(/\/$/, "");
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

const r = await fetch(`${base}/api/voz/roteiro`);
const lista = await r.json().catch(() => ({}));
if (!r.ok) {
  console.error(`Não deu para pegar a lista de falas (${r.status}): ${lista.erro || ""}`);
  process.exit(1);
}

mkdirSync(PASTA, { recursive: true });
const anterior = existsSync(MAPA) ? JSON.parse(readFileSync(MAPA, "utf8")) : { versao: 0, falas: {} };
const vozMudou = anterior.voz && anterior.voz !== lista.voz;
const mapa = {};
let gravadas = 0;
let falhas = 0;

for (const fala of lista.falas) {
  const nome = fala.arquivo.split("/").pop();
  const destino = join(PASTA, nome);
  if (existsSync(destino) && !refazer && !vozMudou) {
    mapa[fala.texto] = fala.arquivo;
    continue;
  }
  let ok = false;
  for (let tentativa = 1; tentativa <= 3 && !ok; tentativa++) {
    try {
      const a = await fetch(base + fala.gravar);
      const buf = Buffer.from(await a.arrayBuffer());
      if (!a.ok || buf.length < 500) throw new Error(`${a.status} ${buf.toString("utf8", 0, 120)}`);
      writeFileSync(destino, buf);
      mapa[fala.texto] = fala.arquivo;
      gravadas++;
      ok = true;
      console.log(`ok  ${nome}  ${(buf.length / 1024).toFixed(0)} KB  "${fala.texto.slice(0, 50)}"`);
    } catch (e) {
      console.warn(`tentativa ${tentativa} falhou: "${fala.texto.slice(0, 40)}" -> ${e.message}`);
      await espera(2500 * tentativa);
    }
  }
  if (!ok) falhas++;
  await espera(900);
}

// Apaga MP3 que não pertencem mais a nenhuma fala.
const usados = new Set(Object.values(mapa).map((a) => a.split("/").pop()));
for (const f of readdirSync(PASTA)) if (f.endsWith(".mp3") && !usados.has(f)) unlinkSync(join(PASTA, f));

writeFileSync(MAPA, JSON.stringify({ versao: (anterior.versao || 0) + 1, voz: lista.voz, falas: mapa }, null, 2) + "\n");
writeFileSync(join(PASTA, "lista.json"), JSON.stringify(Object.values(mapa)) + "\n");
console.log(`\n${Object.keys(mapa).length} de ${lista.falas.length} falas prontas (${gravadas} gravadas agora, ${falhas} falharam).`);
if (falhas) process.exit(2);
