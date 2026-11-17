// Vó Zilda: a personagem que faz o "golpista" perder tempo.
// Com chave de IA ela improvisa; sem IA ela segue o roteiro fixo de lib/falas-fixas.ts (plano B do estande).
// Cada resposta já vem com o endereço do áudio (gravado, ElevenLabs ou null = voz do navegador).
import { detectarTecnicas, TECNICAS } from "./tecnicas.mjs";
import { pedirJSON, provedorAtivo } from "./ia";
import { PROMPT_VOVO } from "./prompt";
import { reservarChamadaIA } from "./limite";
import { falaDoRoteiro } from "./falas-fixas";
import { urlDoAudio } from "./voz-ia";
import type { FalaVovo, RespostaVovo } from "./tipos";

/** Corta a fala no fim de uma frase, para a voz não parar no meio de uma palavra. */
function cortarEmFrase(fala: string, max: number): string {
  if (fala.length <= max) return fala;
  const pedaco = fala.slice(0, max);
  const fim = Math.max(pedaco.lastIndexOf(". "), pedaco.lastIndexOf("! "), pedaco.lastIndexOf("? "));
  return fim > max * 0.4 ? pedaco.slice(0, fim + 1) : pedaco.slice(0, pedaco.lastIndexOf(" ")) + "...";
}

const IDS = new Set(TECNICAS.map((t) => t.id));

/** `curta`: no estande a ligação tem tempo contado, então a Vó responde em até duas frases. */
export async function responderVovo(historico: FalaVovo[], opcoes: { curta?: boolean } = {}): Promise<RespostaVovo> {
  const r = await pensarResposta(historico, !!opcoes.curta);
  return { ...r, audio: urlDoAudio(r.fala) };
}

async function pensarResposta(historico: FalaVovo[], curta: boolean): Promise<Omit<RespostaVovo, "audio">> {
  const ultima = [...historico].reverse().find((f) => f.de === "golpista")?.texto || "";
  const porRegras = detectarTecnicas(ultima);
  const rodada = historico.filter((f) => f.de === "golpista").length;

  if (provedorAtivo() === "offline" || !reservarChamadaIA()) {
    return { fala: falaDoRoteiro(porRegras, rodada), tecnicas: porRegras, fonte: "roteiro" };
  }

  try {
    const conversa = historico
      .slice(-16)
      .map((f) => `${f.de === "golpista" ? "GOLPISTA" : "VÓ ZILDA"}: ${f.texto}`)
      .join("\n");
    const { dados } = await pedirJSON({
      sistema: PROMPT_VOVO,
      pedido: `Conversa até agora:\n${conversa}\n\nResponda como a Vó Zilda à última mensagem do golpista, no formato JSON pedido.${
        curta ? " Esta é uma ligação ao vivo com tempo contado: use no máximo 2 frases curtas (até 140 caracteres no total)." : ""
      }`,
      maxTokens: 1200,
      temperatura: 0.9,
      raciocinio: "minimal",
    });
    const fala = cortarEmFrase(String(dados.fala || "").trim(), curta ? 220 : 400);
    if (!fala) throw new Error("fala vazia");
    const daIA = Array.isArray(dados.tecnicas) ? dados.tecnicas.map(String).filter((id) => IDS.has(id)) : [];
    return { fala, tecnicas: Array.from(new Set([...daIA, ...porRegras])), fonte: "ia" };
  } catch (erro) {
    console.error("[anti-golpe] Vó Zilda caiu no roteiro:", erro instanceof Error ? erro.message : erro);
    return { fala: falaDoRoteiro(porRegras, rodada), tecnicas: porRegras, fonte: "roteiro" };
  }
}
