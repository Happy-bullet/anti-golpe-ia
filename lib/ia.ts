// Chamada aos modelos de IA (Gemini e Claude) via fetch, sem SDK.
// Se um provedor, modelo ou chave falhar, tenta o próximo. Se todos falharem, quem chamou cai nas regras locais.
// O Gemini aceita várias chaves (GEMINI_API_KEY, GEMINI_API_KEY_2...). A cota gratuita é por PROJETO do Google,
// então só soma cota se cada chave for de um projeto diferente.

import { chavesGemini } from "./chaves.mjs";
import { limparPausas, pausar, pausasAtivas, type Pausa } from "./pausas";

export type Provedor = "gemini" | "claude" | "offline";

interface Imagem {
  base64: string;
  mime: string;
}

interface Pedido {
  sistema: string;
  pedido: string;
  imagem?: Imagem;
  /** Áudio para transcrever. Só o Gemini aceita. */
  audio?: Imagem;
  maxTokens?: number;
  temperatura?: number;
  /** Quanto o modelo "pensa" antes de responder. Menos = mais rápido. */
  raciocinio?: "minimal" | "low";
}

const TEMPO_LIMITE_MS = 14_000;

// Modelos tentados em ordem. O primeiro vem do .env; os outros são reserva.
const MODELOS_GEMINI = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];
const MODELOS_CLAUDE = ["claude-haiku-5-5"];

function semRepetir(lista: (string | undefined)[]) {
  return Array.from(new Set(lista.filter((x): x is string => !!x && !!x.trim()).map((x) => x.trim())));
}

/** Provedores com chave configurada, na ordem em que serão tentados. */
export function provedoresDisponiveis(): Exclude<Provedor, "offline">[] {
  const forcado = (process.env.IA_PROVEDOR || "").toLowerCase();
  if (forcado === "offline") return [];
  const tem = { gemini: chavesGemini().length > 0, claude: !!process.env.ANTHROPIC_API_KEY };
  const ordem: Exclude<Provedor, "offline">[] = forcado === "claude" ? ["claude", "gemini"] : ["gemini", "claude"];
  return ordem.filter((p) => tem[p]);
}

// ---- pausa: quando uma chave+modelo responde "sem cota" ou "chave recusada", fica um tempo sem ser tentada ----
// A pausa é guardada no Redis (lib/pausas.ts), então vale para todos os servidores da Vercel.
const PAUSA_COTA_DO_DIA_MS = 30 * 60_000;
const PAUSA_COTA_DO_MINUTO_MS = 45_000;
const PAUSA_CHAVE_RECUSADA_MS = 30 * 60_000;

/** Nome da pausa: provedor, número da chave e modelo (a cota do Gemini é por projeto e por modelo). */
const quem = (provedor: string, n: number, modelo: string) => `${provedor}/${n}/${modelo}`;

/** Decide a pausa a partir da resposta de erro do provedor. */
async function pausarSeForCota(nome: string, status: number, corpo: string) {
  let ms = 0;
  let motivo = "";
  if (status === 429) {
    const doDia = /PerDay|per day|daily/i.test(corpo);
    ms = doDia ? PAUSA_COTA_DO_DIA_MS : PAUSA_COTA_DO_MINUTO_MS;
    motivo = doDia ? "cota do dia acabou" : "muitos pedidos por minuto";
  } else if (status === 401 || status === 403 || (status === 400 && /API key not valid|API_KEY_INVALID/i.test(corpo))) {
    ms = PAUSA_CHAVE_RECUSADA_MS;
    motivo = "chave recusada";
  } else if (status === 400 && /credit balance/i.test(corpo)) {
    ms = PAUSA_CHAVE_RECUSADA_MS;
    motivo = "sem crédito";
  }
  if (ms) await pausar("ia", nome, ms, motivo);
}

/** O admin pediu para tentar a IA de novo (trocou a chave ou a cota renovou): esquece as pausas. */
export async function limparPausasDaIA() {
  await limparPausas("ia");
}

