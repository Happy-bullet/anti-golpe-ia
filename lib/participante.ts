// Identidade do visitante no modo estande: um código aleatório guardado só no celular dele
// (serve para a fila e para contar as 3 tentativas do quiz) e o nome que ele escolheu para a TV.
export function meuPid(): string {
  try {
    let pid = localStorage.getItem("ag:pid") || "";
    if (!/^[A-Za-z0-9_-]{12,64}$/.test(pid)) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      pid = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("ag:pid", pid);
    }
    return pid;
  } catch {
    // Navegador sem armazenamento (aba anônima antiga): vale só enquanto a página estiver aberta.
    const w = window as unknown as { __agPid?: string };
    if (!w.__agPid) w.__agPid = `tmp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    return w.__agPid;
  }
}

export function meuNome(): string {
  try {
    return localStorage.getItem("ag:nome") || "";
  } catch {
    return "";
  }
}

export function guardarNome(nome: string) {
  try {
    localStorage.setItem("ag:nome", nome);
  } catch {}
}
