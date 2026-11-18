// Pausas das chaves de API, compartilhadas entre os servidores da Vercel.
// Quando uma chave responde "sem cota", "sem crédito" ou "bloqueada", ela fica um tempo sem ser tentada.
// Sem isso, cada servidor novo bateria de novo nas chaves mortas e a Vó demoraria para responder.
// Fica no Redis (hash por grupo); sem Redis, só na memória do servidor. Se o Redis falhar, a memória segura.

import { comandoRedis } from "./armazem";

export type Grupo = "ia" | "voz";
export interface Pausa {
  ate: number;
  motivo: string;
}

const CHAVE: Record<Grupo, string> = { ia: "ag:pausas:ia", voz: "ag:pausas:voz" };
const RELER_MS = 4000;

const g = globalThis as unknown as { __agPausas?: Record<Grupo, { mapa: Map<string, Pausa>; lidoEm: number }> };
function local(grupo: Grupo) {
  if (!g.__agPausas) g.__agPausas = { ia: { mapa: new Map(), lidoEm: 0 }, voz: { mapa: new Map(), lidoEm: 0 } };
  return g.__agPausas[grupo];
}

/** Pausas que ainda valem. Relê do Redis no máximo a cada 4 segundos. */
export async function pausasAtivas(grupo: Grupo): Promise<Map<string, Pausa>> {
  const l = local(grupo);
  if (Date.now() - l.lidoEm > RELER_MS) {
    try {
      const plano = (await comandoRedis(["HGETALL", CHAVE[grupo]])) as string[] | null;
      if (plano) {
        const lidas = new Map<string, Pausa>();
        for (let i = 0; i + 1 < plano.length; i += 2) {
          try {
            lidas.set(plano[i], JSON.parse(plano[i + 1]));
          } catch {}
        }
        // Com o Redis respondendo, vale o que está nele: assim o "Tentar de novo" do painel limpa todos os servidores.
        l.mapa = lidas;
      }
      l.lidoEm = Date.now();
    } catch (e) {
      console.warn("[anti-golpe] pausas: Redis não respondeu, usando a memória.", e instanceof Error ? e.message.slice(0, 120) : "");
      l.lidoEm = Date.now();
    }
  }
  const agora = Date.now();
  return new Map([...l.mapa].filter(([, p]) => p.ate > agora));
}

export async function pausar(grupo: Grupo, quem: string, ms: number, motivo: string) {
  const p = { ate: Date.now() + ms, motivo };
  local(grupo).mapa.set(quem, p);
  try {
    await comandoRedis(["HSET", CHAVE[grupo], quem, JSON.stringify(p)]);
    await comandoRedis(["EXPIRE", CHAVE[grupo], 2 * 24 * 3600]);
  } catch {}
}

/** Tira a pausa de uma chave só (ela acabou de funcionar num teste). */
export async function tirarPausa(grupo: Grupo, quem: string) {
  local(grupo).mapa.delete(quem);
  try {
    await comandoRedis(["HDEL", CHAVE[grupo], quem]);
  } catch {}
}

/** Esquece as pausas de um grupo (botão "Tentar de novo" do painel). */
export async function limparPausas(grupo: Grupo) {
  local(grupo).mapa.clear();
  local(grupo).lidoEm = 0;
  try {
    await comandoRedis(["DEL", CHAVE[grupo]]);
  } catch {}
}
