import type { Metadata } from "next";
import Link from "next/link";
import { TECNICAS } from "@/lib/tecnicas.mjs";
import resultados from "@/lib/resultados.json";

export const metadata: Metadata = { title: "Como funciona" };

interface Bloco {
  total: number;
  acuracia: string;
  sensibilidade: string;
  especificidade: string;
  vp: number;
  vn: number;
  fp: number;
  fn: number;
}
interface Resultados {
  status?: string;
  geradoEm?: string;
  provedor?: string;
  reais?: Bloco | null;
  sinteticos?: Bloco | null;
}

const PASSOS = [
  {
    titulo: "Você cola a mensagem ou manda o print",
    texto: "Vale texto de WhatsApp, SMS, e-mail, link ou Pix copia e cola. No Android, dá para usar o botão Compartilhar do próprio WhatsApp.",
  },
  {
    titulo: "As regras locais fazem a primeira leitura",
    texto: "Um conjunto de regras escritas por nós procura sinais conhecidos: link que imita marca, endereço encurtado, pedido de código, pressa, Pix para chave de pessoa física. Essa parte funciona até sem internet.",
  },
  {
    titulo: "A inteligência artificial lê o contexto",
    texto: "Um modelo de linguagem que entende texto e imagem analisa a conversa inteira, como um especialista faria, e recebe as pistas das regras para conferir.",
  },
  {
    titulo: "As duas notas viram um veredito explicado",
    texto: "A nota final combina 75% da IA com 25% das regras. Você recebe o risco de 0 a 100, cada sinal explicado em linguagem simples e o que fazer em seguida.",
  },
];

function Quadro({ titulo, bloco, aviso }: { titulo: string; bloco: Bloco; aviso?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5">
      <h3 className="font-display text-xl font-extrabold">{titulo}</h3>
      {aviso && <p className="mt-1 text-noite/70">{aviso}</p>}
      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="font-display text-6xl font-extrabold leading-none text-tinta">{bloco.acuracia}</div>
          <div className="font-bold text-noite/70">de acerto em {bloco.total} mensagens</div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 text-lg">
          <dt className="text-noite/70">Golpes pegos</dt>
          <dd className="font-bold">
            {bloco.vp} de {bloco.vp + bloco.fn}
          </dd>
          <dt className="text-noite/70">Legítimas liberadas</dt>
          <dd className="font-bold">
            {bloco.vn} de {bloco.vn + bloco.fp}
          </dd>
        </dl>
      </div>
    </div>
  );
}

export default function ComoFunciona() {
  const r = resultados as Resultados;

  return (
    <main className="pb-28 md:pb-12">
      <div className="bg-tinta pb-10 text-white">
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">Como funciona</h1>
          <p className="mt-3 max-w-xl text-xl leading-snug text-white/90">Duas camadas de proteção: regras que rodam no aparelho e uma IA que entende o contexto da conversa.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-12 px-4 pt-10">
        <section>
          <h2 className="font-display text-3xl font-extrabold">Do print ao veredito</h2>
          <ol className="mt-5 space-y-5">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tinta font-display text-xl font-extrabold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{p.titulo}</h3>
                  <p className="mt-1 max-w-prose text-lg text-noite/80">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-3xl font-extrabold">Resultados dos testes</h2>
          {r.reais || r.sinteticos ? (
            <div className="mt-5 space-y-4">
              {r.reais && <Quadro titulo="Mensagens reais" bloco={r.reais} aviso="Golpes e mensagens legítimas recebidos por pessoas de verdade, com nomes e telefones apagados." />}
              {r.sinteticos && (
                <Quadro
                  titulo="Exemplos escritos pela equipe"
                  bloco={r.sinteticos}
                  aviso="Servem para testar o sistema durante o desenvolvimento. Não contam como resultado, porque as regras foram ajustadas com eles."
                />
              )}
              <p className="text-noite/60">
                Última medição: {r.geradoEm}
                {r.provedor ? `, com ${r.provedor}` : ""}. Golpe classificado como suspeito conta como golpe pego.
              </p>
            </div>
          ) : (
            <p className="mt-4 max-w-prose rounded-2xl bg-white p-5 text-lg">
              A medição com mensagens reais está em andamento. O sistema é testado com golpes e mensagens legítimas recebidos por pessoas de verdade, e os números aparecem aqui assim que a avaliação roda.
            </p>
          )}
        </section>

        <section>
          <h2 className="font-display text-3xl font-extrabold">Os 9 truques que todo golpe usa</h2>
          <p className="mt-2 max-w-prose text-lg text-noite/80">
            Golpe muda de roupa toda semana, mas os truques por baixo são sempre os mesmos. Quem conhece os truques reconhece o golpe novo.
          </p>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {TECNICAS.map((t) => (
              <div key={t.id} className="border-l-[6px] border-faixa pl-3">
                <dt className="text-xl font-bold">{t.nome}</dt>
                <dd className="text-noite/80">{t.descricao}</dd>
                <dd className="mt-1 font-bold text-seguro">{t.defesa}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-lg">
            Quer ver os truques em ação?{" "}
            <Link href="/vovo" className="font-bold text-tinta underline">
              Tente enganar a Vó Zilda
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-extrabold">Privacidade</h2>
          <ul className="mt-4 max-w-prose space-y-3 text-lg text-noite/85">
            <li>A mensagem é analisada e descartada. Não existe banco de dados: nada do que você envia fica guardado.</li>
            <li>O Raio-X do Pix e o jogo rodam inteiros no seu aparelho, sem enviar nada para a internet.</li>
            <li>As mensagens reais usadas nos testes tiveram nomes, telefones, CPFs e chaves Pix apagados antes, seguindo a LGPD.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-3xl font-extrabold">O que o app não faz</h2>
          <ul className="mt-4 max-w-prose space-y-3 text-lg text-noite/85">
            <li>O resultado é uma nota de risco, não uma sentença. A IA pode errar, e por isso o app sempre mostra o motivo de cada alerta.</li>
            <li>Golpe novo e bem escrito pode passar. Na dúvida, confirme por outro caminho antes de pagar ou clicar.</li>
            <li>O nome escrito dentro de um Pix copia e cola pode ser inventado. O nome que o seu banco mostra na hora de confirmar é o que vale.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-3xl font-extrabold">De onde veio a ideia</h2>
          <p className="mt-4 max-w-prose text-lg text-noite/85">
            O projeto se inspira em duas iniciativas que usam IA contra golpistas: o{" "}
            <a href="https://lighthouse.mq.edu.au/article/june-2023/scamming-the-scammers" className="font-bold text-tinta underline" rel="noopener noreferrer" target="_blank">
              Apate
            </a>
            , da Universidade Macquarie, na Austrália, e a{" "}
            <a href="https://www.npr.org/2024/12/10/nx-s1-5220362/daisy-ai-granny-o2-fraud-spam-prevention" className="font-bold text-tinta underline" rel="noopener noreferrer" target="_blank">
              Daisy
            </a>
            , da operadora britânica O2. As duas colocam robôs para conversar com golpistas e fazê-los perder tempo. O Anti-Golpe IA leva a ideia para o lado da vítima e para os golpes brasileiros: Pix, falso parente, falsa central e taxa falsa de entrega.
          </p>
          <p className="mt-4 text-noite/60">Projeto acadêmico apresentado na 6ª MostraTec, Uniube Uberlândia, novembro de 2026.</p>
        </section>
      </div>
    </main>
  );
}
