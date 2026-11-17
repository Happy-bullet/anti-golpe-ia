import { NextResponse } from "next/server";
import {
  atender, avancar, desligar, entrarNaFila, iniciarQuiz, liberar, ocupar, ouvirPausado, registrarFalaDoGolpista, registrarFalhaAoOuvir, registrarOuvirOk,
  registrarQuiz, registrarResposta, sairDaFila, visao,
} from "@/lib/estande.mjs";
import { mudarEstado, tipoDeBanco } from "@/lib/armazem";
import { abertura, despedida, estadoAtual, pidValido } from "@/lib/estande-servidor";
import { responderVovo } from "@/lib/vovo";
import { transcrever } from "@/lib/ouvir";
import { audioDisponivel } from "@/lib/ia";
import { CARTAS, RODADAS, SEGUNDOS_POR_CARTA } from "@/lib/jogo";
import { dentroDoLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 45;
export const dynamic = "force-dynamic";

const SEM_CACHE = { "cache-control": "no-store" };
const responder = (corpo: unknown, status = 200) => NextResponse.json(corpo, { status, headers: SEM_CACHE });

/** A visão do estado, mais o aviso de que este servidor não consegue transcrever (sem chave ou sem cota do Gemini). */
async function visaoDe(e: Parameters<typeof visao>[0], pid: string) {
  const v = visao(e, pid, Date.now());
  return { ...v, ouvirPausado: v.ouvirPausado || !(await audioDisponivel()) };
}

// GET /api/estande?pid=...  -> o que o celular e a TV mostram (perguntam a cada 1 ou 2 segundos)
export async function GET(req: Request) {
  if (tipoDeBanco() === "nenhum") return responder({ ativo: false, semBanco: true });
  const pid = new URL(req.url).searchParams.get("pid") || "";
  try {
    const e = await estadoAtual(pidValido(pid) ? pid : "");
    return responder(await visaoDe(e, pidValido(pid) ? pid : ""));
  } catch (erro) {
    console.error("[anti-golpe] estande GET:", erro instanceof Error ? erro.message : erro);
    return responder({ ativo: false, erro: "Estado do estande indisponível." }, 503);
  }
}

interface Corpo {
  acao?: string;
  pid?: string;
  nome?: string;
  texto?: string;
  audio?: string;
  respostas?: { id?: number; golpe?: boolean | null; resta?: number }[];
}

/** Recalcula a pontuação do quiz no servidor, para ninguém mandar um número inventado. */
function pontuar(respostas: Corpo["respostas"]) {
  const vistos = new Set<number>();
  let pontos = 0;
  let acertos = 0;
  for (const r of (Array.isArray(respostas) ? respostas : []).slice(0, RODADAS)) {
    const carta = CARTAS.find((c) => c.id === r?.id);
    if (!carta || vistos.has(carta.id)) continue;
    vistos.add(carta.id);
    if (r.golpe === carta.golpe) {
      acertos++;
      pontos += 100 + Math.max(0, Math.min(SEGUNDOS_POR_CARTA, Math.floor(Number(r.resta) || 0))) * 5;
    }
  }
  return { pontos, acertos };
}

export async function POST(req: Request) {
  if (tipoDeBanco() === "nenhum") return responder({ erro: "O modo estande não está configurado." }, 503);
  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return responder({ erro: "Não consegui ler o pedido." }, 400);
  }
  const pid = corpo.pid;
  if (!pidValido(pid)) return responder({ erro: "Participante inválido." }, 400);
  if (!dentroDoLimite(`estande:${pid}`, 90)) return responder({ erro: "Calma, um pedido de cada vez." }, 429);

  const agora = Date.now();
  const resposta = async (e: Parameters<typeof visao>[0], extra: Record<string, unknown> = {}, status = 200) =>
    responder({ ...(await visaoDe(e, pid)), ...extra }, status);

  try {
    switch (corpo.acao) {
      case "entrar": {
        const { estado, retorno } = await mudarEstado((e) => {
          avancar(e, agora, despedida);
          return entrarNaFila(e, pid, corpo.nome, agora);
        });
        return resposta(estado, retorno.ok ? {} : { erro: retorno.erro }, retorno.ok ? 200 : 422);
      }
      case "sair": {
        const { estado } = await mudarEstado((e) => sairDaFila(e, pid));
        return resposta(estado);
      }
      case "atender": {
        const { estado, retorno } = await mudarEstado((e) => {
          avancar(e, agora, despedida);
          return atender(e, pid, agora, abertura());
        });
        return resposta(estado, retorno.ok ? {} : { erro: retorno.erro }, retorno.ok ? 200 : 409);
      }
      case "desligar": {
        const { estado } = await mudarEstado((e) => desligar(e, pid, agora, despedida));
        return resposta(estado);
      }
      case "falar": {
        const vez = await mudarEstado((e) => {
          avancar(e, agora, despedida);
          return ocupar(e, pid, agora);
        });
        if (!vez.retorno.ok) return resposta(vez.estado, { erro: vez.retorno.erro }, 409);
        const cid = vez.retorno.cid!;

        let texto = String(corpo.texto || "").replace(/\s+/g, " ").trim().slice(0, 300);
        let falhaAoOuvir = false;
        let tentouOuvir = false;
        if (!texto && corpo.audio) {
          // Transcrição em pausa (cota da IA acabou ou falhou duas vezes): nem tenta, o celular usa o microfone do navegador.
          if (ouvirPausado(vez.estado, agora) || !(await audioDisponivel())) falhaAoOuvir = true;
          else {
            tentouOuvir = true;
            try {
              texto = await transcrever(corpo.audio);
            } catch (erro) {
              falhaAoOuvir = true;
              console.error("[anti-golpe] transcrição falhou:", erro instanceof Error ? erro.message : erro);
            }
          }
        }
        if (!texto) {
          const semCota = falhaAoOuvir && tentouOuvir && !(await audioDisponivel());
          const { estado } = await mudarEstado((e) => {
            liberar(e, cid);
            if (falhaAoOuvir && tentouOuvir) registrarFalhaAoOuvir(e, Date.now(), semCota);
          });
          return resposta(estado, { erro: falhaAoOuvir ? "ouvir-falhou" : "nao-ouvi" }, 422);
        }

        const fala = await mudarEstado((e) => {
          if (tentouOuvir) registrarOuvirOk(e);
          return registrarFalaDoGolpista(e, cid, texto);
        });
        if (!fala.retorno.ok) return resposta(fala.estado, { erro: "A ligação terminou." }, 409);
        const r = await responderVovo(fala.retorno.historico, {
          curta: true,
          economica: fala.estado.config.economico !== false,
          tecnicasJaUsadas: fala.estado.chamada?.tecnicas || [],
          semente: cid,
        });
        const fim = await mudarEstado((e) => registrarResposta(e, cid, r, Date.now(), despedida));
        return resposta(fim.estado, { ouvido: texto, novas: fim.retorno.novas });
      }
      case "quiz-iniciar": {
        const { estado, retorno } = await mudarEstado((e) => (e.ativo ? iniciarQuiz(e, pid, corpo.nome, agora) : { ok: false, erro: "O modo estande está desligado." }));
        return resposta(estado, retorno, retorno.ok ? 200 : 422);
      }
      case "quiz-fim": {
        const { pontos, acertos } = pontuar(corpo.respostas);
        const { estado, retorno } = await mudarEstado((e) => registrarQuiz(e, pid, pontos, acertos, agora));
        return resposta(estado, { ...retorno, pontos, acertos }, retorno.ok ? 200 : 409);
      }
      default:
        return responder({ erro: "Ação desconhecida." }, 400);
    }
  } catch (erro) {
    console.error("[anti-golpe] estande POST:", erro instanceof Error ? erro.message : erro);
    return responder({ erro: "O estande está sem conexão com o banco. Tente de novo." }, 503);
  }
}
