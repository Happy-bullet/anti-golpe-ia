"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ABAS = [
  { href: "/", rotulo: "Analisar", icone: "M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" },
  { href: "/pix", rotulo: "Raio-X do Pix", icone: "M12 2 2 12l10 10 10-10L12 2Zm0 4.2L17.8 12 12 17.8 6.2 12 12 6.2Z" },
  { href: "/jogo", rotulo: "Jogo", icone: "M7 6h10a5 5 0 0 1 4.9 6l-1 5a2.5 2.5 0 0 1-4.3 1.2L14.5 16h-5l-2.1 2.2A2.5 2.5 0 0 1 3.1 17l-1-5A5 5 0 0 1 7 6Zm0 3v2H5v2h2v2h2v-2h2v-2H9V9H7Zm9 0a1.2 1.2 0 1 0 0 2.4A1.2 1.2 0 0 0 16 9Zm2 3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" },
  { href: "/vovo", rotulo: "Vó Zilda", icone: "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5v2h10V9H7Zm0 3.5v2h7v-2H7Z" },
];

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d={d} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export default function Navegacao() {
  const caminho = usePathname();
  const [grande, setGrande] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("ag:modo-facil") === "1") setGrande(true);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("leitura-grande", grande);
    try {
      localStorage.setItem("ag:modo-facil", grande ? "1" : "0");
    } catch {}
  }, [grande]);

  if (caminho === "/estande") return null;

  return (
    <>
      <header className="bg-tinta text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
            <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
              <path d="M16 2 4 6.5v8.3c0 7 4.9 12.6 12 15.2 7.1-2.6 12-8.200 12-15.2V6.500L16 2Z" fill="#FFC629" />
              <path d="m10 16 4.300 4.300L22.500 12" fill="none" stroke="#131A33" strokeWidth="3.200" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Anti-Golpe IA
          </Link>

          <nav aria-label="Seções" className="hidden items-center gap-1 md:flex">
            {ABAS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                aria-current={caminho === a.href ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 font-bold ${caminho === a.href ? "bg-white text-tinta" : "hover:bg-white/15"}`}
              >
                {a.rotulo}
              </Link>
            ))}
            <Link href="/como-funciona" className={`rounded-full px-3 py-1.5 font-bold ${caminho === "/como-funciona" ? "bg-white text-tinta" : "hover:bg-white/15"}`}>
              Como funciona
            </Link>
          </nav>

          <button
            onClick={() => setGrande((v) => !v)}
            aria-pressed={grande}
            className={`shrink-0 rounded-full border-2 px-3 py-1 text-sm font-bold ${grande ? "border-faixa bg-faixa text-noite" : "border-white/50 hover:bg-white/15"}`}
          >
            {grande ? "Modo fácil ligado" : "Modo fácil"}
          </button>
        </div>
      </header>

      <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-40 border-t border-noite/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {ABAS.map((a) => {
            const ativa = caminho === a.href;
            return (
              <li key={a.href}>
                <Link
                  href={a.href}
                  aria-current={ativa ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2 text-xs font-bold ${ativa ? "text-tinta" : "text-noite/60"}`}
                >
                  <span className={`rounded-full px-4 py-0.5 ${ativa ? "bg-tinta/10" : ""}`}>
                    <Icone d={a.icone} />
                  </span>
                  {a.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
