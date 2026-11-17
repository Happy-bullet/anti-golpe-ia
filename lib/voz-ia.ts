// Voz da Vó Zilda pela ElevenLabs, com várias camadas de segurança para a feira:
// 1. Falas fixas já gravadas em /public/falas (não gastam crédito e funcionam sem internet).
// 2. Falas novas da IA viram áudio pela rota /api/voz. A URL é ASSINADA pelo servidor:
//    só o que a própria Vó falou pode virar áudio, então ninguém usa o site como TTS grátis.
// 3. A resposta de /api/voz fica em cache na CDN da Vercel: a mesma frase não gasta crédito duas vezes.
// 4. Teto diário de caracteres e um "disjuntor": se os créditos acabarem ou a ElevenLabs cair,
//    o servidor para de oferecer áudio e o navegador usa a própria voz (último recurso).
// A chave fica só no servidor (variável de ambiente). Nada da conversa é gravado.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import gravadas from "./falas-gravadas.json";

const URL_BASE = process.env.ELEVENLABS_URL_BASE || "https://api.elevenlabs.io";
const TEMPO_LIMITE_MS = 9000;
export const MAX_CARACTERES = 420;

export type Qualidade = "rapida" | "alta";

const MAPA_GRAVADAS: Record<string, string> = (gravadas as { falas?: Record<string, string> }).falas || {};

function chave() {
  // Só o primeiro "pedaço": se a chave for colada duas vezes ou com quebra de linha, ainda funciona.
  return (process.env.ELEVENLABS_API_KEY || "").trim().split(/\s+/)[0] || "";
}

/** Tira qualquer coisa com cara de chave de uma mensagem antes de ela ir para o registro. */
function semSegredo(texto: string): string {
  return texto.replace(/sk_[A-Za-z0-9]+/g, "sk_***").slice(0, 300);
}
function vozId() {
  const id = (process.env.ELEVENLABS_VOICE_ID || "").trim();
  // Proteção contra troca de variáveis: se colarem a chave no lugar do ID da voz, a voz fica desligada
  // (um ID de voz tem 20 letras e números e nunca começa com "sk_").
  return /^[A-Za-z0-9]{16,32}$/.test(id) && !id.startsWith("sk") ? id : "";
}

/** Diz se a variável do ID da voz está preenchida com algo que não é um ID (para avisar no painel). */
export function vozIdInvalido(): boolean {
  return !!(process.env.ELEVENLABS_VOICE_ID || "").trim() && !vozId();
}

/** Marca curta da voz em uso (não é o ID): serve só para o script saber se a voz mudou e regravar. */
export function impressaoDaVoz(): string {
  return createHash("sha256").update(`voz:${vozId()}`).digest("hex").slice(0, 10);
}

export function vozConfigurada(): boolean {
  return !!(chave() && vozId());
}

/** Limpa o texto antes de virar voz: tira emoji, asterisco e espaços sobrando. */
export function limparParaVoz(texto: string): string {
  return texto
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/[*_#`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CARACTERES);
}

export function nomeDoArquivo(texto: string): string {
  return createHash("sha256").update(limparParaVoz(texto)).digest("hex").slice(0, 16);
}

function segredo(): string {
  return process.env.VOZ_SEGREDO || createHash("sha256").update(`anti-golpe-voz:${chave()}:${vozId()}`).digest("hex");
}

function assinatura(texto: string, qualidade: Qualidade): string {
  return createHmac("sha256", segredo()).update(`${qualidade}|${vozId()}|${texto}`).digest("base64url").slice(0, 22);
}

export function assinaturaValida(texto: string, qualidade: Qualidade, recebida: string): boolean {
  const certa = Buffer.from(assinatura(texto, qualidade));
  const veio = Buffer.from(recebida || "");
  return certa.length === veio.length && timingSafeEqual(certa, veio);
}

/** URL de áudio para uma fala da Vó, ou null se a voz do navegador é que deve falar. */
export function urlDoAudio(texto: string, qualidade: Qualidade = "rapida"): string | null {
  const limpo = limparParaVoz(texto);
  if (!limpo) return null;
  const gravada = MAPA_GRAVADAS[limpo];
  if (gravada) return gravada;
  if (!vozConfigurada() || !disjuntorFechado()) return null;
  const p = new URLSearchParams({ t: limpo, q: qualidade, s: assinatura(limpo, qualidade) });
  return `/api/voz?${p.toString()}`;
}

/** URL para gravar uma fala fixa em alta qualidade (usada só pelo script de gravação). */
export function urlDeGravacao(texto: string): string {
  const limpo = limparParaVoz(texto);
  const p = new URLSearchParams({ t: limpo, q: "alta", s: assinatura(limpo, "alta") });
  return `/api/voz?${p.toString()}`;
}

// ---- disjuntor: para de chamar a ElevenLabs por um tempo quando ela falha ----
let pausadoAte = 0;
let falhasSeguidas = 0;

function disjuntorFechado(): boolean {
  return Date.now() >= pausadoAte;
}

function registrarFalha(semCreditos: boolean) {
  if (semCreditos) {
    pausadoAte = Date.now() + 20 * 60_000;
    return;
  }
  falhasSeguidas++;
  if (falhasSeguidas >= 3) {
    pausadoAte = Date.now() + 2 * 60_000;
    falhasSeguidas = 0;
  }
}

// ---- teto diário de caracteres (protege os créditos para o dia da Mostra) ----
let dia = "";
let caracteresHoje = 0;

function reservarCaracteres(n: number): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje !== dia) {
    dia = hoje;
    caracteresHoje = 0;
  }
  const teto = Number(process.env.LIMITE_VOZ_CARACTERES_DIA || 6000);
  if (caracteresHoje + n > teto) return false;
  caracteresHoje += n;
  return true;
}

