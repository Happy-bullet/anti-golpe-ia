"use client";

// Painel do admin do estande (protegido por senha): liga o modo estande, libera a próxima ligação,
// encerra a ligação, tira nomes da fila e dos placares e ajusta o tempo.

import Link from "next/link";
import { useEffect, useState } from "react";
import { TECNICAS } from "@/lib/tecnicas.mjs";
import { minutos, usarEstande, usarRelogio } from "@/lib/usar-estande";
import type { VisaoAdmin } from "@/lib/tipos";

const DURACOES = [60, 90, 120, 150, 180];
const hora = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const nomeDaVariavel = (base: string, n: number) => (n === 1 ? base : `${base}_${n}`);
// Medido na voz ao vivo (modelo flash): 57 créditos para uma fala de cerca de 110 caracteres.
const CREDITOS_POR_CARACTERE = 0.52;

function Chave({ rotulo, ligado, aoTrocar, ajuda }: { rotulo: string; ligado: boolean; aoTrocar: (v: boolean) => void; ajuda?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" checked={ligado} onChange={(e) => aoTrocar(e.target.checked)} className="mt-1 h-6 w-6 accent-tinta" />
      <span>
        <span className="block font-bold">{rotulo}</span>
        {ajuda && <span className="block text-sm text-noite/70">{ajuda}</span>}
      </span>
    </label>
  );
}

