// Voz da Vó Zilda pela ElevenLabs, com várias camadas de segurança para a feira:
// 1. Falas fixas já gravadas em /public/falas (não gastam crédito e funcionam sem internet).
// 2. Falas novas da IA viram áudio pela rota /api/voz. A URL é ASSINADA pelo servidor:
//    só o que a própria Vó falou pode virar áudio, então ninguém usa o site como TTS grátis.
// 3. A resposta de /api/voz fica em cache na CDN da Vercel: a mesma frase não gasta crédito duas vezes.
// 4. Várias contas (ELEVENLABS_API_KEY, ELEVENLABS_API_KEY_2...): quando uma fica sem crédito ou é bloqueada,
//    a próxima assume. A pausa de cada conta fica no Redis, para todos os servidores saberem.
// 5. Teto diário de caracteres por conta e um "disjuntor": se todas as contas pararem ou a ElevenLabs cair,
//    o servidor para de oferecer áudio e o navegador usa a própria voz (último recurso).
// As chaves ficam só no servidor (variáveis de ambiente). Nada da conversa é gravado.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import gravadas from "./falas-gravadas.json";
import { contasElevenLabs, contasSemVoz, vozesInvalidas } from "./chaves.mjs";
import { comandoRedis } from "./armazem";
import { limparPausas, pausar, pausasAtivas } from "./pausas";

const URL_BASE = process.env.ELEVENLABS_URL_BASE || "https://api.elevenlabs.io";
const TEMPO_LIMITE_MS = 9000;
export const MAX_CARACTERES = 420;

export type Qualidade = "rapida" | "alta";

const MAPA_GRAVADAS: Record<string, string> = (gravadas as { falas?: Record<string, string> }).falas || {};

interface Conta {
  n: number;
  chave: string;
  voz: string;
  vozPropria: boolean;
}

const contas = (): Conta[] => contasElevenLabs();

/** A conta 1 (ou a primeira configurada) assina as URLs e identifica as falas gravadas. */
function principal(): Conta | undefined {
  return contas()[0];
}

/** Tira qualquer coisa com cara de chave de uma mensagem antes de ela ir para o registro. */
function semSegredo(texto: string): string {
  return texto.replace(/sk_[A-Za-z0-9]+/g, "sk_***").slice(0, 300);
}

/** Diz se alguma variável de ID de voz está preenchida com algo que não é um ID (para avisar no painel). */
export function vozIdInvalido(): boolean {
  return vozesInvalidas().length > 0 || contasSemVoz().length > 0;
}

/** Números das contas com problema no ID da voz, para o painel dizer qual variável corrigir. */
export function problemasDeConfiguracao(): { vozInvalida: number[]; semVoz: number[] } {
  return { vozInvalida: vozesInvalidas(), semVoz: contasSemVoz() };
}

/** Marca curta da voz em uso (não é o ID): serve só para o script saber se a voz mudou e regravar. */
export function impressaoDaVoz(): string {
  return createHash("sha256").update(`voz:${principal()?.voz || ""}`).digest("hex").slice(0, 10);
}

export function vozConfigurada(): boolean {
  return contas().length > 0;
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
  const p = principal();
  return process.env.VOZ_SEGREDO || createHash("sha256").update(`anti-golpe-voz:${p?.chave || ""}:${p?.voz || ""}`).digest("hex");
}

function assinatura(texto: string, qualidade: Qualidade): string {
  return createHmac("sha256", segredo()).update(`${qualidade}|${principal()?.voz || ""}|${texto}`).digest("base64url").slice(0, 22);
}

export function assinaturaValida(texto: string, qualidade: Qualidade, recebida: string): boolean {
  const certa = Buffer.from(assinatura(texto, qualidade));
  const veio = Buffer.from(recebida || "");
  return certa.length === veio.length && timingSafeEqual(certa, veio);
}

/**
 * Versão sem consultar as contas, para falas que já estão gravadas (abertura e despedidas) e para lugares
 * que não podem esperar. Se a fala não estiver gravada e nenhuma conta funcionar, o celular cai na voz do navegador.
 */
export function urlDoAudioSemConferir(texto: string): string | null {
  const limpo = limparParaVoz(texto);
  if (!limpo) return null;
  if (MAPA_GRAVADAS[limpo]) return MAPA_GRAVADAS[limpo];
  if (!vozConfigurada() || !disjuntorFechado()) return null;
  const p = new URLSearchParams({ t: limpo, q: "rapida", s: assinatura(limpo, "rapida") });
  return `/api/voz?${p.toString()}`;
}

/**
 * URL de áudio para uma fala da Vó, ou null se a voz do navegador é que deve falar.
 * Devolve null quando todas as contas estão paradas, para o celular e a TV não esperarem um áudio que não vem.
 */
