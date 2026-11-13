# Base de testes

`mensagens.csv` → colunas: `id, rotulo, tipo, origem, texto`

- **rotulo:** `golpe` ou `legitimo`
- **tipo:** categoria livre (falso parente, taxa correios, familia...)
- **origem:** `real` (recebida por alguém de verdade) ou `sintetico` (escrita como exemplo)

## ⚠️ Importante
As 24 mensagens que já estão aqui são **exemplos sintéticos**, só pra testar se o script funciona.
**Na Mostra, os números têm que vir de mensagens reais** (foi isso que o resumo da inscrição prometeu).
O script mostra o resultado separado por origem, então dá pra ver os dois.

## Como coletar mensagens reais
1. Pedir no grupo da família / amigos: "me encaminha golpes que vocês receberam"
2. Também vale: mensagens normais do seu próprio WhatsApp (pra base ter legítimas)
3. **Antes de salvar, apague nomes, telefones, CPFs, chaves Pix** → troque por `[NOME]`, `[TELEFONE]`
4. Meta: **30+ golpes reais e 30+ legítimas**
5. Texto com vírgula ou quebra de linha vai entre aspas `"..."`; aspas dentro do texto viram `""`

Prints: se a mensagem só existe em print, salve a imagem em `prints/` e digite o texto no CSV.

## Rodar
Dentro de `app/`:
- `npm run testar-regras` → testa só as regras locais (não precisa de internet nem chave) → gera `resultados-regras.md`
- `npm run dev` em um terminal e `npm run avaliar` em outro → testa o sistema completo (IA + regras) → gera `resultados.md`
