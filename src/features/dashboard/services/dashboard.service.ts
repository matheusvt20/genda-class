import { fimDoMes, inicioDoMes } from "@/lib/date";
import { listClasses } from "@/features/classes/services/classes.service";
import { supabase } from "@/core/supabase/client";

export type DashboardData = {
  turmasDoMes: number;
  alunasConfirmadas: number;
  recebido: number;
  lucroEstimado: number;
  proximasTurmas: Array<{
    id: string;
    title: string;
    startsAt: string;
    ocupacao: string;
    status: string;
  }>;
  pendencias: Array<{
    enrollmentId: string;
    studentName: string;
    classTitle: string;
    balanceDue: number;
  }>;
};

export async function getDashboardData(workspaceId: string) {
  const inicio = inicioDoMes();
  const fim = fimDoMes();

  const [turmas, enrollmentsResponse, paymentsResponse, costsResponse] = await Promise.all([
    listClasses(workspaceId),
    supabase
      .from("class_enrollments")
      .select("id, status, balance_due, classes!inner(id, title, starts_at), students!inner(full_name)")
      .eq("workspace_id", workspaceId)
      .gte("classes.starts_at", inicio.toISOString())
      .lte("classes.starts_at", fim.toISOString())
      .returns<
        Array<{
          id: string;
          status: string;
          balance_due: number;
          classes: { id: string; title: string; starts_at: string };
          students: { full_name: string };
        }>
      >(),
    supabase
      .from("class_payments")
      .select("amount, status, paid_at")
      .eq("workspace_id", workspaceId)
      .gte("paid_at", inicio.toISOString())
      .lte("paid_at", fim.toISOString())
      .returns<Array<{ amount: number; status: string; paid_at: string }>>(),
    supabase
      .from("class_costs")
      .select("amount, status, incurred_at")
      .eq("workspace_id", workspaceId)
      .gte("incurred_at", inicio.toISOString().slice(0, 10))
      .lte("incurred_at", fim.toISOString().slice(0, 10))
      .returns<Array<{ amount: number; status: string; incurred_at: string }>>(),
  ]);

  if (enrollmentsResponse.error) {
    throw enrollmentsResponse.error;
  }

  if (paymentsResponse.error) {
    throw paymentsResponse.error;
  }

  if (costsResponse.error) {
    throw costsResponse.error;
  }

  const turmasDoMes = turmas.filter((item) => {
    const inicioTurma = new Date(item.starts_at);
    return inicioTurma >= inicio && inicioTurma <= fim;
  });

  const recebidos = (paymentsResponse.data ?? [])
    .filter((item) => item.status === "paid")
    .reduce((total, item) => total + Number(item.amount), 0);

  const custosRealizados = (costsResponse.data ?? [])
    .filter((item) => item.status === "realizado")
    .reduce((total, item) => total + Number(item.amount), 0);

  const alunasConfirmadas = (enrollmentsResponse.data ?? []).filter((item) => item.status === "confirmada").length;

  const pendencias = (enrollmentsResponse.data ?? [])
    .filter((item) => Number(item.balance_due) > 0)
    .slice(0, 5)
    .map((item) => ({
      enrollmentId: item.id,
      studentName: item.students.full_name,
      classTitle: item.classes.title,
      balanceDue: Number(item.balance_due),
    }));

  return {
    turmasDoMes: turmasDoMes.length,
    alunasConfirmadas,
    recebido: recebidos,
    lucroEstimado: recebidos - custosRealizados,
    proximasTurmas: turmas
      .filter((item) => new Date(item.starts_at) >= new Date())
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.title,
        startsAt: item.starts_at,
        ocupacao: `${item.vagasOcupadas}/${item.capacity} vagas`,
        status: item.statusExibicao,
      })),
    pendencias,
  } satisfies DashboardData;
}
