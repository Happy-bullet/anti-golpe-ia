import { NextResponse } from "next/server";
import { analisar } from "@/lib/analisar";
import { provedorAtivo } from "@/lib/ia";
import { dentroDoLimite, ipDoPedido } from "@/lib/limite";
import type { Entrada } from "@/lib/tipos";

export const runtime = "nodejs";
export const maxDuration = 45;
export const dynamic = "force-dynamic";

const MIMES_OK = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PEDIDOS_POR_MINUTO = Number(process.env.LIMITE_POR_MINUTO || 120);

export async function GET() {
  return NextResponse.json({ ok: true, provedor: provedorAtivo() });
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`analisar:${ipDoPedido(req)}`, PEDIDOS_POR_MINUTO)) {
    return NextResponse.json({ erro: "Muitas análises em pouco tempo. Espere um minuto e tente de novo." }, { status: 429 });
  }

  let corpo: Entrada;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Não consegui ler o pedido." }, { status: 400 });
  }

  const texto = typeof corpo?.texto === "string" ? corpo.texto : "";
  const imagem =
    corpo?.imagem && typeof corpo.imagem.base64 === "string" && MIMES_OK.includes(corpo.imagem.mime) ? corpo.imagem : undefined;

  if (!texto.trim() && !imagem) {
    return NextResponse.json({ erro: "Cole uma mensagem ou envie um print." }, { status: 400 });
  }
  if (imagem && imagem.base64.length > 6_000_000) {
    return NextResponse.json({ erro: "A imagem é grande demais. Envie um print menor." }, { status: 413 });
  }

  // Privacidade: nada é salvo. A mensagem é processada e descartada.
  const resultado = await analisar({ texto, imagem, forcarOffline: corpo.forcarOffline === true });
  return NextResponse.json(resultado, { headers: { "cache-control": "no-store" } });
}
