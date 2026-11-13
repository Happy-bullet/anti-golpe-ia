export interface Tecnica {
  id: string;
  nome: string;
  descricao: string;
  defesa: string;
  re: RegExp;
}
export const TECNICAS: Tecnica[];
export function detectarTecnicas(texto: string): string[];
