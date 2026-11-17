"use client";

// Vó Zilda tem dois modos:
// - Estande (ligado pelo admin na feira): uma ligação por vez, com fila, nome e placar na TV.
// - Livre (padrão, e sempre que o servidor não responde): cada pessoa conversa no próprio celular.
import { useCallback, useEffect, useState } from "react";
import VovoEstande from "@/components/VovoEstande";
import VovoSolo from "@/components/VovoSolo";

export default function VoZilda() {
  const [modo, setModo] = useState<"vendo" | "estande" | "livre">("vendo");

  useEffect(() => {
    let vivo = true;
    const controle = new AbortController();
    const desistir = setTimeout(() => controle.abort(), 4000);
    fetch("/api/estande", { cache: "no-store", signal: controle.signal })
      .then((r) => r.json())
      .then((j) => vivo && setModo(j?.ativo ? "estande" : "livre"))
      .catch(() => vivo && setModo("livre"))
      .finally(() => clearTimeout(desistir));
    return () => {
      vivo = false;
      clearTimeout(desistir);
    };
  }, []);

  const sair = useCallback(() => setModo("livre"), []);

  if (modo === "vendo") return <main className="min-h-screen bg-noite" aria-busy="true" />;
  return modo === "estande" ? <VovoEstande aoSairDoModo={sair} /> : <VovoSolo />;
}
