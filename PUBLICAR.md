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
