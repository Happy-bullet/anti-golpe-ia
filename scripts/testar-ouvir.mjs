// Testa a transcrição do microfone com arquivos WAV (16 kHz mono), usando o mesmo pedido do app.
// Uso (PowerShell, dentro de app/):  node --env-file=.env.local scripts/testar-ouvir.mjs arquivo1.wav arquivo2.wav
import { readFileSync } from "node:fs";
import { PEDIDO_OUVIR, SISTEMA_OUVIR } from "../lib/ouvir-pedido.mjs";

const chave = process.env.GEMINI_API_KEY;
if (!chave) {
  console.error("Falta GEMINI_API_KEY (use --env-file=.env.local).");
  process.exit(1);
}
const modelo = process.env.GEMINI_MODEL || "gemini-3.6-flash";

async function transcrever(base64, comRaciocinio = true, tipo = "audio/wav") {
  const generationConfig = { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 400 };
  if (comRaciocinio) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SISTEMA_OUVIR }] },
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: tipo, data: base64 } }, { text: PEDIDO_OUVIR }] }],
      generationConfig,
    }),
  });
  if (r.status === 400 && comRaciocinio) return transcrever(base64, false, tipo);
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const texto = (j?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
  return JSON.parse(texto.replace(/```json|```/g, "").trim()).texto ?? "";
}

for (const arquivo of process.argv.slice(2)) {
  const inicio = Date.now();
  try {
    const texto = await transcrever(readFileSync(arquivo).toString("base64"), true, arquivo.endsWith(".mp3") ? "audio/mp3" : "audio/wav");
    console.log(`${arquivo.split(/[\\/]/).pop()}  (${Date.now() - inicio} ms)\n   -> ${JSON.stringify(texto)}`);
  } catch (e) {
    console.log(`${arquivo.split(/[\\/]/).pop()}  FALHOU: ${e.message}`);
  }
}
