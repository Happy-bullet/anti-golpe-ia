// Lê as chaves de API das variáveis de ambiente. Aceita várias contas, para a feira não parar quando uma acaba:
//   GEMINI_API_KEY, GEMINI_API_KEY_2 ... GEMINI_API_KEY_10   (também aceita várias chaves na mesma variável, separadas por vírgula)
//   ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID, ELEVENLABS_API_KEY_2 + ELEVENLABS_VOICE_ID_2 ... até _10
// Cada conta da ElevenLabs tem as próprias vozes, então cada chave precisa do ID de uma voz criada naquela conta.
// Sem ELEVENLABS_VOICE_ID_N, a conta N tenta a voz da conta 1 (só funciona se a voz estiver compartilhada com ela).
// Nada aqui devolve a chave para o navegador: as contas são identificadas só pelo número.

export const MAX_CONTAS = 10;

function pedacos(valor) {
  return String(valor || "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Chaves do Gemini, na ordem em que serão tentadas, sem repetir. */
export function chavesGemini(env = process.env) {
  const todas = [...pedacos(env.GEMINI_API_KEY)];
  for (let i = 2; i <= MAX_CONTAS; i++) todas.push(...pedacos(env[`GEMINI_API_KEY_${i}`]));
  return Array.from(new Set(todas));
}

/** Um ID de voz tem letras e números (cerca de 20) e nunca começa com "sk" (isso seria a chave colada no lugar errado). */
export function idDeVozValido(id) {
  return /^[A-Za-z0-9]{16,32}$/.test(id || "") && !String(id).startsWith("sk");
}

/** Contas da ElevenLabs prontas para usar: { n, chave, voz, vozPropria }. */
export function contasElevenLabs(env = process.env) {
  const vozPrincipal = String(env.ELEVENLABS_VOICE_ID || "").trim();
  const vistas = new Set();
  const contas = [];
  for (let n = 1; n <= MAX_CONTAS; n++) {
    const sufixo = n === 1 ? "" : `_${n}`;
    // Só o primeiro pedaço: se a chave for colada duas vezes ou com quebra de linha, ainda funciona.
    const chave = pedacos(env[`ELEVENLABS_API_KEY${sufixo}`])[0];
    if (!chave || vistas.has(chave)) continue;
    vistas.add(chave);
    const propria = String(env[`ELEVENLABS_VOICE_ID${sufixo}`] || "").trim();
    const voz = idDeVozValido(propria) ? propria : idDeVozValido(vozPrincipal) ? vozPrincipal : "";
    if (voz) contas.push({ n, chave, voz, vozPropria: idDeVozValido(propria) });
  }
  return contas;
}

/** Números das variáveis de ID de voz preenchidas com algo que não é ID (para o painel avisar). */
export function vozesInvalidas(env = process.env) {
  const ruins = [];
  for (let n = 1; n <= MAX_CONTAS; n++) {
    const valor = String(env[`ELEVENLABS_VOICE_ID${n === 1 ? "" : `_${n}`}`] || "").trim();
    if (valor && !idDeVozValido(valor)) ruins.push(n);
  }
  return ruins;
}

/** Contas com chave mas sem nenhum ID de voz usável. */
export function contasSemVoz(env = process.env) {
  const prontas = new Set(contasElevenLabs(env).map((c) => c.n));
  const sem = [];
  for (let n = 1; n <= MAX_CONTAS; n++) {
    if (pedacos(env[`ELEVENLABS_API_KEY${n === 1 ? "" : `_${n}`}`])[0] && !prontas.has(n)) sem.push(n);
  }
  return sem;
}
