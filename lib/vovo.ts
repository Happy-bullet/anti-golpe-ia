// Vó Zilda: a personagem que faz o "golpista" perder tempo.
// Com chave de IA ela improvisa; sem internet ela segue um roteiro fixo (plano B do estande).
import { detectarTecnicas, TECNICAS } from "./tecnicas.mjs";
import { pedirJSON, provedorAtivo } from "./ia";
import { PROMPT_VOVO } from "./prompt";
import { reservarChamadaIA } from "./limite";
import type { FalaVovo, RespostaVovo } from "./tipos";

const IDS = new Set(TECNICAS.map((t) => t.id));

const ROTEIRO: Record<string, string[]> = {
  pressa: [
    "Calma, meu filho, pressa é inimiga da perfeição. Deixa só eu desligar o fogo do feijão.",
    "Uai, mas é pra já? Espera eu achar meus óculos, que sem eles eu não enxergo nem o celular.",
  ],
  autoridade: [
    "Do banco? Ô gente, qual banco mesmo? Eu tenho conta é na cooperativa, e a moça de lá chama Lurdinha.",
    "Ah, você é o gerente? Que bom! Então me fala: o gerente antigo, o seu Osvaldo, sarou da coluna?",
  ],
  medo: [
    "Bloqueada? Nossa Senhora! Mas eu só uso esse trem pra ver receita de bolo. Vou perguntar pro Juninho.",
    "Processo? Meu filho, a única coisa que eu devo nessa vida é uma travessa pra comadre Nair.",
  ],
  isca: [
    "Ganhei um prêmio? Mas eu nem joguei! Da última vez que ganhei foi um frango na rifa da paróquia.",
    "Dinheiro fácil? Meu falecido dizia que dinheiro fácil só o que cai do bolso da gente.",
  ],
  afeto: [
    "Meu neto? Uai, mas a sua voz tá diferente. Me fala então o nome do meu papagaio, que você conhece desde pequeno.",
    "Ô meu bem, trocou de número de novo? Então me conta: qual é a sua sobremesa preferida aqui de casa?",
  ],
  segredo: [
    "Não contar pra ninguém? Ih, tarde demais, o Juscelino já ouviu tudo. Papagaio não guarda segredo.",
    "Segredo? Meu filho, nesta rua até o que eu sonho a vizinhança fica sabendo.",
  ],
  dados: [
    "A senha? Peraí que tá anotada. É... p-a-o-d-e-q-u-e-i-j-o. Não, essa é a do portão. Deixa eu procurar a outra.",
    "O código que chegou? Chegou um trem aqui sim: 'promoção de fralda'. Serve esse?",
  ],
  dinheiro: [
    "Pix? Eu até faço, mas o Juninho falou pra eu ligar pra ele antes. Só um minutinho que o número dele tá na geladeira.",
    "Quanto mesmo? Deixa eu abrir o aplicativo... uai, abri a calculadora. Como é que volta?",
  ],
  link: [
    "Clicar onde? Aqui só aparece a foto do meu pé de jabuticaba. Ele tá carregadinho, você precisa ver.",
    "Instalar aplicativo? Meu celular tá cheio de foto de bolo. Tenho que apagar umas trezentas antes.",
  ],
};

const DESVIOS = [
  "Hein? Fala mais alto, meu filho, que o Juscelino tá gritando aqui do lado.",
  "Só um instantinho que a novela das seis tá começando. Você gosta de novela?",
  "Ô gente, você já tomou café? Acabei de tirar pão de queijo do forno.",
  "Como é mesmo o seu nome? Você me lembra o filho da dona Cotinha.",
  "Peraí que o telefone escorregou. Pronto. O que é que você estava falando mesmo?",
];

function falaDoRoteiro(tecnicas: string[], rodada: number): string {
  const novas = tecnicas.filter((t) => ROTEIRO[t]);
  if (!novas.length) return DESVIOS[rodada % DESVIOS.length];
  const escolhida = novas[rodada % novas.length];
  const opcoes = ROTEIRO[escolhida];
  return opcoes[rodada % opcoes.length];
}

export async function responderVovo(historico: FalaVovo[]): Promise<RespostaVovo> {
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
    const fala = String(dados.fala || "").trim().slice(0, 500);
    if (!fala) throw new Error("fala vazia");
    const daIA = Array.isArray(dados.tecnicas) ? dados.tecnicas.map(String).filter((id) => IDS.has(id)) : [];
    return { fala, tecnicas: Array.from(new Set([...daIA, ...porRegras])), fonte: "ia" };
  } catch (erro) {
    console.error("[anti-golpe] Vó Zilda caiu no roteiro:", erro instanceof Error ? erro.message : erro);
    return { fala: falaDoRoteiro(porRegras, rodada), tecnicas: porRegras, fonte: "roteiro" };
  }
}
