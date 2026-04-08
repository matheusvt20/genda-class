type EmptyStateProps = {
  titulo: string;
  descricao: string;
};

export function EmptyState({ titulo, descricao }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <p className="mt-2 text-sm text-slate-500">{descricao}</p>
    </div>
  );
}
