import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getDepositPageData,
  getPublicClassLead,
  updateLeadPixStatus,
  type DepositPageData,
} from "@/features/classes/services/public-sales.service";
import { formatarMoeda } from "@/lib/currency";
import { trackPageView } from "@/lib/pixel";
import { useParams } from "react-router-dom";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildWhatsappNumber(value: string | null) {
  const digits = onlyDigits(value ?? "");

  if (!digits) {
    return "";
  }

  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function DepositPage() {
  const { slug } = useParams();
  const [data, setData] = useState<DepositPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    trackPageView();
  }, []);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await getDepositPageData(slug);

        if (!active) {
          return;
        }

        setData(response);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Não foi possível carregar os dados do sinal.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [slug]);

  const qrCodeUrl = useMemo(() => {
    const pixKey = encodeURIComponent(data?.workspace_settings.pix_key ?? "");
    return `https://api.qrserver.com/v1/create-qr-code/?data=${pixKey}&size=200x200`;
  }, [data?.workspace_settings.pix_key]);
  const hasPixConfigured = Boolean(data?.workspace_settings.pix_key?.trim());
  const whatsappNumber = data ? buildWhatsappNumber(data.workspace_settings.whatsapp_number) : "";

  async function handleSendReceipt() {
    if (!slug || !data) {
      return;
    }

    const leadId = sessionStorage.getItem(`genda:lead:${slug}`);
    const message = encodeURIComponent(
      `Oi! Acabei de enviar o sinal da turma ${data.course_name || data.title}. Meu comprovante está seguindo por aqui.`,
    );

    setSending(true);
    try {
      if (leadId) {
        const lead = await getPublicClassLead(leadId);

        if (!lead) {
          throw new Error("Lead público não encontrado para esta inscrição.");
        }

        await updateLeadPixStatus(leadId, "enviado");
      }

      if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o status do comprovante.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F3F7] px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F1F3F7] px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Card className="space-y-3 text-center">
            <p className="text-sm font-semibold text-brand-600">Sinal indisponível</p>
            <h1 className="text-3xl font-semibold text-slate-900">Não foi possível carregar esta etapa.</h1>
            <p className="text-sm text-slate-500">{error ?? "Tente novamente em instantes."}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F7] px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="space-y-3 text-center">
          <p className="text-sm font-semibold text-brand-600">Reserva da vaga</p>
          <h1 className="text-3xl font-semibold text-slate-900">Faça o pagamento do sinal</h1>
          <p className="text-sm text-slate-500">
            Envie o sinal para garantir sua vaga na turma {data.course_name || data.title}.
          </p>
        </Card>

        <Card className="space-y-5">
          <div className="rounded-[24px] bg-brand-50 p-5 text-center">
            <p className="text-sm text-brand-700">Valor do sinal</p>
            <p className="mt-1 text-4xl font-semibold text-brand-700">{formatarMoeda(Number(data.deposit_amount ?? 0))}</p>
          </div>

          {!hasPixConfigured ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Dados de pagamento não configurados. Entre em contato pelo WhatsApp.
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-[200px_1fr] md:items-center">
            <div className="mx-auto">
              {hasPixConfigured ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code Pix"
                  className="size-[200px] rounded-[24px] border border-slate-200 bg-white p-3"
                />
              ) : (
                <div className="flex size-[200px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  QR Code disponível após configurar a chave Pix
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Tipo da chave</p>
                <p className="font-semibold text-slate-900">{data.workspace_settings.pix_key_type || "Pix"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Chave</p>
                <p className="break-all font-semibold text-slate-900">{data.workspace_settings.pix_key || "Não informada"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Titular</p>
                <p className="font-semibold text-slate-900">
                  {data.workspace_settings.pix_holder_name || data.workspace_settings.school_name || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={() => void handleSendReceipt()} disabled={sending || !whatsappNumber}>
            {sending ? "Abrindo WhatsApp..." : "Enviar comprovante no WhatsApp"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
