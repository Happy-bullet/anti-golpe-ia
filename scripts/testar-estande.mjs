// Testa as regras do modo estande (fila, ligação única, tempo, aprovação, placares, quiz).
// Uso: node scripts/testar-estande.mjs
import assert from "node:assert/strict";
import * as E from "../lib/estande.mjs";
import { readFileSync } from "node:fs";

// As falas ficam num arquivo TypeScript. O Node 22.18 ou mais novo lê direto; nos mais antigos esses dois testes são pulados.
const F = await import("../lib/falas-fixas.ts").catch(() => null);

const GRAVADAS = JSON.parse(readFileSync(new URL("../lib/falas-gravadas.json", import.meta.url), "utf8"));

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

// ---------- modo econômico de voz, contagem de voz e pausa do microfone ----------

const testeDasFalas = F ? teste : (nome) => console.log(`--  pulado (precisa do Node 22.18+): ${nome}`);

testeDasFalas("modo econômico: a fala gravada combina com o assunto, não repete, e null fora do roteiro", () => {
  const { autoridade: A, pressa: P, medo: M, dados: D, afeto: N, dinheiro: X } = F.ROTEIRO;
  const g = F.falaGravadaPara;
  assert.equal(g([], [], [], "Oi, tudo bem?"), null, "sem truque, quem responde é a IA");
  assert.equal(g(["autoridade"], [], [], "Aqui é do banco"), A[0]);
  assert.equal(g(["autoridade"], [], [], "Sou o gerente da sua conta"), A[1]);
  assert.equal(g(["autoridade"], [], [], "Aqui é da Polícia Federal"), null, "não diz 'do banco?' para quem falou em polícia");
  assert.equal(g(["dados"], [], [], "Me passa a sua SENHA"), D[0], "maiúscula não atrapalha");
  assert.equal(g(["dados"], [], [], "Me fala o código que chegou"), D[1], "acento não atrapalha");
  assert.equal(g(["dados"], [], [], "Me passa o número do CPF"), null);
  assert.equal(g(["afeto"], [], [], "Oi vó, aqui é do banco"), null, "'vó' sozinho não vira 'Meu neto?'");
  assert.equal(g(["afeto"], [], [], "Oi vó, sou eu, seu neto!"), N[0]);
  assert.equal(g(["dinheiro"], [], [], "Faz uma transferência de 500 reais"), X[1], "fala geral do truque serve para qualquer pedido de dinheiro");
  assert.equal(g(["autoridade", "pressa"], ["autoridade"], [A[0]], "É do banco, é urgente"), P[0], "prefere o truque que a pessoa ainda não tinha usado");
  assert.equal(g(["autoridade", "medo"], ["autoridade"], [], "É do banco, sua conta foi bloqueada"), M[0]);
  assert.equal(g(["autoridade"], ["autoridade"], [A[0]], "É do banco"), null, "não repete a fala nem força a do gerente");
  assert.equal(g(["pressa"], [], [], "É urgente", 0), P[0]);
  assert.equal(g(["pressa"], [], [], "É urgente", 1), P[1], "a semente varia qual fala sai primeiro entre ligações");
  assert.equal(g(["truque-que-nao-existe"], [], [], "x"), null);
});

testeDasFalas("sem IA: o plano B nunca repete fala enquanto houver gravada sobrando", () => {
  const ditas = [];
  for (let rodada = 1; rodada <= 7; rodada++) {
    const fala = F.falaReserva(["autoridade"], ["autoridade"], ditas, "Aqui é da Receita Federal", rodada);
    assert.equal(ditas.includes(fala), false, `repetiu na rodada ${rodada}: ${fala}`);
    ditas.push(fala);
  }
  assert.equal(ditas.filter((f) => F.ROTEIRO.autoridade.includes(f)).length, 2);
  assert.equal(ditas.filter((f) => F.DESVIOS.includes(f)).length, 5, "depois das falas do truque vêm os desvios de assunto");
  assert.ok(F.falaReserva(["autoridade"], [], ditas, "x", 8), "com tudo já dito ainda devolve alguma fala");
});

testeDasFalas("modo econômico: toda fala do roteiro tem gravação (senão gastaria crédito)", () => {
  const limpar = (x) => x.replace(/\s+/g, " ").trim();
  const gravadas = new Set(Object.keys(GRAVADAS.falas || GRAVADAS).map(limpar));
  const faltando = Object.values(F.ROTEIRO).flat().filter((f) => !gravadas.has(limpar(f)));
  assert.deepEqual(faltando, []);
});

