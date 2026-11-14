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

const IDS = new Set(TECNICAS.map((t) => t.id));

export async function responderVovo(historico: FalaVovo[]): Promise<RespostaVovo> {
  const r = await pensarResposta(historico);
  return { ...r, audio: urlDoAudio(r.fala) };
}

async function pensarResposta(historico: FalaVovo[]): Promise<Omit<RespostaVovo, "audio">> {
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
      pedido: `Conversa até agora:\n${conversa}\n\nResponda como a Vó Zilda à última mensagem do golpista, no formato JSON pedido.`,
      maxTokens: 1200,
      temperatura: 0.9,
      raciocinio: "minimal",
    });
    const fala = String(dados.fala || "").trim().slice(0, 400);
    if (!fala) throw new Error("fala vazia");
    const daIA = Array.isArray(dados.tecnicas) ? dados.tecnicas.map(String).filter((id) => IDS.has(id)) : [];
    return { fala, tecnicas: Array.from(new Set([...daIA, ...porRegras])), fonte: "ia" };
  } catch (erro) {
    console.error("[anti-golpe] Vó Zilda caiu no roteiro:", erro instanceof Error ? erro.message : erro);
    return { fala: falaDoRoteiro(porRegras, rodada), tecnicas: porRegras, fonte: "roteiro" };
  }
}
