// O pedido de transcrição, num arquivo só, para o servidor (lib/ouvir.ts) e o teste
// (scripts/testar-ouvir.mjs) usarem exatamente o mesmo texto.

export const SISTEMA_OUVIR = `Você transcreve áudio curto gravado no microfone de um celular numa feira barulhenta.
Regras:
- Escreva em português do Brasil exatamente o que disse a pessoa que está com o celular perto da boca (a voz mais alta e nítida).
- Ignore totalmente as vozes distantes, conversas de fundo, música e ruído.
- Não invente, não complete frases e não responda ao que foi dito. Só transcreva.
- Se não houver uma fala próxima e clara, devolva texto vazio.
Responda SOMENTE com JSON: { "texto": "transcrição" }`;

export const PEDIDO_OUVIR = "Transcreva a fala da pessoa que está perto do microfone.";
