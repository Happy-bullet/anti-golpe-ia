// Camada de REGRAS LOCAIS (funciona sem internet).
// Arquivo .mjs pra ser usado tanto pelo app (Next.js) quanto pelos scripts de teste (node).
// Cada regra tem um peso; a soma (limitada a 100) é a nota de risco das regras.

/**
 * @typedef {{ titulo: string, explicacao: string, gravidade: "baixa" | "media" | "alta", trecho?: string }} Sinal
 */

const ENCURTADORES = [
  "bit.ly", "tinyurl.com", "cutt.ly", "is.gd", "t.co", "rebrand.ly", "shorturl.at",
  "encurtador.com.br", "abre.ai", "l1nk.dev", "tiny.cc", "ow.ly", "rb.gy", "s.id",
];

const TLDS_SUSPEITOS = [
  ".xyz", ".top", ".click", ".icu", ".online", ".site", ".live", ".shop", ".buzz",
  ".info", ".vip", ".monster", ".rest", ".cfd", ".sbs", ".lat",
];

// Marcas muito imitadas -> domínios oficiais
const MARCAS = {
  caixa: ["caixa.gov.br"],
  "banco do brasil": ["bb.com.br"],
  bb: ["bb.com.br"],
  itau: ["itau.com.br"],
  bradesco: ["bradesco.com.br"],
  nubank: ["nubank.com.br"],
  santander: ["santander.com.br"],
  inter: ["bancointer.com.br", "inter.co"],
  correios: ["correios.com.br"],
  receita: ["gov.br"],
  gov: ["gov.br"],
  serasa: ["serasa.com.br"],
  detran: ["gov.br"],
  mercadolivre: ["mercadolivre.com.br", "mercadolivre.com"],
  shopee: ["shopee.com.br"],
  netflix: ["netflix.com"],
  whatsapp: ["whatsapp.com"],
};

