// Banco de mensagens do jogo "É golpe ou não?".
// São exemplos escritos para o jogo, com nomes e números inventados.

export interface Carta {
  id: number;
  de: string; // quem aparece como remetente
  texto: string;
  golpe: boolean;
  porque: string; // explicação mostrada depois da resposta
}

export const CARTAS: Carta[] = [
  { id: 1, de: "Número desconhecido", golpe: true,
    texto: "Oi pai, esse é meu número novo, o outro deu problema. Salva aí. Preciso de um favor urgente, consegue me fazer um pix de 1.800? Amanhã te devolvo",
    porque: "Número novo + pressa + Pix é o roteiro do falso parente. Ligue para o número antigo antes de qualquer coisa." },
  { id: 2, de: "CORREIOS", golpe: true,
    texto: "Sua encomenda foi taxada. Pague a taxa de R$ 32,40 em até 24 horas para liberar a entrega: https://correios-entrega.xyz/pagar",
    porque: "Os Correios não cobram taxa por link em SMS. E o site oficial termina em correios.com.br, não em .xyz." },
  { id: 3, de: "WhatsApp", golpe: false,
    texto: "Seu código de verificação do WhatsApp é 482-913. Não compartilhe este código com ninguém.",
    porque: "É o aviso verdadeiro: ele não pede nada e ainda manda não compartilhar. Vira golpe só se alguém pedir esse código pra você." },
  { id: 4, de: "Pesquisa Magalu", golpe: true,
    texto: "Olá! Para confirmar seu cadastro e liberar o cupom de R$ 100, me informa o código de 6 dígitos que acabou de chegar por SMS.",
    porque: "Quem pede o código que chegou por SMS quer clonar o seu WhatsApp. Nenhuma empresa pede isso." },
  { id: 5, de: "Nubank", golpe: false,
    texto: "Compra aprovada no crédito de R$ 23,90 em PADARIA PAO QUENTE. Se não reconhecer, entre em contato pelo app.",
    porque: "Aviso normal de compra: não tem link, não tem telefone, não tem pressa. Manda resolver pelo aplicativo oficial." },
  { id: 6, de: "ITAU", golpe: true,
    texto: "Compra suspeita de R$ 2.799,00 no seu cartão final 4421. Caso não reconheça, ligue agora para nosso setor de fraude 0800 777 1923",
    porque: "Falsa central: o susto serve pra você ligar para o número do golpista. Ligue só para o número do verso do cartão." },
  { id: 7, de: "Vó Cida", golpe: false,
    texto: "Filho, chegou a conta de luz, deixei em cima da mesa. Paga quando der que depois eu acerto com você",
    porque: "Conversa comum de família, de um contato salvo, sem pressa e sem link." },
  { id: 8, de: "RH Vagas Online", golpe: true,
    texto: "Vaga home office! Ganhe de R$ 200 a R$ 800 por dia só curtindo vídeos. Sem experiência. Chama no WhatsApp para começar hoje",
    porque: "Dinheiro fácil por tarefa simples é isca. Depois pedem um depósito para liberar os ganhos." },
  { id: 9, de: "Mercado Livre", golpe: false,
    texto: "Seu pacote chega amanhã. Acompanhe pelo app ou em mercadolivre.com.br/vendas",
    porque: "O endereço é o site oficial e a mensagem não pede pagamento nem dado nenhum." },
  { id: 10, de: "Comprador OLX", golpe: true,
    texto: "Oi, acabei de te mandar um pix de 350 mas era pra ser 35, errei o zero. Consegue me devolver os 315? Mandei o comprovante aí",
    porque: "Golpe do Pix errado: o comprovante é falso ou agendado. Confira o extrato no app do banco antes de devolver." },
  { id: 11, de: "Clínica São José", golpe: false,
    texto: "Lembrete: sua consulta está marcada para 20/11 às 9h. Responda 1 para confirmar ou 2 para remarcar.",
    porque: "Lembrete de consulta: não pede dinheiro, dado pessoal nem clique em link." },
  { id: 12, de: "SERASA", golpe: true,
    texto: "Seu CPF possui pendência e seu nome será negativado amanhã. Regularize com 90% de desconto: http://serasa-acordo.online/quitar",
    porque: "Ameaça com prazo + desconto milagroso + site que imita a Serasa. O oficial é serasa.com.br." },
  { id: 13, de: "Caixa", golpe: true,
    texto: "Seu acesso ao app foi bloqueado por segurança. Atualize seus dados em https://caixa-atualizacao.site para evitar o cancelamento da conta",
    porque: "Banco não manda link para atualizar dados. O endereço verdadeiro da Caixa é caixa.gov.br." },
  { id: 14, de: "Bia (faculdade)", golpe: false,
    texto: "Te mandei o pix do rolê de sábado, 45 conto certinho. Valeu por pagar a conta",
    porque: "Fala de Pix, mas é alguém conhecido avisando que pagou. Não pede nada de volta." },
  { id: 15, de: "GOV.BR", golpe: true,
    texto: "Você tem valores a receber de R$ 1.247,30. Consulte e resgate agora informando seu CPF e dados bancários em valores-receber-gov.top",
    porque: "O governo não avisa por SMS com link. Sites oficiais terminam em .gov.br, nunca em .top." },
  { id: 16, de: "iFood", golpe: false,
    texto: "Hoje tem frete grátis nos restaurantes parceiros até meia-noite. Peça pelo app!",
    porque: "Promoção comum: manda usar o aplicativo oficial e não pede dado nem pagamento adiantado." },
  { id: 17, de: "Suporte Técnico", golpe: true,
    texto: "Detectamos um vírus no seu celular. Instale o aplicativo de suporte pelo link abaixo e informe o código de acesso ao nosso técnico: bit.ly/suporte-seguro",
    porque: "Aplicativo de acesso remoto dá o controle do seu celular ao golpista. Nenhuma empresa detecta vírus por mensagem." },
  { id: 18, de: "Tio Marcos", golpe: false,
    texto: "Bom dia! A reunião de família ficou pra domingo às 11h na casa da sua tia. Leva refrigerante.",
    porque: "Recado de um contato conhecido, sem pedido de dinheiro, dado ou clique." },
  { id: 19, de: "DETRAN", golpe: true,
    texto: "Consta multa pendente no seu veículo. Pague até hoje com desconto para evitar suspensão da CNH. Acesse http://45.162.13.88/detran",
    porque: "Endereço feito só de números não é site de órgão público. Multa se consulta no site ou app oficial." },
  { id: 20, de: "Loja Americanas", golpe: true,
    texto: "Parabéns! Você foi selecionado no sorteio de aniversário e ganhou uma Smart TV. Resgate seu prêmio em: bit.ly/premio-tv-2026",
    porque: "Sorteio em que você não entrou + link encurtado, que esconde o endereço verdadeiro." },
];

export const RODADAS = 8;
export const SEGUNDOS_POR_CARTA = 20;

/** Sorteia as cartas de uma partida, misturando golpes e mensagens legítimas. */
export function sortearPartida(): Carta[] {
  const embaralhar = <T,>(lista: T[]) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };
  const golpes = embaralhar(CARTAS.filter((c) => c.golpe)).slice(0, 5);
  const legitimas = embaralhar(CARTAS.filter((c) => !c.golpe)).slice(0, RODADAS - 5);
  return embaralhar([...golpes, ...legitimas]);
}

export function tituloDoPlacar(acertos: number): string {
  if (acertos >= RODADAS) return "Detetive de golpes";
  if (acertos >= RODADAS - 2) return "Olho vivo";
  if (acertos >= RODADAS / 2) return "Precisa de mais treino";
  return "Alvo fácil para golpista";
}
