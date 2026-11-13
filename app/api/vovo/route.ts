import { NextResponse } from "next/server";
import { responderVovo } from "@/lib/vovo";
import { dentroDoLimite, ipDoPedido } from "@/lib/limite";
import type { FalaVovo } from "@/lib/tipos";

export const runtime = "nodejs";
export const maxDuration = 45;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!dentroDoLimite(`vovo:${ipDoPedido(req)}`, 30)) {
    return NextResponse.json({ erro: "A Vó Zilda precisa de um minutinho pra respirar. Tente de novo já já." }, { status: 429 });
  }

  let corpo: { historico?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Não consegui ler o pedido." }, { status: 400 });
  }

  const historico: FalaVovo[] = Array.isArray(corpo?.historico)
    ? corpo.historico
        .filter((f): f is { de: string; texto: string } => !!f && typeof f === "object" && typeof (f as FalaVovo).texto === "string")
        .map((f) => ({ de: f.de === "vovo" ? ("vovo" as const) : ("golpista" as const), texto: f.texto.slice(0, 400) }))
        .slice(-24)
    : [];

  if (!historico.some((f) => f.de === "golpista" && f.texto.trim())) {
    return NextResponse.json({ erro: "Escreva alguma coisa para a Vó Zilda." }, { status: 400 });
  }

  const resposta = await responderVovo(historico);
  return NextResponse.json(resposta, { headers: { "cache-control": "no-store" } });
}
