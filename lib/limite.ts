// Proteções para o app aguentar a feira sem estourar a cota gratuita da IA:
// limite de pedidos por visitante, teto diário de chamadas à IA e cache de respostas repetidas.
// Tudo em memória: nada é gravado em disco nem em banco (LGPD). Em servidor serverless
// cada instância tem a sua memória, então os limites são "por instância" (melhor esforço).

import { createHash } from "node:crypto";

const janelas = new Map<string, number[]>();

/** Devolve false se a chave (ex.: IP) passou de `max` pedidos na janela de tempo. */
export function dentroDoLimite(chave: string, max: number, janelaMs = 60_000): boolean {
  const agora = Date.now();
  const recentes = (janelas.get(chave) || []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= max) {
    janelas.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  janelas.set(chave, recentes);
  if (janelas.size > 5000) {
    for (const [k, v] of janelas) if (!v.some((t) => agora - t < janelaMs)) janelas.delete(k);
  }
  return true;
}

export function ipDoPedido(req: Request): string {
  const encaminhado = req.headers.get("x-forwarded-for") || "";
  return encaminhado.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

// ---- teto diário de chamadas à IA ----
let dia = "";
let chamadasHoje = 0;

/** Conta uma chamada à IA. Devolve false se o teto do dia foi atingido (aí usa só regras). */
export function reservarChamadaIA(): boolean {
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje !== dia) {
    dia = hoje;
    chamadasHoje = 0;
  }
  const teto = Number(process.env.LIMITE_IA_DIA || 3000);
  if (chamadasHoje >= teto) return false;
  chamadasHoje++;
  return true;
}

// ---- cache de respostas (só texto; guarda o hash, nunca a mensagem) ----
const VALIDADE_MS = 60 * 60 * 1000;
const MAX_ITENS = 300;
const cache = new Map<string, { valor: unknown; quando: number }>();

export function chaveDeCache(texto: string): string {
  return createHash("sha256").update(texto.trim().replace(/\s+/g, " ").toLowerCase()).digest("hex");
}

export function lerCache<T>(chave: string): T | null {
  const item = cache.get(chave);
  if (!item) return null;
  if (Date.now() - item.quando > VALIDADE_MS) {
    cache.delete(chave);
    return null;
  }
  return item.valor as T;
}

export function gravarCache(chave: string, valor: unknown) {
  if (cache.size >= MAX_ITENS) {
    const maisAntiga = cache.keys().next().value;
    if (maisAntiga !== undefined) cache.delete(maisAntiga);
  }
  cache.set(chave, { valor, quando: Date.now() });
}
