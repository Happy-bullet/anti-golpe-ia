"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Carimbo from "@/components/Carimbo";
import { destacar } from "@/lib/destacar";
import { falar, pararFala, podeFalar } from "@/lib/voz";
import type { Resultado } from "@/lib/tipos";

const EXEMPLOS = [
  {
    rotulo: "Filho com número novo",
    texto: "Oi mãe, troquei de número, salva esse aqui. Tô precisando pagar um boleto urgente e meu app do banco tá bloqueado, consegue fazer um pix pra mim? Te devolvo amanhã",
  },
  {
    rotulo: "Taxa dos Correios",
    texto: "CORREIOS: Seu objeto BR8829174BR esta retido aguardando pagamento da taxa de liberacao de R$ 24,90. Evite a devolucao: https://correios-rastreio.top/taxa",
  },
  {
    rotulo: "Central do banco",
    texto: "BRADESCO INFORMA: Compra nao reconhecida no valor de R$ 3.489,00 aprovada no seu cartao. Se nao reconhece ligue imediatamente para a central de seguranca 0800 591 2231",
  },
  {
    rotulo: "Recado da família",
    texto: "Oi vó! Domingo a gente passa aí pro almoço, a mãe pediu pra avisar que vai levar a sobremesa. Beijos",
  },
];

const VEREDITO = {
  golpe: { carimbo: "Golpe", frase: "Provável golpe", barra: "bg-golpe", texto: "text-golpe" },
  suspeito: { carimbo: "Suspeito", frase: "Suspeito", barra: "bg-alerta", texto: "text-alerta" },
  seguro: { carimbo: "Seguro", frase: "Parece seguro", barra: "bg-seguro", texto: "text-seguro" },
} as const;

const COR_SINAL = {
  alta: "border-golpe",
  media: "border-alerta",
  baixa: "border-noite/30",
} as const;

type Print = { base64: string; mime: string; preview: string };

