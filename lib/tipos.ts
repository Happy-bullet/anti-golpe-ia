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
  audio?: string | null; // MP3 da fala (gravado ou /api/voz assinado); null = usar a voz do navegador
}

// ---------- modo estande (fila, ligação única, placares) ----------

export interface ChamadaEstande {
  cid: number;
  pid: string; // segredo do celular de quem está ligando
  id: string; // identificador público
  nome: string;
  fase: "chamando" | "ativa";
  expira: number;
  inicio: number;
  fim: number;
  falas: FalaVovo[];
  tecnicas: string[];
  pensando: number; // 0 ou a hora em que a fala começou a ser processada
}

export interface LinhaVovo {
  id: string;
  nome: string;
  truques: number;
  duracaoS: number;
  quando: number;
  vezes: number;
  /** Nome corrigido pelo admin: não volta ao original se a pessoa jogar de novo. */
  editado?: boolean;
}

export interface LinhaQuiz {
  id: string;
  nome: string;
  pontos: number;
  acertos: number;
  tentativas: number;
  quando: number;
  editado?: boolean;
}

export interface UltimaLigacao {
  tipo: "fim" | "perdeu";
  motivo?: "tempo" | "venceu" | "desligou" | "admin";
  nome: string;
  id: string;
  truques?: number;
  tecnicas?: string[];
  duracaoS?: number;
  quando: number;
}

export interface EstadoEstande {
  ativo: boolean;
  /** `economico`: a Vó usa as falas gravadas sempre que dá, e só gera voz na hora para o que sai do roteiro. */
  config: { duracaoS: number; aprovacaoManual: boolean; somNoCelular: boolean; economico: boolean };
  chamada: ChamadaEstande | null;
  fila: { pid: string; id: string; nome: string; entrou: number; visto: number }[];
  audio: { n: number; texto: string; url: string | null };
  ultima: UltimaLigacao | null;
  placarVovo: LinhaVovo[];
  placarQuiz: LinhaQuiz[];
  ligacoes: number;
  /** De onde veio a voz das respostas: gravada (grátis), gerada na hora (gasta crédito) ou voz do navegador. */
  voz: VozUsada;
  /** Transcrição do microfone no servidor: falhas seguidas e até quando os celulares usam o navegador. */
  ouvir: { falhas: number; pausadoAte: number };
}

export interface VozUsada {
  gravadas: number;
  aoVivo: number;
  caracteres: number;
  navegador: number;
}

/** O que os celulares e a TV recebem (sem o `pid` de ninguém). */
export interface VisaoEstande {
  agora: number;
  ativo: boolean;
  config: EstadoEstande["config"];
  chamada: (Omit<ChamadaEstande, "pid" | "id" | "pensando"> & { pensando: boolean; sua: boolean }) | null;
  fila: string[];
  posicao: number;
  esperaS: number;
  audio: EstadoEstande["audio"];
  ultima: UltimaLigacao | null;
  placarVovo: Pick<LinhaVovo, "id" | "nome" | "truques" | "duracaoS">[];
  placarQuiz: Pick<LinhaQuiz, "id" | "nome" | "pontos" | "acertos">[];
  eu: { id: string; quizTentativas: number; quizMelhor: number } | null;
  /** true: a transcrição no servidor está fora (cota ou falha), o celular usa o microfone do navegador. */
  ouvirPausado: boolean;
}

export interface VisaoAdmin extends VisaoEstande {
  filaCompleta: { id: string; nome: string; entrou: number; visto: number }[];
  placarVovoCompleto: LinhaVovo[];
  placarQuizCompleto: LinhaQuiz[];
  ligacoes: number;
  vozUsada: VozUsada;
  banco: "redis" | "memoria" | "nenhum";
  voz: boolean;
  vozIdInvalido?: boolean;
  ia: string;
  /** false: sem chave do Gemini ou sem cota para transcrever o microfone neste servidor. */
  audioNoServidor?: boolean;
  /** Números das contas da ElevenLabs com ID de voz errado ou faltando. */
  problemasDeVoz?: { vozInvalida: number[]; semVoz: number[] };
  contasDeVoz?: EstadoContaDeVoz[];
  chavesDeIA?: EstadoChaveDeIA[];
}

/** Uma conta da ElevenLabs, como o painel mostra (sem chave e sem ID da voz). */
export interface EstadoContaDeVoz {
  n: number;
  vozPropria: boolean;
  caracteresHoje: number;
  teto: number;
  pausa: { motivo: string; ate: number } | null;
  saldo: { usados: number; limite: number } | null;
}

/** Uma chave de IA, como o painel mostra (só o número). */
export interface EstadoChaveDeIA {
  provedor: string;
  n: number;
  pausas: { modelo: string; motivo: string; ate: number }[];
  parada: boolean;
}
