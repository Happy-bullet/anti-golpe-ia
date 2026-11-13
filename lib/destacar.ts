import type { Sinal } from "./tipos";

function escapar(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Devolve o texto em HTML seguro, com os trechos perigosos dentro de <mark class="trecho">. */
export function destacar(texto: string, sinais: Pick<Sinal, "trecho">[]): string {
  let html = escapar(texto);
  const trechos = Array.from(new Set(sinais.map((s) => s.trecho).filter((t): t is string => !!t && t.length > 2)));
  for (const t of trechos.sort((a, b) => b.length - a.length)) {
    const alvo = escapar(t);
    const i = html.toLowerCase().indexOf(alvo.toLowerCase());
    if (i < 0 || /<mark[^>]*>[^<]*$/.test(html.slice(0, i))) continue; // não achou, ou já está dentro de outra marca
    let fim = i + alvo.length;
    while (fim < html.length && /[\p{L}\p{N}]/u.test(html[fim])) fim++; // não corta palavra no meio
    if (html.slice(i, fim).includes("<")) continue;
    html = html.slice(0, i) + `<mark class="trecho">${html.slice(i, fim)}</mark>` + html.slice(fim);
  }
  return html;
}
