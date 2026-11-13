export type TipoChave = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria" | "desconhecida";

export type PixLido =
  | { ok: false; erro: string }
  | {
      ok: true;
      nome: string;
      cidade: string;
      valor: number | null;
      chave: string;
      tipoChave: TipoChave;
      nomeTipoChave: string;
      chaveMascarada: string;
      dinamico: boolean;
      dominio: string;
      descricao: string;
      txid: string;
      crcValido: boolean;
    };

export interface AlertaPix {
  titulo: string;
  explicacao: string;
  gravidade: "baixa" | "media" | "alta";
}

export function crc16(texto: string): string;
export function acharCodigoPix(texto: string): string | null;
export function tipoDaChave(chave: string): TipoChave;
export function mascararChave(chave: string, tipo: TipoChave): string;
export function nomeCombina(recebedor: string, esperado: string): boolean | null;
export function lerPix(bruto: string): PixLido;
export function avaliarPix(pix: PixLido, esperado?: { quem?: string; valor?: number | null }): { risco: number; alertas: AlertaPix[] };
export function montarPix(dados: { chave: string; nome: string; cidade: string; valor?: number; txid?: string }): string;
