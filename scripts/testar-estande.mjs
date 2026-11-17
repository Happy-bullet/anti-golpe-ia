// Testa as regras do modo estande (fila, ligação única, tempo, aprovação, placares, quiz).
// Uso: node scripts/testar-estande.mjs
import assert from "node:assert/strict";
import * as E from "../lib/estande.mjs";

const pid = (n) => `participante-${String(n).padStart(4, "0")}`;
const abertura = { texto: "Alô?", url: null };
const tchau = (motivo) => ({ texto: `tchau:${motivo}`, url: null });
let t = 1_000_000;
let ok = 0;
const teste = (nome, fn) => {
  fn();
  ok++;
  console.log(`ok  ${nome}`);
};

teste("modo desligado não aceita fila", () => {
  const e = E.estadoInicial();
  assert.equal(E.entrarNaFila(e, pid(1), "Ana", t).ok, false);
});

const e = E.estadoInicial();
E.acaoDoAdmin(e, "ligar-modo", { ativo: true }, t);

teste("nome impróprio é recusado e nome bom entra", () => {
  assert.equal(E.entrarNaFila(e, pid(1), "caralho", t).ok, false);
  assert.equal(E.entrarNaFila(e, pid(1), "Ana Laura", t).ok, true);
  assert.equal(E.entrarNaFila(e, pid(1), "Ana Laura", t).ok, true);
  assert.equal(e.fila.length, 1, "a mesma pessoa não entra duas vezes");
});

teste("a fila não começa sozinha com aprovação manual", () => {
  E.entrarNaFila(e, pid(2), "Bruno", t);
  E.avancar(e, (t += 5000));
  assert.equal(e.chamada, null);
  assert.equal(E.visao(e, pid(2), t).posicao, 1);
});

teste("ninguém atende antes de o admin liberar", () => {
  assert.equal(E.atender(e, pid(1), t, abertura).ok, false);
});

teste("admin libera a primeira; só ela pode atender", () => {
  assert.equal(E.acaoDoAdmin(e, "liberar", {}, t).ok, true);
  assert.equal(e.chamada.fase, "chamando");
  assert.equal(E.atender(e, pid(2), t, abertura).ok, false);
  assert.equal(E.acaoDoAdmin(e, "liberar", {}, t).ok, false, "não libera duas ao mesmo tempo");
  assert.equal(E.atender(e, pid(1), (t += 3000), abertura).ok, true);
  assert.equal(e.chamada.fim - e.chamada.inicio, 120_000);
  assert.equal(e.audio.n, 1);
});

teste("quem espera vê o tempo de espera", () => {
  const v = E.visao(e, pid(2), t + 20_000);
  assert.equal(v.posicao, 0);
  assert.equal(v.esperaS, 120);
  assert.equal(v.chamada.sua, false);
  assert.equal(JSON.stringify(v).includes("participante-"), false, "a visão pública não vaza pid");
});

teste("uma fala por vez, e os truques somam sem repetir", () => {
  const vez = E.ocupar(e, pid(1), (t += 2000));
  assert.equal(vez.ok, true);
  assert.equal(E.ocupar(e, pid(1), t).ok, false);
  assert.equal(E.ocupar(e, pid(2), t).ok, false);
  E.registrarFalaDoGolpista(e, vez.cid, "sou do banco, é urgente");
  E.registrarResposta(e, vez.cid, { fala: "Qual banco?", tecnicas: ["autoridade", "pressa"], audio: null }, t, tchau);
  const vez2 = E.ocupar(e, pid(1), (t += 4000));
  E.registrarFalaDoGolpista(e, vez2.cid, "faz um pix agora");
  E.registrarResposta(e, vez2.cid, { fala: "Peraí", tecnicas: ["pressa", "dinheiro"], audio: null }, t, tchau);
  assert.deepEqual(e.chamada.tecnicas, ["autoridade", "pressa", "dinheiro"]);
  assert.equal(e.audio.n, 3);
});

teste("o tempo acaba: ligação encerra, entra no placar, a próxima NÃO começa sozinha", () => {
  const fim = e.chamada.fim;
  assert.equal(E.avancar(e, fim - 1, tchau), false);
  assert.equal(E.avancar(e, fim + 10, tchau), true);
  t = fim + 10;
  assert.equal(e.chamada, null);
  assert.equal(e.ultima.motivo, "tempo");
  assert.equal(e.placarVovo[0].truques, 3);
  assert.equal(e.audio.texto, "tchau:tempo");
  assert.equal(e.fila.length, 1);
  E.avancar(e, t + 30_000, tchau);
  assert.equal(e.chamada, null);
  assert.equal(E.ocupar(e, pid(1), t).ok, false, "quem terminou não fala mais");
});

teste("resposta que chega depois do fim é descartada", () => {
  assert.equal(E.registrarResposta(e, 1, { fala: "x", tecnicas: ["medo"], audio: null }, t, tchau).ok, false);
});

