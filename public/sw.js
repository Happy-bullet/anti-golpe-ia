// Service worker do Anti-Golpe IA.
// 1. Recebe o que a pessoa manda pelo botão "Compartilhar" do celular (texto ou print)
//    e entrega para a tela de análise. Fica num cache temporário e é apagado assim que a tela lê.
// 2. Plano B do estande: guarda as páginas, os arquivos do site e as falas gravadas da Vó Zilda,
//    para o app abrir e a Vó falar mesmo se a internet do campus cair.
//    Páginas: rede primeiro (sempre a versão nova), cache só se a rede falhar.
//    Arquivos com hash e áudios: cache primeiro (nunca mudam).
// Nada do que a pessoa digita é guardado: as análises (POST) passam direto.

const CACHE_PAGINAS = "ag-paginas-v2";
const CACHE_ARQUIVOS = "ag-arquivos-v2";
const CACHE_VOZ = "ag-voz-v1";
const MANTER = [CACHE_PAGINAS, CACHE_ARQUIVOS, CACHE_VOZ, "ag-compartilhado"];
const PAGINAS = ["/", "/vovo", "/jogo", "/pix", "/estande", "/como-funciona"];

self.addEventListener("install", (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    (async () => {
      try {
        const paginas = await caches.open(CACHE_PAGINAS);
        await Promise.all(PAGINAS.map((p) => paginas.add(p).catch(() => {})));
        const r = await fetch("/falas/lista.json", { cache: "no-store" });
        if (r.ok) {
          const lista = await r.json();
          const voz = await caches.open(CACHE_VOZ);
          const ja = new Set((await voz.keys()).map((k) => new URL(k.url).pathname));
          await Promise.all(lista.filter((a) => !ja.has(a)).map((a) => voz.add(a).catch(() => {})));
        }
      } catch {
        // instalar nunca pode falhar por causa do plano B
      }
    })(),
  );
});

self.addEventListener("activate", (evento) =>
  evento.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) if (!MANTER.includes(nome)) await caches.delete(nome);
      await self.clients.claim();
    })(),
  ),
);

async function cachePrimeiro(req, nomeCache) {
  const cache = await caches.open(nomeCache);
  const guardado = await cache.match(req);
  if (guardado) return guardado;
  const r = await fetch(req);
  if (r.ok && r.status === 200) cache.put(req, r.clone()).catch(() => {});
  return r;
}

async function redePrimeiro(req) {
  const cache = await caches.open(CACHE_PAGINAS);
  const daRede = fetch(req).then((r) => {
    if (r.ok && r.status === 200) cache.put(req, r.clone()).catch(() => {});
    return r;
  });
  // Rede lenta: depois de 5 s mostra a versão guardada (a da rede ainda atualiza o cache).
  const lento = new Promise((ok) => setTimeout(() => ok(null), 5000));
  try {
    const r = await Promise.race([daRede, lento]);
    if (r) return r;
    const guardado = await cache.match(req, { ignoreSearch: true });
    return guardado || (await daRede);
  } catch {
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    const inicio = await cache.match("/");
    if (inicio) return inicio;
    throw new Error("sem rede e sem cópia");
  }
}

async function receberCompartilhado(req) {
  try {
    const dados = await req.formData();
    const cache = await caches.open("ag-compartilhado");
    const texto = [dados.get("title"), dados.get("text"), dados.get("url")].filter((x) => typeof x === "string" && x).join("\n");
    await cache.put("/_compartilhado/texto", new Response(texto));
    const imagem = dados.get("imagem");
    if (imagem && typeof imagem !== "string" && imagem.size) {
      await cache.put("/_compartilhado/imagem", new Response(imagem, { headers: { "content-type": imagem.type || "image/jpeg" } }));
    } else {
      await cache.delete("/_compartilhado/imagem");
    }
    return Response.redirect("/?compartilhado=1", 303);
  } catch {
    return Response.redirect("/", 303);
  }
}

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.method === "POST" && url.pathname === "/compartilhar") {
    evento.respondWith(receberCompartilhado(req));
    return;
  }
  if (req.method !== "GET") return;

  if ((url.pathname === "/api/voz" && url.searchParams.has("s")) || (url.pathname.startsWith("/falas/") && url.pathname.endsWith(".mp3"))) {
    evento.respondWith(cachePrimeiro(req, CACHE_VOZ));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    evento.respondWith(cachePrimeiro(req, CACHE_ARQUIVOS));
    return;
  }
  if (req.mode === "navigate") {
    evento.respondWith(redePrimeiro(req));
  }
});
