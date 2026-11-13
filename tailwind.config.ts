import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tinta: "#1F3A93", // azul de tinta de carimbo: a cor da marca
        noite: "#131A33", // texto e fundos escuros
        papel: "#F1F4FA", // fundo
        golpe: "#D7263D",
        seguro: "#0B8F63",
        alerta: "#C77700", // âmbar escuro, legível como texto
        faixa: "#FFC629", // amarelo de faixa de atenção (jogos)
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Atkinson Hyperlegible"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
