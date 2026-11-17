"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Carimbo from "@/components/Carimbo";
import { RODADAS, SEGUNDOS_POR_CARTA, sortearPartida, tituloDoPlacar, type Carta } from "@/lib/jogo";
import { destacar } from "@/lib/destacar";
import { analisarComRegras } from "@/lib/regras.mjs";
import { guardarNome, meuNome, meuPid } from "@/lib/participante";
import type { VisaoEstande } from "@/lib/tipos";

const MAX_TENTATIVAS = 3;

/** Fala com o estande (placar da TV). Devolve null se o servidor não respondeu. */
async function estande(corpo?: Record<string, unknown>): Promise<(Partial<VisaoEstande> & { erro?: string; restam?: number; ok?: boolean }) | null> {
  try {
    const pid = meuPid();
    const r = corpo
      ? await fetch("/api/estande", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...corpo, pid }) })
      : await fetch(`/api/estande?pid=${pid}`, { cache: "no-store" });
    return await r.json();
  } catch {
    return null;
  }
}

type Fase = "inicio" | "jogando" | "resposta" | "fim";
interface Linha {
  nome: string;
  pontos: number;
  acertos: number;
  dia: string;
}

const hoje = () => new Date().toLocaleDateString("pt-BR");

function lerRanking(): Linha[] {
  try {
    const tudo: Linha[] = JSON.parse(localStorage.getItem("ag:ranking") || "[]");
    return tudo.filter((l) => l.dia === hoje()).sort((a, b) => b.pontos - a.pontos).slice(0, 10);
  } catch {
    return [];
  }
}

/** Marca na mensagem os trechos que as regras locais do app consideram perigosos. */
function comPistas(texto: string) {
  return destacar(texto, analisarComRegras(texto).sinais);
}