/** @type {{ id: string, re: RegExp, peso: number, gravidade: Sinal["gravidade"], titulo: string, explicacao: string }[]} */
const REGRAS_TEXTO = [
  {
    id: "numero_novo",
    re: /(troquei de n[uú]mero|meu n[uú]mero novo|n[uú]mero novo|celular (quebrou|caiu|foi roubado)|salva (esse|este|meu) (novo )?n[uú]mero|perdi meu (celular|chip))/i,
    peso: 35, gravidade: "alta",
    titulo: "Golpe do falso parente / número novo",
    explicacao: "Golpistas fingem ser um parente que 'trocou de número' para logo depois pedir dinheiro. Ligue para o número antigo da pessoa antes de qualquer coisa.",
  },
  {
    id: "pix",
    re: /\b(pix|transfer[eê]ncia|transferir|deposit[ao]r?|chave aleat[oó]ria|me empresta)\b/i,
    peso: 20, gravidade: "media",
    titulo: "Pedido de dinheiro / Pix",
    explicacao: "A mensagem envolve transferência de dinheiro. Pix não pode ser cancelado depois de enviado.",
  },
  {
    id: "urgencia",
    re: /(urgente|urg[eê]ncia|imediatamente|agora mesmo|ligue agora|o quanto antes|ainda hoje|em at[eé] \d+ ?(h|horas|minutos)|[uú]ltim[ao]s? (horas|dia|chance)|expira|ser[aá] (bloquead|cancelad|suspens)|evite o bloqueio)/i,
    peso: 20, gravidade: "media",
    titulo: "Urgência artificial",
    explicacao: "Criar pressa é a principal técnica de golpe: a pessoa age sem pensar. Empresas sérias não exigem decisões em minutos.",
  },
  {
    id: "codigo",
    re: /((c[oó]digo|token|senha)[^.\n]{0,50}(envi|mand|pass|inform|digit|me fala)|(envi|mand|pass|inform|me fala)[^.\n]{0,40}(c[oó]digo|token|senha))/i,
    peso: 35, gravidade: "alta",
    titulo: "Pede código ou senha",
    explicacao: "Nenhum banco, loja ou aplicativo pede código de verificação ou senha por mensagem. Quem pede isso quer roubar sua conta (ex.: clonar o WhatsApp).",
  },
  {
    id: "premio",
    re: /(parab[eé]ns[^.\n]{0,40}(ganh|sorte|selecion)|voc[eê] (ganhou|foi sorteado|foi selecionad)|pr[eê]mio|resgat(e|ar) (seu|o)|cashback exclusivo|brinde)/i,
    peso: 20, gravidade: "media",
    titulo: "Prêmio ou vantagem boa demais",
    explicacao: "Prêmios que você não pediu são isca para roubar dados ou cobrar uma 'taxa' de liberação.",
  },
  {
    id: "central_falsa",
    re: /(compra (n[aã]o reconhecida|suspeita|aprovada no valor)|cart[aã]o (foi )?(bloquead|clonad)|central de seguran[cç]a|setor de fraude|conta (ser[aá]|foi|est[aá]) (bloquead|suspens|desativad)|acesso (suspeito|bloqueado))/i,
    peso: 30, gravidade: "alta",
    titulo: "Falsa central do banco",
    explicacao: "Golpistas fingem ser o banco avisando de compra suspeita. Desligue e ligue você mesmo para o número no verso do cartão.",
  },
  {
    id: "taxa_entrega",
    re: /((taxa|tarifa|imposto|pagamento)[^.\n]{0,50}(libera|entrega|pacote|encomenda|objeto|alfand)|(encomenda|pacote|objeto)[^.\n]{0,50}(retid|taxad|aguardando pagamento))/i,
    peso: 30, gravidade: "alta",
    titulo: "Taxa falsa de entrega",
    explicacao: "Os Correios e transportadoras não cobram taxa por SMS ou WhatsApp com link. Consulte o rastreio só pelo site ou app oficial.",
  },
  {
    id: "emprego",
    re: /((ganhe|renda extra|trabalh[eo] de casa|vaga)[^.\n]{0,60}(R\$|reais|por dia|por hora|por tarefa)|curtir v[ií]deos|avaliar produtos e ganhar)/i,
    peso: 30, gravidade: "alta",
    titulo: "Proposta de emprego ou renda fácil",
    explicacao: "Ofertas de dinheiro fácil (curtir vídeos, tarefas online) costumam terminar pedindo um 'depósito' para liberar ganhos.",
  },
  {
    id: "pix_errado",
    re: /((pix|transfer[eê]ncia|depositei|mandei)[^.\n]{0,60}(errad|a mais|por engano|errei)|devolv(e|er|a)[^.\n]{0,40}(pix|valor|diferen[cç]a|\d))/i,
    peso: 30, gravidade: "alta",
    titulo: "Golpe do Pix enviado errado",
    explicacao: "O golpista diz que mandou dinheiro a mais e pede a devolução. Muitas vezes o comprovante é falso. Confira o extrato no app do banco antes de devolver qualquer valor.",
  },
  {
    id: "dados",
    re: /(\bcpf\b|dados banc[aá]rios|n[uú]mero do cart[aã]o|c[oó]digo de seguran[cç]a|cvv|data de nascimento|nome da m[aã]e)/i,
    peso: 15, gravidade: "media",
    titulo: "Pede dados pessoais",
    explicacao: "Mensagens que pedem CPF, dados do cartão ou bancários são usadas para fraudes em seu nome.",
  },
  {
    id: "divida",
    re: /(seu nome (est[aá]|ser[aá]) (negativad|protestad)|d[ií]vida[^.\n]{0,40}(quit|desconto|acordo)|regularize|pend[eê]ncia (fiscal|financeira|no cpf)|cpf (irregular|suspenso|cancelado))/i,
    peso: 20, gravidade: "media",
    titulo: "Ameaça de dívida ou nome sujo",
    explicacao: "Medo de ter o nome negativado é usado para fazer a pessoa pagar boletos falsos. Consulte direto no Serasa, gov.br ou no banco.",
  },
];