export async function urlDoAudio(texto: string, qualidade: Qualidade = "rapida"): Promise<string | null> {
  const limpo = limparParaVoz(texto);
  if (!limpo) return null;
  const gravada = MAPA_GRAVADAS[limpo];
  if (gravada) return gravada;
  if (!vozConfigurada() || !disjuntorFechado() || !(await algumaContaLivre())) return null;
  const p = new URLSearchParams({ t: limpo, q: qualidade, s: assinatura(limpo, qualidade) });
  return `/api/voz?${p.toString()}`;
}

/** URL para gravar uma fala fixa em alta qualidade (usada só pelo script de gravação). */
export function urlDeGravacao(texto: string): string {
  const limpo = limparParaVoz(texto);
  const p = new URLSearchParams({ t: limpo, q: "alta", s: assinatura(limpo, "alta") });
  return `/api/voz?${p.toString()}`;
}

// ---- disjuntor geral: ElevenLabs fora do ar (sem resposta ou erro 5xx), vale para todas as contas ----
let pausadoAte = 0;
let falhasSeguidas = 0;

function disjuntorFechado(): boolean {
  return Date.now() >= pausadoAte;
}

function registrarFalhaGeral() {
  falhasSeguidas++;
  if (falhasSeguidas >= 3) {
    pausadoAte = Date.now() + 2 * 60_000;
    falhasSeguidas = 0;
  }
}

// ---- pausa por conta (sem crédito, bloqueada, chave ou voz errada), compartilhada no Redis ----
const PAUSA_CONTA_MS = 60 * 60_000;
const PAUSA_OCUPADA_MS = 20_000;

/**
 * Lê o erro da ElevenLabs e diz se é problema DESTA conta (aí a próxima conta tenta) e o motivo para o painel.
 * Exemplos de erro: 401 quota_exceeded, 401 detected_unusual_activity, 401 invalid_api_key, 404 voice_not_found,
 * 429 too_many_concurrent_requests (o plano gratuito aceita poucos pedidos ao mesmo tempo).
 */
export function lerErroDaConta(status: number, corpo: string): { daConta: boolean; motivo: string; ms: number } {
  if (/unusual_activity|unusual activity/i.test(corpo)) return { daConta: true, motivo: "bloqueada pela ElevenLabs por atividade incomum", ms: PAUSA_CONTA_MS };
  if (/quota_exceeded|credits|quota/i.test(corpo) || status === 402) return { daConta: true, motivo: "sem crédito", ms: PAUSA_CONTA_MS };
  if (/voice_not_found|voice_id/i.test(corpo) || status === 404) return { daConta: true, motivo: "voz não encontrada nesta conta", ms: PAUSA_CONTA_MS };
  if (/concurrent|too_many|system_busy/i.test(corpo) || status === 429) return { daConta: true, motivo: "ocupada", ms: PAUSA_OCUPADA_MS };
  if (status === 401 || status === 403) return { daConta: true, motivo: "chave recusada", ms: PAUSA_CONTA_MS };
  return { daConta: false, motivo: `erro ${status}`, ms: 0 };
}

const nomeDaConta = (n: number) => `el/${n}`;

// ---- teto diário de caracteres por conta (protege os créditos; a contagem fica no Redis) ----
const diaDeHoje = () => new Date().toISOString().slice(0, 10);
const usoLocal = new Map<string, number>();

function tetoPorConta(): number {
  return Number(process.env.LIMITE_VOZ_CARACTERES_DIA || 20000);
}

async function usoDeHoje(): Promise<Map<number, number>> {
  const dia = diaDeHoje();
  const uso = new Map<number, number>();
  try {
    const plano = (await comandoRedis(["HGETALL", `ag:voz:uso:${dia}`])) as string[] | null;
    if (plano) {
      for (let i = 0; i + 1 < plano.length; i += 2) uso.set(Number(plano[i]), Number(plano[i + 1]) || 0);
      return uso;
    }
  } catch {}
  for (const [k, v] of usoLocal) if (k.startsWith(`${dia}|`)) uso.set(Number(k.split("|")[1]), v);
  return uso;
}

async function somarUso(n: number, caracteres: number) {
  const dia = diaDeHoje();
  usoLocal.set(`${dia}|${n}`, (usoLocal.get(`${dia}|${n}`) || 0) + caracteres);
  try {
    await comandoRedis(["HINCRBY", `ag:voz:uso:${dia}`, String(n), caracteres]);
    await comandoRedis(["EXPIRE", `ag:voz:uso:${dia}`, 3 * 24 * 3600]);
  } catch {}
}

/** Contas que podem falar agora, na ordem (a conta 1 primeiro; as outras só quando ela para). */
async function contasLivres(caracteres = 0): Promise<Conta[]> {
  const [pausas, uso] = await Promise.all([pausasAtivas("voz"), usoDeHoje()]);
  const teto = tetoPorConta();
  return contas().filter((c) => !pausas.has(nomeDaConta(c.n)) && (uso.get(c.n) || 0) + caracteres <= teto);
}

