# Anti-Golpe IA

Recebeu uma mensagem estranha? O Anti-Golpe IA diz se é golpe, explica por quê e ensina a reconhecer os truques que os golpistas usam.

Projeto acadêmico apresentado na 6ª MostraTec (Uniube Uberlândia, novembro de 2026), categoria Comercial.

## O que tem no app

| Endereço | O que é |
|---|---|
| `/` | Analisa mensagem, link ou print com IA + regras locais. Veredito em voz alta e botão "Avisar minha família" |
| `/pix` | Raio-X do Pix: lê o Pix copia e cola (padrão BR Code, com CRC16) e mostra quem recebe. Roda no aparelho |
| `/jogo` | "É golpe ou não?": 8 mensagens contra o relógio, com placar do dia |
| `/vovo` | "Engane a Vó Zilda": você é o golpista e a IA te enrola, revelando os 9 truques de manipulação |
| `/como-funciona` | Como a análise é feita, privacidade, limites e resultados dos testes |
| `/estande` | Tela para o notebook do estande, com QR code |

## Como funciona por dentro

```
texto / print ──► /api/analisar ──► lib/limite.ts   limite por visitante, teto diário, cache
                                    lib/regras.mjs  regras locais (links, Pix, urgência, código...)
                                    lib/pix.mjs     Raio-X do Pix
                                    lib/ia.ts       Gemini → modelos reserva → Claude (se tiver chave)
                                    lib/analisar.ts nota final = 75% IA + 25% regras; IA caiu → só regras
```

Privacidade: não existe banco de dados. A mensagem é analisada e descartada.

## Rodar

```bash
npm install
cp .env.example .env.local   # cole a chave do Gemini dentro (nunca suba este arquivo)
npm run dev                  # http://localhost:3000
```

Sem chave o app funciona em modo offline: regras locais, Raio-X do Pix, jogo e Vó Zilda com roteiro fixo.

## Testes

```bash
npm run testar-regras   # regras na base de mensagens (pasta testes/), sem internet
npm run testar-pix      # Raio-X do Pix e detecção de truques, sem internet
npm run avaliar         # sistema completo; precisa do "npm run dev" rodando em outro terminal
```

## Tecnologias

Next.js 14, TypeScript, Tailwind CSS, Gemini API (com Claude como reserva), Web Speech API, Web Share Target.

## Inspiração

O Apate, da Universidade Macquarie (Austrália), e a Daisy, da operadora O2 (Reino Unido): IAs que conversam com golpistas para fazê-los perder tempo. Aqui a ideia foi levada para o lado da vítima e para os golpes brasileiros.
