"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

// Tela para o notebook do estande: chama quem passa, mostra o QR code do app
// e conta quantas análises foram feitas neste aparelho.

const CHAMADAS = ["Recebeu mensagem estranha?", "Você reconhece um golpe?", "Tente enganar a Vó Zilda", "Para quem vai esse Pix?"];

export default function Estande() {
  const [qr, setQr] = useState("");
  const [endereco, setEndereco] = useState("");
  const [vez, setVez] = useState(0);
  const [analises, setAnalises] = useState(0);

  useEffect(() => {
    // O QR aponta para o endereço público. Em localhost, use ?url=https://seu-app.vercel.app
    const params = new URLSearchParams(window.location.search);
    const base = (params.get("url") || window.location.origin).replace(/\/$/, "");
    setEndereco(base.replace(/^https?:\/\//, ""));
    QRCode.toString(`${base}/?origem=estande`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#131A33", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => {});

    const ler = () => {
      try {
        setAnalises(Number(localStorage.getItem("ag:analises") || 0));
      } catch {}
    };
    ler();
    const troca = setInterval(() => setVez((v) => (v + 1) % CHAMADAS.length), 4000);
    const conta = setInterval(ler, 5000);
    return () => {
      clearInterval(troca);
      clearInterval(conta);
    };
  }, []);

  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  return (
    <main className="flex min-h-screen flex-col bg-noite text-white">
      <div className="faixa" aria-hidden="true" />

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-8 py-8 lg:grid-cols-[1fr_auto]">
        <section>
          <p className="font-display text-3xl font-extrabold text-faixa">Anti-Golpe IA</p>
          <h1 key={vez} className="mt-3 min-h-[2.1em] font-display text-[clamp(3rem,7.5vw,7.5rem)] font-extrabold leading-[0.95] tracking-tight">
            {CHAMADAS[vez]}
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(1.25rem,2vw,2rem)] leading-snug text-white/85">
            Pegue o celular, abra uma mensagem suspeita que você recebeu e teste aqui. A inteligência artificial diz se é golpe e explica por quê.
          </p>

          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: "/", rotulo: "Analisar mensagem" },
              { href: "/vovo", rotulo: "Engane a Vó Zilda" },
              { href: "/jogo", rotulo: "É golpe ou não?" },
              { href: "/pix", rotulo: "Raio-X do Pix" },
            ].map((b) => (
              <Link key={b.href} href={b.href} className="rounded-2xl border-2 border-faixa px-4 py-4 text-center font-display text-xl font-extrabold text-faixa hover:bg-faixa hover:text-noite">
                {b.rotulo}
              </Link>
            ))}
          </div>
        </section>

        <section className="justify-self-center text-center">
          <div className="rounded-3xl bg-white p-5">
            {qr ? (
              <div className="h-[min(42vh,26rem)] w-[min(42vh,26rem)] [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code para ${endereco}`} dangerouslySetInnerHTML={{ __html: qr }} />
            ) : (
              <div className="h-[min(42vh,26rem)] w-[min(42vh,26rem)]" />
            )}
          </div>
          <p className="mt-4 font-display text-3xl font-extrabold text-faixa">Aponte a câmera</p>
          <p className="text-xl text-white/80">{endereco}</p>
        </section>
      </div>

      <footer className="flex items-center justify-between gap-4 px-8 pb-6 text-lg text-white/70">
        <p>
          <strong className="font-display text-2xl font-extrabold text-white">{analises}</strong> análises feitas neste aparelho
        </p>
        <p className="hidden sm:block">6ª MostraTec, Uniube Uberlândia</p>
        <button onClick={telaCheia} className="rounded-xl border-2 border-white/30 px-4 py-2 font-bold hover:bg-white/10">
          Tela cheia
        </button>
      </footer>
    </main>
  );
}
