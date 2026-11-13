// Voz no navegador: ler em voz alta (síntese) e ouvir o microfone (reconhecimento).
// Usa só recursos do próprio aparelho; se o navegador não tiver, os botões somem.

export function podeFalar(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function falar(texto: string, opcoes: { velocidade?: number; tom?: number; aoTerminar?: () => void } = {}) {
  if (!podeFalar()) return;
  const sintese = window.speechSynthesis;
  sintese.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = opcoes.velocidade ?? 0.95;
  fala.pitch = opcoes.tom ?? 1;
  const voz = sintese.getVoices().find((v) => v.lang === "pt-BR") || sintese.getVoices().find((v) => v.lang.startsWith("pt"));
  if (voz) fala.voice = voz;
  if (opcoes.aoTerminar) {
    fala.onend = opcoes.aoTerminar;
    fala.onerror = opcoes.aoTerminar;
  }
  sintese.speak(fala);
}

export function pararFala() {
  if (podeFalar()) window.speechSynthesis.cancel();
}

interface Reconhecedor {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function construtor(): (new () => Reconhecedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function podeOuvir(): boolean {
  return !!construtor();
}

/** Ouve uma frase pelo microfone. Devolve uma função para cancelar. */
export function ouvir(aoEntender: (texto: string) => void, aoParar: () => void): () => void {
  const Classe = construtor();
  if (!Classe) {
    aoParar();
    return () => {};
  }
  const r = new Classe();
  r.lang = "pt-BR";
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => {
    const texto = e.results[0]?.[0]?.transcript || "";
    if (texto) aoEntender(texto);
  };
  r.onerror = aoParar;
  r.onend = aoParar;
  try {
    r.start();
  } catch {
    aoParar();
  }
  return () => {
    try {
      r.stop();
    } catch {}
  };
}
