// Voz no navegador. Três camadas, da melhor para a reserva:
// 1. MP3 da Vó Zilda (gravado em /public/falas ou gerado pela ElevenLabs em /api/voz).
// 2. Se o MP3 não chegar a tempo ou não tocar, a melhor voz em português que o aparelho tiver.
// 3. Se o aparelho não tiver voz nenhuma, o texto continua na tela (os botões de voz somem).
// Também ouve o microfone (reconhecimento de fala), quando o navegador deixa.

import gravadas from "./falas-gravadas.json";

const MAPA_GRAVADAS: Record<string, string> = (gravadas as { falas?: Record<string, string> }).falas || {};
const TEMPO_PARA_BAIXAR_MS = 7000;
// 10 ms de silêncio: tocado no primeiro toque da pessoa para o iPhone liberar o áudio depois.
const SILENCIO =
  "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

export function podeFalar(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

/** Arquivo gravado de uma fala fixa, se existir. */
export function arquivoGravado(texto: string): string | null {
  return MAPA_GRAVADAS[texto.replace(/\s+/g, " ").trim()] || null;
}

// ---------- voz do próprio aparelho (reserva) ----------

function normalizarLingua(l: string) {
  return l.replace("_", "-").toLowerCase();
}

/** Escolhe a voz mais natural em português do Brasil. Vozes "Natural"/"Online" (Edge, Chrome) soam bem melhor. */
function melhorVoz(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const vozes = window.speechSynthesis.getVoices();
  const br = vozes.filter((v) => normalizarLingua(v.lang) === "pt-br");
  const lista = br.length ? br : vozes.filter((v) => normalizarLingua(v.lang).startsWith("pt"));
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  const nota = (v: SpeechSynthesisVoice) => {
    let n = 0;
    if (/natural|neural|premium|enhanced|aprimorad/i.test(v.name)) n += 4;
    if (/francisca|thalita|luciana|camila|vit[oó]ria|fernanda|leila|yara|google/i.test(v.name)) n += 2;
    if (/daniel|ant[oô]nio|felipe|donato|fabio|f[aá]bio|julio|j[uú]lio|humberto|male\b/i.test(v.name)) n -= 2;
    if (!v.localService) n += online ? 1 : -10; // vozes de rede são melhores, mas não funcionam sem internet
    return n;
  };
  return [...lista].sort((a, b) => nota(b) - nota(a))[0];
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // No Chrome a lista de vozes chega atrasada; pedir uma vez já deixa pronta.
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
}

function falarNoAparelho(texto: string, velocidade = 0.95, tom = 1): Promise<void> {
  return new Promise((pronto) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return pronto();
    const sintese = window.speechSynthesis;
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = velocidade;
    fala.pitch = tom;
    const voz = melhorVoz();
    if (voz) fala.voice = voz;
    let terminou = false;
    const fim = () => {
      if (terminou) return;
      terminou = true;
      clearTimeout(seguranca);
      pronto();
    };
    // Alguns navegadores nunca avisam o fim da fala; este relógio evita a fila travar.
    const seguranca = setTimeout(fim, 4000 + texto.length * 110);
    fala.onend = fim;
    fala.onerror = fim;
    sintese.speak(fala);
  });
}

/** Lê um texto com a voz do aparelho (usado no resultado da análise e no modo fácil). */
export function falar(texto: string, opcoes: { velocidade?: number; tom?: number; aoTerminar?: () => void } = {}) {
  pararFala();
  falarNoAparelho(texto, opcoes.velocidade ?? 0.95, opcoes.tom ?? 1).then(() => opcoes.aoTerminar?.());
}

// ---------- tocador de MP3 com fila ----------

let elemento: HTMLAudioElement | null = null;
let geracao = 0;
let fila: Promise<void> = Promise.resolve();
let ultimaFonte: "mp3" | "aparelho" | "" = "";

function tocador(): HTMLAudioElement {
  if (!elemento) {
    elemento = new Audio();
    elemento.preload = "auto";
  }
  return elemento;
}

/** Chame dentro de um clique/toque: libera o áudio no iPhone e no Chrome do Android. */
export function destravarAudio() {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  const el = tocador();
  if (el.dataset.destravado) return;
  el.muted = true;
  el.src = SILENCIO;
  el.play()
    .then(() => {
      el.pause();
      el.dataset.destravado = "1";
    })
    .catch(() => {})
    .finally(() => {
      el.muted = false;
    });
  // O iOS também só libera a síntese de voz depois de um toque.
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

async function baixar(url: string): Promise<string> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_PARA_BAIXAR_MS);
  try {
    const r = await fetch(url, { signal: controle.signal });
    if (!r.ok) throw new Error(`áudio ${r.status}`);
    const blob = await r.blob();
    if (blob.size < 500) throw new Error("áudio vazio");
    return URL.createObjectURL(blob);
  } finally {
    clearTimeout(relogio);
  }
}

function tocarArquivo(src: string, minhaGeracao: number): Promise<void> {
  return new Promise((pronto, falhou) => {
    if (minhaGeracao !== geracao) return pronto();
    const el = tocador();
    el.onended = () => pronto();
    el.onerror = () => falhou(new Error("não tocou"));
    el.src = src;
    el.play().catch(falhou);
  });
}

/**
 * A Vó Zilda fala. Toca o MP3 (se houver) e, se falhar, usa a voz do aparelho.
 * As falas entram numa fila: uma "espera" (hummm...) termina antes da resposta começar.
 * `soGravada`: só fala se existir arquivo pronto (para não soar robótico nas falas de espera).
 */
export function falarVovo(
  texto: string,
  audio?: string | null,
  opcoes: { aoTerminar?: () => void; soGravada?: boolean } = {},
) {
  const minhaGeracao = geracao;
  const fonte = audio || arquivoGravado(texto);
  if (!fonte && opcoes.soGravada) return;
  // Começa a baixar já, em paralelo com o que estiver tocando.
  const baixando = fonte ? baixar(fonte).catch(() => null) : Promise.resolve(null);

  fila = fila
    .then(async () => {
      if (minhaGeracao !== geracao) return;
      const url = await baixando;
      if (minhaGeracao !== geracao) return;
      if (url) {
        try {
          await tocarArquivo(url, minhaGeracao);
          ultimaFonte = "mp3";
          return;
        } catch {
          // segue para a voz do aparelho
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (opcoes.soGravada || minhaGeracao !== geracao) return;
      ultimaFonte = "aparelho";
      await falarNoAparelho(texto, 0.92, 1.1);
    })
    .catch(() => {})
    .finally(() => {
      if (minhaGeracao === geracao) opcoes.aoTerminar?.();
    });
}

/** Qual camada falou por último (para o painel do estande). */
export function fonteDaUltimaFala() {
  return ultimaFonte;
}

export function pararFala() {
  geracao++;
  fila = Promise.resolve();
  if (elemento) {
    elemento.pause();
    elemento.onended = null;
    elemento.onerror = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ---------- microfone ----------

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
