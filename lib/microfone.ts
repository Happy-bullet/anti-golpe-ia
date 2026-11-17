// Microfone do celular para a ligação com a Vó, pensado para um estande barulhento.
// O que é feito para pegar só quem está com o celular na mão:
// 1. A pessoa segura o botão para falar: fora disso nada é gravado.
// 2. O navegador é pedido para cancelar eco e ruído e isolar a voz (onde existe), SEM ganho
//    automático, porque o ganho automático aumenta as conversas de fundo nos silêncios.
// 3. Filtro que corta os graves (ronco do ambiente) e um "portão" que abaixa tudo que for bem
//    mais fraco que a voz principal. Quem está a 10 cm do microfone é muito mais forte que o fundo.
// 4. O áudio vira WAV 16 kHz mono e vai para o servidor, que transcreve só a voz próxima.
// Se o nível for baixo demais, nem envia: pede para a pessoa falar mais perto.

export interface Gravacao {
  base64: string;
  segundos: number;
  /** Nível da voz principal antes de normalizar (0 a 1). Abaixo de NIVEL_MINIMO não houve fala próxima. */
  nivel: number;
}

export const NIVEL_MINIMO = 0.006;
const TAXA = 16000;
const QUADRO = 320; // 20 ms
const MAX_SEGUNDOS = 15;

type ClasseAudio = typeof AudioContext;

function classeDeAudio(): ClasseAudio | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: ClasseAudio; webkitAudioContext?: ClasseAudio };
  return w.AudioContext || w.webkitAudioContext || null;
}

export function temMicrofone(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!classeDeAudio();
}

function reduzir(entrada: Float32Array, taxaOrigem: number): Float32Array {
  if (taxaOrigem === TAXA) return entrada;
  const passo = taxaOrigem / TAXA;
  const saida = new Float32Array(Math.floor(entrada.length / passo));
  for (let i = 0; i < saida.length; i++) {
    const ini = Math.floor(i * passo);
    const fim = Math.min(entrada.length, Math.floor((i + 1) * passo));
    let soma = 0;
    for (let j = ini; j < fim; j++) soma += entrada[j];
    saida[i] = soma / Math.max(1, fim - ini);
  }
  return saida;
}

/** Abaixa o fundo, corta o silêncio das pontas e normaliza o volume. Exportada para teste. */
export function tratar(amostras: Float32Array): { audio: Float32Array; nivel: number } {
  const quadros = Math.floor(amostras.length / QUADRO);
  if (quadros < 5) return { audio: amostras, nivel: 0 };
  const forca = new Float32Array(quadros);
  for (let q = 0; q < quadros; q++) {
    let soma = 0;
    for (let i = q * QUADRO; i < (q + 1) * QUADRO; i++) soma += amostras[i] * amostras[i];
    forca[q] = Math.sqrt(soma / QUADRO);
  }
  const ordenado = Array.from(forca).sort((a, b) => a - b);
  const nivel = ordenado[Math.floor(ordenado.length * 0.92)];
  const limiar = nivel * 0.22;

  // Portão com folga: abre 60 ms antes da voz e segura 240 ms depois, para não comer sílaba.
  const aberto = new Uint8Array(quadros);
  for (let q = 0; q < quadros; q++) {
    if (forca[q] >= limiar) for (let k = Math.max(0, q - 3); k <= Math.min(quadros - 1, q + 12); k++) aberto[k] = 1;
  }
  let primeiro = aberto.indexOf(1);
  let ultimo = aberto.lastIndexOf(1);
  if (primeiro < 0) return { audio: amostras, nivel };
  primeiro = Math.max(0, primeiro - 5);
  ultimo = Math.min(quadros - 1, ultimo + 5);

  const saida = new Float32Array((ultimo - primeiro + 1) * QUADRO);
  let ganho = aberto[primeiro] ? 1 : 0.12;
  let pico = 0;
  for (let q = primeiro; q <= ultimo; q++) {
    const alvo = aberto[q] ? 1 : 0.12;
    for (let i = 0; i < QUADRO; i++) {
      ganho += (alvo - ganho) * 0.02;
      const v = amostras[q * QUADRO + i] * ganho;
      saida[(q - primeiro) * QUADRO + i] = v;
      if (Math.abs(v) > pico) pico = Math.abs(v);
    }
  }
  const volume = pico > 0 ? Math.min(12, 0.89 / pico) : 1;
  for (let i = 0; i < saida.length; i++) saida[i] *= volume;
  return { audio: saida, nivel };
}

