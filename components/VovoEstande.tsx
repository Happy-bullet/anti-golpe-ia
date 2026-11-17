"use client";

// Vó Zilda no modo estande: uma ligação por vez, com fila, tempo contado e aprovação do admin.
// O celular é o microfone e o teclado de quem liga. A voz da Vó e a conversa aparecem na TV.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TECNICAS } from "@/lib/tecnicas.mjs";
import { Microfone, NIVEL_MINIMO, temMicrofone } from "@/lib/microfone";
import { destravarAudio, falarVovo, ouvir, pararFala, podeOuvir } from "@/lib/voz";
import { guardarNome, meuNome, meuPid } from "@/lib/participante";
import { minutos, usarEstande, usarRelogio } from "@/lib/usar-estande";
import type { UltimaLigacao } from "@/lib/tipos";

const SUGESTOES = ["Oi vó, sou eu, seu neto! Troquei de número.", "Aqui é da central de segurança do seu banco.", "A senhora ganhou um prêmio de 5 mil reais!"];

const AVISOS: Record<string, string> = {
  "nao-ouvi": "Não ouvi. Segure o botão e fale bem perto do celular.",
  "ouvir-falhou": "O microfone falhou agora. Tente de novo ou escreva.",
  "sem-conexao": "Sem conexão. Tente de novo.",
};

