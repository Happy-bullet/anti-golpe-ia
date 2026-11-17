// Modo estande: as regras da fila e da ligação única para a Vó Zilda, e os dois placares.
// Funções puras (recebem o estado e a hora), para poderem ser testadas sem servidor:
//   node scripts/testar-estande.mjs
// O estado inteiro é um objeto pequeno guardado no banco (lib/armazem.ts).
// Só guardamos o primeiro nome que a pessoa digitou e a pontuação. Nenhum dado pessoal além disso.

export const TOTAL_TRUQUES = 9;
export const MAX_FILA = 25;
export const TEMPO_PARA_ATENDER_MS = 60_000; // depois de liberada, a pessoa tem 1 min para tocar em "Ligar"
export const SUMIU_MS = 10 * 60_000; // sai da fila quem fechou a página há 10 min
export const FOLGA_ENTRE_LIGACOES_MS = 20_000;
export const MAX_TENTATIVAS_QUIZ = 3;
export const PENSANDO_MAX_MS = 30_000;
const TAMANHO_PLACAR = 60;

/** @typedef {import("./tipos").EstadoEstande} Estado */

/** @returns {Estado} */
export function estadoInicial() {
  return {
    ativo: false,
    config: { duracaoS: 120, aprovacaoManual: true, somNoCelular: false },
    chamada: null,
    fila: [],
    audio: { n: 0, texto: "", url: null },
    ultima: null,
    placarVovo: [],
    placarQuiz: [],
    ligacoes: 0,
  };
}

