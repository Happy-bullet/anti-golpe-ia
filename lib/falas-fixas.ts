// Falas fixas da Vó Zilda. Ficam num arquivo próprio, sem nada de servidor, porque são usadas
// em três lugares: no servidor (quando a IA cai), no navegador (quando a internet cai)
// e no script que grava a voz delas uma vez só (scripts/gravar-falas.mjs).

export const ABERTURA = "Alô? Quem fala? Espera só eu baixar o volume da novela.";

export const ROTEIRO: Record<string, string[]> = {
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

export const DESVIOS = [
  "Hein? Fala mais alto, meu filho, que o Juscelino tá gritando aqui do lado.",
  "Só um instantinho que a novela das seis tá começando. Você gosta de novela?",
  "Ô gente, você já tomou café? Acabei de tirar pão de queijo do forno.",
  "Como é mesmo o seu nome? Você me lembra o filho da dona Cotinha.",
  "Peraí que o telefone escorregou. Pronto. O que é que você estava falando mesmo?",
];

/** Falas curtinhas que a Vó diz enquanto a resposta de verdade ainda está chegando. */
export const ESPERAS = [
  "Hummm... peraí, meu filho.",
  "Ô gente, deixa eu pensar aqui...",
  "Uai... como é que é?",
  "Espera um tiquinho...",
];

/** Falas que encerram a ligação no modo estande. */
export const DESPEDIDAS: Record<string, string> = {
  tempo: "Ih, meu filho, a novela começou. Vou desligar. Fica com Deus!",
  venceu: "Ara! Você usou todos os truques de golpista. Mas da Vó Zilda você não leva nem um pão de queijo. Tchau!",
  desligou: "Uai, desligou? Esse povo de hoje não tem paciência.",
  admin: "Ô gente, o Juninho chegou. Depois a gente conversa. Tchau!",
};

export function falaDoRoteiro(tecnicas: string[], rodada: number): string {
  const novas = tecnicas.filter((t) => ROTEIRO[t]);
  if (!novas.length) return DESVIOS[rodada % DESVIOS.length];
  const escolhida = novas[rodada % novas.length];
  const opcoes = ROTEIRO[escolhida];
  return opcoes[rodada % opcoes.length];
}

// Para cada fala do ROTEIRO (mesma ordem), o que a pessoa precisa ter dito para a fala fazer sentido.
// null = serve para qualquer mensagem com aquele truque. As expressões são conferidas sem acento e em minúsculas.
// Exemplo: "Ah, você é o gerente?" só sai se a pessoa falou em gerente; para "sou da polícia" a IA é que responde.
const GATILHOS: Record<string, (RegExp | null)[]> = {
  pressa: [null, null],
  autoridade: [/banco/, /gerente/],
  medo: [/bloque/, /process/],
  isca: [/premio|sorteio|sortead|ganhou|ganhador/, /dinheiro|renda extra|lucro|investi/],
  afeto: [/\bnet[oa]\b|netinh|sou eu/, /numero|celular (novo|quebrou|caiu)|\bchip\b/],
  segredo: [/nao (conta|fala|comenta|avisa)|ninguem/, null],
  dados: [/senha/, /codigo/],
  dinheiro: [/\bpix\b/, null],
  link: [/clic|link|acess/, /instal|baix|aplicativo|\bapp\b/],
};

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Procura uma fala já gravada que responda bem à mensagem (custa zero crédito de voz e sai na hora).
 * Regras: nunca repete uma fala já dita na ligação; só usa fala específica se a mensagem tiver o assunto dela;
 * prefere responder ao truque que a pessoa ainda não tinha usado. `semente` desempata, para variar entre ligações.
 * Devolve null quando nenhuma fala gravada serve (aí a IA improvisa).
 */
export function falaGravadaPara(tecnicas: string[], jaUsadas: string[], jaDitas: string[], mensagem = "", semente = 0): string | null {
  const dito = semAcento(mensagem);
  const candidatas: { fala: string; pontos: number }[] = [];
  for (const t of tecnicas) {
    (ROTEIRO[t] || []).forEach((fala, i) => {
      if (jaDitas.includes(fala)) return;
      const gatilho = GATILHOS[t]?.[i];
      if (gatilho && !gatilho.test(dito)) return;
      candidatas.push({ fala, pontos: (jaUsadas.includes(t) ? 0 : 2) + (gatilho ? 1 : 0) });
    });
  }
  if (!candidatas.length) return null;
  const melhor = Math.max(...candidatas.map((c) => c.pontos));
  const empatadas = candidatas.filter((c) => c.pontos === melhor);
  return empatadas[semente % empatadas.length].fala;
}

/**
 * Plano B, para quando a IA não responde: uma fala gravada que ainda não foi dita na ligação.
 * Tenta primeiro uma que combine com a mensagem, depois qualquer uma do truque, depois um desvio de assunto.
 */
export function falaReserva(tecnicas: string[], jaUsadas: string[], jaDitas: string[], mensagem: string, rodada: number): string {
  const combina = falaGravadaPara(tecnicas, jaUsadas, jaDitas, mensagem, rodada);
  if (combina) return combina;
  const doTruque = tecnicas.flatMap((t) => ROTEIRO[t] || []).filter((f) => !jaDitas.includes(f));
  if (doTruque.length) return doTruque[rodada % doTruque.length];
  const desvios = DESVIOS.filter((f) => !jaDitas.includes(f));
  if (desvios.length) return desvios[rodada % desvios.length];
  return falaDoRoteiro(tecnicas, rodada);
}

/** Todas as falas fixas, na ordem em que são gravadas. */
export function todasAsFalasFixas(): string[] {
  return [ABERTURA, ...Object.values(ROTEIRO).flat(), ...DESVIOS, ...ESPERAS, ...Object.values(DESPEDIDAS)];
}
