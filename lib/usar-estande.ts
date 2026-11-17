"use client";
// Mantém a tela (celular, TV ou painel) em dia com o estado do estande, perguntando ao servidor
// a cada `intervaloMs`. Também acerta o relógio da tela pelo do servidor, para o cronômetro
// da ligação bater em todos os aparelhos.
import { useCallback, useEffect, useRef, useState } from "react";
import type { VisaoEstande } from "./tipos";

export type Conexao = "carregando" | "ok" | "fora";

export function usarEstande<V extends VisaoEstande = VisaoEstande>(opcoes: {
  pid?: string;
  intervaloMs: number;
  ligado?: boolean;
  caminho?: string;
  cabecalhos?: Record<string, string>;
}) {
  const { pid = "", intervaloMs, ligado = true, caminho = "/api/estande" } = opcoes;
  const cabecalhos = useRef(opcoes.cabecalhos || {});
  cabecalhos.current = opcoes.cabecalhos || {};
  const [visao, setVisao] = useState<V | null>(null);
  const [conexao, setConexao] = useState<Conexao>("carregando");
  const [erro, setErro] = useState("");
  const desvio = useRef(0);
  const pedido = useRef(0);
  const aplicado = useRef(0);
  const falhas = useRef(0);
  const parado = useRef(false);

  const aplicar = useCallback((v: V, numero: number) => {
    if (numero < aplicado.current || typeof v?.agora !== "number") return;
    aplicado.current = numero;
    desvio.current = v.agora - Date.now();
    parado.current = v.ativo === false;
    setVisao(v);
  }, []);

  const buscar = useCallback(async () => {
    const numero = ++pedido.current;
    try {
      const r = await fetch(`${caminho}${pid ? `?pid=${pid}` : ""}`, { cache: "no-store", headers: cabecalhos.current });
      const j = await r.json();
      if (!r.ok && typeof j?.agora !== "number") throw new Error(j?.erro || `erro ${r.status}`);
      falhas.current = 0;
      setErro(r.ok ? "" : j?.erro || "");
      setConexao("ok");
      if (typeof j?.agora === "number") aplicar(j, numero);
      else setVisao(j);
    } catch (e) {
      if (++falhas.current >= 3) setConexao("fora");
      setErro(e instanceof Error ? e.message : "sem conexão");
    }
  }, [aplicar, caminho, pid]);

  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    let relogio: ReturnType<typeof setTimeout>;
    const volta = async () => {
      await buscar();
      // Com o modo estande desligado, pergunta bem mais devagar (economiza a cota do banco).
      if (vivo) relogio = setTimeout(volta, parado.current ? Math.max(8000, intervaloMs) : intervaloMs);
    };
    volta();
    return () => {
      vivo = false;
      clearTimeout(relogio);
    };
  }, [buscar, intervaloMs, ligado]);

  /** Envia uma ação e já atualiza a tela com a resposta. */
  const acao = useCallback(
    async (corpo: Record<string, unknown>): Promise<{ ok: boolean; erro?: string } & Record<string, unknown>> => {
      const numero = ++pedido.current;
      try {
        const r = await fetch(caminho, {
          method: "POST",
          headers: { "content-type": "application/json", ...cabecalhos.current },
          body: JSON.stringify(pid ? { ...corpo, pid } : corpo),
        });
        const j = await r.json();
        if (typeof j?.agora === "number") aplicar(j, numero);
        return { ...j, ok: r.ok && !j?.erro };
      } catch {
        return { ok: false, erro: "sem-conexao" };
      }
    },
    [aplicar, caminho, pid],
  );

  const agoraNoServidor = useCallback(() => Date.now() + desvio.current, []);

  return { visao, conexao, erro, acao, agoraNoServidor, atualizar: buscar };
}

/** Faz a tela se redesenhar a cada `ms` (para cronômetros). */
export function usarRelogio(ms = 500) {
  const [, setTique] = useState(0);
  useEffect(() => {
    const r = setInterval(() => setTique((t) => t + 1), ms);
    return () => clearInterval(r);
  }, [ms]);
}

export function minutos(segundos: number) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
