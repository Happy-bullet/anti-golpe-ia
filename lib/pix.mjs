// Raio-X do Pix: lê um código "Pix copia e cola" (padrão BR Code / EMV do Banco Central)
// e mostra para quem o dinheiro vai. Roda 100% no aparelho, sem internet.
// Arquivo .mjs para ser usado pelo app (Next.js) e pelos scripts de teste (node).

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido pelo padrão do Pix. */
export function crc16(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Lê uma sequência de campos ID(2) + TAMANHO(2) + VALOR. Devolve null se estiver quebrada. */
function lerCampos(s) {
  const campos = {};
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const tam = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(id) || !Number.isInteger(tam) || i + 4 + tam > s.length) return null;
    campos[id] = s.slice(i + 4, i + 4 + tam);
    i += 4 + tam;
  }
  return campos;
}

/** Procura um código Pix dentro de um texto maior (ex.: mensagem inteira de WhatsApp). */
export function acharCodigoPix(texto) {
  const t = texto || "";
  let inicio = t.indexOf("000201");
  while (inicio >= 0) {
    const fim = /6304[0-9A-Fa-f]{4}/g;
    fim.lastIndex = inicio + 30;
    let m;
    while ((m = fim.exec(t)) && m.index - inicio < 700) {
      const candidato = t.slice(inicio, m.index + 8);
      if (lerCampos(candidato)) return candidato;
    }
    inicio = t.indexOf("000201", inicio + 6);
  }
  return null;
}

function validarCPF(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

/** Descobre o tipo da chave Pix. */
export function tipoDaChave(chave) {
  const c = (chave || "").trim();
  if (!c) return "desconhecida";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return "aleatoria";
  if (/^\+55\d{10,11}$/.test(c)) return "telefone";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return "email";
  if (/^\d{14}$/.test(c)) return "cnpj";
  if (/^\d{11}$/.test(c)) return validarCPF(c) ? "cpf" : "telefone";
  return "desconhecida";
}

const NOME_TIPO = {
  cpf: "CPF (pessoa física)",
  cnpj: "CNPJ (empresa)",
  telefone: "número de celular",
  email: "e-mail",
  aleatoria: "chave aleatória",
  desconhecida: "não identificada",
};

/** Esconde parte da chave para não expor dado pessoal na tela do estande. */
export function mascararChave(chave, tipo) {
  if (!chave) return "";
  if (tipo === "cpf") return `***.${chave.slice(3, 6)}.${chave.slice(6, 9)}-**`;
  if (tipo === "telefone") return `${chave.slice(0, 5)}*****${chave.slice(-2)}`;
  if (tipo === "email") {
    const [u, d] = chave.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  if (tipo === "aleatoria") return `${chave.slice(0, 8)}…${chave.slice(-4)}`;
  return chave;
}

const semAcento = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "ltda", "sa", "me", "eireli", "epp", "s", "brasil", "banco", "pagamentos", "servicos", "comercio"]);

function palavrasFortes(s) {
  return semAcento(s).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p));
}

/** O nome que recebe o Pix tem algo a ver com quem a mensagem diz ser? */
export function nomeCombina(recebedor, esperado) {
  const a = palavrasFortes(recebedor);
  const b = palavrasFortes(esperado);
  if (!a.length || !b.length) return null;
  return a.some((p) => b.some((q) => p === q || (p.length >= 5 && q.length >= 5 && (p.startsWith(q) || q.startsWith(p)))));
}

/**
 * Lê o código Pix.
 * @param {string} bruto código copia e cola
 * @returns {{ ok: false, erro: string } | { ok: true, nome: string, cidade: string, valor: number | null, chave: string, tipoChave: string, nomeTipoChave: string, chaveMascarada: string, dinamico: boolean, dominio: string, descricao: string, txid: string, crcValido: boolean }}
 */