teste("liberada que não atende em 1 min perde a vez", () => {
  E.acaoDoAdmin(e, "liberar", {}, t);
  assert.equal(e.chamada.nome, "Bruno");
  E.avancar(e, t + E.TEMPO_PARA_ATENDER_MS + 1, tchau);
  assert.equal(e.chamada, null);
  assert.equal(e.ultima.tipo, "perdeu");
  assert.equal(e.placarVovo.length, 1);
});

teste("9 truques: vitória e fim imediato", () => {
  E.entrarNaFila(e, pid(3), "Carla", (t += 100_000));
  E.acaoDoAdmin(e, "liberar", {}, t);
  E.atender(e, pid(3), t, abertura);
  const vez = E.ocupar(e, pid(3), (t += 30_000));
  E.registrarFalaDoGolpista(e, vez.cid, "tudo");
  const todas = ["pressa", "autoridade", "medo", "isca", "afeto", "segredo", "dados", "dinheiro", "link"];
  E.registrarResposta(e, vez.cid, { fala: "Ara!", tecnicas: todas, audio: null }, t, tchau);
  assert.equal(e.chamada, null);
  assert.equal(e.ultima.motivo, "venceu");
  assert.equal(e.placarVovo[0].nome, "Carla");
  assert.equal(e.placarVovo[0].truques, 9);
  assert.equal(e.audio.texto, "tchau:venceu");
});

teste("placar: mais truques primeiro; empate ganha quem foi mais rápido; fica a melhor marca", () => {
  const jogar = (n, nome, truques, segundos) => {
    E.entrarNaFila(e, pid(n), nome, (t += 1000));
    E.acaoDoAdmin(e, "liberar", {}, t);
    E.atender(e, pid(n), t, abertura);
    const vez = E.ocupar(e, pid(n), t + 1000);
    E.registrarFalaDoGolpista(e, vez.cid, "x");
    E.registrarResposta(e, vez.cid, { fala: "y", tecnicas: ["pressa", "medo", "isca", "link", "dados"].slice(0, truques), audio: null }, t + 1000, tchau);
    E.desligar(e, pid(n), (t += segundos * 1000), tchau);
  };
  jogar(4, "Davi", 5, 80);
  jogar(5, "Eva", 5, 40);
  jogar(1, "Ana Laura", 2, 30); // pior que a marca anterior (3): não troca
  assert.deepEqual(e.placarVovo.map((l) => `${l.nome}:${l.truques}`), ["Carla:9", "Eva:5", "Davi:5", "Ana Laura:3"]);
  assert.equal(e.placarVovo.find((l) => l.nome === "Ana Laura").vezes, 2);
});

teste("sem aprovação manual a fila anda sozinha", () => {
  E.acaoDoAdmin(e, "configurar", { aprovacaoManual: false, duracaoS: 90 }, t);
  E.entrarNaFila(e, pid(6), "Fábio", t);
  E.avancar(e, t, tchau);
  assert.equal(e.chamada.nome, "Fábio");
  E.atender(e, pid(6), t, abertura);
  assert.equal(e.chamada.fim - e.chamada.inicio, 90_000);
  E.acaoDoAdmin(e, "encerrar", {}, (t += 5000), tchau);
  assert.equal(e.chamada, null);
  E.acaoDoAdmin(e, "configurar", { aprovacaoManual: true, duracaoS: 120 }, t);
});

teste("quiz: 3 tentativas, vale a melhor pontuação", () => {
  assert.equal(E.registrarQuiz(e, pid(7), 500, 4, t).ok, false, "não registra sem iniciar");
  assert.equal(E.iniciarQuiz(e, pid(7), "Gabi", t).restam, 2);
  E.registrarQuiz(e, pid(7), 900, 6, t);
  E.iniciarQuiz(e, pid(7), "Gabi", t);
  E.registrarQuiz(e, pid(7), 700, 5, t);
  assert.equal(E.iniciarQuiz(e, pid(7), "Gabi", t).restam, 0);
  E.registrarQuiz(e, pid(7), 1200, 8, t);
  assert.equal(E.iniciarQuiz(e, pid(7), "Gabi", t).ok, false);
  assert.equal(e.placarQuiz[0].pontos, 1200);
  assert.equal(E.visao(e, pid(7), t).eu.quizTentativas, 3);
});

teste("admin remove do placar, tira da fila e desliga o modo", () => {
  E.acaoDoAdmin(e, "tirar-do-placar", { placar: "vovo", id: E.idPublico(pid(4)) }, t);
  assert.equal(e.placarVovo.some((l) => l.nome === "Davi"), false);
  E.entrarNaFila(e, pid(8), "Hugo", t);
  E.acaoDoAdmin(e, "tirar-da-fila", { id: E.idPublico(pid(8)) }, t);
  assert.equal(e.fila.length, 0);
  E.entrarNaFila(e, pid(8), "Hugo", t);
  E.acaoDoAdmin(e, "ligar-modo", { ativo: false }, t);
  assert.equal(e.fila.length, 0);
  assert.equal(e.placarVovo.length > 0, true, "desligar não apaga o placar");
});

console.log(`\n${ok} testes do modo estande passaram.`);