// ---- cache em memória (a CDN da Vercel é o cache principal; este segura repetições na mesma instância) ----
const cache = new Map<string, Buffer>();
const MAX_CACHE = 80;

export class ErroDeVoz extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}

export async function sintetizar(texto: string, qualidade: Qualidade): Promise<Buffer> {
  if (!vozConfigurada()) throw new ErroDeVoz("Voz da ElevenLabs não configurada.");
  if (!disjuntorFechado()) throw new ErroDeVoz("Voz pausada depois de falhas seguidas.");

  const chaveCache = `${qualidade}|${texto}`;
  const guardado = cache.get(chaveCache);
  if (guardado) return guardado;

  if (!reservarCaracteres(texto.length)) throw new ErroDeVoz("Teto diário de voz atingido.", 429);

  const modelo =
    qualidade === "alta"
      ? process.env.ELEVENLABS_MODELO_GRAVACAO || "eleven_multilingual_v2"
      : process.env.ELEVENLABS_MODELO || "eleven_flash_v2_5";

  const corpo: Record<string, unknown> = {
    text: texto,
    model_id: modelo,
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 },
  };
  // multilingual_v2 não aceita language_code; os outros aceitam e ficam mais firmes no português.
  if (!modelo.startsWith("eleven_multilingual")) corpo.language_code = "pt";

  let r: Response;
  try {
    r = await fetch(`${URL_BASE}/v1/text-to-speech/${encodeURIComponent(vozId())}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": chave(), "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch (e) {
    registrarFalha(false);
    // A mensagem do erro pode trazer o cabeçalho com a chave: vai só para o registro, e sem a chave.
    console.error("[anti-golpe] ElevenLabs não respondeu:", semSegredo(e instanceof Error ? e.message : String(e)));
    throw new ErroDeVoz("ElevenLabs não respondeu.");
  }

  if (!r.ok) {
    const detalhe = semSegredo(await r.text().catch(() => ""));
    const semCreditos = r.status === 401 || r.status === 402 || /quota|credit|limit/i.test(detalhe);
    registrarFalha(semCreditos);
    console.error(`[anti-golpe] ElevenLabs ${r.status}${semCreditos ? " (créditos/cota)" : ""}: ${detalhe}`);
    throw new ErroDeVoz(semCreditos ? "Créditos de voz esgotados." : `ElevenLabs respondeu ${r.status}.`);
  }

  const audio = Buffer.from(await r.arrayBuffer());
  if (audio.length < 500) {
    registrarFalha(false);
    throw new ErroDeVoz("Áudio vazio.");
  }
  falhasSeguidas = 0;
  if (cache.size >= MAX_CACHE) {
    const primeira = cache.keys().next().value;
    if (primeira !== undefined) cache.delete(primeira);
  }
  cache.set(chaveCache, audio);
  return audio;
}
