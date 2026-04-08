import { Card } from "@/components/ui/Card";

const cards = [
  { titulo: "Turmas do mês", valor: "0", detalhe: "Em breve" },
  { titulo: "Alunas confirmadas", valor: "0", detalhe: "Em breve" },
  { titulo: "Recebido", valor: "R$ 0,00", detalhe: "Em breve" },
  { titulo: "Lucro estimado", valor: "R$ 0,00", detalhe: "Em breve" },
];

export function DashboardStats() {
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