export default function VovoEstande({ aoSairDoModo }: { aoSairDoModo: () => void }) {
  const [pid] = useState(() => meuPid());
  const [nome, setNome] = useState(() => meuNome());
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [micDoNavegador, setMicDoNavegador] = useState(false);
  const [resultado, setResultado] = useState<UltimaLigacao | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const mic = useRef<Microfone | null>(null);
  const gravandoRef = useRef(false);
  const gravandoPeloNavegador = useRef(false);
  const apertou = useRef(0);
  const modoToque = useRef(false);
  const limite = useRef<ReturnType<typeof setTimeout>>();
  const pararNavegador = useRef<() => void>(() => {});
  const fimDaConversa = useRef<HTMLDivElement>(null);
  const audioTocado = useRef(-1);
  const avisado = useRef(0);

  const [rapido, setRapido] = useState(false);
  const { visao, conexao, acao, agoraNoServidor } = usarEstande({ pid, intervaloMs: rapido ? 1200 : 2500 });
  usarRelogio(500);

  const c = visao?.chamada?.sua ? visao.chamada : null;
  const naFila = (visao?.posicao ?? -1) >= 0;
  const fase = !visao ? "carregando" : c?.fase === "ativa" ? "ligacao" : c?.fase === "chamando" ? "sua-vez" : naFila ? "fila" : resultado ? "fim" : "nome";

  useEffect(() => setRapido(fase === "ligacao" || fase === "sua-vez"), [fase]);

  // Se o admin desligar o modo estande, volta para a Vó normal.
  useEffect(() => {
    if (visao && !visao.ativo) aoSairDoModo();
  }, [visao, aoSairDoModo]);
  useEffect(() => {
    if (conexao === "fora" && (fase === "carregando" || fase === "nome")) aoSairDoModo();
  }, [conexao, fase, aoSairDoModo]);

  // Guarda o resultado da própria ligação (a tela de fim não some quando outra pessoa liga).
  useEffect(() => {
    const u = visao?.ultima;
    if (u && u.tipo === "fim" && u.id === visao?.eu?.id && u.quando !== resultado?.quando && u.quando > avisado.current) {
      avisado.current = u.quando;
      setResultado(u);
      mic.current?.soltar();
      mic.current = null;
      setMicOk(null);
    }
  }, [visao, resultado]);

  // Avisa quando chega a vez (o celular pode estar no bolso).
  useEffect(() => {
    if (fase === "sua-vez") {
      try {
        navigator.vibrate?.([300, 150, 300, 150, 300]);
      } catch {}
      document.title = "É a sua vez! Vó Zilda";
    } else document.title = "Vó Zilda | Anti-Golpe IA";
  }, [fase]);

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [c?.falas.length, c?.pensando]);

  // Som no celular só se o admin ligou essa opção (o padrão é a voz sair na TV do estande).
  useEffect(() => {
    if (!visao) return;
    if (audioTocado.current < 0) audioTocado.current = visao.audio.n;
    if (visao.audio.n > audioTocado.current) {
      audioTocado.current = visao.audio.n;
      if (visao.config.somNoCelular && (c || resultado)) falarVovo(visao.audio.texto, visao.audio.url);
    }
  }, [visao, c, resultado]);

  useEffect(
    () => () => {
      mic.current?.soltar();
      pararFala();
    },
    [],
  );

  async function entrar() {
    setAviso("");
    setResultado(null);
    setOcupado(true);
    const r = await acao({ acao: "entrar", nome });
    setOcupado(false);
    if (!r.ok) setAviso(AVISOS[r.erro || ""] || r.erro || "Não deu para entrar na fila.");
    else guardarNome(nome.trim());
  }

  async function ligar() {
    setAviso("");
    setOcupado(true);
    destravarAudio();
    // Se o servidor já avisou que não transcreve e o navegador sabe ouvir, nem abre o microfone próprio.
    if (visao?.ouvirPausado && podeOuvir()) setMicOk(false);
    else if (temMicrofone()) {
      try {
        mic.current = mic.current || new Microfone();
        await mic.current.preparar();
        setMicOk(true);
      } catch {
        mic.current = null;
        setMicOk(false);
      }
    } else setMicOk(false);
    const r = await acao({ acao: "atender" });
    setOcupado(false);
    if (!r.ok) setAviso(r.erro || "Não deu para começar a ligação.");
  }

  async function enviar(corpo: { texto?: string; audio?: string }) {
    if (ocupado) return;
    setAviso("");
    setOcupado(true);
    setTexto("");
    const r = await acao({ acao: "falar", ...corpo });
    setOcupado(false);
    if (r.ok) return;
    if (r.erro === "ouvir-falhou" && podeOuvir()) setMicDoNavegador(true);
    setAviso(AVISOS[r.erro || ""] || r.erro || "Não deu para enviar.");
  }

  // Quando a transcrição no servidor está fora (cota da IA ou falha), o celular usa o reconhecimento de voz do navegador.
  function peloNavegador() {
    return micDoNavegador || !!visao?.ouvirPausado || !mic.current?.pronto;
  }

  function comecarGravacao() {
    if (ocupado || c?.pensando) return;
    setAviso("");
    if (peloNavegador()) {
      if (!podeOuvir()) return;
      // Solta o microfone próprio antes: em alguns celulares o reconhecimento de voz não ouve nada com ele aberto.
      mic.current?.soltar();
      mic.current = null;
      gravandoRef.current = true;
      gravandoPeloNavegador.current = true;
      setGravando(true);
      pararNavegador.current = ouvir(
        (dito) => enviar({ texto: dito }),
        () => {
          gravandoRef.current = false;
          setGravando(false);
        },
      );
      return;
    }
    mic.current!.iniciar();
    gravandoRef.current = true;
    gravandoPeloNavegador.current = false;
    setGravando(true);
    clearTimeout(limite.current);
    limite.current = setTimeout(terminarGravacao, 14_000);
  }

  function terminarGravacao() {
    if (!gravandoRef.current) return;
    gravandoRef.current = false;
    setGravando(false);
    clearTimeout(limite.current);
    if (gravandoPeloNavegador.current) {
      pararNavegador.current();
      return;
    }
    const g = mic.current?.parar();
    if (!g || g.nivel < NIVEL_MINIMO) {
      setAviso(AVISOS["nao-ouvi"]);
      return;
    }
    enviar({ audio: g.base64 });
  }

  // Segurar para falar. Um toque rápido também funciona: toca para começar, toca para enviar.
  function apertar() {
    if (gravandoRef.current && modoToque.current) {
      modoToque.current = false;
      terminarGravacao();
      return;
    }
    apertou.current = Date.now();
    modoToque.current = false;
    comecarGravacao();
  }
  function soltar() {
    if (!gravandoRef.current) return;
    if (Date.now() - apertou.current < 350) {
      modoToque.current = true;
      return;
    }
    terminarGravacao();
  }

  const restam = c ? Math.max(0, (c.fim - agoraNoServidor()) / 1000) : 0;
  const temBotaoDeVoz = micOk !== null && (peloNavegador() ? podeOuvir() : true);
  const truques = c?.tecnicas || resultado?.tecnicas || [];

  const cartela = (
    <div>
      <ul className="grid grid-cols-3 gap-2">
        {TECNICAS.map((t) => {
          const achou = truques.includes(t.id);
          return (
            <li key={t.id}>
              <button
                onClick={() => achou && setAberta(aberta === t.id ? null : t.id)}
                disabled={!achou}
                aria-pressed={aberta === t.id}
                className={`flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 px-1 text-center text-sm font-bold leading-tight ${
                  achou ? "border-faixa bg-faixa text-noite" : "border-white/25 text-white/40"
                }`}
              >
                {achou ? t.nome : "?"}
              </button>
            </li>
          );
        })}
      </ul>
      {aberta && (
        <p className="mt-3 rounded-xl bg-white/10 p-3 leading-snug" aria-live="polite">
          <strong className="text-faixa">{TECNICAS.find((t) => t.id === aberta)?.nome}:</strong> {TECNICAS.find((t) => t.id === aberta)?.descricao} Como se defender:{" "}
          {TECNICAS.find((t) => t.id === aberta)?.defesa}
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-noite pb-28 text-white md:pb-12">
      <div className="faixa" aria-hidden="true" />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {fase === "carregando" && <p className="text-white/70">Chamando o estande…</p>}
        {conexao === "fora" && fase !== "carregando" && (
          <p role="status" className="mb-4 rounded-lg bg-white/10 p-3 font-bold">
            Sem conexão com o estande. Tentando de novo…
          </p>
        )}

        {fase === "nome" && visao && (
          <section>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-faixa">Tente enganar a Vó Zilda</h1>
            <p className="mt-3 text-lg leading-snug text-white/90">
              Você é o golpista. Ligue para a Vó e use o máximo de truques que conseguir em {minutos(visao.config.duracaoS)}. A ligação aparece na TV do estande, e quem usar os 9
              truques ganha.
            </p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                entrar();
              }}
            >
              <label htmlFor="nome" className="block font-bold">
                Seu nome (aparece na TV)
              </label>
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={16}
                autoComplete="given-name"
                placeholder="Ex.: Ana"
                className="mt-2 w-full rounded-2xl border-2 border-white/30 bg-white/10 px-4 py-3 text-xl font-bold text-white placeholder:text-white/40 focus:border-faixa focus:outline-none"
              />
              <button
                disabled={ocupado || nome.trim().length < 2}
                className="mt-4 w-full rounded-2xl bg-faixa px-6 py-4 font-display text-2xl font-extrabold text-noite transition active:scale-[0.98] disabled:opacity-50"
              >
                Entrar na fila para ligar
              </button>
            </form>

            <p className="mt-4 text-white/70">
              {visao.chamada ? `Agora: ${visao.chamada.nome} está na ligação. ` : "Ninguém na ligação agora. "}
              {visao.fila.length === 0 ? "A fila está vazia." : visao.fila.length === 1 ? "1 pessoa na fila." : `${visao.fila.length} pessoas na fila.`}
            </p>
          </section>
        )}

        {fase === "fila" && visao && (
          <section aria-live="polite">
            <p className="font-bold text-white/70">Você está na fila, {nome.trim()}</p>
            <h1 className="mt-1 font-display text-6xl font-extrabold text-faixa">{visao.posicao + 1}º</h1>
            {visao.posicao === 0 && !visao.chamada ? (
              <p className="mt-3 text-2xl font-bold leading-snug">Você é a próxima pessoa. Fique perto do estande: o Guilherme vai liberar a sua ligação.</p>
            ) : (
              <p className="mt-3 text-2xl font-bold leading-snug">
                Aguarde cerca de <span className="text-faixa">{visao.esperaS} segundos</span> ({minutos(visao.esperaS)})
              </p>
            )}
            <p className="mt-3 text-white/70">
              {visao.chamada ? `${visao.chamada.nome} está na ligação agora. ` : ""}
              Deixe esta página aberta. O celular vibra quando chegar a sua vez.
            </p>
            {visao.posicao > 0 && <p className="mt-3 text-white/70">Na sua frente: {visao.fila.slice(0, visao.posicao).join(", ")}</p>}
            <button onClick={() => acao({ acao: "sair" })} className="mt-6 rounded-xl border-2 border-white/30 px-4 py-2 font-bold hover:bg-white/10">
              Sair da fila
            </button>
            <p className="mt-8 text-white/70">
              Enquanto espera,{" "}
              <Link href="/jogo" className="font-bold text-faixa underline">
                jogue o quiz É golpe ou não?
              </Link>{" "}
              O seu lugar na fila fica guardado.
            </p>
          </section>
        )}

        {fase === "sua-vez" && c && (
          <section aria-live="assertive">
            <h1 className="font-display text-5xl font-extrabold leading-tight text-faixa">É a sua vez, {c.nome}!</h1>
            <p className="mt-3 text-xl leading-snug">
              Venha para a frente da TV. Você tem {minutos(visao!.config.duracaoS)} para usar o máximo de truques de golpista com a Vó Zilda.
            </p>
            <button onClick={ligar} disabled={ocupado} className="mt-6 w-full rounded-2xl bg-faixa px-6 py-5 font-display text-3xl font-extrabold text-noite active:scale-[0.98] disabled:opacity-60">
              Ligar para a Vó
            </button>
            <p className="mt-3 text-white/70">
              O celular vai pedir o microfone: aceite para falar com ela. Você tem {Math.max(0, Math.ceil((c.expira - agoraNoServidor()) / 1000))} segundos para começar.
            </p>
          </section>
        )}

        {fase === "ligacao" && c && (
          <section aria-label="Ligação com a Vó Zilda">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white/70">Ligação com a Vó Zilda</p>
                <p className={`font-display text-5xl font-extrabold tabular-nums ${restam <= 15 ? "text-golpe" : "text-faixa"}`} aria-label={`Restam ${Math.ceil(restam)} segundos`}>
                  {minutos(restam)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-extrabold">
                  {c.tecnicas.length}
                  <span className="text-white/50"> de 9</span>
                </p>
                <button onClick={() => acao({ acao: "desligar" })} className="mt-1 rounded-xl border-2 border-white/30 px-3 py-1 font-bold hover:bg-white/10">
                  Desligar
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3" aria-live="polite">
              {c.falas.slice(-4).map((f, i) => (
                <div key={`${c.falas.length}-${i}`} className={f.de === "vovo" ? "pr-10" : "pl-10"}>
                  <div className={`balao p-3 text-lg leading-snug text-noite ${f.de === "vovo" ? "ml-2" : "balao-meu mr-2"}`}>{f.texto}</div>
                </div>
              ))}
              {(c.pensando || ocupado) && <p className="ml-3 text-white/60">Vó Zilda está procurando os óculos…</p>}
              <div ref={fimDaConversa} />
            </div>

            <div className="sticky bottom-[4.6rem] z-10 -mx-4 mt-3 bg-noite px-4 pb-3 pt-1 md:bottom-0">
            {aviso && (
                <p role="alert" className="mt-3 rounded-lg bg-golpe/25 p-3 font-bold">
                  {aviso}
                </p>
              )}

              {c.falas.length <= 1 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGESTOES.map((s) => (
                    <button key={s} onClick={() => enviar({ texto: s })} disabled={ocupado} className="rounded-full border-2 border-white/30 px-3 py-1.5 text-left font-bold hover:bg-white/10">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {temBotaoDeVoz && (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    apertar();
                  }}
                  onPointerUp={soltar}
                  onPointerCancel={soltar}
                  onPointerLeave={soltar}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={ocupado || c.pensando}
                  aria-pressed={gravando}
                  className={`mt-5 flex w-full touch-none select-none items-center justify-center gap-3 rounded-2xl px-6 py-6 font-display text-2xl font-extrabold transition disabled:opacity-50 ${
                    gravando ? "scale-[0.98] bg-golpe text-white" : "bg-faixa text-noite"
                  }`}
                  style={{ WebkitTouchCallout: "none" }}
                >
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z" />
                  </svg>
                  {gravando ? "Gravando… solte para enviar" : "Segure para falar"}
                </button>
              )}
              {temBotaoDeVoz && <p className="mt-2 text-center text-white/60">Fale com o celular perto da boca, como numa ligação.</p>}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (texto.trim()) enviar({ texto });
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
                  placeholder={temBotaoDeVoz ? "Ou escreva aqui" : "Escreva sua lábia de golpista"}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-2xl border-2 border-white/30 bg-white/10 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:border-faixa focus:outline-none"
                />
                <button disabled={ocupado || !texto.trim()} className="rounded-2xl bg-white px-5 py-3 font-display text-xl font-extrabold text-noite disabled:opacity-50">
                  Enviar
                </button>
              </form>
            </div>

            <h2 className="mt-6 font-display text-xl font-extrabold">Truques usados: {c.tecnicas.length} de 9</h2>
            <p className="mb-3 text-white/70">Pressa, ameaça, prêmio, parente falso… cada truque diferente vale um ponto.</p>
            {cartela}
          </section>
        )}

        {fase === "fim" && resultado && (
          <section>
            <p className="font-bold text-white/70">
              {resultado.motivo === "venceu" ? "Você usou todos os truques!" : resultado.motivo === "tempo" ? "O tempo acabou" : "Ligação encerrada"}
            </p>
            <h1 className="mt-1 font-display text-5xl font-extrabold leading-tight text-faixa">
              {resultado.truques} de 9 truques
            </h1>
            <p className="mt-3 text-lg leading-snug text-white/90">
              {resultado.motivo === "venceu"
                ? "Você conhece todos os truques de um golpista. Agora sabe reconhecer cada um quando tentarem com você."
                : "Estes são os truques que você usou. Golpistas de verdade usam os mesmos. Toque em cada um para ver como se defender."}
            </p>
            {visao && visao.placarVovo.findIndex((l) => l.id === visao.eu?.id) >= 0 && (
              <p className="mt-3 text-xl font-bold">Você está em {visao.placarVovo.findIndex((l) => l.id === visao.eu?.id) + 1}º lugar no placar da TV.</p>
            )}
            <div className="mt-5">{cartela}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={entrar} disabled={ocupado} className="rounded-2xl bg-faixa px-5 py-4 font-display text-xl font-extrabold text-noite">
                Entrar na fila de novo
              </button>
              <Link href="/jogo" className="rounded-2xl border-2 border-faixa px-5 py-4 text-center font-display text-xl font-extrabold text-faixa">
                Jogar o quiz
              </Link>
            </div>
            {aviso && (
              <p role="alert" className="mt-3 rounded-lg bg-golpe/25 p-3 font-bold">
                {aviso}
              </p>
            )}
          </section>
        )}

        {(fase === "nome" || fase === "fila") && aviso && (
          <p role="alert" className="mt-4 rounded-lg bg-golpe/25 p-3 font-bold">
            {aviso}
          </p>
        )}
      </div>
    </main>
  );
}
