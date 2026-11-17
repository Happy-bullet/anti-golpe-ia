// Cola entre as regras do estande (lib/estande.mjs), o banco (lib/armazem.ts) e a voz.
import { avancar, marcarVisto } from "./estande.mjs";
import { lerEstado, mudarEstado } from "./armazem";
import { ABERTURA, DESPEDIDAS } from "./falas-fixas";
import { urlDoAudio } from "./voz-ia";
import type { EstadoEstande } from "./tipos";

export function despedida(motivo: string) {
  const texto = DESPEDIDAS[motivo] || DESPEDIDAS.tempo;
  return { texto, url: urlDoAudio(texto) };
}

export function abertura() {
  return { texto: ABERTURA, url: urlDoAudio(ABERTURA) };
}

export function pidValido(pid: unknown): pid is string {
  return typeof pid === "string" && /^[A-Za-z0-9_-]{12,64}$/.test(pid);
}

/** Estado já com o relógio aplicado (ligação que venceu é encerrada aqui, na primeira leitura). */
export async function estadoAtual(pid = "", idadeMaxMs = 400): Promise<EstadoEstande> {
  const agora = Date.now();
  const e = await lerEstado(idadeMaxMs);
  const mudouRelogio = avancar(e, agora, despedida);
  const mudouVisto = pid ? marcarVisto(e, pid, agora) : false;
  if (!mudouRelogio && !mudouVisto) return e;
  const { estado } = await mudarEstado((novo) => {
    avancar(novo, agora, despedida);
    if (pid) marcarVisto(novo, pid, agora);
  });
  return estado;
}