// Reduz o print no próprio aparelho antes de enviar: mais rápido e cabe no limite do servidor.
async function prepararImagem(arquivo: Blob): Promise<Print> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    await new Promise((ok, falha) => {
      img.onload = ok;
      img.onerror = falha;
      img.src = url;
    });
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const tela = document.createElement("canvas");
    tela.width = Math.round(img.width * escala);
    tela.height = Math.round(img.height * escala);
    tela.getContext("2d")!.drawImage(img, 0, 0, tela.width, tela.height);
    const dataUrl = tela.toDataURL("image/jpeg", 0.85);
    return { base64: dataUrl.split(",")[1], mime: "image/jpeg", preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function textoFalado(r: Resultado) {
  return `${VEREDITO[r.nivel].frase}. Risco de ${r.risco} por cento. ${r.resumo} O que fazer: ${r.recomendacoes.join(" ")}`;
}

export default function Pagina() {
  const [texto, setTexto] = useState("");
  const [print, setPrint] = useState<Print | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const [falando, setFalando] = useState(false);
  const [provedor, setProvedor] = useState("");
  const campoArquivo = useRef<HTMLInputElement>(null);
  const areaResultado = useRef<HTMLDivElement>(null);

  const analisar = useCallback(async (t: string, p: Print | null) => {
    setErro("");
    setResultado(null);
    pararFala();
    setFalando(false);
    if (!t.trim() && !p) {
      setErro("Cole a mensagem ou envie um print primeiro.");
      return;
    }
    setCarregando(true);
    try {
      const r = await fetch("/api/analisar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: t, imagem: p ? { base64: p.base64, mime: p.mime } : undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Não consegui analisar. Tente de novo.");
      setResultado(j);
      try {
        localStorage.setItem("ag:analises", String(Number(localStorage.getItem("ag:analises") || 0) + 1));
      } catch {}
      setTimeout(() => areaResultado.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      // No modo fácil, o resultado é lido em voz alta sozinho.
      if (document.documentElement.classList.contains("leitura-grande") && podeFalar()) {
        setFalando(true);
        falar(textoFalado(j), { aoTerminar: () => setFalando(false) });
      }
    } catch (e) {
      setErro(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Sem conexão com o servidor. Confira a internet e tente de novo.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/analisar")
      .then((r) => r.json())
      .then((j) => setProvedor(j.provedor))
      .catch(() => {});

    // Mensagem que chegou pelo "Compartilhar" do WhatsApp ou por link (?texto=...)
    (async () => {
      const params = new URLSearchParams(window.location.search);
      let t = params.get("texto") || "";
      let p: Print | null = null;
      if (params.get("compartilhado") && "caches" in window) {
        try {
          const cache = await caches.open("ag-compartilhado");
          const rt = await cache.match("/_compartilhado/texto");
          if (rt) t = (await rt.text()) || t;
          const ri = await cache.match("/_compartilhado/imagem");
          if (ri) p = await prepararImagem(await ri.blob());
          await cache.delete("/_compartilhado/texto");
          await cache.delete("/_compartilhado/imagem");
        } catch {}
      }
      if (t || p) {
        setTexto(t);
        setPrint(p);
        window.history.replaceState(null, "", "/");
        analisar(t, p);
      }
    })();

    // Colar um print com Ctrl+V
    const aoColar = async (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
      const arquivo = item?.getAsFile();
      if (arquivo) setPrint(await prepararImagem(arquivo));
    };
    window.addEventListener("paste", aoColar);
    return () => {
      window.removeEventListener("paste", aoColar);
      pararFala();
    };
  }, [analisar]);

  function limpar() {
    setTexto("");
    setPrint(null);
    setResultado(null);
    setErro("");
    pararFala();
    setFalando(false);
  }

  function ouvirResultado() {
    if (!resultado) return;
    if (falando) {
      pararFala();
      setFalando(false);
      return;
    }
    setFalando(true);
    falar(textoFalado(resultado), { aoTerminar: () => setFalando(false) });
  }

  async function avisarFamilia() {
    if (!resultado) return;
    const aviso = `Atenção: recebi uma mensagem e o Anti-Golpe IA apontou ${resultado.risco}% de risco de golpe (${resultado.tipo}). ${resultado.resumo} Se chegar algo parecido pra você, não clique e não faça Pix. Confira em ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: aviso });
        return;
      } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(aviso)}`, "_blank", "noopener");
  }

  const v = resultado ? VEREDITO[resultado.nivel] : null;

  return (
    <main className="pb-28 md:pb-12">
      <div className="bg-tinta pb-16 text-white">
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">Recebeu mensagem estranha?</h1>
          <p className="mt-3 max-w-md text-xl leading-snug text-white/90">Cole aqui ou mande o print. Em segundos você sabe se é golpe, e por quê.</p>
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-2xl px-4">
        <section aria-label="Mensagem para analisar" className="balao ml-2 p-4 shadow-lg">
          <label htmlFor="msg" className="mb-2 block text-lg font-bold">
            A mensagem que você recebeu
          </label>
          <textarea
            id="msg"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Cole aqui o texto do WhatsApp, SMS, e-mail, o link ou o Pix copia e cola"
            className="w-full resize-y rounded-xl border-2 border-noite/20 bg-papel/60 p-3 text-lg outline-none placeholder:text-noite/50 focus:border-tinta"
          />

          {print && (
            <div className="mt-3 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={print.preview} alt="Print que você enviou" className="max-h-40 rounded-lg border-2 border-noite/20" />
              <button onClick={() => setPrint(null)} className="font-bold text-golpe underline">
                Tirar o print
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => analisar(texto, print)}
              disabled={carregando}
              className="flex-1 rounded-xl bg-tinta px-5 py-3.5 font-display text-xl font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? "Analisando…" : "Analisar mensagem"}
            </button>
            <button onClick={() => campoArquivo.current?.click()} className="rounded-xl border-2 border-tinta px-4 py-3 font-bold text-tinta hover:bg-tinta/5">
              Enviar print
            </button>
            <input
              ref={campoArquivo}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) setPrint(await prepararImagem(arquivo));
                e.target.value = "";
              }}
            />
          </div>

          {erro && (
            <p role="alert" className="mt-3 rounded-lg border-l-4 border-golpe bg-golpe/10 p-3 font-bold text-golpe">
              {erro}
            </p>
          )}

          <div className="mt-4 border-t border-noite/10 pt-3">
            <p className="mb-2 text-noite/70">Não tem nenhuma agora? Teste com uma destas:</p>
            <div className="flex flex-wrap gap-2">
              {EXEMPLOS.map((ex) => (
                <button
                  key={ex.rotulo}
                  onClick={() => {
                    setTexto(ex.texto);
                    setPrint(null);
                    analisar(ex.texto, null);
                  }}
                  className="rounded-full bg-papel px-3 py-1.5 font-bold text-tinta hover:bg-tinta/10"
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>
          </div>
        </section>

        {resultado && v && (
          <section ref={areaResultado} aria-label="Resultado" className="mt-8 scroll-mt-4">
            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <Carimbo key={resultado.risco + resultado.tipo} nivel={resultado.nivel} texto={v.carimbo} className="text-4xl sm:text-5xl" />
                <div className="text-right">
                  <div className={`font-display text-6xl font-extrabold leading-none ${v.texto}`}>{resultado.risco}%</div>
                  <div className="font-bold text-noite/70">de risco de golpe</div>
                </div>
              </div>

              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-noite/10" role="img" aria-label={`Risco de ${resultado.risco} por cento`}>
                <div className={`h-full rounded-full ${v.barra}`} style={{ width: `${Math.max(4, resultado.risco)}%` }} />
              </div>

              <p className="mt-4 font-bold text-noite/70">{resultado.tipo}</p>
              <p className="mt-1 text-xl leading-snug">{resultado.resumo}</p>

              {resultado.aviso && <p className="mt-3 rounded-lg bg-faixa/25 p-3 text-noite">{resultado.aviso}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {podeFalar() && (
                  <button onClick={ouvirResultado} className="rounded-xl border-2 border-noite/20 px-4 py-2.5 font-bold hover:bg-papel">
                    {falando ? "Parar a leitura" : "Ouvir o resultado"}
                  </button>
                )}
                {resultado.nivel !== "seguro" && (
                  <button onClick={avisarFamilia} className="rounded-xl bg-seguro px-4 py-2.5 font-bold text-white hover:opacity-90">
                    Avisar minha família
                  </button>
                )}
                <button onClick={limpar} className="rounded-xl border-2 border-noite/20 px-4 py-2.5 font-bold hover:bg-papel">
                  Analisar outra
                </button>
              </div>
            </div>

            {resultado.pix && (
              <div className="mt-4 rounded-2xl border-2 border-tinta bg-white p-5">
                <h2 className="font-display text-2xl font-extrabold">Tem um Pix nesta mensagem</h2>
                <p className="mt-2 text-lg">
                  O dinheiro vai para <strong>{resultado.pix.nome || "recebedor sem nome"}</strong>
                  {resultado.pix.cidade ? `, em ${resultado.pix.cidade}` : ""}
                  {resultado.pix.valor !== null ? `, no valor de R$ ${resultado.pix.valor.toFixed(2).replace(".", ",")}` : ""}. Chave: {resultado.pix.nomeTipoChave}.
                </p>
                <Link href="/pix" className="mt-2 inline-block font-bold text-tinta underline">
                  Abrir o Raio-X do Pix
                </Link>
              </div>
            )}

            {resultado.sinais.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white p-5">
                <h2 className="font-display text-2xl font-extrabold">O que chamou atenção</h2>
                <ul className="mt-3 space-y-4">
                  {resultado.sinais.map((s, i) => (
                    <li key={i} className={`border-l-[6px] pl-3 ${COR_SINAL[s.gravidade] || COR_SINAL.baixa}`}>
                      <div className="text-lg font-bold">{s.titulo}</div>
                      <div className="text-noite/80">{s.explicacao}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.textoAnalisado && resultado.sinais.some((s) => s.trecho) && (
              <div className="mt-4">
                <h2 className="mb-2 px-1 font-display text-2xl font-extrabold">Onde está o perigo</h2>
                <div className="balao ml-2 p-4">
                  <p className="whitespace-pre-wrap break-words text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: destacar(resultado.textoAnalisado, resultado.sinais) }} />
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-noite p-5 text-white">
              <h2 className="font-display text-2xl font-extrabold">O que fazer agora</h2>
              <ul className="mt-3 space-y-2 text-lg">
                {resultado.recomendacoes.map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-faixa" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {!resultado && (
          <section aria-label="Outras experiências" className="mt-10 grid gap-3 sm:grid-cols-3">
            <Link href="/vovo" className="rounded-2xl bg-noite p-4 text-white transition hover:-translate-y-0.5">
              <div className="font-display text-xl font-extrabold text-faixa">Engane a Vó Zilda</div>
              <p className="mt-1 text-white/80">Você é o golpista. Ela foi treinada pra te enrolar.</p>
            </Link>
            <Link href="/jogo" className="rounded-2xl bg-noite p-4 text-white transition hover:-translate-y-0.5">
              <div className="font-display text-xl font-extrabold text-faixa">É golpe ou não?</div>
              <p className="mt-1 text-white/80">Oito mensagens contra o relógio. Quantas você acerta?</p>
            </Link>
            <Link href="/pix" className="rounded-2xl bg-noite p-4 text-white transition hover:-translate-y-0.5">
              <div className="font-display text-xl font-extrabold text-faixa">Raio-X do Pix</div>
              <p className="mt-1 text-white/80">Veja para quem o dinheiro vai antes de pagar.</p>
            </Link>
          </section>
        )}

        <footer className="mt-10 text-center text-noite/60">
          <p>Nada do que você envia fica salvo. Análise feita por {provedor === "offline" ? "regras locais, sem internet" : "IA e regras locais"}.</p>
          <p className="mt-1">
            <Link href="/como-funciona" className="font-bold text-tinta underline">
              Como funciona
            </Link>
            {" · "}Projeto acadêmico, Uniube Uberlândia, 6ª MostraTec 2026
          </p>
        </footer>
      </div>
    </main>
  );
}
