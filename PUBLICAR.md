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
