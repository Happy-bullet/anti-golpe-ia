import { NextResponse } from "next/server";

// Plano B do "Compartilhar": se o service worker ainda não estiver ativo,
// o texto compartilhado chega aqui e é repassado para a tela de análise pelo endereço.
// (O print só é entregue pelo service worker; aqui vai só o texto.)
export async function POST(req: Request) {
  let texto = "";
  try {
    const dados = await req.formData();
    texto = [dados.get("title"), dados.get("text"), dados.get("url")]
      .filter((x): x is string => typeof x === "string" && !!x)
      .join("\n")
      .slice(0, 1500);
  } catch {}
  const destino = new URL(texto ? `/?texto=${encodeURIComponent(texto)}` : "/", req.url);
  return NextResponse.redirect(destino, 303);
}

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/", req.url), 303);
}
