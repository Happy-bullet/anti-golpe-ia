# Resultados — só regras locais (modo offline)

Gerado em 13/11/2026, 08:45:15

### Todas (64 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **62.5%** | acertos no total |
| Sensibilidade | 40.5% | dos golpes, quantos pegamos |
| Especificidade | 92.6% | das legítimas, quantas liberamos |
| Precisão | 88.2% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 15 ✅ | 22 ❌ (pior erro) |
| **Era legítima** | 2 ⚠️ | 25 ✅ |

### Golpes PUBLICADOS por imprensa, bancos e operadoras (26 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **15.4%** | acertos no total |
| Sensibilidade | 12.0% | dos golpes, quantos pegamos |
| Especificidade | 100.0% | das legítimas, quantas liberamos |
| Precisão | 100.0% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 3 ✅ | 22 ❌ (pior erro) |
| **Era legítima** | 0 ⚠️ | 1 ✅ |

### Exemplos sintéticos (escritos pela equipe) (38 mensagens)

| Métrica | Valor | O que significa |
|---|---|---|
| **Acurácia** | **94.7%** | acertos no total |
| Sensibilidade | 100.0% | dos golpes, quantos pegamos |
| Especificidade | 92.3% | das legítimas, quantas liberamos |
| Precisão | 85.7% | dos alertas, quantos eram golpe mesmo |

Matriz de confusão:

| | Previsto golpe/suspeito | Previsto seguro |
|---|---|---|
| **Era golpe** | 12 ✅ | 0 ❌ (pior erro) |
| **Era legítima** | 2 ⚠️ | 24 ✅ |

## Erros (24)