function modelosDe(provedor: Exclude<Provedor, "offline">): string[] {
  return provedor === "gemini"
    ? semRepetir([process.env.GEMINI_MODEL, ...MODELOS_GEMINI])
    : semRepetir([process.env.ANTHROPIC_MODEL, ...MODELOS_CLAUDE]);
}

/** Chaves de cada provedor, numeradas a partir de 1 (o número é o que aparece no painel; a chave nunca sai do servidor). */
function chavesDe(provedor: Exclude<Provedor, "offline">): { n: number; chave: string }[] {
  const lista = provedor === "gemini" ? chavesGemini() : [(process.env.ANTHROPIC_API_KEY || "").trim()].filter(Boolean);
  return lista.map((chave, i) => ({ n: i + 1, chave }));
}

/**
 * O microfone do estande depende do Gemini (o Claude não recebe áudio).
 * Devolve false quando não há chave do Gemini ou quando todas as chaves e modelos estão em pausa longa.
 */
export async function audioDisponivel(): Promise<boolean> {
  if (!provedoresDisponiveis().includes("gemini")) return false;
  const pausas = await pausasAtivas("ia");
  const logo = Date.now() + 2 * 60_000;
  return chavesDe("gemini").some(({ n }) => modelosDe("gemini").some((m) => (pausas.get(quem("gemini", n, m))?.ate || 0) <= logo));
}

export interface EstadoDaChave {
  provedor: string;
  n: number;
  /** Modelos em pausa, com o motivo e até quando. */
  pausas: { modelo: string; motivo: string; ate: number }[];
  /** true: todos os modelos desta chave estão em pausa. */
  parada: boolean;
}

/** Situação de cada chave de IA, para o painel. */
export async function estadoDasChavesDeIA(): Promise<EstadoDaChave[]> {
  const pausas = await pausasAtivas("ia");
  const saida: EstadoDaChave[] = [];
  for (const provedor of provedoresDisponiveis()) {
    const modelos = modelosDe(provedor);
    for (const { n } of chavesDe(provedor)) {
      const desta = modelos
        .map((modelo) => ({ modelo, p: pausas.get(quem(provedor, n, modelo)) }))
        .filter((x): x is { modelo: string; p: Pausa } => !!x.p)
        .map(({ modelo, p }) => ({ modelo, motivo: p.motivo, ate: p.ate }));
      saida.push({ provedor, n, pausas: desta, parada: desta.length === modelos.length });
    }
  }
  return saida;
}

export function provedorAtivo(): Provedor {
  return provedoresDisponiveis()[0] || "offline";
}

/** Tira o JSON de dentro da resposta do modelo, mesmo que venha com crases ou texto em volta. */
export function extrairObjeto(texto: string): Record<string, unknown> {
  const limpo = texto.replace(/```json|```/g, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) throw new Error("A IA não devolveu JSON");
  const obj = JSON.parse(limpo.slice(ini, fim + 1));
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("JSON inesperado");
  return obj as Record<string, unknown>;
}

