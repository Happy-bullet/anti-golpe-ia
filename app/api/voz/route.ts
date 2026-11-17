import { NextResponse } from "next/server";
import { assinaturaValida, ErroDeVoz, MAX_CARACTERES, sintetizar, type Qualidade } from "@/lib/voz-ia";
import { dentroDoLimite, ipDoPedido } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 20;
export const dynamic = "force-dynamic";

// GET /api/voz?t=texto&q=rapida|alta&s=assinatura
// Só funciona com a assinatura que o próprio servidor gerou para uma fala da Vó.
// A resposta pode ficar em cache na CDN para sempre: o mesmo texto + voz dá sempre o mesmo áudio.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const texto = (url.searchParams.get("t") || "").slice(0, MAX_CARACTERES);
  const qualidade: Qualidade = url.searchParams.get("q") === "alta" ? "alta" : "rapida";
  const s = url.searchParams.get("s") || "";

  if (!texto || !assinaturaValida(texto, qualidade, s)) {
    return NextResponse.json({ erro: "Fala não reconhecida." }, { status: 403 });
  }
  if (!dentroDoLimite(`voz:${ipDoPedido(req)}`, 240)) {
    return NextResponse.json({ erro: "Muitas falas seguidas." }, { status: 429 });
  }

  try {
    const audio = await sintetizar(texto, qualidade);
    return new Response(new Uint8Array(audio), {
      headers: {
        "content-type": "audio/mpeg",
        "content-length": String(audio.length),
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    const status = e instanceof ErroDeVoz ? e.status : 503;
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Voz indisponível." },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