- **#102** (publicado) era *golpe* (taxa correios), saiu *seguro* com risco 0% → "Correios: informamos que seu pedido foi barrado pela fiscalização alfandegária. Para mais informações, acesse: [link]"
- **#103** (publicado) era *golpe* (taxa correios), saiu *seguro* com risco 0% → "Correios: temos uma atualização sobre seu pacote. Ele foi taxado e está aguardando retirada. Saiba mais: [link]"
- **#105** (publicado) era *golpe* (taxa correios), saiu *seguro* com risco 0% → "CorreiosAviso: informamos que seu pedido foi parado pela fiscalização. Para mais informações ou rastreio: [link]"
- **#106** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 20% → "PIX de 1.000,00 em análise efetuado hoje. Caso não tenha efetuado entre em contato com a nossa central 0800 XXX XXXX"
- **#107** (publicado) era *golpe* (pontos expirando), saiu *seguro* com risco 25% → "Seus pontos expiram HOJE, troque por PRODUTOS ou MILHAS agora mesmo. Acesse http://m.trocarapidopontos.com"
- **#108** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 0% → "Compra aprovada em R$ XXXXX em (alguma loja do varejo conhecida). Para confirmar, digite o número 1. Caso desconheça a t..."
- **#109** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 0% → "Compra de R$ 2.900,00 aprovada. Caso não reconheça, digite 1 ou ligue para o 0800…"
- **#110** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 0% → "Compra aprovada nas Casas Bahia no valor de R$ 3.800,00. Caso não reconheça, ligue para 0800-XXX-XXXX"
- **#111** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 0% → "SANTANDER: Compra APROVADA Casas Bahia R$ 2.900. Ligue 0800-999-9999 para cancelar."
- **#112** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 0% → "Acesso autorizado à sua conta, caso não reconheça, entre em contato"
- **#113** (publicado) era *golpe* (falsa central), saiu *seguro* com risco 0% → "Compra sob suspeita, digite 1 para confirmar ou ligue para cancelar"
- **#114** (publicado) era *golpe* (pontos expirando), saiu *seguro* com risco 20% → "Dotz & BB: Resgate seus 150.585 pontos disponíveis até dia 28/12"
- **#115** (publicado) era *golpe* (pontos expirando), saiu *seguro* com risco 20% → "Seus 150.000 pontos Livelo expiram hoje! Resgate agora produtos ou dinheiro"
- **#116** (publicado) era *golpe* (emprego falso), saiu *seguro* com risco 0% → "Olá, sou o gerente geral do projeto Am e atualmente estou recrutando uma equipe de meio período. Você pode trabalhar mei..."
- **#117** (publicado) era *golpe* (emprego falso), saiu *seguro* com risco 20% → "Olá, você foi selecionado para um trabalho de meio período online, com salário diário de R$ 500 – R$ 1000. Entre em cont..."
- **#118** (publicado) era *golpe* (emprego falso), saiu *seguro* com risco 20% → "Você foi selecionado para um trabalho de meio período online. Até R$ 500 por dia. Entre em contato comigo"
- **#119** (publicado) era *golpe* (cnh suspensa), saiu *seguro* com risco 0% → "Sua conta GOV tem uma nova mensagem sobre sua CNH. Acesse ww1.regualrizeagora.tax/dc5b3 e confira detalhes."
- **#120** (publicado) era *golpe* (cnh suspensa), saiu *seguro* com risco 0% → "NOTIFICAÇÃO EXTRAJUDICIAL. Suspensão da sua CNH em andamento. saiba mais e evite sua restrição"
- **#121** (publicado) era *golpe* (falso parente), saiu *seguro* com risco 0% → "mãe, quebrei meu celular, esse é meu novo número, salva"
- **#122** (publicado) era *golpe* (falso parente), saiu *seguro* com risco 0% → "fala, quanto tempo, tudo bem? Troquei meu número… Anota o novo e… você não teria um dinheiro para me emprestar?"
- **#124** (publicado) era *golpe* (falso parente), saiu *seguro* com risco 0% → "oi mãe, tudo bem? Mudei de celular"
- **#125** (publicado) era *golpe* (falso parente), saiu *seguro* com risco 0% → "Oi mãe… pode me fazer um favor?"
- **#202** (sintetico) era *legitimo* (codigo legitimo), saiu *suspeito* com risco 35% → "Seu código de acesso gov.br é 482193. Não informe este código a ninguém."
- **#210** (sintetico) era *legitimo* (familia), saiu *suspeito* com risco 35% → "Pai, o boleto da escola vence amanhã, não esquece. O código tá no e-mail que a secretaria mandou."

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
| 101 | golpe | publicado | suspeito | 30 | taxa_entrega |
| 102 | golpe | publicado | seguro | 0 |  |
| 103 | golpe | publicado | seguro | 0 |  |
| 104 | golpe | publicado | suspeito | 30 | taxa_entrega |
| 105 | golpe | publicado | seguro | 0 |  |
| 106 | golpe | publicado | seguro | 20 | pix |
| 107 | golpe | publicado | seguro | 25 | urgencia, links |
| 108 | golpe | publicado | seguro | 0 |  |
| 109 | golpe | publicado | seguro | 0 |  |
| 110 | golpe | publicado | seguro | 0 |  |
| 111 | golpe | publicado | seguro | 0 |  |
| 112 | golpe | publicado | seguro | 0 |  |
| 113 | golpe | publicado | seguro | 0 |  |
| 114 | golpe | publicado | seguro | 20 | premio |
| 115 | golpe | publicado | seguro | 20 | urgencia |
| 116 | golpe | publicado | seguro | 0 |  |
| 117 | golpe | publicado | seguro | 20 | premio |
| 118 | golpe | publicado | seguro | 20 | premio |
| 119 | golpe | publicado | seguro | 0 |  |
| 120 | golpe | publicado | seguro | 0 |  |
| 121 | golpe | publicado | seguro | 0 |  |
| 122 | golpe | publicado | seguro | 0 |  |
| 123 | golpe | publicado | suspeito | 35 | numero_novo |
| 124 | golpe | publicado | seguro | 0 |  |
| 125 | golpe | publicado | seguro | 0 |  |
| 126 | legitimo | publicado | seguro | 0 |  |
| 201 | legitimo | sintetico | seguro | 20 | pix |
| 202 | legitimo | sintetico | suspeito | 35 | codigo |
| 203 | legitimo | sintetico | seguro | 0 |  |
| 204 | legitimo | sintetico | seguro | 0 |  |
| 205 | legitimo | sintetico | seguro | 20 | pix |
| 206 | legitimo | sintetico | seguro | 0 |  |
| 207 | legitimo | sintetico | seguro | 0 |  |
| 208 | legitimo | sintetico | seguro | 0 |  |
| 209 | legitimo | sintetico | seguro | 0 |  |
| 210 | legitimo | sintetico | suspeito | 35 | codigo |
| 211 | legitimo | sintetico | seguro | 0 |  |
| 212 | legitimo | sintetico | seguro | 0 |  |
| 213 | legitimo | sintetico | seguro | 0 |  |
| 214 | legitimo | sintetico | seguro | 20 | pix |
