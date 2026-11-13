// Orquestra a análise: regras locais + Raio-X do Pix + IA -> resultado final.
import { analisarComRegras, nivelDoRisco } from "./regras.mjs";
import { acharCodigoPix, lerPix, avaliarPix } from "./pix.mjs";
import { pedirJSON, provedorAtivo } from "./ia";
import { montarPedido, PROMPT_SISTEMA } from "./prompt";
import { chaveDeCache, gravarCache, lerCache, reservarChamadaIA } from "./limite";
import type { Entrada, Gravidade, Resultado, ResumoPix, Sinal } from "./tipos";

const PESO_IA = 0.75; // quanto a nota da IA pesa na nota final (o resto é das regras)

const RECOMENDACOES_PADRAO: Record<string, string[]> = {
  golpe: [
    "Não clique em links, não faça Pix e não passe códigos.",
    "Confirme por outro canal: ligue para a pessoa ou para o número oficial da empresa.",
    "Bloqueie o contato e denuncie no próprio aplicativo.",
  ],
  suspeito: [
    "Desconfie: confirme por outro canal antes de fazer qualquer coisa.",
    "Não informe dados pessoais nem códigos.",
  ],
  seguro: ["Não encontramos sinais de golpe. Continue atento a pedidos de dinheiro ou de códigos."],
};

const GRAVIDADES: Gravidade[] = ["baixa", "media", "alta"];

function limparSinais(bruto: unknown): Sinal[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      titulo: String(s.titulo || "").slice(0, 80),
      explicacao: String(s.explicacao || "").slice(0, 300),
      gravidade: GRAVIDADES.includes(s.gravidade as Gravidade) ? (s.gravidade as Gravidade) : "media",
      trecho: typeof s.trecho === "string" && s.trecho.trim() ? s.trecho.slice(0, 200) : undefined,
    }))
    .filter((s) => s.titulo)
    .slice(0, 8);
}

function juntarSinais(a: Sinal[], b: Sinal[]): Sinal[] {
  const vistos = new Set<string>();
  const saida: Sinal[] = [];
  for (const s of [...a, ...b]) {
    const chave = s.titulo.toLowerCase().slice(0, 25);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(s);
  }
  const ordem = { alta: 0, media: 1, baixa: 2 } as const;
  return saida.sort((x, y) => ordem[x.gravidade] - ordem[y.gravidade]).slice(0, 9);
}

/** Se a mensagem traz um Pix copia e cola, lê e devolve os alertas. */
function olharPix(texto: string): { resumo?: ResumoPix; sinais: Sinal[]; risco: number } {
  const codigo = acharCodigoPix(texto);
  if (!codigo) return { sinais: [], risco: 0 };
  const pix = lerPix(codigo);
  if (!pix.ok) return { sinais: [], risco: 0 };
  // Se a mensagem fala em nome de uma empresa ou órgão, confere se o Pix vai mesmo para ela.
  const semCodigo = texto.replace(codigo, " ");
  const marca = semCodigo.match(/\b(correios|receita federal|detran|inss|serasa|caixa|banco do brasil|bradesco|ita[uú]|santander|nubank|mercado livre|shopee|amazon|magalu|netflix|claro|vivo|tim)\b/i)?.[0];
  const { risco, alertas } = avaliarPix(pix, { quem: marca });
  const sinais: Sinal[] = alertas
    .filter((a) => a.gravidade !== "baixa")
    .map((a) => ({ titulo: a.titulo, explicacao: a.explicacao, gravidade: a.gravidade }));
  sinais.push({
    titulo: "Para quem vai este Pix",
    explicacao: `O código manda o dinheiro para "${pix.nome || "sem nome"}", em ${pix.cidade || "cidade não informada"}, numa chave do tipo ${pix.nomeTipoChave}. Confira se é quem a mensagem diz ser.`,
    gravidade: ["cpf", "telefone", "email"].includes(pix.tipoChave) ? "media" : "baixa",
  });
  return {
    resumo: { nome: pix.nome, cidade: pix.cidade, valor: pix.valor, nomeTipoChave: pix.nomeTipoChave, chaveMascarada: pix.chaveMascarada },
    sinais,
    risco,
  };
}

