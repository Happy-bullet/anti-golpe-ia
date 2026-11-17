"use client";

// Tela da TV do estande: mostra a ligação ao vivo, toca a voz da Vó Zilda (na TV ou na caixa
// de som ligada ao notebook), os dois placares, a fila e o QR code para entrar.
// Abra em /tv, clique em "Ligar o som" uma vez e deixe em tela cheia.

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { TECNICAS } from "@/lib/tecnicas.mjs";
import { ABERTURA, ESPERAS } from "@/lib/falas-fixas";
import { destravarAudio, falarVovo, pararFala } from "@/lib/voz";
import { minutos, usarEstande, usarRelogio } from "@/lib/usar-estande";

const MOSTRAR_RESULTADO_MS = 18_000;

function Posicao({ n }: { n: number }) {
  return (
    <span className={`flex h-[2.2vw] w-[2.2vw] shrink-0 items-center justify-center rounded-full font-display text-[1.2vw] font-extrabold ${n === 1 ? "bg-faixa text-noite" : "bg-white/15"}`}>
      {n}
    </span>
  );
}

export default function TV() {
  const { visao, conexao, agoraNoServidor } = usarEstande({ intervaloMs: 1000 });
  usarRelogio(250);
  const [som, setSom] = useState(false);
  const [qr, setQr] = useState("");
  const [endereco, setEndereco] = useState("");
  const tocado = useRef(-1);
  const esperas = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const base = (params.get("url") || window.location.origin).replace(/\/$/, "");
    setEndereco(base.replace(/^https?:\/\//, "") + "/vovo");
    QRCode.toString(`${base}/vovo?origem=tv`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#131A33", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => {});
    return () => pararFala();
  }, []);

  // Toca cada fala nova da Vó (a numeração vem do servidor, então nada toca duas vezes).
  useEffect(() => {
    if (!visao?.audio) return;
    if (tocado.current < 0) {
      tocado.current = visao.audio.n;
      return;
    }
    if (visao.audio.n > tocado.current) {
      tocado.current = visao.audio.n;
      if (som) falarVovo(visao.audio.texto, visao.audio.url);
    }
  }, [visao, som]);

  // Se a resposta demora, a Vó solta um "hummm..." gravado para não ficar silêncio no estande.
  const pensando = !!visao?.chamada?.pensando;
  useEffect(() => {
    if (!pensando || !som) return;
    const r = setTimeout(() => falarVovo(ESPERAS[esperas.current++ % ESPERAS.length], null, { soGravada: true }), 1600);
    return () => clearTimeout(r);
  }, [pensando, som]);

  async function ligarSom() {
    destravarAudio();
    setSom(true);
    try {
      await (navigator as unknown as { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request("screen");
    } catch {}
  }

  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  const agora = agoraNoServidor();
  const c = visao?.chamada || null;
  const u = visao?.ultima || null;
  const resultado = !c && u?.tipo === "fim" && agora - u.quando < MOSTRAR_RESULTADO_MS ? u : null;
  const restam = c?.fase === "ativa" ? Math.max(0, (c.fim - agora) / 1000) : 0;
  const truques = c?.tecnicas || resultado?.tecnicas || [];
  const falas = c?.falas.slice(-2) || [];

  const codigo = (tamanho: string) => (
    <div className="rounded-[1.4vw] bg-white p-[0.9vw]">
      <div className={`${tamanho} [&>svg]:h-full [&>svg]:w-full`} role="img" aria-label={`QR code para ${endereco}`} dangerouslySetInnerHTML={{ __html: qr }} />
    </div>
  );

  const cartela = (
    <ul className="grid grid-cols-5 gap-[0.6vw]">
      {TECNICAS.map((t) => {
        const achou = truques.includes(t.id);
        return (
          <li
            key={t.id}
            className={`flex h-[3.5vw] items-center justify-center rounded-[0.8vw] border-[0.2vw] px-[0.4vw] text-center font-display text-[1.45vw] font-extrabold leading-tight ${
              achou ? "border-faixa bg-faixa text-noite" : "border-white/20 text-white/30"
            }`}
          >
            {achou ? t.nome : "?"}
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-noite text-white">
      <div className="faixa shrink-0" aria-hidden="true" />

      <header className="flex shrink-0 items-center justify-between px-[2.2vw] pt-[1.2vw]">
        <p className="font-display text-[2vw] font-extrabold text-faixa">Anti-Golpe IA</p>
        <p className="text-[1.3vw] text-white/70">{visao?.ativo === false ? "Modo estande desligado no painel" : "Uma ligação por vez. Quem usar os 9 truques ganha."}</p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1.6fr_1fr] gap-[2vw] px-[2.2vw] pb-[1.6vw] pt-[1vw]">
        <section className="flex min-h-0 flex-col" aria-live="polite">
          {c?.fase === "ativa" && (
            <>
              <div className="flex items-start justify-between gap-[2vw]">
                <div className="min-w-0">
                  <p className="text-[1.5vw] font-bold text-white/70">Ligação ao vivo</p>
                  <h1 className="font-display text-[4.2vw] font-extrabold leading-[1]">
                    <span className="text-faixa">{c.nome}</span> tenta enganar a Vó Zilda
                  </h1>
                </div>
                <p className={`shrink-0 font-display text-[7vw] font-extrabold leading-none tabular-nums ${restam <= 15 ? "text-golpe" : "text-white"}`}>{minutos(restam)}</p>
              </div>

              <div className="mt-[1.4vw] flex min-h-0 flex-1 flex-col justify-end gap-[1vw] overflow-hidden">
                {falas.map((f, i) => (
                  <div key={`${c.falas.length}-${i}`} className={f.de === "vovo" ? "pr-[8vw]" : "pl-[8vw]"}>
                    <p className={`mb-[0.2vw] text-[1.1vw] font-bold ${f.de === "vovo" ? "text-faixa" : "text-right text-white/60"}`}>{f.de === "vovo" ? "Vó Zilda" : c.nome}</p>
                    <div className={`rounded-[1.2vw] p-[1vw] text-[1.85vw] leading-snug text-noite ${f.de === "vovo" ? "bg-white" : "line-clamp-2 bg-[#dfe7ff]"}`}>{f.texto}</div>
                  </div>
                ))}
                {c.pensando && <p className="text-[1.5vw] text-white/60">Vó Zilda está procurando os óculos…</p>}
              </div>

              <div className="mt-[1.4vw] shrink-0">
                <p className="mb-[0.6vw] font-display text-[1.8vw] font-extrabold">
                  Truques usados: <span className="text-faixa">{c.tecnicas.length} de 9</span>
                </p>
                {cartela}
              </div>
            </>
          )}

          {c?.fase === "chamando" && (
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-[2vw] font-bold text-white/70">Próxima ligação</p>
              <h1 className="font-display text-[9vw] font-extrabold leading-[0.95] text-faixa">{c.nome}</h1>
              <p className="mt-[1.5vw] max-w-[50vw] text-[2.4vw] leading-snug">Venha para a frente da TV e toque em Ligar para a Vó no seu celular.</p>
            </div>
          )}

          {resultado && (
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-[2vw] font-bold text-white/70">{resultado.motivo === "venceu" ? "Usou todos os truques de golpista" : "Fim da ligação"}</p>
              <h1 className="font-display text-[6.5vw] font-extrabold leading-[1]">
                <span className="text-faixa">{resultado.nome}</span> usou {resultado.truques} de 9 truques
              </h1>
              <p className="mb-[1.5vw] mt-[1.2vw] text-[1.9vw] text-white/85">E a Vó Zilda não passou senha, código nem Pix. Golpista de verdade usa estes mesmos truques:</p>
              {cartela}
            </div>
          )}

          {!c && !resultado && (
            <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-[2.5vw]">
              <div>
                <h1 className="font-display text-[6.4vw] font-extrabold leading-[0.95]">
                  Você engana a <span className="text-faixa">Vó Zilda</span>?
                </h1>
                <ol className="mt-[2vw] space-y-[0.9vw] text-[2.1vw] leading-snug">
                  <li>1. Aponte a câmera do celular para o QR code.</li>
                  <li>2. Escreva seu nome e entre na fila.</li>
                  <li>3. Ligue para a Vó e use truques de golpista.</li>
                </ol>
                {visao && visao.fila.length > 0 && (
                  <p className="mt-[1.6vw] text-[1.8vw] font-bold text-faixa">
                    Na fila: {visao.fila.slice(0, 5).join(", ")}
                    {visao.fila.length > 5 ? ` e mais ${visao.fila.length - 5}` : ""}
                  </p>
                )}
              </div>
              <div className="text-center">
                {codigo("h-[24vw] w-[24vw]")}
                <p className="mt-[0.8vw] text-[1.3vw] text-white/75">{endereco}</p>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-[1.2vw]">
          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.4vw] bg-white/[0.07] p-[1.3vw]">
            <h2 className="font-display text-[1.9vw] font-extrabold text-faixa">Placar da Vó Zilda</h2>
            <p className="text-[1.05vw] text-white/60">Quem usou mais truques de golpista</p>
            <ol className="mt-[0.7vw] space-y-[0.45vw]">
              {(visao?.placarVovo || []).slice(0, 6).map((l, i) => (
                <li key={l.id} className="flex items-center gap-[0.8vw] text-[1.5vw]">
                  <Posicao n={i + 1} />
                  <span className="min-w-0 flex-1 truncate font-bold">{l.nome}</span>
                  <span className="font-display font-extrabold tabular-nums">{l.truques} de 9</span>
                </li>
              ))}
              {!visao?.placarVovo.length && <li className="text-[1.3vw] text-white/50">Ainda ninguém ligou. Seja a primeira pessoa.</li>}
            </ol>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.4vw] bg-white/[0.07] p-[1.3vw]">
            <h2 className="font-display text-[1.9vw] font-extrabold text-faixa">Placar do quiz</h2>
            <p className="text-[1.05vw] text-white/60">É golpe ou não? Vale a melhor de 3 tentativas</p>
            <ol className="mt-[0.7vw] space-y-[0.45vw]">
              {(visao?.placarQuiz || []).slice(0, 6).map((l, i) => (
                <li key={l.id} className="flex items-center gap-[0.8vw] text-[1.5vw]">
                  <Posicao n={i + 1} />
                  <span className="min-w-0 flex-1 truncate font-bold">{l.nome}</span>
                  <span className="font-display font-extrabold tabular-nums">{l.pontos}</span>
                </li>
              ))}
              {!visao?.placarQuiz.length && <li className="text-[1.3vw] text-white/50">Ninguém jogou ainda.</li>}
            </ol>
          </div>

          {(c || resultado) && (
            <div className="flex shrink-0 items-center gap-[1.2vw]">
              {codigo("h-[8.5vw] w-[8.5vw]")}
              <div className="min-w-0">
                <p className="font-display text-[1.7vw] font-extrabold leading-tight">Quer ser a próxima pessoa?</p>
                <p className="text-[1.2vw] text-white/75">Aponte a câmera e entre na fila.</p>
                {visao && visao.fila.length > 0 && <p className="mt-[0.3vw] truncate text-[1.2vw] font-bold text-faixa">Na fila: {visao.fila.slice(0, 4).join(", ")}{visao.fila.length > 4 ? ` +${visao.fila.length - 4}` : ""}</p>}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="flex shrink-0 items-center justify-between px-[2.2vw] pb-[0.8vw] text-[0.95vw] text-white/50">
        <p>6ª MostraTec, Uniube Uberlândia</p>
        <p>
          {conexao === "fora" ? "Sem conexão com o servidor. Tentando de novo…" : som ? "Som ligado" : "Som desligado"}
          <button onClick={() => som && falarVovo(ABERTURA)} className="ml-[1vw] underline">
            Testar som
          </button>
          <button onClick={telaCheia} className="ml-[1vw] underline">
            Tela cheia
          </button>
        </p>
      </footer>

      {!som && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-noite/90">
          <button onClick={ligarSom} className="rounded-[1.5vw] bg-faixa px-[3vw] py-[2vw] font-display text-[3vw] font-extrabold text-noite">
            Ligar o som da TV
          </button>
        </div>
      )}
    </main>
  );
}
