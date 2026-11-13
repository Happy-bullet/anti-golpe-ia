# Resultados — só regras locais (modo offline)

Gerado em 13/11/2026, 08:54:51

### Todas (64 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **98.4%** | acertos no total |
| Sensibilidade | 97.3% | dos golpes, quantos pegamos |
| Especificidade | 100.0% | das legítimas, quantas liberamos |
| Precisão | 100.0% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 36 ✅ | 1 ❌ (pior erro) |
| **Era legítima** | 0 ⚠️ | 27 ✅ |

### Golpes PUBLICADOS por imprensa, bancos e operadoras (26 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **96.2%** | acertos no total |
| Sensibilidade | 96.0% | dos golpes, quantos pegamos |
| Especificidade | 100.0% | das legítimas, quantas liberamos |
| Precisão | 100.0% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 24 ✅ | 1 ❌ (pior erro) |
| **Era legítima** | 0 ⚠️ | 1 ✅ |

### Exemplos sintéticos (escritos pela equipe) (38 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **100.0%** | acertos no total |
| Sensibilidade | 100.0% | dos golpes, quantos pegamos |
| Especificidade | 100.0% | das legítimas, quantas liberamos |
| Precisão | 100.0% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 12 ✅ | 0 ❌ (pior erro) |
| **Era legítima** | 0 ⚠️ | 26 ✅ |

## Erros (1)

- **#125** (publicado) era *golpe* (falso parente), saiu *seguro* com risco 0% → "Oi mãe… pode me fazer um favor?"

## Todas as respostas

| # | Rótulo | Origem | Nível | Risco | Tipo detectado |
|---|---|---|---|---|---|
| 1 | golpe | sintetico | golpe | 95 | numero_novo, pix, urgencia |
| 2 | golpe | sintetico | golpe | 75 | numero_novo, pix |
| 3 | golpe | sintetico | suspeito | 35 | codigo |
| 4 | golpe | sintetico | golpe | 100 | urgencia, taxa_entrega, links |
| 5 | golpe | sintetico | suspeito | 50 | urgencia, central_falsa |
| 6 | golpe | sintetico | suspeito | 40 | premio, links |
| 7 | golpe | sintetico | suspeito | 30 | emprego |
| 8 | golpe | sintetico | golpe | 95 | dados, divida, links |
| 9 | golpe | sintetico | suspeito | 55 | links |
| 10 | golpe | sintetico | suspeito | 50 | pix, pix_errado |
| 11 | golpe | sintetico | golpe | 70 | dados, links |
| 12 | golpe | sintetico | suspeito | 30 | links |
| 13 | legitimo | sintetico | seguro | 0 |  |
| 14 | legitimo | sintetico | seguro | 0 |  |
| 15 | legitimo | sintetico | seguro | 0 |  |
| 16 | legitimo | sintetico | seguro | 0 |  |
| 17 | legitimo | sintetico | seguro | 0 |  |
| 18 | legitimo | sintetico | seguro | 0 |  |
| 19 | legitimo | sintetico | seguro | 0 |  |
| 20 | legitimo | sintetico | seguro | 20 | pix |
| 21 | legitimo | sintetico | seguro | 0 |  |
| 22 | legitimo | sintetico | seguro | 0 |  |
| 23 | legitimo | sintetico | seguro | 0 |  |
| 24 | legitimo | sintetico | seguro | 0 |  |
| 101 | golpe | publicado | golpe | 60 | taxa_entrega, links |
| 102 | golpe | publicado | suspeito | 30 | taxa_entrega |
| 103 | golpe | publicado | suspeito | 30 | taxa_entrega |
| 104 | golpe | publicado | suspeito | 30 | taxa_entrega |
| 105 | golpe | publicado | suspeito | 30 | taxa_entrega |
| 106 | golpe | publicado | suspeito | 50 | pix, central_falsa |
| 107 | golpe | publicado | suspeito | 55 | urgencia, pontos, links |
| 108 | golpe | publicado | suspeito | 30 | central_falsa |
| 109 | golpe | publicado | suspeito | 30 | central_falsa |
| 110 | golpe | publicado | suspeito | 30 | central_falsa |
| 111 | golpe | publicado | suspeito | 30 | central_falsa |
| 112 | golpe | publicado | suspeito | 30 | central_falsa |
| 113 | golpe | publicado | suspeito | 30 | central_falsa |
| 114 | golpe | publicado | suspeito | 50 | premio, pontos |
| 115 | golpe | publicado | suspeito | 50 | urgencia, pontos |
| 116 | golpe | publicado | suspeito | 30 | emprego |
| 117 | golpe | publicado | suspeito | 50 | premio, emprego |
| 118 | golpe | publicado | suspeito | 50 | premio, emprego |
| 119 | golpe | publicado | suspeito | 50 | links |
| 120 | golpe | publicado | suspeito | 30 | cnh |
| 121 | golpe | publicado | suspeito | 35 | numero_novo |
| 122 | golpe | publicado | suspeito | 35 | numero_novo |
| 123 | golpe | publicado | suspeito | 35 | numero_novo |
| 124 | golpe | publicado | suspeito | 35 | numero_novo |
| 125 | golpe | publicado | seguro | 0 |  |
| 126 | legitimo | publicado | seguro | 0 |  |
| 201 | legitimo | sintetico | seguro | 20 | pix |
| 202 | legitimo | sintetico | seguro | 0 |  |
| 203 | legitimo | sintetico | seguro | 0 |  |
| 204 | legitimo | sintetico | seguro | 0 |  |
| 205 | legitimo | sintetico | seguro | 20 | pix |
| 206 | legitimo | sintetico | seguro | 0 |  |
| 207 | legitimo | sintetico | seguro | 0 |  |
| 208 | legitimo | sintetico | seguro | 0 |  |
| 209 | legitimo | sintetico | seguro | 0 |  |
| 210 | legitimo | sintetico | seguro | 0 |  |
| 211 | legitimo | sintetico | seguro | 0 |  |
| 212 | legitimo | sintetico | seguro | 0 |  |
| 213 | legitimo | sintetico | seguro | 0 |  |
| 214 | legitimo | sintetico | seguro | 20 | pix |
