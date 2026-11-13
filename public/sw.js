// Service worker do Anti-Golpe IA.
// Função única: receber o que a pessoa manda pelo botão "Compartilhar" do celular
// (texto ou print do WhatsApp) e entregar para a tela de análise.
// O conteúdo fica só num cache temporário do próprio aparelho e é apagado assim que a tela lê.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== "POST" || url.pathname !== "/compartilhar") return;

  evento.respondWith(
    (async () => {
      try {
        const dados = await evento.request.formData();
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
    })(),
  );
});