function paraWavBase64(amostras: Float32Array): string {
  const bytes = new Uint8Array(44 + amostras.length * 2);
  const v = new DataView(bytes.buffer);
  const escrever = (pos: number, texto: string) => {
    for (let i = 0; i < texto.length; i++) v.setUint8(pos + i, texto.charCodeAt(i));
  };
  escrever(0, "RIFF");
  v.setUint32(4, 36 + amostras.length * 2, true);
  escrever(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, TAXA, true);
  v.setUint32(28, TAXA * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  escrever(36, "data");
  v.setUint32(40, amostras.length * 2, true);
  for (let i = 0; i < amostras.length; i++) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

export class Microfone {
  private fluxo: MediaStream | null = null;
  private contexto: AudioContext | null = null;
  private pedacos: Float32Array[] = [];
  private gravando = false;
  private amostras = 0;
  /** Nível instantâneo (0 a 1), para o medidor na tela. */
  nivelAgora = 0;

  get pronto() {
    return !!this.contexto;
  }

  /** Pede o microfone. Chame dentro de um toque da pessoa (exigência dos navegadores). */
  async preparar(): Promise<void> {
    if (this.contexto) return;
    const Classe = classeDeAudio();
    if (!Classe || !navigator.mediaDevices?.getUserMedia) throw new Error("sem microfone");
    this.fluxo = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1, voiceIsolation: true } as MediaTrackConstraints,
    });
    const contexto = new Classe();
    await contexto.resume().catch(() => {});
    const fonte = contexto.createMediaStreamSource(this.fluxo);
    const graves = contexto.createBiquadFilter();
    graves.type = "highpass";
    graves.frequency.value = 140;
    const agudos = contexto.createBiquadFilter();
    agudos.type = "lowpass";
    agudos.frequency.value = 6500;
    const leitor = contexto.createScriptProcessor(4096, 1, 1);
    leitor.onaudioprocess = (ev) => {
      const dados = ev.inputBuffer.getChannelData(0);
      let soma = 0;
      for (let i = 0; i < dados.length; i += 8) soma += dados[i] * dados[i];
      this.nivelAgora = Math.sqrt(soma / (dados.length / 8));
      if (!this.gravando) return;
      this.pedacos.push(new Float32Array(dados));
      this.amostras += dados.length;
      if (this.amostras > contexto.sampleRate * MAX_SEGUNDOS) this.gravando = false;
    };
    const mudo = contexto.createGain();
    mudo.gain.value = 0;
    fonte.connect(graves).connect(agudos).connect(leitor).connect(mudo).connect(contexto.destination);
    this.contexto = contexto;
  }

  iniciar() {
    this.pedacos = [];
    this.amostras = 0;
    this.gravando = true;
    this.contexto?.resume().catch(() => {});
  }

  /** Para de gravar e devolve o áudio tratado, ou null se foi curto demais. */
  parar(): Gravacao | null {
    this.gravando = false;
    const contexto = this.contexto;
    if (!contexto || !this.amostras) return null;
    const tudo = new Float32Array(this.amostras);
    let pos = 0;
    for (const p of this.pedacos) {
      tudo.set(p, pos);
      pos += p.length;
    }
    this.pedacos = [];
    this.amostras = 0;
    const bruto = reduzir(tudo, contexto.sampleRate);
    if (bruto.length < TAXA * 0.4) return null;
    const { audio, nivel } = tratar(bruto);
    return { base64: paraWavBase64(audio), segundos: audio.length / TAXA, nivel };
  }

  soltar() {
    this.gravando = false;
    this.fluxo?.getTracks().forEach((t) => t.stop());
    this.contexto?.close().catch(() => {});
    this.fluxo = null;
    this.contexto = null;
  }
}