async function chamarGemini(modelo: string, p: Pedido, chave: string, n: number): Promise<string> {
  const partes: unknown[] = [];
  if (p.imagem) partes.push({ inlineData: { mimeType: p.imagem.mime, data: p.imagem.base64 } });
  if (p.audio) partes.push({ inlineData: { mimeType: p.audio.mime, data: p.audio.base64 } });
  partes.push({ text: p.pedido });
  const base = process.env.GEMINI_URL_BASE || "https://generativelanguage.googleapis.com"; // trocável só para testes

  // Os modelos Gemini 3 "pensam" por padrão, o que deixa a resposta lenta.
  // Pedimos pouco raciocínio; se o modelo recusar esse parâmetro, tentamos de novo sem ele.
  const pedir = async (comRaciocinio: boolean) => {
    const config: Record<string, unknown> = {
      responseMimeType: "application/json",
      temperature: p.temperatura ?? 0.2,
      maxOutputTokens: p.maxTokens ?? 3000,
    };
    if (comRaciocinio) config.thinkingConfig = { thinkingLevel: p.raciocinio ?? "low" };
    return fetch(`${base}/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.sistema }] },
        contents: [{ role: "user", parts: partes }],
        generationConfig: config,
      }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  };

  let r = await pedir(true);
  if (r.status === 400) r = await pedir(false);
  if (!r.ok) {
    const corpo = await r.text();
    await pausarSeForCota(quem("gemini", n, modelo), r.status, corpo);
    throw new Error(`Gemini chave ${n} ${modelo} ${r.status}: ${corpo.slice(0, 200)}`);
  }
  const j = await r.json();
  const texto = (j?.candidates?.[0]?.content?.parts || [])
    .filter((x: { thought?: boolean }) => !x.thought)
    .map((x: { text?: string }) => x.text || "")
    .join("");
  if (!texto) throw new Error(`Gemini ${modelo}: resposta vazia (${j?.candidates?.[0]?.finishReason || "sem motivo"})`);
  return texto;
}

async function chamarClaude(modelo: string, p: Pedido, chave: string, n: number): Promise<string> {
  if (p.audio) throw new Error("Claude não recebe áudio");
  const conteudo: unknown[] = [];
  if (p.imagem) conteudo.push({ type: "image", source: { type: "base64", media_type: p.imagem.mime, data: p.imagem.base64 } });
  conteudo.push({ type: "text", text: p.pedido });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: p.maxTokens ?? 2000,
      temperature: p.temperatura ?? 0.2,
      system: p.sistema,
      messages: [{ role: "user", content: conteudo }],
    }),
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!r.ok) {
    const corpo = await r.text();
    await pausarSeForCota(quem("claude", n, modelo), r.status, corpo);
    throw new Error(`Claude ${modelo} ${r.status}: ${corpo.slice(0, 200)}`);
  }
  const j = await r.json();
  const texto = (j?.content || []).map((c: { text?: string }) => c.text || "").join("");
  if (!texto) throw new Error(`Claude ${modelo}: resposta vazia`);
  return texto;
}

/**
 * Pede um JSON para a IA. Tenta cada provedor e cada modelo em ordem.
 * Lança erro se nenhum responder (quem chama decide o plano B).
 */
export async function pedirJSON(p: Pedido): Promise<{ dados: Record<string, unknown>; provedor: string }> {
  const erros: string[] = [];
  const pausas = await pausasAtivas("ia");
  for (const provedor of provedoresDisponiveis()) {
    if (p.audio && provedor === "claude") continue; // só o Gemini recebe áudio
    // Primeiro o melhor modelo em todas as chaves; só depois o modelo reserva.
    for (const modelo of modelosDe(provedor)) {
      for (const { n, chave } of chavesDe(provedor)) {
        if (pausas.has(quem(provedor, n, modelo))) {
          erros.push(`${provedor} chave ${n} ${modelo} em pausa`);
          continue;
        }
        try {
          const texto = provedor === "gemini" ? await chamarGemini(modelo, p, chave, n) : await chamarClaude(modelo, p, chave, n);
          return { dados: extrairObjeto(texto), provedor: `${provedor} (${modelo}, chave ${n})` };
        } catch (e) {
          const motivo = e instanceof Error ? e.message : String(e);
          console.warn(`[anti-golpe] ${provedor} chave ${n} ${modelo} falhou, tentando a próxima:`, motivo.slice(0, 200));
          erros.push(motivo);
          // Tempo esgotado ou servidor fora do ar não é problema da chave: não vale gastar mais 14 s em outra chave do mesmo modelo.
          if (/timeout|aborted|fetch failed| 5\d\d:/i.test(motivo)) break;
        }
      }
    }
  }
  throw new Error(erros.length ? erros.join(" | ") : "Nenhuma chave de IA configurada");
}