function resultadoSoRegras(texto: string, temImagem: boolean, aviso?: string): Resultado {
  const regras = analisarComRegras(texto);
  const pix = olharPix(texto);
  const risco = Math.min(100, regras.risco + pix.risco);
  const nivel = nivelDoRisco(risco);
  const sinais = juntarSinais(regras.sinais, pix.sinais);
  return {
    risco,
    nivel,
    tipo: regras.sinais[0]?.titulo || (nivel === "seguro" ? "Nenhum sinal encontrado" : "Mensagem suspeita"),
    resumo:
      nivel === "golpe"
        ? "Esta mensagem tem vários sinais típicos de golpe."
        : nivel === "suspeito"
          ? "Esta mensagem tem sinais que merecem atenção."
          : "As regras locais não encontraram sinais de golpe.",
    sinais,
    recomendacoes: RECOMENDACOES_PADRAO[nivel],
    textoAnalisado: texto,
    fonte: "regras",
    provedor: "offline",
    pix: pix.resumo,
    aviso:
      aviso ||
      (temImagem
        ? "Modo offline: o print não foi lido, só o texto digitado. Cole o texto da mensagem."
        : "Modo offline: análise feita só com as regras locais, sem IA."),
  };
}

export async function analisar(entrada: Entrada): Promise<Resultado> {
  const texto = (entrada.texto || "").slice(0, 8000);
  const temImagem = !!entrada.imagem;
  const offline = entrada.forcarOffline || provedorAtivo() === "offline";

  if (offline) return resultadoSoRegras(texto, temImagem);

  // Mensagem só de texto já analisada na última hora? Devolve do cache (economiza a cota da IA).
  const chave = temImagem ? "" : chaveDeCache(texto);
  if (chave) {
    const guardado = lerCache<Resultado>(chave);
    if (guardado) return guardado;
  }

  if (!reservarChamadaIA()) {
    return resultadoSoRegras(texto, temImagem, "Muita gente usando agora: esta análise foi feita só com as regras locais.");
  }

  try {
    const regrasIniciais = analisarComRegras(texto);
    const { dados, provedor } = await pedirJSON({
      sistema: PROMPT_SISTEMA,
      pedido: montarPedido(texto, temImagem, regrasIniciais.sinais.map((s) => s.titulo)),
      imagem: entrada.imagem,
    });

    const riscoIA = Math.max(0, Math.min(100, Number(dados.risco) || 0));
    const textoExtraido = typeof dados.texto_extraido === "string" ? dados.texto_extraido.slice(0, 6000) : "";
    const textoTotal = [texto, textoExtraido].filter(Boolean).join("\n\n");

    // Se a IA leu texto do print, as regras e o Raio-X do Pix rodam nele também.
    const regras = textoExtraido ? analisarComRegras(textoTotal) : regrasIniciais;
    const pix = olharPix(textoTotal);

    const risco = Math.min(100, Math.round(riscoIA * PESO_IA + regras.risco * (1 - PESO_IA)) + Math.round(pix.risco / 2));
    const nivel = nivelDoRisco(risco);
    const recomendacoes = Array.isArray(dados.recomendacoes) ? dados.recomendacoes.map((r) => String(r).slice(0, 200)).slice(0, 5) : [];

    const resultado: Resultado = {
      risco,
      nivel,
      tipo: String(dados.tipo || "Indefinido").slice(0, 60),
      resumo: String(dados.resumo || "").slice(0, 400),
      sinais: juntarSinais(limparSinais(dados.sinais), [...regras.sinais, ...pix.sinais]),
      recomendacoes: recomendacoes.length ? recomendacoes : RECOMENDACOES_PADRAO[nivel],
      textoAnalisado: textoTotal,
      fonte: "ia+regras",
      provedor,
      pix: pix.resumo,
    };
    if (chave) gravarCache(chave, resultado);
    return resultado;
  } catch (erro) {
    // A IA falhou (sem internet, cota, modelo fora do ar): cai nas regras sem quebrar a demonstração.
    console.error("[anti-golpe] falha na IA, usando regras:", erro instanceof Error ? erro.message : erro);
    return resultadoSoRegras(texto, temImagem, "A IA não respondeu agora. Este resultado foi feito só com as regras locais.");
  }
}
