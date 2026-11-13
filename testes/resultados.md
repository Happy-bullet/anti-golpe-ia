# Resultados — sistema completo (IA + regras)

Gerado em 13/11/2026, 09:03:19 · provedor: gemini

### Todas (64 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **98.4%** | acertos no total |
| Sensibilidade | 100.0% | dos golpes, quantos pegamos |
| Especificidade | 96.3% | das legítimas, quantas liberamos |
| Precisão | 97.4% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 37 ✅ | 0 ❌ (pior erro) |
| **Era legítima** | 1 ⚠️ | 26 ✅ |

### Golpes PUBLICADOS por imprensa, bancos e operadoras (26 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **100.0%** | acertos no total |
| Sensibilidade | 100.0% | dos golpes, quantos pegamos |
| Especificidade | 100.0% | das legítimas, quantas liberamos |
| Precisão | 100.0% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 25 ✅ | 0 ❌ (pior erro) |
| **Era legítima** | 0 ⚠️ | 1 ✅ |

### Exemplos sintéticos (escritos pela equipe) (38 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **97.4%** | acertos no total |
| Sensibilidade | 100.0% | dos golpes, quantos pegamos |
| Especificidade | 96.2% | das legítimas, quantas liberamos |
| Precisão | 92.3% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 12 ✅ | 0 ❌ (pior erro) |
| **Era legítima** | 1 ⚠️ | 25 ✅ |

## Erros (1)

- **#205** (sintetico) era *legitimo* (familia), saiu *suspeito* com risco 39% → "Oi amor, esqueci a carteira em casa, consegue me mandar 30 de pix pro almoço? Tô no restaurante de sempre"

## Todas as respostas

| # | Rótulo | Origem | Nível | Risco | Tipo detectado |
|---|---|---|---|---|---|
| 1 | golpe | sintetico | golpe | 95 | Falso parente / número novo |
| 2 | golpe | sintetico | golpe | 90 | Falso parente / 'troquei de número' |
| 3 | golpe | sintetico | golpe | 80 | Clonagem de WhatsApp ou Roubo de Conta |
| 4 | golpe | sintetico | golpe | 96 | Taxa falsa dos Correios |
| 5 | golpe | sintetico | golpe | 84 | Falsa central do banco |
| 6 | golpe | sintetico | golpe | 81 | Falso prêmio |
| 7 | golpe | sintetico | golpe | 79 | Falsa vaga de emprego |
| 8 | golpe | sintetico | golpe | 95 | Falsa renegociação de dívida / Serasa |
| 9 | golpe | sintetico | golpe | 85 | Falsa central do banco / Phishing |
| 10 | golpe | sintetico | golpe | 76 | Golpe do Pix enviado errado |
| 11 | golpe | sintetico | golpe | 89 | Falso site do governo / Valores a receber |
| 12 | golpe | sintetico | golpe | 79 | Falsa multa do Detran |
| 13 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 14 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 15 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 16 | legitimo | sintetico | seguro | 15 | Mensagem legítima |
| 17 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 18 | legitimo | sintetico | seguro | 4 | Mensagem legítima |
| 19 | legitimo | sintetico | seguro | 4 | Mensagem legítima |
| 20 | legitimo | sintetico | seguro | 9 | Mensagem legítima |
| 21 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 22 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 23 | legitimo | sintetico | seguro | 8 | Mensagem legítima |
| 24 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 101 | golpe | publicado | golpe | 86 | Taxa falsa dos Correios / encomenda retida |
| 102 | golpe | publicado | golpe | 79 | Taxa falsa dos Correios |
| 103 | golpe | publicado | golpe | 75 | Taxa falsa dos Correios |
| 104 | golpe | publicado | golpe | 79 | Taxa falsa dos Correios |
| 105 | golpe | publicado | golpe | 79 | Taxa falsa dos Correios |
| 106 | golpe | publicado | golpe | 84 | Falsa central do banco |
| 107 | golpe | publicado | golpe | 83 | Falso prêmio / Falsa troca de pontos |
| 108 | golpe | publicado | golpe | 71 | Falsa central do banco |
| 109 | golpe | publicado | golpe | 79 | Falsa central do banco |
| 110 | golpe | publicado | golpe | 75 | Falsa central de atendimento |
| 111 | golpe | publicado | golpe | 79 | Falsa central do banco |
| 112 | golpe | publicado | golpe | 71 | Falsa central do banco |
| 113 | golpe | publicado | golpe | 71 | Falsa central do banco |
| 114 | golpe | publicado | golpe | 76 | Falso prêmio / Falsos pontos |
| 115 | golpe | publicado | golpe | 76 | Falso prêmio / Falsos pontos |
| 116 | golpe | publicado | golpe | 75 | Falsa vaga de emprego |
| 117 | golpe | publicado | golpe | 84 | Falsa vaga de emprego |
| 118 | golpe | publicado | golpe | 84 | Falsa vaga de emprego / renda extra |
| 119 | golpe | publicado | golpe | 84 | Falso gov.br / CNH irregular |
| 120 | golpe | publicado | golpe | 75 | Falsa multa ou falsa notificação do Detran |
| 121 | golpe | publicado | golpe | 80 | Falso parente / Troquei de número |
| 122 | golpe | publicado | golpe | 80 | Falso parente / Troquei de número |
| 123 | golpe | publicado | golpe | 80 | Falso parente / Troquei de número |
| 124 | golpe | publicado | golpe | 73 | Golpe do falso parente / número novo |
| 125 | golpe | publicado | suspeito | 34 | Falso parente / Possível início de golpe |
| 126 | legitimo | publicado | seguro | 15 | Mensagem legítima |
| 201 | legitimo | sintetico | seguro | 5 | Mensagem legítima |
| 202 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 203 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 204 | legitimo | sintetico | seguro | 8 | Mensagem legítima |
| 205 | legitimo | sintetico | suspeito | 39 | Possível falso parente / Pix de emergência |
| 206 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 207 | legitimo | sintetico | seguro | 11 | Mensagem legítima |
| 208 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 209 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 210 | legitimo | sintetico | seguro | 4 | Mensagem legítima |
| 211 | legitimo | sintetico | seguro | 8 | Mensagem legítima |
| 212 | legitimo | sintetico | seguro | 4 | Mensagem legítima |
| 213 | legitimo | sintetico | seguro | 0 | Mensagem legítima |
| 214 | legitimo | sintetico | seguro | 13 | Mensagem legítima |