export default function Jogo() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [indice, setIndice] = useState(0);
  const [resta, setResta] = useState(SEGUNDOS_POR_CARTA);
  const [pontos, setPontos] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [acertou, setAcertou] = useState<boolean | null>(null);
  const [ranking, setRanking] = useState<Linha[]>([]);
  const [nome, setNome] = useState("");
  const [salvo, setSalvo] = useState(false);
  const proximo = useRef<HTMLButtonElement>(null);
  // Modo estande: nome obrigatório, 3 tentativas por pessoa e placar na TV.
  const [noEstande, setNoEstande] = useState(false);
  const [restam, setRestam] = useState(MAX_TENTATIVAS);
  const [placarTV, setPlacarTV] = useState<VisaoEstande["placarQuiz"]>([]);
  const [meuId, setMeuId] = useState("");
  const [aviso, setAviso] = useState("");
  const [entrando, setEntrando] = useState(false);
  const respostas = useRef<{ id: number; golpe: boolean | null; resta: number }[]>([]);

  const carta = cartas[indice];

  useEffect(() => setRanking(lerRanking()), []);

  useEffect(() => {
    setNome(meuNome());
    estande().then((v) => {
      if (!v?.ativo) return;
      setNoEstande(true);
      setRestam(MAX_TENTATIVAS - (v.eu?.quizTentativas || 0));
      setPlacarTV(v.placarQuiz || []);
      setMeuId(v.eu?.id || "");
    });
  }, []);

  // No estande, o resultado vai para o placar da TV assim que a partida termina.
  useEffect(() => {
    if (fase !== "fim" || !noEstande || salvo) return;
    setSalvo(true);
    estande({ acao: "quiz-fim", respostas: respostas.current }).then((v) => {
      if (v?.placarQuiz) setPlacarTV(v.placarQuiz);
      if (typeof v?.restam === "number") setRestam(v.restam);
      if (!v || v.erro) setAviso("Não deu para enviar o resultado para a TV. Mostre esta tela para o Guilherme.");
    });
  }, [fase, noEstande, salvo]);

  const responder = useCallback(
    (disseGolpe: boolean | null) => {
      if (fase !== "jogando" || !carta) return;
      const certo = disseGolpe !== null && disseGolpe === carta.golpe;
      respostas.current.push({ id: carta.id, golpe: disseGolpe, resta });
      setAcertou(disseGolpe === null ? null : certo);
      if (certo) {
        setAcertos((a) => a + 1);
        setPontos((p) => p + 100 + resta * 5);
      }
      setFase("resposta");
      setTimeout(() => proximo.current?.focus(), 50);
    },
    [fase, carta, resta],
  );

  // Relógio da rodada
  useEffect(() => {
    if (fase !== "jogando") return;
    if (resta <= 0) {
      responder(null);
      return;
    }
    const t = setTimeout(() => setResta((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [fase, resta, responder]);

  async function comecar() {
    setAviso("");
    if (noEstande) {
      setEntrando(true);
      const v = await estande({ acao: "quiz-iniciar", nome });
      setEntrando(false);
      if (v && v.ativo === false) setNoEstande(false);
      else if (!v || v.erro) {
        if (typeof v?.restam === "number") setRestam(v.restam);
        setAviso(v?.erro || "Sem conexão com o estande. Tente de novo.");
        setFase("inicio");
        return;
      } else {
        guardarNome(nome.trim());
        if (typeof v.restam === "number") setRestam(v.restam);
      }
    }
    respostas.current = [];
    setCartas(sortearPartida());
    setIndice(0);
    setPontos(0);
    setAcertos(0);
    setAcertou(null);
    setResta(SEGUNDOS_POR_CARTA);
    setSalvo(false);
    setFase("jogando");
  }

  function avancar() {
    if (indice + 1 >= RODADAS) {
      setFase("fim");
      return;
    }
    setIndice((i) => i + 1);
    setResta(SEGUNDOS_POR_CARTA);
    setAcertou(null);
    setFase("jogando");
  }

  function salvarPlacar() {
    const linha: Linha = { nome: nome.trim().slice(0, 14) || "Visitante", pontos, acertos, dia: hoje() };
    try {
      const tudo: Linha[] = JSON.parse(localStorage.getItem("ag:ranking") || "[]");
      localStorage.setItem("ag:ranking", JSON.stringify([...tudo.filter((l) => l.dia === hoje()), linha]));
    } catch {}
    setRanking(lerRanking());
    setSalvo(true);
  }

  return (
    <main className="min-h-screen bg-noite pb-28 text-white md:pb-12">
      <div className="faixa" aria-hidden="true" />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {fase === "inicio" && (
          <section>
            <h1 className="font-display text-[3.2rem] font-extrabold leading-[0.95] tracking-tight text-faixa sm:text-7xl">É golpe ou não?</h1>
            <p className="mt-4 max-w-md text-xl leading-snug text-white/90">
              {RODADAS} mensagens. {SEGUNDOS_POR_CARTA} segundos para cada uma. Quanto mais rápido você acerta, mais pontos faz.
            </p>
            {noEstande && (
              <div className="mt-5 max-w-md">
                <label htmlFor="nome-quiz" className="block font-bold">
                  Seu nome (aparece no placar da TV)
                </label>
                <input
                  id="nome-quiz"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={16}
                  autoComplete="given-name"
                  placeholder="Ex.: Ana"
                  className="mt-2 w-full rounded-2xl border-2 border-white/30 bg-white/10 px-4 py-3 text-xl font-bold text-white placeholder:text-white/40 focus:border-faixa focus:outline-none"
                />
                <p className="mt-2 text-white/80">
                  {restam > 0 ? `Você pode jogar ${restam === 1 ? "mais 1 vez" : `mais ${restam} vezes`}. Vale a sua melhor pontuação.` : "Você já jogou as 3 vezes. Vale a sua melhor pontuação."}
                </p>
              </div>
            )}
            {aviso && (
              <p role="alert" className="mt-3 max-w-md rounded-lg bg-golpe/25 p-3 font-bold">
                {aviso}
              </p>
            )}
            <button
              onClick={comecar}
              disabled={entrando || (noEstande && (restam <= 0 || nome.trim().length < 2))}
              className="mt-6 w-full rounded-2xl bg-faixa px-6 py-4 font-display text-2xl font-extrabold text-noite transition active:scale-[0.98] disabled:opacity-50 sm:w-auto"
            >
              Começar
            </button>

            {noEstande && placarTV.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-extrabold">Placar da TV</h2>
                <ol className="mt-3 divide-y divide-white/10">
                  {placarTV.map((l, i) => (
                    <li key={l.id} className={`flex items-baseline gap-3 py-2 text-lg ${l.id === meuId ? "text-faixa" : ""}`}>
                      <span className="w-6 font-display font-extrabold text-faixa">{i + 1}</span>
                      <span className="flex-1 truncate font-bold">{l.nome}</span>
                      <span className="w-20 text-right font-display font-extrabold">{l.pontos}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!noEstande && ranking.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-extrabold">Placar de hoje</h2>
                <ol className="mt-3 divide-y divide-white/10">
                  {ranking.map((l, i) => (
                    <li key={i} className="flex items-baseline gap-3 py-2 text-lg">
                      <span className="w-6 font-display font-extrabold text-faixa">{i + 1}</span>
                      <span className="flex-1 truncate font-bold">{l.nome}</span>
                      <span className="text-white/70">
                        {l.acertos}/{RODADAS}
                      </span>
                      <span className="w-20 text-right font-display font-extrabold">{l.pontos}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {(fase === "jogando" || fase === "resposta") && carta && (
          <section>
            <div className="flex items-center justify-between font-bold">
              <span>
                Mensagem {indice + 1} de {RODADAS}
              </span>
              <span className="font-display text-xl font-extrabold text-faixa">{pontos} pontos</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15" role="timer" aria-label={`${resta} segundos`}>
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${resta <= 5 ? "bg-golpe" : "bg-faixa"}`}
                style={{ width: `${(resta / SEGUNDOS_POR_CARTA) * 100}%` }}
              />
            </div>

            <div className="relative mt-6">
              <p className="mb-1 ml-3 font-bold text-white/70">{carta.de}</p>
              <div className="balao ml-2 p-4 text-noite">
                {fase === "resposta" ? (
                  <p className="whitespace-pre-wrap break-words text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: comPistas(carta.texto) }} />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-xl leading-relaxed">{carta.texto}</p>
                )}
              </div>
              {fase === "resposta" && (
                <div className="pointer-events-none absolute -top-3 right-1">
                  <Carimbo nivel={carta.golpe ? "golpe" : "seguro"} texto={carta.golpe ? "Golpe" : "Seguro"} className="bg-white text-3xl" />
                </div>
              )}
            </div>

            {fase === "jogando" ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => responder(true)} className="rounded-2xl bg-golpe px-4 py-5 font-display text-2xl font-extrabold transition active:scale-[0.97]">
                  É golpe
                </button>
                <button onClick={() => responder(false)} className="rounded-2xl bg-seguro px-4 py-5 font-display text-2xl font-extrabold transition active:scale-[0.97]">
                  É seguro
                </button>
              </div>
            ) : (
              <div className="mt-6" aria-live="polite">
                <p className="font-display text-3xl font-extrabold" style={{ color: acertou ? "#3DDC97" : "#FF6B7D" }}>
                  {acertou === null ? "O tempo acabou" : acertou ? "Acertou" : "Errou"}
                </p>
                <p className="mt-2 text-xl leading-snug text-white/90">{carta.porque}</p>
                <button ref={proximo} onClick={avancar} className="mt-5 w-full rounded-2xl bg-faixa px-6 py-4 font-display text-2xl font-extrabold text-noite transition active:scale-[0.98]">
                  {indice + 1 >= RODADAS ? "Ver meu resultado" : "Próxima mensagem"}
                </button>
              </div>
            )}
          </section>
        )}

        {fase === "fim" && (
          <section>
            <p className="font-bold text-white/70">Seu resultado</p>
            <h1 className="font-display text-[3rem] font-extrabold leading-[0.95] tracking-tight text-faixa sm:text-6xl">{tituloDoPlacar(acertos)}</h1>
            <p className="mt-4 text-2xl">
              Você acertou <strong>{acertos}</strong> de {RODADAS} e fez <strong>{pontos}</strong> pontos.
            </p>
            <p className="mt-2 text-lg text-white/80">
              {acertos >= RODADAS - 1
                ? "Golpista nenhum passa por você. Agora ensine alguém da família."
                : "Na dúvida, não clique e não pague: cole a mensagem no Anti-Golpe IA antes."}
            </p>

            {noEstande ? (
              <div className="mt-6">
                <p className="text-lg font-bold" style={{ color: "#3DDC97" }}>
                  {aviso || "Seu resultado está no placar da TV."}
                </p>
                <p className="mt-1 text-white/80">{restam > 0 ? `Você ainda pode jogar ${restam === 1 ? "mais 1 vez" : `mais ${restam} vezes`}.` : "Você usou as 3 tentativas."}</p>
                <ol className="mt-4 divide-y divide-white/10">
                  {placarTV.map((l, i) => (
                    <li key={l.id} className={`flex items-baseline gap-3 py-2 text-lg ${l.id === meuId ? "text-faixa" : ""}`}>
                      <span className="w-6 font-display font-extrabold text-faixa">{i + 1}</span>
                      <span className="flex-1 truncate font-bold">{l.nome}</span>
                      <span className="w-20 text-right font-display font-extrabold">{l.pontos}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : !salvo ? (
              <div className="mt-6 flex flex-wrap gap-2">
                <label htmlFor="nome" className="sr-only">
                  Seu nome para o placar
                </label>
                <input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={14}
                  placeholder="Seu nome para o placar"
                  className="min-w-0 flex-1 rounded-xl border-2 border-white/30 bg-transparent p-3 text-lg text-white outline-none placeholder:text-white/50 focus:border-faixa"
                />
                <button onClick={salvarPlacar} className="rounded-xl bg-faixa px-5 py-3 font-display text-lg font-extrabold text-noite">
                  Entrar no placar
                </button>
              </div>
            ) : (
              <p className="mt-6 text-lg font-bold" style={{ color: "#3DDC97" }}>
                Placar salvo neste aparelho.
              </p>
            )}

            {!noEstande && ranking.length > 0 && (
              <ol className="mt-6 divide-y divide-white/10">
                {ranking.map((l, i) => (
                  <li key={i} className="flex items-baseline gap-3 py-2 text-lg">
                    <span className="w-6 font-display font-extrabold text-faixa">{i + 1}</span>
                    <span className="flex-1 truncate font-bold">{l.nome}</span>
                    <span className="text-white/70">
                      {l.acertos}/{RODADAS}
                    </span>
                    <span className="w-20 text-right font-display font-extrabold">{l.pontos}</span>
                  </li>
                ))}
              </ol>
            )}

            <button
              onClick={comecar}
              disabled={entrando || (noEstande && restam <= 0)}
              className="mt-8 w-full rounded-2xl border-2 border-faixa px-6 py-4 font-display text-2xl font-extrabold text-faixa transition active:scale-[0.98] disabled:opacity-40 sm:w-auto"
            >
              Jogar de novo
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
