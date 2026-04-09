import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlanLimitModal } from "@/components/ui/PlanLimitModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { StudentFormDialog } from "@/features/students/components/StudentFormDialog";
import {
  getStudentCount,
  listStudents,
  saveStudent,
  type StudentFormValues,
  type StudentListItem,
} from "@/features/students/services/students.service";
import { supabase } from "@/core/supabase/client";
import { formatarMoeda } from "@/lib/currency";

const filters = [
  { id: "todas", label: "Todas" },
  { id: "com_debito", label: "Com débito" },
  { id: "ativas", label: "Ativas" },
  { id: "inativas", label: "Inativas" },
] as const;

const valoresPadrao: StudentFormValues = {
  fullName: "",
  phone: "",
  email: "",
  instagram: "",
  notes: "",
  isActive: true,
};

type StudentPaymentSummaryRow = {
  student_id: string;
  amount: number;
  status: "paid" | "pending" | "cancelled";
  payment_type: string;
};

type StudentPageItem = StudentListItem & {
  totalPago: number;
};

function getStatusBadge(student: StudentPageItem) {
  if (student.statusFinanceiro === "com_debito") {
    return "bg-[#FEF9C3] text-[#854D0E]";
  }

  return "bg-[#DCFCE7] text-[#166534]";
}

