import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const dados = {
    name: "Anti-Golpe IA",
    short_name: "Anti-Golpe",
    description: "Descubra em segundos se uma mensagem é golpe, e por quê.",
    lang: "pt-BR",
    start_url: "/?origem=app",
    display: "standalone",
    background_color: "#F1F4FA",
    theme_color: "#1F3A93",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Faz o app aparecer no menu "Compartilhar" do Android (ex.: dentro do WhatsApp).
    share_target: {
      action: "/compartilhar",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [{ name: "imagem", accept: ["image/*"] }],
      },
    },
    shortcuts: [
      { name: "Raio-X do Pix", url: "/pix" },
      { name: "É golpe ou não?", url: "/jogo" },
      { name: "Engane a Vó Zilda", url: "/vovo" },
    ],
  };
  return dados as unknown as MetadataRoute.Manifest;
}
