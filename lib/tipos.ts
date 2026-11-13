export type Gravidade = "baixa" | "media" | "alta";
export type Nivel = "seguro" | "suspeito" | "golpe";

export interface Sinal {
  titulo: string;
  explicacao: string;
  gravidade: Gravidade;
  trecho?: string;
}

export interface ResumoPix {
  nome: string;
  cidade: string;
  valor: number | null;
  nomeTipoChave: string;
  chaveMascarada: string;
}

export interface Resultado {
  risco: number; // 0 a 100
  nivel: Nivel;
  tipo: string; // ex.: "Falso parente", "Mensagem legítima"
  resumo: string; // 1-2 frases em linguagem simples
  sinais: Sinal[];
  recomendacoes: string[];
  textoAnalisado: string; // texto digitado + texto lido do print
  fonte: "ia+regras" | "regras";
  provedor?: string;
  aviso?: string;
  pix?: ResumoPix; // quando a mensagem traz um Pix copia e cola
}

export interface Entrada {
  texto?: string;
  imagem?: { base64: string; mime: string };
  forcarOffline?: boolean;
}

export interface FalaVovo {
  de: "golpista" | "vovo";
  texto: string;
}

export interface RespostaVovo {
  fala: string;
  tecnicas: string[]; // ids de lib/tecnicas.mjs encontrados na última fala do golpista
  fonte: "ia" | "roteiro";
}
