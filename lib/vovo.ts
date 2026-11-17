// Vó Zilda: a personagem que faz o "golpista" perder tempo.
// Com chave de IA ela improvisa; sem IA ela segue o roteiro fixo de lib/falas-fixas.ts (plano B do estande).
// Cada resposta já vem com o endereço do áudio (gravado, ElevenLabs ou null = voz do navegador).
import { detectarTecnicas, TECNICAS } from "./tecnicas.mjs";
import { pedirJSON, provedorAtivo } from "./ia";
import { PROMPT_VOVO } from "./prompt";
import { reservarChamadaIA } from "./limite";
import { falaGravadaPara, falaReserva } from "./falas-fixas";
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

export interface OpcoesVovo {
  /** No estande a ligação tem tempo contado, então a Vó responde em até duas frases. */
  curta?: boolean;
  /**
   * Modo econômico: quando a pessoa usa um truque conhecido, a Vó responde com uma fala já gravada
   * (sem chamar a IA e sem gastar crédito de voz). A IA e a voz ao vivo ficam para o que sai do roteiro.
   */
  economica?: boolean;
  /** Truques que a pessoa já usou nesta ligação (o modo econômico responde primeiro ao truque novo). */
  tecnicasJaUsadas?: string[];
  /** Número que muda a cada ligação, para variar qual fala gravada sai primeiro. */
  semente?: number;
}

export async function responderVovo(historico: FalaVovo[], opcoes: OpcoesVovo = {}): Promise<RespostaVovo> {
  const r = await pensarResposta(historico, opcoes);
  return { ...r, audio: await urlDoAudio(r.fala) };
}

async function pensarResposta(historico: FalaVovo[], opcoes: OpcoesVovo): Promise<Omit<RespostaVovo, "audio">> {
  const curta = !!opcoes.curta;
  const ultima = [...historico].reverse().find((f) => f.de === "golpista")?.texto || "";
  const porRegras = detectarTecnicas(ultima);
  const rodada = historico.filter((f) => f.de === "golpista").length;
  const jaUsadas = opcoes.tecnicasJaUsadas || [];
  const jaDitas = historico.filter((f) => f.de === "vovo").map((f) => f.texto);
  const gravadaPara = (tecnicas: string[]) => (opcoes.economica ? falaGravadaPara(tecnicas, jaUsadas, jaDitas, ultima, opcoes.semente || 0) : null);
  // Sem IA (sem chave, sem cota ou erro), a Vó segue o roteiro gravado sem repetir fala.
  const peloRoteiro = (): Omit<RespostaVovo, "audio"> => ({ fala: falaReserva(porRegras, jaUsadas, jaDitas, ultima, rodada), tecnicas: porRegras, fonte: "roteiro" });

  const prontaPorRegras = gravadaPara(porRegras);
  if (prontaPorRegras) return { fala: prontaPorRegras, tecnicas: porRegras, fonte: "roteiro" };

  if (provedorAtivo() === "offline" || !reservarChamadaIA()) {
    return peloRoteiro();
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
    const tecnicas = Array.from(new Set([...daIA, ...porRegras]));
    // Truque que só a IA reconheceu: no modo econômico ainda vale a fala gravada dele.
    const prontaPelaIA = gravadaPara(tecnicas);
    if (prontaPelaIA) return { fala: prontaPelaIA, tecnicas, fonte: "roteiro" };
    return { fala, tecnicas, fonte: "ia" };
  } catch (erro) {
    console.error("[anti-golpe] Vó Zilda caiu no roteiro:", erro instanceof Error ? erro.message : erro);
    return peloRoteiro();
  }
}
