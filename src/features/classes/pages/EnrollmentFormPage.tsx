import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClassLead, getPublicClassBySlug, type PublicClassData } from "@/features/classes/services/public-sales.service";

const sourceOptions = [
  "Instagram",
  "WhatsApp",
  "Indicação",
  "Google",
  "Evento",
  "Outro",
];

export function EnrollmentFormPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<PublicClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({
    fullName: "",
    phone: "",
    instagram: "",
    source: sourceOptions[0],
  });

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    async function loadClass() {
      setLoading(true);
      setError(null);

      try {
        const response = await getPublicClassBySlug(slug);

        if (!active) {
          return;
        }

        setClassData(response);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Não foi possível carregar a turma.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadClass();

    return () => {
      active = false;
    };
  }, [slug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createClassLead(slug, values);
      sessionStorage.setItem(`genda:lead:${slug}`, response.leadId);
      navigate(`/curso/${slug}/sinal`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir sua inscrição.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F3F7] px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="h-80 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-[#F1F3F7] px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Card className="space-y-3 text-center">
            <p className="text-sm font-semibold text-brand-600">Inscrição indisponível</p>
            <h1 className="text-3xl font-semibold text-slate-900">Não encontramos esta turma.</h1>
            <p className="text-sm text-slate-500">{error ?? "Verifique o link e tente novamente."}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F7] px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-brand-600">Quase lá</p>
          <h1 className="text-3xl font-semibold text-slate-900">Inscrição para {classData.course_name || classData.title}</h1>
          <p className="text-sm text-slate-500">Preencha seus dados para receber as instruções do sinal.</p>
        </Card>

        <Card>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="lead-full-name"
              label="Nome completo"
              value={values.fullName}
              onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))}
              required
            />
            <Input
              id="lead-phone"
              label="Telefone"
              value={values.phone}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
              required
            />
            <Input
              id="lead-instagram"
              label="Instagram"
              value={values.instagram}
              onChange={(event) => setValues((current) => ({ ...current, instagram: event.target.value }))}
              placeholder="@seuinstagram"
            />
            <Select
              id="lead-source"
              label="Como ficou sabendo"
              value={values.source}
              onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))}
            >
              {sourceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Continuar para o sinal"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