/** Identificador público do participante (o `pid` verdadeiro fica só no celular dele e no servidor). */
export function idPublico(pid) {
  let h = 2166136261;
  for (let i = 0; i < pid.length; i++) {
    h ^= pid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

// O nome aparece na TV do estande, então passa por um filtro simples de palavrão.
// Compara palavra por palavra (e não o nome grudado), para não barrar "Ana Laura" ou "Carola".
// O filtro é só a primeira barreira: o nome só vai para a TV depois que o admin libera a ligação.
const RADICAIS = [
  "caralh", "porra", "merda", "bosta", "cuzao", "cuzinh", "buceta", "boceta", "xoxota", "xereca", "piroca", "viad", "boiola", "arrombad",
  "vagabund", "piranha", "safad", "punhet", "siririca", "estupr", "pedofil", "nazis", "hitler", "retardad", "nigger", "nigga", "fuck", "bitch",
  "pussy", "fodase", "foder", "fodid",
];
const INTEIRAS = new Set([
  "puta", "puto", "putas", "cu", "pau", "pica", "rola", "penis", "vagina", "bicha", "sapatao", "traveco", "foda", "fdp", "vsf", "vtnc", "tnc", "pqp",
  "otario", "otaria", "babaca", "corno", "corna", "tesao", "gozar", "gozo", "macaco", "crioulo", "mongol", "shit", "dick", "cock", "sexo", "porno",
  "anal", "anus", "ku",
]);

function semAcento(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Devolve o nome pronto para a TV, ou "" se for vazio, curto demais ou impróprio. */
export function limparNome(bruto) {
  const nome = String(bruto || "")
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16)
    .trim();
  if (nome.replace(/[^\p{L}]/gu, "").length < 2) return "";
  const base = semAcento(nome).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");
  const palavras = base.split(/[^a-z]+/).filter(Boolean);
  if (palavras.some((w) => INTEIRAS.has(w) || RADICAIS.some((r) => w.includes(r)))) return "";
  // "p u t a": letras soltas viram uma palavra só para conferir.
  if (palavras.length > 2 && palavras.every((w) => w.length === 1)) {
    const junto = palavras.join("");
    if (INTEIRAS.has(junto) || RADICAIS.some((r) => junto.includes(r))) return "";
  }
  return nome;
}

function tocar(e, fala) {
  if (!fala || !fala.texto) return;
  e.audio = { n: e.audio.n + 1, texto: fala.texto, url: fala.url || null };
}

function ordenarVovo(a, b) {
  return b.truques - a.truques || a.duracaoS - b.duracaoS || a.quando - b.quando;
}
function ordenarQuiz(a, b) {
  return b.pontos - a.pontos || a.quando - b.quando;
}

/**
 * Encerra a ligação em andamento e grava o resultado no placar.
 * @param {Estado} e
 * @param {"tempo"|"venceu"|"desligou"|"admin"} motivo
 * @param {(motivo: string, truques: number) => {texto: string, url?: string|null}|null} [despedida] fala final da Vó
 */
export function encerrar(e, motivo, agora, despedida) {
  const c = e.chamada;
  e.chamada = null;
  if (!c) return;
  if (c.fase !== "ativa") {
    e.ultima = { tipo: "perdeu", nome: c.nome, id: c.id, quando: agora };
    return;
  }
  const truques = c.tecnicas.length;
  const duracaoS = Math.max(1, Math.round((Math.min(agora, c.fim) - c.inicio) / 1000));
  const antigo = e.placarVovo.find((l) => l.id === c.id);
  const novo = { id: c.id, nome: c.nome, truques, duracaoS, quando: agora, vezes: (antigo?.vezes || 0) + 1 };
  if (!antigo) e.placarVovo.push(novo);
  else if (ordenarVovo(novo, antigo) < 0) Object.assign(antigo, novo);
  else antigo.vezes = novo.vezes;
  e.placarVovo.sort(ordenarVovo);
  e.placarVovo.length = Math.min(e.placarVovo.length, TAMANHO_PLACAR);
  e.ultima = { tipo: "fim", motivo, nome: c.nome, id: c.id, truques, tecnicas: c.tecnicas, duracaoS, quando: agora };
  if (despedida) tocar(e, despedida(motivo, truques));
}

/** Tira o próximo da fila (ou a pessoa escolhida) e avisa o celular dela que pode ligar. */
export function chamarProximo(e, agora, id) {
  if (e.chamada) return { ok: false, erro: "Já existe uma ligação em andamento." };
  const i = id ? e.fila.findIndex((p) => p.id === id) : 0;
  const p = e.fila[i];
  if (!p) return { ok: false, erro: "Não tem ninguém na fila." };
  e.fila.splice(i, 1);
  e.ligacoes++;
  e.chamada = {
    cid: e.ligacoes, pid: p.pid, id: p.id, nome: p.nome, fase: "chamando",
    expira: agora + TEMPO_PARA_ATENDER_MS, inicio: 0, fim: 0, falas: [], tecnicas: [], pensando: 0,
  };
  return { ok: true, nome: p.nome };
}

/** Passagens que dependem só do relógio. Devolve true se mudou alguma coisa. */
export function avancar(e, agora, despedida) {
  let mudou = false;
  const c = e.chamada;
  if (c) {
    if (c.fase === "ativa" && agora >= c.fim) {
      encerrar(e, "tempo", agora, despedida);
      mudou = true;
    } else if (c.fase === "chamando" && agora >= c.expira) {
      encerrar(e, "tempo", agora);
      mudou = true;
    } else if (c.pensando && agora - c.pensando > PENSANDO_MAX_MS) {
      c.pensando = 0;
      mudou = true;
    }
  }
  const antes = e.fila.length;
  e.fila = e.fila.filter((p) => agora - p.visto < SUMIU_MS);
  if (e.fila.length !== antes) mudou = true;
  if (e.ativo && !e.config.aprovacaoManual && !e.chamada && e.fila.length) {
    chamarProximo(e, agora);
    mudou = true;
  }
  return mudou;
}

export function entrarNaFila(e, pid, nomeBruto, agora) {
  if (!e.ativo) return { ok: false, erro: "O modo estande está desligado." };
  const nome = limparNome(nomeBruto);
  if (!nome) return { ok: false, erro: "Escolha outro nome: use de 2 a 16 letras, sem palavrão." };
  if (e.chamada?.pid === pid) return { ok: true };
  const ja = e.fila.find((p) => p.pid === pid);
  if (ja) {
    ja.nome = nome;
    ja.visto = agora;
    return { ok: true };
  }
  if (e.fila.length >= MAX_FILA) return { ok: false, erro: "A fila está cheia. Tente de novo daqui a pouco." };
  e.fila.push({ pid, id: idPublico(pid), nome, entrou: agora, visto: agora });
  return { ok: true };
}

export function sairDaFila(e, pid) {
  e.fila = e.fila.filter((p) => p.pid !== pid);
}

/** O celular avisa que continua na fila. Devolve true se precisa gravar (no máximo a cada 20 s). */
export function marcarVisto(e, pid, agora) {
  const p = e.fila.find((x) => x.pid === pid);
  if (!p || agora - p.visto < 20_000) return false;
  p.visto = agora;
  return true;
}

/** A pessoa liberada tocou em "Ligar": o relógio começa e a Vó atende. */
export function atender(e, pid, agora, abertura) {
  const c = e.chamada;
  if (!c || c.pid !== pid) return { ok: false, erro: "Ainda não é a sua vez." };
  if (c.fase === "ativa") return { ok: true };
  c.fase = "ativa";
  c.inicio = agora;
  c.fim = agora + e.config.duracaoS * 1000;
  c.falas = [{ de: "vovo", texto: abertura.texto }];
  tocar(e, abertura);
  return { ok: true };
}

/** Reserva a vez de falar (uma fala por vez). */
export function ocupar(e, pid, agora) {
  const c = e.chamada;
  if (!c || c.pid !== pid || c.fase !== "ativa") return { ok: false, erro: "A ligação terminou." };
  if (agora >= c.fim) return { ok: false, erro: "O tempo acabou." };
  if (c.pensando) return { ok: false, erro: "Espere a Vó responder." };
  c.pensando = agora;
  return { ok: true, cid: c.cid };
}

export function liberar(e, cid) {
  if (e.chamada?.cid === cid) e.chamada.pensando = 0;
}

export function registrarFalaDoGolpista(e, cid, texto) {
  const c = e.chamada;
  if (!c || c.cid !== cid || c.fase !== "ativa") return { ok: false, historico: [] };
  c.falas.push({ de: "golpista", texto });
  return { ok: true, historico: c.falas.slice() };
}

/** Grava a resposta da Vó. Se a pessoa completou os 9 truques, a ligação termina com vitória. */
export function registrarResposta(e, cid, resposta, agora, despedida) {
  const c = e.chamada;
  if (!c || c.cid !== cid || c.fase !== "ativa") return { ok: false, novas: [] };
  c.pensando = 0;
  c.falas.push({ de: "vovo", texto: resposta.fala });
  const novas = resposta.tecnicas.filter((t) => !c.tecnicas.includes(t));
  c.tecnicas.push(...novas);
  if (c.tecnicas.length >= TOTAL_TRUQUES) {
    encerrar(e, "venceu", agora, despedida);
  } else {
    tocar(e, { texto: resposta.fala, url: resposta.audio });
  }
  return { ok: true, novas };
}

export function desligar(e, pid, agora, despedida) {
  if (e.chamada?.pid !== pid) return;
  encerrar(e, "desligou", agora, despedida);
}

// ---------- quiz "É golpe ou não?" ----------

export function iniciarQuiz(e, pid, nomeBruto, agora) {
  const nome = limparNome(nomeBruto);
  if (!nome) return { ok: false, erro: "Escolha outro nome: use de 2 a 16 letras, sem palavrão." };
  const id = idPublico(pid);
  let linha = e.placarQuiz.find((l) => l.id === id);
  if (linha && linha.tentativas >= MAX_TENTATIVAS_QUIZ) {
    return { ok: false, erro: `Você já jogou ${MAX_TENTATIVAS_QUIZ} vezes. Vale a sua melhor pontuação.`, restam: 0 };
  }
  if (!linha) {
    linha = { id, nome, pontos: 0, acertos: 0, tentativas: 0, quando: agora };
    e.placarQuiz.push(linha);
  }
  linha.nome = nome;
  linha.tentativas++;
  return { ok: true, restam: MAX_TENTATIVAS_QUIZ - linha.tentativas };
}

export function registrarQuiz(e, pid, pontos, acertos, agora) {
  const linha = e.placarQuiz.find((l) => l.id === idPublico(pid));
  if (!linha || linha.tentativas < 1) return { ok: false };
  if (pontos > linha.pontos) Object.assign(linha, { pontos, acertos, quando: agora });
  e.placarQuiz.sort(ordenarQuiz);
  e.placarQuiz.length = Math.min(e.placarQuiz.length, TAMANHO_PLACAR);
  return { ok: true, melhor: linha.pontos, restam: MAX_TENTATIVAS_QUIZ - linha.tentativas };
}

// ---------- o que cada tela enxerga ----------

function esperaEmSegundos(e, posicao, agora) {
  const d = e.config.duracaoS * 1000;
  const c = e.chamada;
  let base = 0;
  if (c) base = (c.fase === "ativa" ? Math.max(0, c.fim - agora) : d) + FOLGA_ENTRE_LIGACOES_MS;
  return Math.round((base + posicao * (d + FOLGA_ENTRE_LIGACOES_MS)) / 1000);
}

/** Visão pública (celulares e TV). Nunca inclui o `pid` de ninguém. */
export function visao(e, pid, agora) {
  const c = e.chamada;
  const id = pid ? idPublico(pid) : "";
  const posicao = pid ? e.fila.findIndex((p) => p.pid === pid) : -1;
  const quiz = e.placarQuiz.find((l) => l.id === id);
  return {
    agora,
    ativo: e.ativo,
    config: e.config,
    chamada: c && {
      cid: c.cid, nome: c.nome, fase: c.fase, expira: c.expira, inicio: c.inicio, fim: c.fim,
      falas: c.falas.slice(-14), tecnicas: c.tecnicas, pensando: !!c.pensando, sua: !!pid && c.pid === pid,
    },
    fila: e.fila.map((p) => p.nome),
    posicao,
    esperaS: posicao >= 0 ? esperaEmSegundos(e, posicao, agora) : 0,
    audio: e.audio,
    ultima: e.ultima,
    placarVovo: e.placarVovo.slice(0, 10).map(({ id: i, nome, truques, duracaoS }) => ({ id: i, nome, truques, duracaoS })),
    placarQuiz: e.placarQuiz.filter((l) => l.pontos > 0).slice(0, 10).map(({ id: i, nome, pontos, acertos }) => ({ id: i, nome, pontos, acertos })),
    eu: id ? { id, quizTentativas: quiz?.tentativas || 0, quizMelhor: quiz?.pontos || 0 } : null,
  };
}

/** Visão do painel do admin: inclui a fila e os placares completos (com o id público, para remover). */
export function visaoAdmin(e, agora) {
  return {
    ...visao(e, "", agora),
    filaCompleta: e.fila.map((p) => ({ id: p.id, nome: p.nome, entrou: p.entrou, visto: p.visto })),
    placarVovoCompleto: e.placarVovo,
    placarQuizCompleto: e.placarQuiz,
    ligacoes: e.ligacoes,
  };
}

// ---------- ações do admin ----------

export function acaoDoAdmin(e, acao, dados, agora, despedida) {
  switch (acao) {
    case "ligar-modo":
      e.ativo = !!dados.ativo;
      if (!e.ativo) {
        if (e.chamada) encerrar(e, "admin", agora);
        e.fila = [];
      }
      return { ok: true };
    case "liberar":
      return chamarProximo(e, agora, dados.id);
    case "encerrar":
      if (!e.chamada) return { ok: false, erro: "Não há ligação." };
      encerrar(e, "admin", agora, despedida);
      return { ok: true };
    case "tirar-da-fila":
      e.fila = e.fila.filter((p) => p.id !== dados.id);
      return { ok: true };
    case "tirar-do-placar":
      if (dados.placar === "quiz") e.placarQuiz = e.placarQuiz.filter((l) => l.id !== dados.id);
      else e.placarVovo = e.placarVovo.filter((l) => l.id !== dados.id);
      return { ok: true };
    case "zerar-placares":
      e.placarVovo = [];
      e.placarQuiz = [];
      e.ultima = null;
      return { ok: true };
    case "configurar": {
      const d = Number(dados.duracaoS);
      if ([60, 90, 120, 150, 180].includes(d)) e.config.duracaoS = d;
      if (typeof dados.aprovacaoManual === "boolean") e.config.aprovacaoManual = dados.aprovacaoManual;
      if (typeof dados.somNoCelular === "boolean") e.config.somNoCelular = dados.somNoCelular;
      return { ok: true };
    }
    default:
      return { ok: false, erro: "Ação desconhecida." };
  }
}
