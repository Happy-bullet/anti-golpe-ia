// Chamada aos modelos de IA (Gemini e Claude) via fetch, sem SDK.
// Se um provedor ou modelo falhar, tenta o próximo. Se todos falharem, quem chamou cai nas regras locais.

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
  const tem = { gemini: !!process.env.GEMINI_API_KEY, claude: !!process.env.ANTHROPIC_API_KEY };
  const ordem: Exclude<Provedor, "offline">[] = forcado === "claude" ? ["claude", "gemini"] : ["gemini", "claude"];
  return ordem.filter((p) => tem[p]);
}

// ---- pausa de modelo: quando um modelo responde "sem cota" ou "chave recusada", ele fica um tempo sem ser tentado ----
// Sem isso, cada resposta da Vó perderia tempo batendo de novo num modelo que já avisou que não vai responder.
// A pausa vale por instância do servidor (memória), o que basta: a instância seguinte descobre no primeiro pedido.
const PAUSA_COTA_DO_DIA_MS = 30 * 60_000;
const PAUSA_COTA_DO_MINUTO_MS = 45_000;
const PAUSA_CHAVE_RECUSADA_MS = 10 * 60_000;
const pausados = new Map<string, number>();

function emPausa(chave: string): boolean {
  return (pausados.get(chave) || 0) > Date.now();
}

/** Decide a pausa a partir da resposta de erro do provedor. */
function pausarSeForCota(chave: string, status: number, corpo: string) {
  let ms = 0;
  if (status === 429) ms = /PerDay|per day|daily/i.test(corpo) ? PAUSA_COTA_DO_DIA_MS : PAUSA_COTA_DO_MINUTO_MS;
  else if (status === 401 || status === 403) ms = PAUSA_CHAVE_RECUSADA_MS;
  else if (status === 400 && /credit balance|API key not valid/i.test(corpo)) ms = PAUSA_CHAVE_RECUSADA_MS;
  if (ms) pausados.set(chave, Date.now() + ms);
}

/** O admin pediu para tentar a IA de novo (trocou a chave ou a cota renovou): esquece as pausas deste servidor. */
export function limparPausasDaIA() {
  pausados.clear();
}

function modelosDe(provedor: Exclude<Provedor, "offline">): string[] {
  return provedor === "gemini"
    ? semRepetir([process.env.GEMINI_MODEL, ...MODELOS_GEMINI])
    : semRepetir([process.env.ANTHROPIC_MODEL, ...MODELOS_CLAUDE]);
}

/**
 * O microfone do estande depende do Gemini (o Claude não recebe áudio).
 * Devolve false quando não há chave do Gemini ou quando todos os modelos dele estão em pausa longa (cota do dia).
 */
export function audioDisponivel(): boolean {
  if (!provedoresDisponiveis().includes("gemini")) return false;
  const logo = Date.now() + 2 * 60_000;
  return modelosDe("gemini").some((m) => (pausados.get(`gemini/${m}`) || 0) <= logo);
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

async function chamarGemini(modelo: string, p: Pedido): Promise<string> {
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
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
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
    pausarSeForCota(`gemini/${modelo}`, r.status, corpo);
    throw new Error(`Gemini ${modelo} ${r.status}: ${corpo.slice(0, 200)}`);
  }
  const j = await r.json();
  const texto = (j?.candidates?.[0]?.content?.parts || [])
    .filter((x: { thought?: boolean }) => !x.thought)
    .map((x: { text?: string }) => x.text || "")
    .join("");
  if (!texto) throw new Error(`Gemini ${modelo}: resposta vazia (${j?.candidates?.[0]?.finishReason || "sem motivo"})`);
  return texto;
}

async function chamarClaude(modelo: string, p: Pedido): Promise<string> {
  if (p.audio) throw new Error("Claude não recebe áudio");
  const conteudo: unknown[] = [];
  if (p.imagem) conteudo.push({ type: "image", source: { type: "base64", media_type: p.imagem.mime, data: p.imagem.base64 } });
  conteudo.push({ type: "text", text: p.pedido });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
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
    pausarSeForCota(`claude/${modelo}`, r.status, corpo);
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
  for (const provedor of provedoresDisponiveis()) {
    if (p.audio && provedor === "claude") continue; // só o Gemini recebe áudio
    for (const modelo of modelosDe(provedor)) {
      if (emPausa(`${provedor}/${modelo}`)) {
        erros.push(`${provedor}/${modelo} em pausa (sem cota ou chave recusada)`);
        continue;
      }
      try {
        const texto = provedor === "gemini" ? await chamarGemini(modelo, p) : await chamarClaude(modelo, p);
        return { dados: extrairObjeto(texto), provedor: `${provedor} (${modelo})` };
      } catch (e) {
        const motivo = e instanceof Error ? e.message : String(e);
        console.warn(`[anti-golpe] ${provedor}/${modelo} falhou, tentando o próximo:`, motivo.slice(0, 200));
        erros.push(motivo);
      }
    }
  }
  throw new Error(erros.length ? erros.join(" | ") : "Nenhuma chave de IA configurada");
}