async function algumaContaLivre(): Promise<boolean> {
  return (await contasLivres()).length > 0;
}

export interface EstadoDaConta {
  n: number;
  vozPropria: boolean;
  caracteresHoje: number;
  teto: number;
  pausa: { motivo: string; ate: number } | null;
  /** Créditos restantes, quando a chave tem permissão de leitura da conta (User: Read). */
  saldo: { usados: number; limite: number } | null;
}

/** Situação de cada conta, para o painel. Nunca devolve a chave nem o ID da voz. */
export async function estadoDasContas(): Promise<EstadoDaConta[]> {
  const [pausas, uso] = await Promise.all([pausasAtivas("voz"), usoDeHoje()]);
  const lista = contas();
  const saldos = await Promise.all(lista.map((c) => saldoDaConta(c)));
  return lista.map((c, i) => {
    const p = pausas.get(nomeDaConta(c.n));
    return {
      n: c.n,
      vozPropria: c.vozPropria || c.n === 1,
      caracteresHoje: uso.get(c.n) || 0,
      teto: tetoPorConta(),
      pausa: p ? { motivo: p.motivo, ate: p.ate } : null,
      saldo: saldos[i],
    };
  });
}

// O saldo só aparece se a chave tiver a permissão "User: Read" na ElevenLabs. Guardado por 1 minuto.
const saldos = new Map<number, { quando: number; valor: { usados: number; limite: number } | null }>();
async function saldoDaConta(c: Conta): Promise<{ usados: number; limite: number } | null> {
  const guardado = saldos.get(c.n);
  if (guardado && Date.now() - guardado.quando < 60_000) return guardado.valor;
  let valor: { usados: number; limite: number } | null = null;
  try {
    const r = await fetch(`${URL_BASE}/v1/user/subscription`, { headers: { "xi-api-key": c.chave }, signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const j = (await r.json()) as { character_count?: number; character_limit?: number };
      if (typeof j.character_count === "number" && typeof j.character_limit === "number") valor = { usados: j.character_count, limite: j.character_limit };
    }
  } catch {}
  saldos.set(c.n, { quando: Date.now(), valor });
  return valor;
}

/** Botão "Tentar as vozes de novo" do painel: esquece as pausas das contas. */
export async function limparPausasDaVoz() {
  pausadoAte = 0;
  falhasSeguidas = 0;
  await limparPausas("voz");
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

  const livres = await contasLivres(texto.length);
  if (!livres.length) throw new ErroDeVoz("Nenhuma conta de voz disponível agora (crédito, bloqueio ou teto do dia).", 429);

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

  let ultimoMotivo = "";
  for (const conta of livres) {
    let r: Response;
    try {
      r = await fetch(`${URL_BASE}/v1/text-to-speech/${encodeURIComponent(conta.voz)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": conta.chave, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      });
    } catch (e) {
      // Sem resposta é problema da ElevenLabs ou da rede, não da conta: tentar outra conta só faria a Vó demorar mais.
      registrarFalhaGeral();
      // A mensagem do erro pode trazer o cabeçalho com a chave: vai só para o registro, e sem a chave.
      console.error(`[anti-golpe] ElevenLabs (conta ${conta.n}) não respondeu:`, semSegredo(e instanceof Error ? e.message : String(e)));
      throw new ErroDeVoz("ElevenLabs não respondeu.");
    }

    if (!r.ok) {
      const detalhe = semSegredo(await r.text().catch(() => ""));
      const erro = lerErroDaConta(r.status, detalhe);
      console.error(`[anti-golpe] ElevenLabs conta ${conta.n} ${r.status} (${erro.motivo}): ${detalhe}`);
      if (!erro.daConta) {
        registrarFalhaGeral();
        throw new ErroDeVoz(`ElevenLabs respondeu ${r.status}.`);
      }
      await pausar("voz", nomeDaConta(conta.n), erro.ms, erro.motivo);
      ultimoMotivo = erro.motivo;
      continue; // a próxima conta tenta
    }

    const audio = Buffer.from(await r.arrayBuffer());
    if (audio.length < 500) {
      registrarFalhaGeral();
      throw new ErroDeVoz("Áudio vazio.");
    }
    falhasSeguidas = 0;
    await somarUso(conta.n, texto.length);
    if (cache.size >= MAX_CACHE) {
      const primeira = cache.keys().next().value;
      if (primeira !== undefined) cache.delete(primeira);
    }
    cache.set(chaveCache, audio);
    return audio;
  }
  throw new ErroDeVoz(ultimoMotivo === "sem crédito" ? "Créditos de voz esgotados." : "Nenhuma conta de voz respondeu.");
}