export default function Admin() {
  const [senha, setSenha] = useState("");
  const [digitada, setDigitada] = useState("");
  const [aviso, setAviso] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [teste, setTeste] = useState<{ n: number; ok: boolean; ms: number; motivo: string }[] | null>(null);
  const [testando, setTestando] = useState(false);

  async function testarContas() {
    setTestando(true);
    setTeste(null);
    const r = await acao({ acao: "testar-contas" });
    setTestando(false);
    if (Array.isArray(r.testeDeContas)) setTeste(r.testeDeContas as { n: number; ok: boolean; ms: number; motivo: string }[]);
    else setAviso(r.erro || "O teste não respondeu.");
  }

  useEffect(() => {
    try {
      setSenha(sessionStorage.getItem("ag:senha") || "");
    } catch {}
  }, []);

  const { visao, erro, acao, agoraNoServidor } = usarEstande<VisaoAdmin>({
    intervaloMs: 1500,
    ligado: !!senha,
    caminho: "/api/estande/admin",
    cabecalhos: { "x-estande-senha": senha },
  });
  usarRelogio(500);

  async function fazer(corpo: Record<string, unknown>) {
    setAviso("");
    const r = await acao(corpo);
    if (!r.ok) setAviso(r.erro || "Não deu certo.");
  }

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem("ag:senha", digitada);
    } catch {}
    setSenha(digitada);
  }

  function sair() {
    try {
      sessionStorage.removeItem("ag:senha");
    } catch {}
    setSenha("");
    setDigitada("");
  }

  if (!senha || (!visao && erro)) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold text-tinta">Painel do estande</h1>
        <form onSubmit={entrar} className="mt-6">
          <label htmlFor="senha" className="block font-bold">
            Senha do admin
          </label>
          <input
            id="senha"
            type="password"
            value={digitada}
            onChange={(e) => setDigitada(e.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border-2 border-noite/30 px-4 py-3 text-lg"
          />
          <button className="mt-4 w-full rounded-xl bg-tinta px-5 py-3 font-display text-xl font-extrabold text-white">Entrar</button>
        </form>
        {senha && erro && (
          <p role="alert" className="mt-4 rounded-lg bg-golpe/10 p-3 font-bold text-golpe">
            {erro}
          </p>
        )}
      </main>
    );
  }

  if (!visao) return <main className="p-6">Carregando…</main>;

  if (visao.banco === "nenhum" || !visao.config) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold text-tinta">Painel do estande</h1>
        <p role="alert" className="mt-4 rounded-lg bg-golpe/10 p-3 font-bold text-golpe">
          Falta criar o banco Redis (Upstash) na Vercel: aba Storage, Create Database, Upstash for Redis, plano Free, e conectar ao projeto. Depois publique de novo.
        </p>
        <button onClick={sair} className="mt-4 rounded-xl border-2 border-noite/30 px-3 py-2 font-bold">
          Sair
        </button>
      </main>
    );
  }

  const agora = agoraNoServidor();
  const c = visao.chamada;
  const proximo = visao.filaCompleta?.[0];
  const voz = visao.vozUsada || { gravadas: 0, aoVivo: 0, caracteres: 0, navegador: 0 };
  const micPelaIA = !visao.ouvirPausado && visao.audioNoServidor !== false;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-tinta">Painel do estande</h1>
        <div className="flex gap-2">
          <Link href="/tv" target="_blank" className="rounded-xl border-2 border-tinta px-3 py-2 font-bold text-tinta">
            Abrir a tela da TV
          </Link>
          <button onClick={sair} className="rounded-xl border-2 border-noite/30 px-3 py-2 font-bold">
            Sair
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-noite/70">
        Banco: <strong>{visao.banco === "redis" ? "Redis ligado" : visao.banco === "memoria" ? "memória (só para teste local)" : "não configurado"}</strong> · Voz ElevenLabs:{" "}
        <strong>{visao.voz ? "ligada" : "desligada (usa a voz do navegador)"}</strong> · IA: <strong>{visao.ia}</strong> · Ligações hoje: <strong>{visao.ligacoes ?? 0}</strong>
      </p>

      {aviso && (
        <p role="alert" className="mt-3 rounded-lg bg-golpe/10 p-3 font-bold text-golpe">
          {aviso}
        </p>
      )}
      {visao.vozIdInvalido && (
        <p role="alert" className="mt-3 rounded-lg bg-golpe/10 p-3 font-bold text-golpe">
          {(visao.problemasDeVoz?.vozInvalida || []).map((n) => nomeDaVariavel("ELEVENLABS_VOICE_ID", n)).join(", ") ||
            (visao.problemasDeVoz?.semVoz || []).map((n) => nomeDaVariavel("ELEVENLABS_VOICE_ID", n)).join(", ")}
          {(visao.problemasDeVoz?.vozInvalida || []).length
            ? ": o valor na Vercel não é um ID de voz (parece outra coisa, talvez a chave). Corrija e publique de novo."
            : ": falta o ID da voz dessa conta. Crie a voz nela e cole o ID na Vercel."}
        </p>
      )}

      <section className="mt-5 rounded-2xl border-2 border-noite/15 bg-white p-4">
        <Chave
          rotulo="Modo estande ligado"
          ligado={!!visao.ativo}
          aoTrocar={(v) => fazer({ acao: "ligar-modo", ativo: v })}
          ajuda="Ligado: uma ligação por vez, com fila, nome e placar na TV. Desligado: cada pessoa conversa com a Vó no próprio celular. Desligar esvazia a fila, mas mantém os placares."
        />
      </section>

      <section className="mt-5 rounded-2xl border-2 border-tinta bg-white p-4" aria-live="polite">
        <h2 className="font-display text-2xl font-extrabold">Ligação</h2>

        {!c && (
          <>
            <p className="mt-1 text-noite/70">Nenhuma ligação agora.</p>
            <button
              onClick={() => fazer({ acao: "liberar" })}
              disabled={!proximo}
              className="mt-3 w-full rounded-2xl bg-faixa px-5 py-5 font-display text-2xl font-extrabold text-noite disabled:bg-noite/10 disabled:text-noite/40"
            >
              {proximo ? `Liberar a próxima ligação: ${proximo.nome}` : "Fila vazia"}
            </button>
          </>
        )}

        {c?.fase === "chamando" && (
          <>
            <p className="mt-1 text-xl">
              Esperando <strong>{c.nome}</strong> tocar em Ligar ({Math.max(0, Math.ceil((c.expira - agora) / 1000))} s).
            </p>
            <button onClick={() => fazer({ acao: "encerrar" })} className="mt-3 rounded-xl border-2 border-golpe px-4 py-2 font-bold text-golpe">
              Cancelar e passar a vez
            </button>
          </>
        )}

        {c?.fase === "ativa" && (
          <>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-xl">
                <strong>{c.nome}</strong> está na ligação · {c.tecnicas.length} de 9 truques
              </p>
              <p className="font-display text-4xl font-extrabold tabular-nums text-tinta">{minutos((c.fim - agora) / 1000)}</p>
            </div>
            <p className="mt-1 text-sm text-noite/70">
              {TECNICAS.filter((t) => c.tecnicas.includes(t.id))
                .map((t) => t.nome)
                .join(", ") || "Nenhum truque ainda"}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {c.falas.slice(-4).map((f, i) => (
                <li key={i} className={f.de === "vovo" ? "text-noite" : "text-tinta"}>
                  <strong>{f.de === "vovo" ? "Vó" : c.nome}:</strong> {f.texto}
                </li>
              ))}
            </ul>
            <button onClick={() => fazer({ acao: "encerrar" })} className="mt-3 rounded-xl border-2 border-golpe px-4 py-2 font-bold text-golpe">
              Encerrar a ligação agora
            </button>
          </>
        )}
      </section>

      <section className="mt-5 rounded-2xl border-2 border-noite/15 bg-white p-4">
        <h2 className="font-display text-2xl font-extrabold">Fila ({visao.filaCompleta?.length || 0})</h2>
        <ol className="mt-2 divide-y divide-noite/10">
          {(visao.filaCompleta || []).map((p, i) => {
            const sumiu = agora - p.visto > 60_000;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-7 font-display font-extrabold">{i + 1}º</span>
                <span className="min-w-0 flex-1 truncate text-lg font-bold">{p.nome}</span>
                <span className={`text-sm ${sumiu ? "text-alerta" : "text-noite/60"}`}>{sumiu ? `celular parado há ${Math.round((agora - p.visto) / 60_000)} min` : `espera há ${minutos((agora - p.entrou) / 1000)}`}</span>
                <button onClick={() => fazer({ acao: "liberar", id: p.id })} disabled={!!c} className="rounded-lg border-2 border-tinta px-2 py-1 text-sm font-bold text-tinta disabled:opacity-40">
                  Chamar
                </button>
                <button onClick={() => fazer({ acao: "tirar-da-fila", id: p.id })} className="rounded-lg border-2 border-noite/30 px-2 py-1 text-sm font-bold">
                  Tirar
                </button>
              </li>
            );
          })}
          {!visao.filaCompleta?.length && <li className="py-2 text-noite/60">Ninguém na fila.</li>}
        </ol>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border-2 border-noite/15 bg-white p-4">
          <h2 className="font-display text-xl font-extrabold">Placar da Vó</h2>
          <ol className="mt-2 space-y-1">
            {(visao.placarVovoCompleto || []).map((l, i) => (
              <li key={l.id} className="flex items-center gap-2">
                <span className="w-6 font-bold">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                <span className="font-bold tabular-nums">
                  {l.truques}/9 · {minutos(l.duracaoS)}
                </span>
                <button onClick={() => fazer({ acao: "tirar-do-placar", placar: "vovo", id: l.id })} aria-label={`Remover ${l.nome} do placar da Vó`} className="rounded border border-noite/30 px-2 text-sm">
                  remover
                </button>
              </li>
            ))}
            {!visao.placarVovoCompleto?.length && <li className="text-noite/60">Vazio.</li>}
          </ol>
        </section>
        <section className="rounded-2xl border-2 border-noite/15 bg-white p-4">
          <h2 className="font-display text-xl font-extrabold">Placar do quiz</h2>
          <ol className="mt-2 space-y-1">
            {(visao.placarQuizCompleto || []).map((l, i) => (
              <li key={l.id} className="flex items-center gap-2">
                <span className="w-6 font-bold">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                <span className="font-bold tabular-nums">
                  {l.pontos} · {l.tentativas}/3
                </span>
                <button onClick={() => fazer({ acao: "tirar-do-placar", placar: "quiz", id: l.id })} aria-label={`Remover ${l.nome} do placar do quiz`} className="rounded border border-noite/30 px-2 text-sm">
                  remover
                </button>
              </li>
            ))}
            {!visao.placarQuizCompleto?.length && <li className="text-noite/60">Vazio.</li>}
          </ol>
          <p className="mt-2 text-sm text-noite/60">Remover alguém do quiz também devolve as 3 tentativas.</p>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border-2 border-noite/15 bg-white p-4">
        <h2 className="font-display text-xl font-extrabold">Ajustes</h2>
        <p className="mt-2 font-bold">Tempo de cada ligação</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {DURACOES.map((d) => (
            <button
              key={d}
              onClick={() => fazer({ acao: "configurar", duracaoS: d })}
              aria-pressed={visao.config.duracaoS === d}
              className={`rounded-xl border-2 px-3 py-2 font-bold ${visao.config.duracaoS === d ? "border-tinta bg-tinta text-white" : "border-noite/30"}`}
            >
              {minutos(d)}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Chave
            rotulo="Eu aprovo cada ligação"
            ligado={visao.config.aprovacaoManual}
            aoTrocar={(v) => fazer({ acao: "configurar", aprovacaoManual: v })}
            ajuda="Ligado: a próxima pessoa só liga quando você tocar em Liberar. Desligado: a fila anda sozinha."
          />
          <Chave
            rotulo="Tocar a voz também no celular de quem liga"
            ligado={visao.config.somNoCelular}
            aoTrocar={(v) => fazer({ acao: "configurar", somNoCelular: v })}
            ajuda="Deixe desligado quando a voz sai na TV ou na caixa de som, para não dar eco no microfone."
          />
          <Chave
            rotulo="Modo econômico de voz"
            ligado={visao.config.economico !== false}
            aoTrocar={(v) => fazer({ acao: "configurar", economico: v })}
            ajuda="Ligado: quando a pessoa usa um truque conhecido, a Vó responde com uma fala já gravada, que sai na hora e não gasta crédito. Ela só improvisa (e gasta crédito) no que sai do roteiro. Desligado: a Vó improvisa em toda resposta."
          />
        </div>
        <div className="mt-3 border-t border-noite/10 pt-3">
          <p className="font-bold">Voz usada nas respostas</p>
          <p className="mt-1 text-sm text-noite/80">
            Falas gravadas (grátis): <strong>{voz.gravadas}</strong> · Geradas na hora: <strong>{voz.aoVivo}</strong> ({voz.caracteres} caracteres, cerca de{" "}
            <strong>{Math.round(voz.caracteres * CREDITOS_POR_CARACTERE)} créditos</strong> da ElevenLabs) · Voz do navegador: <strong>{voz.navegador}</strong>
          </p>
          <p className="mt-1 text-sm text-noite/70">
            Os créditos são uma estimativa. O saldo de verdade aparece no site da ElevenLabs.
            {voz.navegador > 0 && " Voz do navegador quer dizer que a ElevenLabs não respondeu (crédito ou conexão)."}
          </p>
          <button onClick={() => fazer({ acao: "zerar-contagem-de-voz" })} className="mt-2 rounded-xl border-2 border-noite/30 px-3 py-2 text-sm font-bold">
            Zerar esta contagem
          </button>
        </div>
        <div className="mt-3 border-t border-noite/10 pt-3">
          <p className="font-bold">Microfone de quem liga</p>
          {micPelaIA ? (
            <p className="mt-1 text-sm text-noite/80">A IA transcreve a fala no servidor (aguenta melhor o barulho do estande).</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-noite/80">
                A IA não está transcrevendo agora (sem cota ou sem chave do Gemini). Os celulares usam o reconhecimento de voz do próprio navegador, ou o
                teclado.
              </p>
              <button onClick={() => fazer({ acao: "testar-microfone" })} className="mt-2 rounded-xl border-2 border-noite/30 px-3 py-2 text-sm font-bold">
                Tentar a IA de novo
              </button>
            </>
          )}
        </div>
        <div className="mt-3 border-t border-noite/10 pt-3">
          <p className="font-bold">Contas de voz (ElevenLabs)</p>
          {!(visao.contasDeVoz || []).length && <p className="mt-1 text-sm text-noite/80">Nenhuma conta configurada. A Vó usa as falas gravadas e a voz do navegador.</p>}
          <ul className="mt-1 space-y-1 text-sm">
            {(visao.contasDeVoz || []).map((c) => (
              <li key={c.n} className={c.pausa && c.pausa.motivo !== "ocupada" ? "text-golpe" : "text-noite/85"}>
                <strong>Conta {c.n}</strong>:{" "}
                {c.pausa ? `parada (${c.pausa.motivo}) até ${hora(c.pausa.ate)}` : c.caracteresHoje >= c.teto ? "chegou no teto do dia" : "funcionando"}
                {" · "}
                {c.saldo
                  ? `${Math.max(0, c.saldo.limite - c.saldo.usados).toLocaleString("pt-BR")} créditos sobrando`
                  : `${c.caracteresHoje.toLocaleString("pt-BR")} caracteres hoje`}
                {!c.vozPropria && " · usa a voz da conta 1"}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm text-noite/70">A Vó usa a conta 1 até ela parar, depois a 2, e assim por diante. A voz pode mudar um pouco na troca.</p>
          <p className="mt-2 font-bold">Chaves de IA</p>
          <ul className="mt-1 space-y-1 text-sm">
            {(visao.chavesDeIA || []).map((k) => (
              <li key={`${k.provedor}-${k.n}`} className={k.parada ? "text-golpe" : "text-noite/85"}>
                <strong>
                  {k.provedor === "gemini" ? "Gemini" : "Claude"} {k.n}
                </strong>
                : {k.pausas.length ? k.pausas.map((p) => `${p.modelo} parado (${p.motivo}) até ${hora(p.ate)}`).join("; ") : "funcionando"}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={testarContas}
              disabled={testando || !(visao.contasDeVoz || []).length}
              className="rounded-xl bg-tinta px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {testando ? "Testando…" : "Testar cada conta"}
            </button>
            <button onClick={() => fazer({ acao: "tentar-vozes" })} className="rounded-xl border-2 border-noite/30 px-3 py-2 text-sm font-bold">
              Tentar as contas de voz de novo
            </button>
          </div>
          <p className="mt-1 text-sm text-noite/70">O teste pede &quot;Alô?&quot; a cada conta (cerca de 3 créditos por conta).</p>
          {teste && (
            <ul aria-live="polite" className="mt-2 space-y-1 rounded-lg bg-noite/5 p-2 text-sm">
              {teste.map((t) => (
                <li key={t.n} className={t.ok ? "text-noite" : "font-bold text-golpe"}>
                  Conta {t.n}: {t.ok ? `falou em ${(t.ms / 1000).toFixed(1).replace(".", ",")} s` : t.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 border-t border-noite/10 pt-3">
          {!confirmar ? (
            <button onClick={() => setConfirmar(true)} className="rounded-xl border-2 border-golpe px-4 py-2 font-bold text-golpe">
              Zerar os dois placares
            </button>
          ) : (
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-bold">Apagar todos os nomes e pontos?</span>
              <button
                onClick={() => {
                  setConfirmar(false);
                  fazer({ acao: "zerar-placares" });
                }}
                className="rounded-xl bg-golpe px-4 py-2 font-bold text-white"
              >
                Sim, zerar
              </button>
              <button onClick={() => setConfirmar(false)} className="rounded-xl border-2 border-noite/30 px-4 py-2 font-bold">
                Cancelar
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
