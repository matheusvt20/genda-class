import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  getPublicAttendanceRoster,
  getPublicAttendanceSession,
  submitPublicAttendanceCheckin,
  type AttendanceRosterItem,
} from "@/features/classes/services/classes.service";
import { formatarData } from "@/lib/date";

export function PublicAttendancePage() {
  const { token } = useParams();
  const [session, setSession] = useState<{
    session_id: string;
    class_id: string;
    class_title: string;
    attendance_date: string;
    is_active: boolean;
  } | null>(null);
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const [currentSession, currentRoster] = await Promise.all([
        getPublicAttendanceSession(token),
        getPublicAttendanceRoster(token),
      ]);

      setSession(currentSession);
      setRoster(currentRoster);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedEnrollmentId) {
      return;
    }

    setSaving(true);
    try {
      await submitPublicAttendanceCheckin(token, selectedEnrollmentId);
      setMessage("Presença confirmada com sucesso.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F3F7] p-6">
        <div className="mx-auto max-w-lg">
          <Card className="p-10 text-center text-sm text-slate-500">Carregando chamada...</Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F1F3F7] p-6">
        <div className="mx-auto max-w-lg">
          <Card className="space-y-4 p-10 text-center">
            <QrCode className="mx-auto size-10 text-brand-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Chamada não encontrada</h1>
            <p className="text-sm text-slate-500">Este QR Code expirou ou ainda não foi iniciado.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F7] p-4 sm:p-6">
      <div className="mx-auto max-w-lg space-y-4">
        <Card className="space-y-3 text-center">
          <QrCode className="mx-auto size-10 text-brand-600" />
          <p className="text-sm font-semibold text-brand-600">Chamada do dia</p>
          <h1 className="text-3xl font-semibold text-slate-900">{session.class_title}</h1>
          <p className="text-sm text-slate-500">{formatarData(session.attendance_date)}</p>
        </Card>

        <Card className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              id="attendance-student"
              label="Selecione seu nome"
              value={selectedEnrollmentId}
              onChange={(event) => setSelectedEnrollmentId(event.target.value)}
            >
              <option value="">Escolha uma opção</option>
              {roster.map((item) => (
                <option key={item.enrollmentId} value={item.enrollmentId} disabled={Boolean(item.checkedInAt)}>
                  {item.studentName}
                  {item.checkedInAt ? " • já confirmado" : ""}
                </option>
              ))}
            </Select>

            <Button type="submit" className="w-full" disabled={!session.is_active || !selectedEnrollmentId || saving}>
              {saving ? "Confirmando..." : "Confirmar presença"}
            </Button>
          </form>

          {message ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="size-4" />
              {message}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Quem já escaneou</p>
          <div className="space-y-2">
            {roster.filter((item) => item.checkedInAt).length === 0 ? (
              <p className="text-sm text-slate-500">Ainda não temos presenças registradas.</p>
            ) : (
              roster
                .filter((item) => item.checkedInAt)
                .map((item) => (
                  <div key={item.enrollmentId} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {item.studentName}
                  </div>
                ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
