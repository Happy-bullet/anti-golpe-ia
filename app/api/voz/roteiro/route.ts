import { NextResponse } from "next/server";
import { todasAsFalasFixas } from "@/lib/falas-fixas";
import { limparParaVoz, nomeDoArquivo, urlDeGravacao, vozConfigurada } from "@/lib/voz-ia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista as falas fixas com o endereço para gravar cada uma em alta qualidade.
// Usado só pelo script scripts/gravar-falas.mjs. As falas já são públicas (estão no código),
// então a lista não expõe nada; a chave continua só no servidor.
export async function GET() {
  if (!vozConfigurada()) {
    return NextResponse.json({ erro: "Configure ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID na Vercel." }, { status: 503 });
  }
  const falas = todasAsFalasFixas().map((texto) => {
    const limpo = limparParaVoz(texto);
    return { texto: limpo, arquivo: `/falas/${nomeDoArquivo(limpo)}.mp3`, gravar: urlDeGravacao(limpo) };
  });
  return NextResponse.json({ voz: process.env.ELEVENLABS_VOICE_ID, falas }, { headers: { "cache-control": "no-store" } });
}
