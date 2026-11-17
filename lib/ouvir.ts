// Transcreve o que a pessoa falou no microfone do celular durante a ligação.
// O estande é barulhento, então o pedido ao modelo é explícito: escrever só a voz que está
// perto do microfone e ignorar as conversas de fundo. Se não houver fala próxima, devolve "".
// O áudio é usado só para essa transcrição e não é guardado.

import { pedirJSON } from "./ia";
import { reservarChamadaIA } from "./limite";
import { PEDIDO_OUVIR, SISTEMA_OUVIR } from "./ouvir-pedido.mjs";

const MAX_BASE64 = 1_400_000; // cerca de 30 s de WAV 16 kHz mono

export async function transcrever(base64: string, mime = "audio/wav"): Promise<string> {
  if (!base64 || base64.length > MAX_BASE64) throw new Error("Áudio vazio ou longo demais.");
  if (!reservarChamadaIA()) throw new Error("Teto diário de IA atingido.");
  // Se a transcrição passar de 10 s, desiste: o celular cai no reconhecimento de voz do navegador ou no teclado.
  const demorou = new Promise<never>((_, falhar) => setTimeout(() => falhar(new Error("transcrição demorou demais")), 10_000));
  const { dados } = await Promise.race([demorou, pedirJSON({
    sistema: SISTEMA_OUVIR,
    pedido: PEDIDO_OUVIR,
    audio: { base64, mime },
    maxTokens: 400,
    temperatura: 0,
    raciocinio: "minimal",
  })]);
  return String(dados.texto || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
