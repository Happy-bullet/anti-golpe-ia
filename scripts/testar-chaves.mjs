// Testes da leitura de várias chaves (npm run testar-chaves). Não chama nenhum serviço.
import assert from "node:assert/strict";
import { chavesGemini, contasElevenLabs, contasSemVoz, idDeVozValido, vozesInvalidas } from "../lib/chaves.mjs";

let ok = 0;
const teste = (nome, fn) => {
  fn();
  ok++;
  console.log(`ok  ${nome}`);
};
const VOZ1 = "4hKyvPIZn2MmqBAXfHU9";
const VOZ2 = "Ab12Cd34Ef56Gh78Ij90";

teste("Gemini: uma chave, várias numeradas, várias na mesma variável e repetidas", () => {
  assert.deepEqual(chavesGemini({}), []);
  assert.deepEqual(chavesGemini({ GEMINI_API_KEY: " AIza1 \n" }), ["AIza1"]);
  assert.deepEqual(chavesGemini({ GEMINI_API_KEY: "AIza1", GEMINI_API_KEY_2: "AIza2", GEMINI_API_KEY_4: "AIza4" }), ["AIza1", "AIza2", "AIza4"]);
  assert.deepEqual(chavesGemini({ GEMINI_API_KEY: "AIza1, AIza2;AIza3" }), ["AIza1", "AIza2", "AIza3"]);
  assert.deepEqual(chavesGemini({ GEMINI_API_KEY: "AIza1 AIza1", GEMINI_API_KEY_2: "AIza1" }), ["AIza1"], "colada duas vezes conta uma");
});

teste("ElevenLabs: cada conta com a própria voz; sem voz própria usa a da conta 1", () => {
  assert.deepEqual(contasElevenLabs({}), []);
  const env = {
    ELEVENLABS_API_KEY: "sk_um sk_um",
    ELEVENLABS_VOICE_ID: VOZ1,
    ELEVENLABS_API_KEY_2: "sk_dois",
    ELEVENLABS_VOICE_ID_2: VOZ2,
    ELEVENLABS_API_KEY_3: "sk_tres",
    ELEVENLABS_API_KEY_5: "sk_cinco",
    ELEVENLABS_VOICE_ID_5: "sk_cinco",
  };
  assert.deepEqual(
    contasElevenLabs(env).map((c) => [c.n, c.chave, c.voz, c.vozPropria]),
    [
      [1, "sk_um", VOZ1, true],
      [2, "sk_dois", VOZ2, true],
      [3, "sk_tres", VOZ1, false],
      [5, "sk_cinco", VOZ1, false],
    ],
  );
  assert.deepEqual(vozesInvalidas(env), [5], "a chave colada no lugar do ID da voz é avisada");
});

teste("ElevenLabs: conta sem nenhuma voz usável fica de fora e é avisada", () => {
  const env = { ELEVENLABS_API_KEY_2: "sk_dois" };
  assert.deepEqual(contasElevenLabs(env), []);
  assert.deepEqual(contasSemVoz(env), [2]);
  assert.deepEqual(contasSemVoz({ ELEVENLABS_API_KEY: "sk_um", ELEVENLABS_VOICE_ID: VOZ1 }), []);
});

teste("ElevenLabs: a mesma chave em duas variáveis conta uma vez", () => {
  const env = { ELEVENLABS_API_KEY: "sk_um", ELEVENLABS_VOICE_ID: VOZ1, ELEVENLABS_API_KEY_2: "sk_um", ELEVENLABS_VOICE_ID_2: VOZ2 };
  assert.deepEqual(contasElevenLabs(env).map((c) => c.n), [1]);
});

teste("ID de voz: aceita ID, recusa chave e lixo", () => {
  assert.equal(idDeVozValido(VOZ1), true);
  assert.equal(idDeVozValido("sk_3ba2c5b43b7c93958b61"), false);
  assert.equal(idDeVozValido("abc"), false);
  assert.equal(idDeVozValido(""), false);
});

console.log(`\n${ok} testes das chaves passaram.`);