export function lerPix(bruto) {
  const codigo = (bruto || "").trim().replace(/[\r\n\t]+/g, "");
  if (!/^0002\d{2}/.test(codigo)) return { ok: false, erro: "Isso não parece um código Pix copia e cola. Ele sempre começa com 000201." };
  const campos = lerCampos(codigo);
  if (!campos) return { ok: false, erro: "O código está incompleto ou foi alterado. Copie de novo, do começo ao fim." };

  const conta = campos["26"] ? lerCampos(campos["26"]) : null;
  if (!conta || semAcento(conta["00"]) !== "br.gov.bcb.pix") {
    return { ok: false, erro: "Este código de pagamento não é um Pix do Banco Central." };
  }

  const semCrc = codigo.slice(0, codigo.length - 4);
  const crcValido = !!campos["63"] && semCrc.endsWith("6304") && crc16(semCrc) === campos["63"].toUpperCase();

  const chave = conta["01"] || "";
  const url = conta["25"] || "";
  const tipoChave = chave ? tipoDaChave(chave) : "desconhecida";
  const extra = campos["62"] ? lerCampos(campos["62"]) : null;
  const valor = campos["54"] ? Number(campos["54"]) : null;

  return {
    ok: true,
    nome: (campos["59"] || "").trim(),
    cidade: (campos["60"] || "").trim(),
    valor: Number.isFinite(valor) ? valor : null,
    chave,
    tipoChave,
    nomeTipoChave: NOME_TIPO[tipoChave],
    chaveMascarada: mascararChave(chave, tipoChave),
    dinamico: !!url,
    dominio: url ? url.split("/")[0].toLowerCase() : "",
    descricao: conta["02"] || "",
    txid: extra && extra["05"] && extra["05"] !== "***" ? extra["05"] : "",
    crcValido,
  };
}

/**
 * Compara o Pix com o que a pessoa esperava e devolve os alertas.
 * @param {ReturnType<typeof lerPix>} pix
 * @param {{ quem?: string, valor?: number | null }} esperado
 */
export function avaliarPix(pix, esperado = {}) {
  /** @type {{ titulo: string, explicacao: string, gravidade: "baixa" | "media" | "alta" }[]} */
  const alertas = [];
  if (!pix.ok) return { risco: 0, alertas };
  let risco = 0;

  if (!pix.crcValido) {
    risco += 30;
    alertas.push({ gravidade: "alta", titulo: "Código alterado ou incompleto",
      explicacao: "O código de verificação não confere. Alguém pode ter mexido no código, ou ele foi copiado pela metade. Não pague." });
  }

  const quem = (esperado.quem || "").trim();
  if (quem) {
    const combina = nomeCombina(pix.nome, quem);
    if (combina === false) {
      risco += 45;
      alertas.push({ gravidade: "alta", titulo: "O nome de quem recebe não bate",
        explicacao: `Você esperava pagar "${quem}", mas o código manda o dinheiro para "${pix.nome || "nome não informado"}".` });
    }
    const pareceEmpresa = /(correios|banco|caixa|ita[uú]|bradesco|nubank|santander|receita|detran|governo|gov|loja|magazine|mercado|shopee|amazon|netflix|claro|vivo|tim|energia|cemig|copasa|prefeitura|serasa|ltda|s\.?a\.?)/i.test(quem);
    if (pareceEmpresa && ["cpf", "telefone", "email"].includes(pix.tipoChave)) {
      risco += 35;
      alertas.push({ gravidade: "alta", titulo: "Empresa recebendo em chave de pessoa",
        explicacao: `Empresas e órgãos públicos não recebem em ${pix.nomeTipoChave}. Isso é típico de conta de laranja.` });
    }
  }

  if (typeof esperado.valor === "number" && pix.valor !== null && Math.abs(esperado.valor - pix.valor) > 0.009) {
    risco += 30;
    alertas.push({ gravidade: "alta", titulo: "O valor é diferente do combinado",
      explicacao: `O código cobra R$ ${pix.valor.toFixed(2).replace(".", ",")}, não R$ ${esperado.valor.toFixed(2).replace(".", ",")}.` });
  }

  if (!pix.nome) {
    risco += 15;
    alertas.push({ gravidade: "media", titulo: "Recebedor sem nome", explicacao: "O código não informa quem recebe. Desconfie." });
  }

  if (!pix.dinamico && pix.valor === null) {
    alertas.push({ gravidade: "baixa", titulo: "Valor em aberto",
      explicacao: "O código não fixa o valor: quem paga é que digita. Confira o número antes de confirmar." });
  }

  alertas.push({ gravidade: "baixa", titulo: "Confira o nome no app do banco",
    explicacao: "O nome escrito dentro do código pode ser inventado por quem criou. O nome que o seu banco mostra na hora de confirmar é o verdadeiro. Se for diferente, cancele." });

  return { risco: Math.min(100, risco), alertas };
}

/** Monta um código Pix estático válido. Usado só nos exemplos do app e nos testes. */
export function montarPix({ chave, nome, cidade, valor, txid = "***" }) {
  const campo = (id, v) => `${id}${String(v.length).padStart(2, "0")}${v}`;
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  let p = campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986");
  if (valor) p += campo("54", valor.toFixed(2));
  p += campo("58", "BR") + campo("59", nome.slice(0, 25)) + campo("60", cidade.slice(0, 15)) + campo("62", campo("05", txid)) + "6304";
  return p + crc16(p);
}
