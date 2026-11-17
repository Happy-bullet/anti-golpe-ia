"use client";

import { useEffect, useRef, useState } from "react";
import { detectarTecnicas, TECNICAS } from "@/lib/tecnicas.mjs";
import { destravarAudio, falarVovo, ouvir, pararFala, podeFalar, podeOuvir } from "@/lib/voz";
import { ABERTURA, ESPERAS, falaDoRoteiro } from "@/lib/falas-fixas";
import type { FalaVovo, RespostaVovo } from "@/lib/tipos";

const MAX_RODADAS = 12;

const SUGESTOES = [
  "Oi vó, sou eu, seu neto! Troquei de número.",
  "Aqui é da central de segurança do seu banco.",
  "A senhora ganhou um prêmio de 5 mil reais!",
];

function relogio(segundos: number) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

export default function VovoSolo() {
  const [fase, setFase] = useState<"inicio" | "conversa" | "fim">("inicio");
  const [falas, setFalas] = useState<FalaVovo[]>([]);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const [reveladas, setReveladas] = useState<string[]>([]);
  const [novas, setNovas] = useState<string[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [comVoz, setComVoz] = useState(true);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState("");
  const [temVoz, setTemVoz] = useState(false);
  const [temMicrofone, setTemMicrofone] = useState(false);
  const fimDaConversa = useRef<HTMLDivElement>(null);
  const pararOuvir = useRef<() => void>(() => {});
  const [semInternet, setSemInternet] = useState(false);

  const rodadas = falas.filter((f) => f.de === "golpista").length;

  useEffect(() => {
    if (fase !== "conversa") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [fase]);

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [falas, esperando]);

  useEffect(() => {
    setTemVoz(podeFalar());
    setTemMicrofone(podeOuvir());
    return () => pararFala();
  }, []);

  function comecar() {
    setFalas([{ de: "vovo", texto: ABERTURA }]);
    setReveladas([]);
    setNovas([]);
    setAberta(null);
    setSegundos(0);
    setErro("");
    setSemInternet(false);
    setFase("conversa");
    destravarAudio();
    if (comVoz) falarVovo(ABERTURA);
  }

  function terminar() {
    pararFala();
    pararOuvir.current();
    setFase("fim");
  }

  async function enviar(mensagem = texto) {
    const dito = mensagem.trim().slice(0, 300);
    if (!dito || esperando) return;
    destravarAudio();
    pararFala();
    const historico: FalaVovo[] = [...falas, { de: "golpista", texto: dito }];
    setFalas(historico);
    setTexto("");
    setErro("");
    setEsperando(true);
    const rodada = historico.filter((f) => f.de === "golpista").length;
    // Se a resposta demorar, a Vó solta um "hummm..." gravado para ninguém ficar no silêncio.
    const espera = setTimeout(() => {
      if (comVoz) falarVovo(ESPERAS[rodada % ESPERAS.length], null, { soGravada: true });
    }, 1300);
    let j: RespostaVovo;
    try {
      const r = await fetch("/api/vovo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ historico }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
      });
      const corpo: RespostaVovo & { erro?: string } = await r.json();
      if (!r.ok || !corpo.fala) throw new Error(corpo.erro || "sem resposta");
      j = corpo;
      setSemInternet(false);
    } catch {
      // Plano B: sem internet ou servidor fora, a Vó responde pelo roteiro aqui mesmo no aparelho.
      const tecnicas = detectarTecnicas(dito);
      j = { fala: falaDoRoteiro(tecnicas, rodada), tecnicas, fonte: "roteiro", audio: null };
      setSemInternet(true);
    } finally {
      clearTimeout(espera);
      setEsperando(false);
    }
    const completo: FalaVovo[] = [...historico, { de: "vovo", texto: j.fala }];
    setFalas(completo);
    const achadas = j.tecnicas.filter((id) => !reveladas.includes(id));
    setNovas(achadas);
    const todas = [...reveladas, ...achadas];
    setReveladas(todas);
    const acabou = todas.length >= TECNICAS.length || rodada >= MAX_RODADAS;
    if (comVoz) {
      falarVovo(j.fala, j.audio, { aoTerminar: acabou ? () => setTimeout(terminar, 800) : undefined });
    } else if (acabou) {
      setTimeout(terminar, 3500);
    }
  }

  function microfone() {
    if (ouvindo) {
      pararOuvir.current();
      return;
    }
    pararFala();
    setOuvindo(true);
    pararOuvir.current = ouvir(
      (dito) => enviar(dito),
      () => setOuvindo(false),
    );
  }

  const cartela = (
    <div>
      <ul className="grid grid-cols-3 gap-2">
        {TECNICAS.map((t) => {
          const achou = reveladas.includes(t.id);
          const nova = novas.includes(t.id);
          return (
            <li key={t.id}>
              <button
                onClick={() => achou && setAberta(aberta === t.id ? null : t.id)}
                disabled={!achou}
                aria-pressed={aberta === t.id}
                className={`flex h-full w-full items-center justify-center rounded-xl border-2 px-1 text-center font-bold leading-tight transition min-h-[3.2rem] text-sm ${
                  achou ? `border-faixa bg-faixa text-noite ${nova ? "ring-4 ring-white" : ""}` : "border-white/25 text-white/40"
                }`}
              >
                {achou ? t.nome : "?"}
              </button>
            </li>
          );
        })}
      </ul>
      {aberta && (
        <p className="mt-3 rounded-xl bg-white/10 p-3 text-base leading-snug" aria-live="polite">
          <strong className="text-faixa">{TECNICAS.find((t) => t.id === aberta)?.nome}:</strong> {TECNICAS.find((t) => t.id === aberta)?.descricao}{" "}
          <span className="text-white/90">Como se defender: {TECNICAS.find((t) => t.id === aberta)?.defesa}</span>
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-noite pb-28 text-white md:pb-12">
      <div className="faixa" aria-hidden="true" />
      <div className="mx-auto max-w-5xl px-4 pt-6">
        {fase === "inicio" && (
          <section className="mx-auto max-w-2xl">
            <h1 className="font-display text-[3.2rem] font-extrabold leading-[0.95] tracking-tight text-faixa sm:text-7xl">Engane a Vó Zilda</h1>
            <p className="mt-4 max-w-lg text-xl leading-snug text-white/90">
              Hoje o golpista é você. Tente convencer a Vó Zilda a passar a senha ou fazer um Pix. Ela é uma inteligência artificial treinada para enrolar golpista.
            </p>
            <p className="mt-3 max-w-lg text-lg leading-snug text-white/75">
              Cada truque que você usar aparece na cartela, com a explicação de como se defender dele. São {TECNICAS.length} truques. Quantos você revela?
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button onClick={comecar} className="rounded-2xl bg-faixa px-6 py-4 font-display text-2xl font-extrabold text-noite transition active:scale-[0.98]">
                Ligar para a Vó
              </button>
              {temVoz && (
                <label className="flex cursor-pointer items-center gap-2 text-lg">
                  <input type="checkbox" checked={comVoz} onChange={(e) => { setComVoz(e.target.checked); if (!e.target.checked) pararFala(); }} className="h-5 w-5 accent-[#FFC629]" />
                  Ouvir a voz dela
                </label>
              )}
            </div>
            <p className="mt-8 max-w-lg text-white/60">
              Inspirado em projetos reais que usam IA para fazer golpistas perderem tempo: o Apate, da Universidade Macquarie (Austrália), e a Daisy, da operadora O2 (Reino Unido).
            </p>
          </section>
        )}

        {fase === "conversa" && (
          <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
            <section aria-label="Conversa com a Vó Zilda" className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-faixa">Vó Zilda</h1>
                  <p className="text-white/70">
                    Ela já te enrolou por <strong className="text-white">{relogio(segundos)}</strong>
                  </p>
                </div>
                <button onClick={terminar} className="rounded-xl border-2 border-white/30 px-3 py-2 font-bold hover:bg-white/10">
                  Desligar
                </button>
              </div>

              <div className="mt-4 space-y-3" aria-live="polite">
                {falas.map((f, i) => (
                  <div key={i} className={f.de === "vovo" ? "pr-10" : "pl-10"}>
                    <div className={`balao p-3 text-lg leading-snug text-noite ${f.de === "vovo" ? "ml-2" : "balao-meu mr-2"}`}>{f.texto}</div>
                  </div>
                ))}
                {esperando && <p className="ml-3 text-white/60">Vó Zilda está procurando os óculos…</p>}
                {!esperando && novas.length > 0 && (
                  <p className="ml-3 font-bold text-faixa">
                    {novas.length === 1 ? "Truque revelado: " : "Truques revelados: "}
                    {TECNICAS.filter((t) => novas.includes(t.id))
                      .map((t) => t.nome)
                      .join(", ")}
                  </p>
                )}
                <div ref={fimDaConversa} />
              </div>

              {semInternet && (
                <p className="mt-3 text-sm text-white/60">Sem conexão com o servidor: a Vó está usando o roteiro guardado no aparelho.</p>
              )}

              {erro && (
                <p role="alert" className="mt-3 rounded-lg bg-golpe/20 p-3 font-bold">
                  {erro}
                </p>
              )}

              {rodadas === 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGESTOES.map((s) => (
                    <button key={s} onClick={() => enviar(s)} className="rounded-full border-2 border-white/30 px-3 py-1.5 text-left font-bold hover:bg-white/10">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviar();
                }}
                className="mt-4 flex gap-2"
              >
                <label htmlFor="fala" className="sr-only">
                  Sua fala de golpista
                </label>
                <input
                  id="fala"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={300}
                  autoComplete="off"
                  placeholder={ouvindo ? "Pode falar…" : "Escreva sua lábia de golpista"}
                  className="min-w-0 flex-1 rounded-xl border-2 border-white/30 bg-transparent p-3 text-lg outline-none placeholder:text-white/50 focus:border-faixa"
                />
                {temMicrofone && (
                  <button
                    type="button"
                    onClick={microfone}
                    aria-pressed={ouvindo}
                    aria-label={ouvindo ? "Parar de ouvir" : "Falar pelo microfone"}
                    className={`rounded-xl border-2 px-3 ${ouvindo ? "border-golpe bg-golpe" : "border-white/30 hover:bg-white/10"}`}
                  >
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                      <path d="M12 15a3.5 3.5 0 0 0 3.500-3.500v-5a3.500 3.500 0 1 0-7 0v5A3.500 3.500 0 0 0 12 15Zm6-3.500a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.940V22h2v-2.560a8 8 0 0 0 7-7.940h-2Z" />
                    </svg>
                  </button>
                )}
                <button type="submit" disabled={esperando || !texto.trim()} className="rounded-xl bg-faixa px-5 font-display text-lg font-extrabold text-noite disabled:opacity-50">
                  Enviar
                </button>
              </form>
              <p className="mt-2 text-white/50">
                Fala {Math.min(rodadas + 1, MAX_RODADAS)} de {MAX_RODADAS}
              </p>
            </section>

            <aside aria-label="Cartela de truques">
              <h2 className="font-display text-xl font-extrabold">
                Truques revelados: {reveladas.length} de {TECNICAS.length}
              </h2>
              <p className="mb-3 text-white/60">Toque num truque revelado para ver a defesa.</p>
              {cartela}
            </aside>
          </div>
        )}

        {fase === "fim" && (
          <section className="mx-auto max-w-2xl">
            <p className="font-bold text-white/70">Fim da ligação</p>
            <h1 className="font-display text-[2.8rem] font-extrabold leading-[0.98] tracking-tight text-faixa sm:text-6xl">
              A Vó Zilda te enrolou por {relogio(segundos)}
            </h1>
            <p className="mt-4 text-2xl leading-snug">
              Ela não passou nenhum dado. E você mostrou <strong>{reveladas.length}</strong> dos {TECNICAS.length} truques que os golpistas usam.
            </p>

            {reveladas.length > 0 && (
              <ul className="mt-6 space-y-4">
                {TECNICAS.filter((t) => reveladas.includes(t.id)).map((t) => (
                  <li key={t.id} className="border-l-[6px] border-faixa pl-3">
                    <div className="text-xl font-bold">{t.nome}</div>
                    <div className="text-lg text-white/85">{t.defesa}</div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 text-lg text-white/75">Agora que você conhece os truques, fica mais difícil cair neles.</p>
            <button onClick={comecar} className="mt-6 rounded-2xl bg-faixa px-6 py-4 font-display text-2xl font-extrabold text-noite transition active:scale-[0.98]">
              Ligar de novo
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