teste("modo econômico vem ligado e o admin liga e desliga", () => {
  const n = E.estadoInicial();
  assert.equal(n.config.economico, true);
  E.acaoDoAdmin(n, "configurar", { economico: false }, t);
  assert.equal(n.config.economico, false);
  E.acaoDoAdmin(n, "configurar", { duracaoS: 90 }, t);
  assert.equal(n.config.economico, false, "mexer em outro ajuste não religa");
});

teste("contagem de voz: gravada, gerada na hora e voz do navegador", () => {
  const n = E.estadoInicial();
  E.acaoDoAdmin(n, "ligar-modo", { ativo: true }, t);
  E.entrarNaFila(n, pid(20), "Íris", t);
  E.acaoDoAdmin(n, "liberar", {}, t);
  E.atender(n, pid(20), t, abertura);
  const cid = n.chamada.cid;
  const responder = (fala, audio, tecnicas = []) => {
    E.ocupar(n, pid(20), (t += 1000));
    E.registrarFalaDoGolpista(n, cid, "oi");
    E.registrarResposta(n, cid, { fala, tecnicas, audio, fonte: "roteiro" }, t, tchau);
  };
  responder("Do banco?", "/falas/abc.mp3", ["autoridade"]);
  responder("Resposta improvisada de vinte e oito.", "/api/voz?t=x&q=rapida&s=y");
  responder("Sem voz da ElevenLabs.", null);
  assert.deepEqual(n.voz, { gravadas: 1, aoVivo: 1, caracteres: 37, navegador: 1 });
  assert.deepEqual(E.visaoAdmin(n, t).vozUsada, n.voz);
  assert.equal("voz" in E.visao(n, pid(20), t), false, "a contagem não vai para os celulares");
  E.acaoDoAdmin(n, "zerar-contagem-de-voz", {}, t);
  assert.equal(n.voz.aoVivo + n.voz.gravadas + n.voz.navegador, 0);
});

teste("microfone: uma falha não pausa, duas seguidas pausam 2 min, sem cota pausa 30 min", () => {
  const n = E.estadoInicial();
  assert.equal(E.visao(n, "", t).ouvirPausado, false);
  E.registrarFalhaAoOuvir(n, t, false);
  assert.equal(E.ouvirPausado(n, t), false);
  E.registrarOuvirOk(n);
  E.registrarFalhaAoOuvir(n, t, false);
  assert.equal(E.ouvirPausado(n, t), false, "um acerto no meio zera a contagem");
  E.registrarFalhaAoOuvir(n, t, false);
  assert.equal(E.visao(n, "", t).ouvirPausado, true);
  assert.equal(E.ouvirPausado(n, t + E.OUVIR_PAUSA_CURTA_MS + 1), false, "volta a tentar sozinho");
  E.registrarFalhaAoOuvir(n, t, true);
  assert.equal(E.ouvirPausado(n, t + E.OUVIR_PAUSA_LONGA_MS - 1000), true);
  E.acaoDoAdmin(n, "testar-microfone", {}, t);
  assert.equal(E.ouvirPausado(n, t), false, "o admin manda tentar de novo");
});

teste("estado antigo (gravado antes desta versão) continua funcionando", () => {
  const antigo = E.estadoInicial();
  delete antigo.voz;
  delete antigo.ouvir;
  delete antigo.config.economico;
  E.acaoDoAdmin(antigo, "ligar-modo", { ativo: true }, t);
  E.entrarNaFila(antigo, pid(21), "João", t);
  E.acaoDoAdmin(antigo, "liberar", {}, t);
  E.atender(antigo, pid(21), t, abertura);
  E.ocupar(antigo, pid(21), (t += 1000));
  E.registrarFalaDoGolpista(antigo, antigo.chamada.cid, "oi");
  E.registrarResposta(antigo, antigo.chamada.cid, { fala: "Alô", tecnicas: [], audio: null, fonte: "roteiro" }, t, tchau);
  E.registrarFalhaAoOuvir(antigo, t, true);
  assert.equal(antigo.voz.navegador, 1);
  assert.equal(E.visao(antigo, "", t).ouvirPausado, true);
  assert.equal(E.visaoAdmin(antigo, t).vozUsada.navegador, 1);
});

console.log(`\n${ok} testes do modo estande passaram.`);
