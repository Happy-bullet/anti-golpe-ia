// Testes do Raio-X do Pix (não precisa de internet). Uso: npm run testar-pix
import { crc16, lerPix, avaliarPix, montarPix, tipoDaChave, acharCodigoPix, nomeCombina } from "../lib/pix.mjs";
import { detectarTecnicas } from "../lib/tecnicas.mjs";

let falhas = 0;
function confere(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "✅" : "❌"} ${nome}${ok ? "" : `  → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}

// Vetor de teste padrão do CRC16-CCITT (FFFF): "123456789" -> 29B1
confere("CRC16 do vetor padrão", crc16("123456789"), "29B1");

const golpe = montarPix({ chave: "+5562999990000", nome: "MARCOS A SILVA", cidade: "GOIANIA", valor: 24.9 });
const lido = lerPix(golpe);
confere("lê um Pix montado", lido.ok && [lido.nome, lido.cidade, lido.valor, lido.tipoChave, lido.crcValido], ["MARCOS A SILVA", "GOIANIA", 24.9, "telefone", true]);
confere("Correios pagando pessoa física = não pague", avaliarPix(lido, { quem: "Correios", valor: 24.9 }).risco >= 60, true);

const loja = lerPix(montarPix({ chave: "12345678000195", nome: "PADARIA PAO QUENTE LTDA", cidade: "UBERLANDIA", valor: 23.9 }));
confere("padaria com CNPJ = confere", avaliarPix(loja, { quem: "Padaria Pão Quente", valor: 23.9 }).risco < 30, true);
confere("valor diferente do combinado", avaliarPix(loja, { quem: "Padaria Pão Quente", valor: 13.9 }).alertas.some((a) => a.titulo.includes("valor")), true);

const adulterado = golpe.replace("MARCOS", "MARCAS");
confere("código adulterado é detectado", lerPix(adulterado).ok && lerPix(adulterado).crcValido, false);
confere("texto qualquer é recusado", lerPix("oi tudo bem").ok, false);
confere("código cortado é recusado", lerPix(golpe.slice(0, 60)).ok, false);

confere("chave aleatória", tipoDaChave("123e4567-e89b-12d3-a456-426655440000"), "aleatoria");
confere("chave e-mail", tipoDaChave("loja@exemplo.com.br"), "email");
confere("chave CNPJ", tipoDaChave("12345678000195"), "cnpj");
confere("acha o Pix no meio da mensagem", acharCodigoPix(`Pague a taxa aqui: ${golpe} obrigado`), golpe);
confere("nome combina (com acento e sufixo)", nomeCombina("PADARIA PAO QUENTE LTDA", "Padaria Pão Quente"), true);
confere("nome não combina", nomeCombina("MARCOS A SILVA", "Correios"), false);

confere("técnicas: falso parente + dinheiro + pressa", detectarTecnicas("Oi vó, sou seu neto, preciso de um pix urgente"), ["pressa", "afeto", "dinheiro"]);
confere("técnicas: conversa neutra", detectarTecnicas("Boa tarde, tudo bem com a senhora?"), []);

console.log(falhas ? `\n${falhas} teste(s) falharam` : "\nTodos os testes passaram");
process.exit(falhas ? 1 : 0);
