// As 9 técnicas de manipulação que os golpistas mais usam (engenharia social).
// Usadas no jogo da Vó Zilda (cartela) e na página "Como funciona".

/** @type {{ id: string, nome: string, descricao: string, defesa: string, re: RegExp }[]} */
export const TECNICAS = [
  {
    id: "pressa",
    nome: "Pressa",
    descricao: "Dizer que é urgente, pra pessoa agir sem pensar.",
    defesa: "Golpe tem pressa, você não. Desligue e resolva com calma.",
    re: /(urgente|urg[eê]ncia|r[aá]pido|agora|imediat|j[aá] j[aá]|hoje ainda|ainda hoje|[uú]ltima chance|minutos|vai (expirar|vencer|perder)|corre|depressa|n[aã]o d[aá] tempo|prazo)/i,
  },
  {
    id: "autoridade",
    nome: "Falsa autoridade",
    descricao: "Fingir que é do banco, do governo, da polícia ou de uma empresa.",
    defesa: "Desligue e ligue você mesmo para o número oficial, o do verso do cartão.",
    re: /(banco|central|gerente|suporte|atendente|atendimento|receita federal|pol[ií]cia|delegad|correios|inss|detran|procon|funcion[aá]ri|setor|protocolo|advogad|t[eé]cnico|operadora|sou d[oa]s? |aqui [eé] d[oa]s? |falo d[oa]s? )/i,
  },
  {
    id: "medo",
    nome: "Ameaça",
    descricao: "Assustar com bloqueio, multa, processo, nome sujo ou conta invadida.",
    defesa: "Susto é ferramenta de golpista. Confira direto no app ou site oficial.",
    re: /(bloque|cancel|suspen|multa|process|pres[ao]|cadeia|negativ|nome sujo|invadi|clon|hacke|fraude|compra (suspeita|n[aã]o reconhecida)|perder (tudo|a conta|o benef[ií]cio)|d[ií]vida|problema grave)/i,
  },
  {
    id: "isca",
    nome: "Isca",
    descricao: "Oferecer prêmio, sorteio, dinheiro fácil, desconto ou herança.",
    defesa: "Prêmio de sorteio em que você não entrou não existe.",
    re: /(pr[eê]mio|ganhou|ganhar|sorteio|sortead|gr[aá]tis|brinde|desconto|promo[cç][aã]o|cashback|heran[cç]a|dinheiro f[aá]cil|renda extra|lucro|investimento|rendimento|oportunidade|indeniza[cç][aã]o|valores a receber)/i,
  },
  {
    id: "afeto",
    nome: "Falso parente",
    descricao: "Fingir que é filho, neto ou amigo que trocou de número.",
    defesa: "Ligue para o número antigo ou faça uma pergunta que só a pessoa saberia responder.",
    re: /(\bv[oó]\b|vov[oó]|\bm[aã]e\b|\bpai\b|\btia\b|sou (o |a )?(seu|sua|teu|tua)? ?(net|filh|sobrinh|afilhad)|[eé] (o|a) (seu|sua) (net|filh)|troquei de n[uú]mero|n[uú]mero novo|celular (quebrou|caiu)|saudade|lembra de mim|sou eu)/i,
  },
  {
    id: "segredo",
    nome: "Segredo",
    descricao: "Pedir pra não contar a ninguém ou não desligar o telefone.",
    defesa: "Quem pede segredo quer te isolar. Conte para alguém de confiança antes de fazer qualquer coisa.",
    re: /(n[aã]o (conta|fala|comenta|avisa|desliga)|segredo|sigilo|confidencial|s[oó] entre n[oó]s|fica na linha|n[aã]o precisa (falar|avisar|ligar)|ningu[eé]m pode saber)/i,
  },
  {
    id: "dados",
    nome: "Pesca de dados",
    descricao: "Pedir senha, código que chegou por SMS, CPF ou número do cartão.",
    defesa: "Código e senha não se passam para ninguém. Nem para o banco.",
    re: /(senha|c[oó]digo|token|\bcpf\b|\brg\b|cart[aã]o|cvv|d[ií]gitos|dados (banc|pessoa)|confirma(r)? (seus|os) dados|data de nascimento|nome da (sua )?m[aã]e|n[uú]mero da conta|ag[eê]ncia)/i,
  },
  {
    id: "dinheiro",
    nome: "Pedido de dinheiro",
    descricao: "Pedir Pix, transferência, boleto, taxa ou empréstimo.",
    defesa: "Pix não volta. Só pague depois de confirmar por outro caminho quem está pedindo.",
    re: /(\bpix\b|transfer|deposit|boleto|\btaxa\b|pagamento|pagar|empresta|me manda|manda (pra|para) mim|\d+ ?(reais|conto|mil)|r\$ ?\d)/i,
  },
  {
    id: "link",
    nome: "Link ou aplicativo",
    descricao: "Mandar clicar num link, ler um QR code ou instalar um aplicativo.",
    defesa: "Não clique nem instale. Digite você mesmo o endereço oficial.",
    re: /(link|clica|clique|acess[ae]|site|https?:|www\.|\.com\b|qr ?code|instala|baixa(r)? (o|um) (app|aplicativo|programa)|aplicativo|anydesk|teamviewer|acesso remoto|atualiza[cç][aã]o)/i,
  },
];

/** Devolve os ids das técnicas encontradas num texto. */
export function detectarTecnicas(texto) {
  const t = texto || "";
  return TECNICAS.filter((x) => x.re.test(t)).map((x) => x.id);
}