export function StudentsPage() {
  const { workspace } = useAuth();
  const [students, setStudents] = useState<StudentPageItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("todas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  async function loadStudents() {
    if (!workspace?.id) {
      return;
    }

    setLoading(true);
    try {
      const [studentList, paymentsResponse] = await Promise.all([
        listStudents(workspace.id),
        supabase
          .from("class_payments")
          .select("student_id, amount, status, payment_type")
          .eq("workspace_id", workspace.id)
          .returns<StudentPaymentSummaryRow[]>(),
      ]);

      if (paymentsResponse.error) {
        throw paymentsResponse.error;
      }

      const totalPaidByStudent = new Map<string, number>();
      for (const payment of paymentsResponse.data ?? []) {
        if (payment.status !== "paid") {
          continue;
        }

        const signedAmount =
          payment.payment_type === "reembolso" ? Number(payment.amount) * -1 : Number(payment.amount);

        totalPaidByStudent.set(
          payment.student_id,
          (totalPaidByStudent.get(payment.student_id) ?? 0) + signedAmount,
        );
      }

      setStudents(
        studentList.map((student) => ({
          ...student,
          totalPago: totalPaidByStudent.get(student.id) ?? 0,
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, [workspace?.id]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !term ||
        student.full_name.toLowerCase().includes(term) ||
        student.phone?.toLowerCase().includes(term) ||
        student.instagram?.toLowerCase().includes(term);

      if (!matchesSearch) {
        return false;
      }

      if (activeFilter === "com_debito") {
        return student.statusFinanceiro === "com_debito";
      }

      if (activeFilter === "ativas") {
        return student.is_active;
      }

      if (activeFilter === "inativas") {
        return !student.is_active;
      }

      return true;
    });
  }, [activeFilter, search, students]);

  const studentLimitReached = students.length >= 20;

  async function handleOpenNewStudentDialog() {
    if (!workspace?.id) {
      return;
    }

    const count = await getStudentCount(workspace.id);

    if (count >= 20) {
      setLimitModalOpen(true);
      return;
    }

    setDialogOpen(true);
  }

  async function handleCreate(values: StudentFormValues) {
    if (!workspace?.id) {
      return;
    }

    setSaving(true);
    try {
      await saveStudent(workspace.id, values);
      setDialogOpen(false);
      await loadStudents();
    } catch (error) {
      if (error instanceof Error && error.message === "PLAN_LIMIT_STUDENTS") {
        setDialogOpen(false);
        setLimitModalOpen(true);
        return;
      }

      throw error;
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#2D4EF5]">Alunas</p>
          <h2 className="mt-1 text-[20px] font-medium text-slate-900">Base de alunas</h2>
        </div>
        <Button
          className="gap-2 whitespace-nowrap bg-[#2D4EF5] hover:bg-[#2643d8]"
          onClick={() => void handleOpenNewStudentDialog()}
        >
          <Plus className="size-4" />
          Nova aluna
          {studentLimitReached ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
              Free
            </span>
          ) : null}
        </Button>
      </Card>

      <Card className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-[10px]">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, telefone ou Instagram..."
              className="h-12 min-w-[200px] w-full flex-1 rounded-[6px] border border-transparent bg-[var(--color-background-secondary)] pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2D4EF5]"
            />
          </div>

          <div className="flex flex-wrap gap-[10px]">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full border px-6 py-3 text-sm font-medium transition ${
                    active
                      ? "border-[#2D4EF5] bg-[#2D4EF5] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {filteredStudents.length === 0 ? (
        <EmptyState
          titulo="Nenhuma aluna encontrada"
          descricao="Cadastre sua primeira aluna para acompanhar histórico, pagamentos e débitos."
        />
      ) : (
        <>
          <div className="hidden sm:block">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
            <div
              className="items-center bg-[var(--color-background-secondary)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500"
              style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px 80px" }}
            >
              <span>Aluna</span>
              <span>Cursos</span>
              <span>Total pago</span>
              <span>Status</span>
              <span />
            </div>

            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="items-center border-b border-slate-200/80 px-4 py-[10px] last:border-b-0"
                style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px 80px" }}
              >
                <div className="min-w-0 pr-4">
                  <p className="truncate text-[13px] font-bold text-slate-900">{student.full_name}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {student.phone || "Telefone não informado"} · {student.instagram || "Instagram não informado"}
                  </p>
                </div>

                <p className="text-[13px] font-medium text-slate-900">{student.totalCursos}</p>

                <p className="text-[13px] font-medium text-[#16A34A]">{formatarMoeda(student.totalPago)}</p>

                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadge(
                      student,
                    )} whitespace-nowrap`}
                  >
                    {student.statusFinanceiro === "com_debito" ? "Com débito" : "Em dia"}
                  </span>
                </div>

                <div className="flex justify-end">
                  <Link
                    to={`/alunas/${student.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-[6px] bg-[#EEF1FF] px-3 text-[12px] font-medium text-[#2D4EF5] transition hover:bg-[#dfe5ff]"
                  >
                    Ver ficha
                  </Link>
                </div>
              </div>
            ))}
            </div>
          </div>

          <div className="block sm:hidden">
            <div className="grid gap-[10px]">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">{student.full_name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{student.phone || "Telefone não informado"}</p>
                    <p className="text-[11px] text-slate-500">{student.instagram || "Instagram não informado"}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadge(
                      student,
                    )} whitespace-nowrap`}
                  >
                    {student.statusFinanceiro === "com_debito" ? "Com débito" : "Em dia"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.05em] text-slate-500">Cursos</p>
                    <p className="mt-1 text-[13px] font-medium text-slate-900">{student.totalCursos}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.05em] text-slate-500">Total pago</p>
                    <p className="mt-1 text-[13px] font-medium text-[#16A34A]">{formatarMoeda(student.totalPago)}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Link
                    to={`/alunas/${student.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-[6px] bg-[#EEF1FF] px-3 text-[12px] font-medium text-[#2D4EF5]"
                  >
                    Ver ficha
                  </Link>
                </div>
              </Card>
            ))}
            </div>
          </div>
        </>
      )}

      <StudentFormDialog
        open={dialogOpen}
        title="Nova aluna"
        description="Cadastre dados básicos e deixe a ficha pronta para futuras turmas."
        loading={saving}
        initialValues={valoresPadrao}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
      <PlanLimitModal open={limitModalOpen} type="aluna" onClose={() => setLimitModalOpen(false)} />
    </div>
  );
}
