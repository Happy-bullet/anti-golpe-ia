// Onde mora o estado do modo estande (fila, ligação ao vivo e placares).
// O celular, a TV e o painel do admin são atendidos por servidores diferentes na Vercel,
// então a memória de um servidor não serve: o estado fica num Redis (Upstash, plano gratuito).
// Sem Redis: no computador (npm run dev) usa a memória do processo; na Vercel o modo estande fica desligado.
// As gravações usam "compare e troque": se dois pedidos mexerem ao mesmo tempo, o segundo relê e tenta de novo.

import { estadoInicial } from "./estande.mjs";
import type { EstadoEstande } from "./tipos";

const CHAVE = "ag:estande:v1";
const CHAVE_N = "ag:estande:v1:n";
const TROCAR = `if (redis.call('GET', KEYS[2]) or '0') == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]) redis.call('INCR', KEYS[2]) return 1 else return 0 end`;

function credenciais() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim().split(/\s+/)[0] || "";
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function tipoDeBanco(): "redis" | "memoria" | "nenhum" {
  if (credenciais()) return "redis";
  return process.env.VERCEL ? "nenhum" : "memoria";
}

async function redis(comando: (string | number)[]): Promise<unknown> {
  const c = credenciais()!;
  const r = await fetch(c.url, {
    method: "POST",
    headers: { authorization: `Bearer ${c.token}`, "content-type": "application/json" },
    body: JSON.stringify(comando),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  const j = (await r.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!r.ok || j.error) throw new Error(`Redis ${r.status}: ${j.error || "sem resposta"}`);
  return j.result;
}

interface Lido {
  estado: EstadoEstande;
  n: number;
}

const global = globalThis as unknown as { __agEstande?: Lido; __agCache?: { lido: Lido; quando: number } };

function completar(bruto: Partial<EstadoEstande> | null): EstadoEstande {
  const base = estadoInicial() as EstadoEstande;
  if (!bruto || typeof bruto !== "object") return base;
  return { ...base, ...bruto, config: { ...base.config, ...(bruto.config || {}) } };
}

async function ler(): Promise<Lido> {
  if (tipoDeBanco() === "redis") {
    const [json, n] = (await redis(["MGET", CHAVE, CHAVE_N])) as [string | null, string | null];
    let bruto: Partial<EstadoEstande> | null = null;
    try {
      bruto = json ? JSON.parse(json) : null;
    } catch {}
    return { estado: completar(bruto), n: Number(n || 0) };
  }
  if (!global.__agEstande) global.__agEstande = { estado: completar(null), n: 0 };
  return { estado: structuredClone(global.__agEstande.estado), n: global.__agEstande.n };
}

async function trocar(n: number, estado: EstadoEstande): Promise<boolean> {
  if (tipoDeBanco() === "redis") {
    return (await redis(["EVAL", TROCAR, 2, CHAVE, CHAVE_N, String(n), JSON.stringify(estado)])) === 1;
  }
  if (!global.__agEstande || global.__agEstande.n !== n) return false;
  global.__agEstande = { estado: structuredClone(estado), n: n + 1 };
  return true;
}

/** Lê o estado. Aceita uma cópia de até `idadeMaxMs` (a TV pergunta a cada segundo). */
export async function lerEstado(idadeMaxMs = 0): Promise<EstadoEstande> {
  const c = global.__agCache;
  if (idadeMaxMs && c && Date.now() - c.quando < idadeMaxMs) return structuredClone(c.lido.estado);
  const lido = await ler();
  global.__agCache = { lido, quando: Date.now() };
  return structuredClone(lido.estado);
}

/** Aplica uma mudança no estado, com nova tentativa se outro pedido gravou no meio. */
export async function mudarEstado<T>(fn: (e: EstadoEstande) => T): Promise<{ estado: EstadoEstande; retorno: T }> {
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const { estado, n } = await ler();
    const antes = JSON.stringify(estado);
    const retorno = fn(estado);
    if (JSON.stringify(estado) === antes) return { estado, retorno };
    if (await trocar(n, estado)) {
      global.__agCache = { lido: { estado, n: n + 1 }, quando: Date.now() };
      return { estado, retorno };
    }
    await new Promise((ok) => setTimeout(ok, 15 + Math.random() * 40 * (tentativa + 1)));
  }
  throw new Error("Muitas mudanças ao mesmo tempo no estado do estande.");
}
