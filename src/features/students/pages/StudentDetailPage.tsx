import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Instagram, MessageCircle, PencilLine } from "lucide-react";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StudentFormDialog } from "@/features/students/components/StudentFormDialog";
import {
  getStudentDetail,
  saveStudent,
  type StudentDetailData,
  type StudentFormValues,
} from "@/features/students/services/students.service";
import { formatarMoeda } from "@/lib/currency";
import { formatarData } from "@/lib/date";
import { telefoneParaWhatsapp } from "@/lib/phone";

const tabs = [
  { id: "perfil", label: "Perfil" },
  { id: "historico", label: "Histórico de cursos" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "certificados", label: "Certificados" },
];

export function StudentDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("perfil");
  const [data, setData] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadData() {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      setData(await getStudentDetail(id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  if (loading || !data) {
    return <LoadingScreen />;
  }

  const whatsapp = data.student.phone ? telefoneParaWhatsapp(data.student.phone) : null;

  async function handleSave(values: StudentFormValues) {
    if (!id || !data.student.workspace_id) {
      return;
    }

    setSaving(true);
    try {
      await saveStudent(data.student.workspace_id, values, id);
      setDialogOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  const initialValues: StudentFormValues = {
    fullName: data.student.full_name,
    phone: data.student.phone ?? "",
    email: data.student.email ?? "",
    instagram: data.student.instagram ?? "",
    notes: data.student.notes ?? "",
    isActive: data.student.is_active,
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-soft">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              to="/alunas"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 whitespace-nowrap"
            >
              <ArrowLeft className="size-4" />
              Voltar para alunas
            </Link>
            <div className="hidden h-12 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-600">
                Ficha da aluna
              </p>
              <h2 className="truncate text-[17px] font-medium text-slate-900">{data.student.full_name}</h2>
            </div>
          </div>
          <Button className="h-10 gap-2 self-start px-4 text-sm sm:self-auto" onClick={() => setDialogOpen(true)}>
            <PencilLine className="size-4" />
            Editar
          </Button>
        </div>

        <div className="grid border-t border-slate-200 md:grid-cols-3">
          <div className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r md:border-slate-200">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Cursos realizados
            </p>
            <p className="text-[18px] font-medium text-slate-900">{data.totalCursos}</p>
          </div>
          <div className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r md:border-slate-200">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Total já pago
            </p>
            <p className="text-[18px] font-medium text-emerald-600">{formatarMoeda(data.totalPago)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Saldo devedor
            </p>
            <p className="text-[18px] font-medium text-orange-500">{formatarMoeda(data.saldoDevedor)}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-t-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-b-2 border-brand-600 bg-brand-50 text-brand-600"
                    : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "perfil" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div
            className="space-y-4 rounded-2xl px-4 py-3"
            style={{ background: "var(--color-background-secondary)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Contato</p>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-2 text-sm">
                <span className="text-slate-500">Telefone</span>
                <span className="text-right font-semibold text-slate-900">{data.student.phone || "Não informado"}</span>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-2 text-sm">
                <span className="text-slate-500">Instagram</span>
                <span className="text-right font-semibold text-slate-900">{data.student.instagram || "Não informado"}</span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-slate-500">Email</span>
                <span className="text-right font-semibold text-slate-900">{data.student.email || "Não informado"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white"
                >
                  <MessageCircle className="size-4" />
                  Abrir WhatsApp
                </a>
              ) : null}
              {data.student.instagram ? (
                <a
                  href={`https://instagram.com/${data.student.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                >
                  <Instagram className="size-4" />
                  Ver Instagram
                </a>
              ) : null}
            </div>
          </div>

          <div
            className="space-y-4 rounded-2xl px-4 py-3"
            style={{ background: "var(--color-background-secondary)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Status e observações
            </p>

            <div className="space-y-2">
              <p className="text-sm text-slate-500">Status</p>
              <Badge tom={data.student.is_active ? "azul" : "cinza"}>
                {data.student.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-500">Observações</p>
              <p className="text-sm leading-6 text-slate-700">{data.student.notes || "Sem observações cadastradas."}</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "historico" ? (
        <div className="grid gap-4">
          {data.enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{enrollment.classes?.title || "Curso"}</h3>
                  <p className="text-sm text-slate-500">{formatarData(enrollment.classes?.starts_at || enrollment.enrolled_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tom="azul">{enrollment.status.replaceAll("_", " ")}</Badge>
                  <Badge tom={enrollment.payment_status === "pago" ? "verde" : "laranja"}>
                    {enrollment.payment_status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                <span>Valor pago: {formatarMoeda(enrollment.sale_price - enrollment.balance_due)}</span>
                <span>Valor total: {formatarMoeda(enrollment.sale_price)}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "pagamentos" ? (
        <div className="grid gap-4">
          {data.payments.map((payment) => (
            <Card key={payment.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{payment.classes?.title || "Turma"}</h3>
                <p className="text-sm text-slate-500">{formatarData(payment.paid_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-900">{formatarMoeda(payment.amount)}</p>
                <p className="text-sm text-slate-500">
                  {payment.payment_type} • {payment.payment_method}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "certificados" ? (
        <div className="grid gap-4">
          {data.certificados.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">Nenhum certificado disponível ainda.</p>
            </Card>
          ) : (
            data.certificados.map((certificate) => (
              <Card key={certificate.enrollmentId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{certificate.courseTitle}</h3>
                  <p className="text-sm text-slate-500">
                    {formatarData(certificate.date)}
                    {certificate.durationHours ? ` • ${certificate.durationHours} horas` : ""}
                  </p>
                </div>
                <Button variante="secundaria" disabled={!certificate.available}>
                  {certificate.available ? "Baixar PDF (fase futura)" : "Disponível após conclusão"}
                </Button>
              </Card>
            ))
          )}
        </div>
      ) : null}

      <StudentFormDialog
        open={dialogOpen}
        title="Editar aluna"
        description="Atualize dados cadastrais e status da ficha."
        loading={saving}
        initialValues={initialValues}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