/** Extrai URLs (com ou sem http) do texto. */
export function extrairLinks(texto) {
  const re = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s<>"')]*)?|https?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?:\/[^\s]*)?)/gi;
  const achados = texto.match(re) || [];
  return achados
    .filter((u) => /\//.test(u) || /^(https?:)/i.test(u) || /\.(com|br|net|org|xyz|top|ly|io|co|me|site|online|info|shop|click|icu|live|vip)\b/i.test(u))
    .filter((u) => !/^\d+\.\d+$/.test(u)); // evita "12.50"
}

function dominioDe(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function terminaCom(dominio, oficial) {
  return dominio === oficial || dominio.endsWith(`.${oficial}`);
}

/** Analisa os links do texto. */
function analisarLinks(texto) {
  /** @type {(Sinal & {peso:number})[]} */
  const sinais = [];
  for (const link of extrairLinks(texto)) {
    const dom = dominioDe(link);
    if (!dom) continue;

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(dom)) {
      sinais.push({ peso: 30, gravidade: "alta", trecho: link, titulo: "Link para endereço IP",
        explicacao: "Sites de verdade usam nome (ex.: banco.com.br). Link com números no lugar do nome é típico de golpe." });
      continue;
    }
    if (ENCURTADORES.some((e) => terminaCom(dom, e))) {
      sinais.push({ peso: 20, gravidade: "media", trecho: link, titulo: "Link encurtado",
        explicacao: "Encurtadores escondem o endereço real. Golpistas usam para disfarçar sites falsos." });
    }
    if (TLDS_SUSPEITOS.some((t) => dom.endsWith(t))) {
      sinais.push({ peso: 20, gravidade: "media", trecho: link, titulo: "Domínio com final incomum",
        explicacao: `O site termina em "${dom.slice(dom.lastIndexOf("."))}", final barato e muito usado em sites falsos.` });
    }
    for (const [marca, oficiais] of Object.entries(MARCAS)) {
      const marcaSemEspaco = marca.replace(/\s/g, "");
      const citaMarca = marca.length > 3 ? dom.includes(marcaSemEspaco) : dom.split(/[.-]/).includes(marcaSemEspaco);
      if (citaMarca && !oficiais.some((o) => terminaCom(dom, o))) {
        sinais.push({ peso: 35, gravidade: "alta", trecho: link, titulo: "Site imitando marca conhecida",
          explicacao: `O link usa o nome "${marca}" mas não é o site oficial (${oficiais.join(" ou ")}). É uma página falsa.` });
        break;
      }
    }
    if (/^http:\/\//i.test(link)) {
      sinais.push({ peso: 5, gravidade: "baixa", trecho: link, titulo: "Link sem cadeado (http)",
        explicacao: "O endereço não usa conexão segura (https)." });
    }
  }
  return sinais;
}

/**
 * Roda todas as regras locais.
 * @param {string} texto
 * @returns {{ risco: number, sinais: Sinal[], regrasAtivadas: string[] }}
 */
export function analisarComRegras(texto) {
  const t = texto || "";
  /** @type {(Sinal & {peso:number})[]} */
  const sinais = [];
  const regrasAtivadas = [];

  for (const r of REGRAS_TEXTO) {
    const m = t.match(r.re);
    if (m) {
      regrasAtivadas.push(r.id);
      sinais.push({ peso: r.peso, gravidade: r.gravidade, titulo: r.titulo, explicacao: r.explicacao, trecho: m[0] });
    }
  }
  const sinaisLinks = analisarLinks(t);
  if (sinaisLinks.length) regrasAtivadas.push("links");
  sinais.push(...sinaisLinks);

  // Combinação perigosa: número novo + pedido de dinheiro
  if (regrasAtivadas.includes("numero_novo") && regrasAtivadas.includes("pix")) {
    sinais.push({ peso: 20, gravidade: "alta", titulo: "Combinação clássica de golpe",
      explicacao: "'Número novo' + pedido de Pix é exatamente o roteiro do golpe do falso parente." });
  }

  const risco = Math.min(100, sinais.reduce((s, x) => s + x.peso, 0));
  return {
    risco,
    sinais: sinais.map(({ peso, ...resto }) => resto),
    regrasAtivadas,
  };
}

export function nivelDoRisco(risco) {
  if (risco >= 60) return "golpe";
  if (risco >= 30) return "suspeito";
  return "seguro";
}
