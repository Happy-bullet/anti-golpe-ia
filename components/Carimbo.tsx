const COR = {
  golpe: "text-golpe",
  suspeito: "text-alerta",
  seguro: "text-seguro",
} as const;

/** O carimbo do veredito. `texto` muda conforme a tela (ex.: "Golpe", "Não pague", "Acertou"). */
export default function Carimbo({
  nivel,
  texto,
  className = "",
}: {
  nivel: keyof typeof COR;
  texto: string;
  className?: string;
}) {
  return (
    <span role="status" className={`carimbo carimbo-bate ${COR[nivel]} ${className}`}>
      {texto}
    </span>
  );
}
