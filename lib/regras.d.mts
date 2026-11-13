import type { Sinal, Nivel } from "./tipos";

export function extrairLinks(texto: string): string[];
export function analisarComRegras(texto: string): { risco: number; sinais: Sinal[]; regrasAtivadas: string[] };
export function nivelDoRisco(risco: number): Nivel;
