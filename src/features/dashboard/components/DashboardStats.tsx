import { Card } from "@/components/ui/Card";
import { formatarMoeda } from "@/lib/currency";

type Props = {
  turmasDoMes: number;
  alunasConfirmadas: number;
  recebido: number;
  lucroEstimado: number;
};

export function DashboardStats({ turmasDoMes, alunasConfirmadas, recebido, lucroEstimado }: Props) {
  const cards = [
    { titulo: "Turmas do mês", valor: String(turmasDoMes), detalhe: "Acompanhe a agenda ativa deste mês." },
    { titulo: "Alunas confirmadas", valor: String(alunasConfirmadas), detalhe: "Inscrições confirmadas no período." },
    { titulo: "Recebido", valor: formatarMoeda(recebido), detalhe: "Somatório de pagamentos pagos no mês." },
    { titulo: "Lucro estimado", valor: formatarMoeda(lucroEstimado), detalhe: "Recebido menos custos realizados." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.titulo} className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{card.titulo}</p>
          <p className="text-2xl font-semibold text-slate-900">{card.valor}</p>
          <p className="text-sm text-slate-400">{card.detalhe}</p>
        </Card>
      ))}
    </div>
  );
}
