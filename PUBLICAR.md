# Publicar o Anti-Golpe IA na Vercel (PowerShell)

## 1. Testar no seu PC primeiro

```powershell
cd "$HOME\Desktop\Uniube\3º Período (2026-2)\MostraTec 2026 - Anti-Golpe IA\app"
npm install
Copy-Item .env.example .env.local
notepad .env.local        # cole a chave do Gemini depois de GEMINI_API_KEY= e salve
npm run dev               # abra http://localhost:3000 e teste um print
```

A chave você cria em https://aistudio.google.com/apikey. Ela fica só no `.env.local` e na Vercel. Não mande por chat.

Se a análise mostrar "A IA não respondeu agora", olhe o terminal do `npm run dev`: a linha `[anti-golpe] falha na IA` diz o motivo (chave errada, modelo indisponível, cota).

## 2. Publicar

```powershell
npm run build             # tem que terminar sem erro
npx vercel login          # só na primeira vez
npx vercel --prod
```

Nas perguntas do `vercel --prod`:
- Set up and deploy? **Y**
- Which scope? **happy-bullet's projects**
- Link to existing project? **N**
- Project name? **anti-golpe-ia**
- In which directory is your code located? **./** (só Enter)
- Want to modify these settings? **N**

## 3. Colocar a chave na Vercel e publicar de novo

```powershell
npx vercel env add GEMINI_API_KEY production    # cole a chave quando ele pedir
npx vercel --prod
```

## 4. Conferir

- Abra o endereço que apareceu (algo como `https://anti-golpe-ia.vercel.app`) no celular.
- Em `/api/analisar` deve aparecer `"provedor":"gemini"`. Se aparecer `"offline"`, a chave não entrou: repita o passo 3.
- Medir o acerto no site publicado:

```powershell
$env:URL="https://anti-golpe-ia.vercel.app"; npm run avaliar
```

## 5. Notebook do estande

Abra `https://anti-golpe-ia.vercel.app/estande` e clique em "Tela cheia".
Plano B sem internet: `npm run build` e `npm run start` no notebook, depois `http://localhost:3000/estande?url=https://anti-golpe-ia.vercel.app`.

## 6. Voz da Vó Zilda (ElevenLabs)

A Vó fala em camadas. Se uma falhar, a próxima entra sozinha, sem erro na tela:

1. **Falas fixas gravadas** (`public/falas/*.mp3`): abertura, roteiro, desvios e os "hummm..." de espera. Não gastam crédito e tocam até sem internet.
2. **Falas novas da IA** viram áudio em `/api/voz` (modelo rápido `eleven_flash_v2_5`). A URL é assinada pelo servidor e fica em cache na CDN da Vercel.
3. **Voz do aparelho**: a voz em português mais natural do navegador (no Edge, as vozes "Natural" são as melhores).
4. **Sem internet**: o service worker guarda as páginas e as falas gravadas, e a Vó responde pelo roteiro no próprio aparelho.

Proteções: teto diário de caracteres (`LIMITE_VOZ_CARACTERES_DIA`, padrão 6000) e um disjuntor que pausa a ElevenLabs por 20 minutos quando os créditos acabam.

### Configurar

1. Na Vercel, em *Settings → Environment Variables*, crie `ELEVENLABS_API_KEY` (segredo) e `ELEVENLABS_VOICE_ID`, depois faça Redeploy.
2. Grave as falas fixas pelo próprio site, para que a chave nunca saia da Vercel:

```powershell
cd app
node scripts/gravar-falas.mjs
```

São cerca de 2.500 caracteres no modelo de alta qualidade. Depois disso, publique os arquivos novos (`public/falas/` e `lib/falas-gravadas.json`).

Se trocar a voz, grave de novo com `node scripts/gravar-falas.mjs --refazer`.

## 7. Modo estande (fila, ligação única, TV e placares)

No dia da Mostra a Vó Zilda atende **uma pessoa por vez**:

1. A pessoa aponta a câmera para o QR code da TV, escreve o nome e entra na fila. O celular mostra a posição e o tempo de espera.
2. Você toca em **Liberar a próxima ligação** no painel (`/admin`). Nada começa sozinho.
3. A pessoa toca em **Ligar para a Vó** no celular dela. A ligação dura 2 minutos (ajustável) e aparece na TV (`/tv`), com a voz da Vó saindo do notebook ligado à TV ou à caixa de som.
4. O celular é o microfone: a pessoa **segura o botão para falar**, com o celular perto da boca. Também dá para escrever.
5. No fim, o nome entra no placar com a quantidade de truques usados. Quem usar os 9 ganha.
6. O quiz "É golpe ou não?" pede o nome, deixa jogar 3 vezes e vale a melhor pontuação.

### Preparar (uma vez)

- **Banco Redis**: Vercel → Storage → conecte um banco Upstash for Redis ao projeto `anti-golpe-ia` (pode ser um banco que você já tem: as chaves do estande começam com `ag:estande`).
- **Senha do painel**: variável `ESTANDE_SENHA` na Vercel.
- Publique de novo (Redeploy).

### No dia

| Tela | Endereço | Onde abrir |
|---|---|---|
| TV | `/tv` | Notebook ligado à TV, no Edge, em tela cheia. Clique em "Ligar o som da TV". |
| Painel | `/admin` | No seu celular. Ligue o "Modo estande". |
| Visitante | `/vovo` | Celular de quem escaneia o QR code. |

Com o modo estande desligado (ou sem internet), `/vovo` volta a ser a Vó de sempre, cada um no próprio celular.

### Modo econômico de voz (vem ligado)

Fica em **Ajustes** no painel. Ligado, quando a pessoa usa um truque conhecido ("aqui é do banco", "me passa a senha", "faz um pix"), a Vó responde com uma **fala já gravada**: sai na hora, não chama a IA e não gasta crédito da ElevenLabs. Ela só improvisa (IA + voz gerada na hora) no que sai do roteiro. A fala gravada só é usada se combinar com o que a pessoa disse e nunca se repete na mesma ligação.

O painel mostra, em **Voz usada nas respostas**, quantas respostas foram gravadas, quantas foram geradas na hora e uma estimativa dos créditos gastos. O saldo de verdade fica no site da ElevenLabs.

### IA sem cota

- **Microfone**: quem transcreve a fala é o Gemini. Se a cota dele acabar, o painel avisa em **Microfone de quem liga** e os celulares passam sozinhos para o reconhecimento de voz do navegador (ou o teclado). O botão **Tentar a IA de novo** volta a testar.
- **Respostas**: um modelo que respondeu "sem cota" fica 30 minutos sem ser tentado, para a Vó não demorar. Sem nenhuma IA, a Vó segue o roteiro gravado sem repetir fala.
- **Claude como IA principal**: crie `ANTHROPIC_API_KEY` e `IA_PROVEDOR=claude` na Vercel. As respostas passam a vir do Claude e a cota gratuita do Gemini fica só para o microfone (o Claude não recebe áudio).

### Várias chaves (Gemini e ElevenLabs)

O app aceita até 10 chaves de cada. Quando uma para, a próxima assume sozinha, e todos os servidores ficam sabendo (a pausa fica no Redis).

| Variável na Vercel | O que colocar |
|---|---|
| `GEMINI_API_KEY_2`, `_3`... | Uma chave por **projeto** do Google. Chaves do mesmo projeto dividem a mesma cota. |
| `ELEVENLABS_API_KEY_2`, `_3`... | A chave de cada conta (permissão Text to Speech; marque também User: Read para o painel mostrar o saldo). |
| `ELEVENLABS_VOICE_ID_2`, `_3`... | O ID de uma voz criada **naquela** conta. A voz da conta 1 não existe nas outras. |

No painel, **Contas de voz** e **Chaves de IA** mostram cada uma pelo número: funcionando, ou parada e por quê (sem crédito, bloqueada, chave recusada, voz não encontrada). **Tentar as contas de voz de novo** limpa as pausas. Depois de criar ou mudar variáveis, publique de novo (Redeploy).

### Testes

```powershell
cd app
npm run testar-chaves                                    # leitura das várias chaves
npm run testar-estande                                   # regras da fila, tempo, aprovação e placares
node --env-file=.env.local scripts/testar-ouvir.mjs "..\05 - Testes\microfone\2-com-barulho.wav"   # transcrição com barulho
```
