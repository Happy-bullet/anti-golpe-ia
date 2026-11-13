# Base de testes

`mensagens.csv` → colunas: `id, rotulo, tipo, origem, fonte, texto`

- **rotulo:** `golpe` ou `legitimo`
- **tipo:** categoria livre (falso parente, taxa correios, familia...)
- **origem:**
  - `publicado` = texto de golpe divulgado por imprensa, bancos, operadoras ou órgãos públicos. A coluna `fonte` tem o endereço da página.
  - `real` = mensagem recebida por você, família ou amigos (com nomes e telefones apagados).
  - `sintetico` = escrita pela equipe como exemplo.
- **fonte:** endereço de onde o texto foi tirado (só para `publicado`).

## O que tem na base hoje (13/11/2026)

| Origem | Golpes | Legítimas |
|---|---|---|
| publicado | 25 | 1 |
| sintetico | 12 | 26 |
| real | 0 | 0 |

## Resultado medido em 13/11/2026 (site publicado, Gemini 3.6 Flash + regras)

- **25 de 25** golpes publicados foram pegos (24 como "golpe", 1 como "suspeito").
- **26 de 27** mensagens legítimas foram liberadas. O único alerta falso foi um pedido de Pix entre namorados, marcado como "suspeito".
- No total, **63 de 64** (98,4%).
- Só as regras locais, antes de qualquer ajuste: **3 de 25** golpes publicados. Depois de ajustadas com esses exemplos: 24 de 25.

Arquivos:
- `resultados-primeira-rodada.md` — sistema completo, antes de mexer em qualquer regra (é o número mais honesto)
- `resultados.md` — sistema completo, versão atual
- `resultados-regras-antes-do-ajuste.md` e `resultados-regras.md` — só as regras locais, antes e depois

## Como falar desses números sem exagerar

- Diga "25 de 25 golpes documentados", não "100% de acerto". Com 25 exemplos, o acerto real pode ser menor.
- Os golpes publicados são os mais conhecidos. Golpe novo pode passar.
- Alguns textos publicados são modelos divulgados pelos bancos, com "XXXX" no lugar do valor ou do telefone.
- As mensagens legítimas são quase todas escritas pela equipe. Para fortalecer, acrescente mensagens normais do seu próprio celular com `origem` = `real`.
- As regras locais foram ajustadas olhando esses mesmos golpes, então o "24 de 25" delas não vale como teste independente.

## Como acrescentar mensagens reais

1. Peça à família e aos amigos que encaminhem golpes que receberam.
2. **Antes de salvar, apague nomes, telefones, CPFs e chaves Pix** → troque por `[NOME]`, `[TELEFONE]`.
3. Texto com vírgula ou quebra de linha vai entre aspas `"..."`; aspas dentro do texto viram `""`.
4. Rode de novo a avaliação.

## Rodar

Dentro de `app/`:

```powershell
npm run testar-regras
$env:URL="https://anti-golpe-ia.vercel.app"; npm run avaliar
```

A avaliação completa leva uns 6 minutos (há uma pausa entre as mensagens para não estourar a cota da IA).
