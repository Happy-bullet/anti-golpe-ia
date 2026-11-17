import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { acaoDoAdmin, avancar, visaoAdmin } from "@/lib/estande.mjs";
import { mudarEstado, tipoDeBanco } from "@/lib/armazem";
import { despedida, estadoAtual } from "@/lib/estande-servidor";
import { estadoDasContas, limparPausasDaVoz, problemasDeConfiguracao, vozConfigurada, vozIdInvalido } from "@/lib/voz-ia";
import { audioDisponivel, estadoDasChavesDeIA, limparPausasDaIA, provedoresDisponiveis } from "@/lib/ia";
import { dentroDoLimite, ipDoPedido } from "@/lib/limite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responder = (corpo: unknown, status = 200) => NextResponse.json(corpo, { status, headers: { "cache-control": "no-store" } });

/** A senha vem da variável ESTANDE_SENHA. No computador (sem Vercel) a senha de teste é "estande". */
function conferirSenha(req: Request): NextResponse | null {
  const certa = process.env.ESTANDE_SENHA || (process.env.VERCEL ? "" : "estande");
  if (!certa) return responder({ erro: "Crie a variável ESTANDE_SENHA na Vercel e publique de novo." }, 503);
  const hash = (s: string) => createHash("sha256").update(s).digest();
  if (timingSafeEqual(hash(req.headers.get("x-estande-senha") || ""), hash(certa))) return null;
  if (!dentroDoLimite(`admin-erro:${ipDoPedido(req)}`, 10)) return responder({ erro: "Muitas tentativas. Espere um minuto." }, 429);
  return responder({ erro: "Senha incorreta." }, 401);
}

async function painel(e: Parameters<typeof visaoAdmin>[0], extra: Record<string, unknown> = {}) {
  const [contasDeVoz, chavesDeIA, audioNoServidor] = await Promise.all([estadoDasContas(), estadoDasChavesDeIA(), audioDisponivel()]);
  return {
    ...visaoAdmin(e, Date.now()),
    banco: tipoDeBanco(),
    voz: vozConfigurada(),
    vozIdInvalido: vozIdInvalido(),
    problemasDeVoz: problemasDeConfiguracao(),
    contasDeVoz,
    chavesDeIA,
    ia: provedoresDisponiveis().join(" + ") || "offline",
    audioNoServidor,
    ...extra,
  };
}

export async function GET(req: Request) {
  const barrado = conferirSenha(req);
  if (barrado) return barrado;
  if (tipoDeBanco() === "nenhum") return responder({ ativo: false, banco: "nenhum", erro: "Falta criar o banco Redis (Upstash) na Vercel." });
  try {
    return responder(await painel(await estadoAtual("", 0)));
  } catch (erro) {
    console.error("[anti-golpe] admin:", erro instanceof Error ? erro.message.replace(/Bearer\s+\S+/g, "Bearer ***") : erro);
    return responder({ erro: "Banco fora do ar. Confira a conexão do Redis na Vercel." }, 503);
  }
}

export async function POST(req: Request) {
  const barrado = conferirSenha(req);
  if (barrado) return barrado;
  if (tipoDeBanco() === "nenhum") return responder({ erro: "Falta criar o banco Redis (Upstash) na Vercel." }, 503);
  let corpo: { acao?: string } & Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return responder({ erro: "Não consegui ler o pedido." }, 400);
  }
  try {
    const agora = Date.now();
    if (corpo.acao === "testar-microfone") await limparPausasDaIA();
    if (corpo.acao === "tentar-vozes") await limparPausasDaVoz();
    const { estado, retorno } = await mudarEstado((e) => {
      avancar(e, agora, despedida);
      return acaoDoAdmin(e, String(corpo.acao || ""), corpo, agora, despedida) as { ok: boolean; erro?: string };
    });
    return responder(await painel(estado, retorno.ok ? {} : { erro: retorno.erro }), retorno.ok ? 200 : 409);
  } catch (erro) {
    console.error("[anti-golpe] admin:", erro instanceof Error ? erro.message.replace(/Bearer\s+\S+/g, "Bearer ***") : erro);
    return responder({ erro: "Banco fora do ar. Confira a conexão do Redis na Vercel." }, 503);
  }
}
