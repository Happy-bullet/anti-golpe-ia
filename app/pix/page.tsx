"use client";

import { useMemo, useState } from "react";
import Carimbo from "@/components/Carimbo";
import { avaliarPix, lerPix, montarPix } from "@/lib/pix.mjs";
import type { AlertaPix, PixLido } from "@/lib/pix.mjs";

const COR_ALERTA = { alta: "border-golpe", media: "border-alerta", baixa: "border-noite/30" } as const;

function emReais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RaioXPix() {
  const [codigo, setCodigo] = useState("");
  const [quem, setQuem] = useState("");
  const [valor, setValor] = useState("");
  const [lido, setLido] = useState<PixLido | null>(null);
  const [avaliacao, setAvaliacao] = useState<{ risco: number; alertas: AlertaPix[] } | null>(null);

  // Códigos de exemplo gerados na hora, com dados inventados.
  const exemplos = useMemo(
    () => [
      {
        rotulo: "Taxa dos Correios",
        quem: "Correios",
        valor: "24,90",
        codigo: montarPix({ chave: "+5562999990000", nome: "MARCOS A SILVA", cidade: "GOIANIA", valor: 24.9 }),
      },
      {
        rotulo: "Conta da padaria",
        quem: "Padaria Pão Quente",
        valor: "23,90",
        codigo: montarPix({ chave: "12345678000195", nome: "PADARIA PAO QUENTE LTDA", cidade: "UBERLANDIA", valor: 23.9 }),
      },
    ],
    [],
  );

  function examinar(c = codigo, q = quem, v = valor) {
    const pix = lerPix(c);
    const numero = v.trim() ? Number(v.replace(/\./g, "").replace(",", ".")) : null;
    setLido(pix);
    setAvaliacao(pix.ok ? avaliarPix(pix, { quem: q, valor: numero !== null && Number.isFinite(numero) ? numero : null }) : null);
  }

  const nivel = !avaliacao ? null : avaliacao.risco >= 60 ? "golpe" : avaliacao.risco >= 30 ? "suspeito" : "seguro";
  const carimbo = { golpe: "Não pague", suspeito: "Desconfie", seguro: "Confere" } as const;

  return (
    <main className="pb-28 md:pb-12">
      <div className="bg-tinta pb-16 text-white">
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">Raio-X do Pix</h1>
          <p className="mt-3 max-w-md text-xl leading-snug text-white/90">Cole o Pix copia e cola e veja para quem o dinheiro vai, antes de pagar.</p>
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-2xl px-4">
        <section className="rounded-2xl bg-white p-4 shadow-lg">
          <label htmlFor="codigo" className="mb-2 block text-lg font-bold">
            Código Pix copia e cola
          </label>
          <textarea
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            rows={4}
            placeholder="Começa com 000201…"
            className="w-full resize-y break-all rounded-xl border-2 border-noite/20 bg-papel/60 p-3 font-mono text-base outline-none focus:border-tinta"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div>
              <label htmlFor="quem" className="mb-1 block font-bold">
                Quem disse que vai receber?
              </label>
              <input
                id="quem"
                value={quem}
                onChange={(e) => setQuem(e.target.value)}
                placeholder="Ex.: Correios, a loja, meu filho"
                className="w-full rounded-xl border-2 border-noite/20 bg-papel/60 p-3 text-lg outline-none focus:border-tinta"
              />
            </div>
            <div>
              <label htmlFor="valor" className="mb-1 block font-bold">
                Valor combinado
              </label>
              <input
                id="valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="R$"
                className="w-full rounded-xl border-2 border-noite/20 bg-papel/60 p-3 text-lg outline-none focus:border-tinta"
              />
            </div>
          </div>

          <button onClick={() => examinar()} className="mt-4 w-full rounded-xl bg-tinta px-5 py-3.5 font-display text-xl font-extrabold text-white transition active:scale-[0.98]">
            Ver para quem vai o dinheiro
          </button>

          <div className="mt-4 border-t border-noite/10 pt-3">
            <p className="mb-2 text-noite/70">Não tem um código agora? Teste com um destes, com dados inventados:</p>
            <div className="flex flex-wrap gap-2">
              {exemplos.map((ex) => (
                <button
                  key={ex.rotulo}
                  onClick={() => {
                    setCodigo(ex.codigo);
                    setQuem(ex.quem);
                    setValor(ex.valor);
                    examinar(ex.codigo, ex.quem, ex.valor);
                  }}
                  className="rounded-full bg-papel px-3 py-1.5 font-bold text-tinta hover:bg-tinta/10"
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>
          </div>
        </section>

        {lido && !lido.ok && (
          <p role="alert" className="mt-6 rounded-2xl border-l-4 border-golpe bg-white p-4 text-lg font-bold text-golpe">
            {lido.erro}
          </p>
        )}

        {lido && lido.ok && avaliacao && nivel && (
          <section aria-label="Resultado do Raio-X" className="mt-8">
            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-noite/70">O dinheiro vai para</p>
                  <p className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{lido.nome || "Recebedor sem nome"}</p>
                  <p className="mt-1 text-lg text-noite/80">{lido.cidade || "Cidade não informada"}</p>
                </div>
                <Carimbo key={codigo + quem + valor} nivel={nivel} texto={carimbo[nivel]} className="text-3xl" />
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-noite/10 pt-4 text-lg">
                <div>
                  <dt className="text-base text-noite/70">Valor no código</dt>
                  <dd className="font-bold">{lido.valor !== null ? emReais(lido.valor) : "Em aberto"}</dd>
                </div>
                <div>
                  <dt className="text-base text-noite/70">Tipo de chave</dt>
                  <dd className="font-bold">{lido.dinamico ? "Cobrança de banco" : lido.nomeTipoChave}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-base text-noite/70">{lido.dinamico ? "Emitido por" : "Chave"}</dt>
                  <dd className="break-all font-bold">{lido.dinamico ? lido.dominio : lido.chaveMascarada}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-5">
              <h2 className="font-display text-2xl font-extrabold">O que conferir</h2>
              <ul className="mt-3 space-y-4">
                {avaliacao.alertas.map((a, i) => (
                  <li key={i} className={`border-l-[6px] pl-3 ${COR_ALERTA[a.gravidade]}`}>
                    <div className="text-lg font-bold">{a.titulo}</div>
                    <div className="text-noite/80">{a.explicacao}</div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-noite/60">O código é lido no seu próprio aparelho. Nada é enviado para a internet.</p>
      </div>
    </main>
  );
}
