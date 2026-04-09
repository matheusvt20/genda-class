import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  getWorkspaceSettings,
  updateWorkspaceName,
  updateWorkspaceSettings,
  type PixKeyType,
  type WorkspaceSettings,
} from "@/features/settings/services/settings.service";

type SettingsTab = "perfil" | "pagamento" | "preferencias";

const tabs = [
  { id: "perfil", label: "Perfil da escola" },
  { id: "pagamento", label: "Pagamento" },
  { id: "preferencias", label: "Preferências" },
];

const pixKeyTypeOptions: Array<{ value: PixKeyType; label: string }> = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "Email" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
];

type ProfileForm = {
  schoolName: string;
  schoolPhone: string;
  schoolInstagram: string;
  whatsappNumber: string;
};

type PaymentForm = {
  pixKeyType: PixKeyType;
  pixKey: string;
  pixHolderName: string;
};

type PreferencesForm = {
  defaultClassCapacity: number;
  defaultDepositPercentage: number;
};

function toProfileForm(settings: WorkspaceSettings, workspaceName: string): ProfileForm {
  return {
    schoolName: settings.school_name ?? workspaceName,
    schoolPhone: settings.school_phone ?? "",
    schoolInstagram: settings.school_instagram ?? "",
    whatsappNumber: settings.whatsapp_number ?? "",
  };
}

function toPaymentForm(settings: WorkspaceSettings): PaymentForm {
  return {
    pixKeyType: settings.pix_key_type ?? "cpf",
    pixKey: settings.pix_key ?? "",
    pixHolderName: settings.pix_holder_name ?? "",
  };
}

function toPreferencesForm(settings: WorkspaceSettings): PreferencesForm {
  return {
    defaultClassCapacity: settings.default_class_capacity ?? 10,
    defaultDepositPercentage: Number(settings.default_deposit_percentage ?? 0),
  };
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");
  const [workspaceName, setWorkspaceName] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    schoolName: "",
    schoolPhone: "",
    schoolInstagram: "",
    whatsappNumber: "",
  });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    pixKeyType: "cpf",
    pixKey: "",
    pixHolderName: "",
  });
  const [preferencesForm, setPreferencesForm] = useState<PreferencesForm>({
    defaultClassCapacity: 10,
    defaultDepositPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SettingsTab | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    const response = await getWorkspaceSettings();

    setWorkspaceName(response.workspace.name);
    setProfileForm(toProfileForm(response.settings, response.workspace.name));
    setPaymentForm(toPaymentForm(response.settings));
    setPreferencesForm(toPreferencesForm(response.settings));
  }

  function showSuccessToast() {
    setSuccessMessage("Configurações salvas");
    window.setTimeout(() => setSuccessMessage(null), 3000);
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await loadSettings();
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const paymentPreview = useMemo(() => {
    return {
      title: paymentForm.pixHolderName.trim() || profileForm.schoolName.trim() || "Sua escola",
      keyType: pixKeyTypeOptions.find((item) => item.value === paymentForm.pixKeyType)?.label ?? "Pix",
      key: paymentForm.pixKey.trim() || "Sua chave Pix aparecerá aqui",
    };
  }, [paymentForm.pixHolderName, paymentForm.pixKey, paymentForm.pixKeyType, profileForm.schoolName]);

  async function handleSaveProfile() {
    setSaving("perfil");
    setError(null);
    setSuccessMessage(null);

    try {
      await Promise.all([
        updateWorkspaceName(profileForm.schoolName),
        updateWorkspaceSettings({
          school_name: profileForm.schoolName.trim() || null,
          school_phone: profileForm.schoolPhone.trim() || null,
          school_instagram: profileForm.schoolInstagram.trim() || null,
          whatsapp_number: profileForm.whatsappNumber.trim() || null,
        }),
      ]);

      await loadSettings();
      showSuccessToast();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(null);
      setLoading(false);
    }
  }

  async function handleSavePayment() {
    setSaving("pagamento");
    setError(null);
    setSuccessMessage(null);

    try {
      await updateWorkspaceSettings({
        pix_key_type: paymentForm.pixKeyType,
        pix_key: paymentForm.pixKey.trim() || null,
        pix_holder_name: paymentForm.pixHolderName.trim() || null,
      });

      await loadSettings();
      showSuccessToast();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os dados de pagamento.");
    } finally {
      setSaving(null);
      setLoading(false);
    }
  }

  async function handleSavePreferences() {
    setSaving("preferencias");
    setError(null);
    setSuccessMessage(null);

    try {
      await updateWorkspaceSettings({
        default_class_capacity: preferencesForm.defaultClassCapacity,
        default_deposit_percentage: preferencesForm.defaultDepositPercentage,
      });

      await loadSettings();
      showSuccessToast();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as preferências.");
    } finally {
      setSaving(null);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-brand-600">Configurações</p>
          <h2 className="text-3xl font-semibold text-slate-900">Dados da escola e pagamentos</h2>
        </div>
        <Card className="space-y-4">
          <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-600">Configurações</p>
        <h2 className="text-3xl font-semibold text-slate-900">Dados da escola e pagamentos</h2>
        <p className="mt-2 text-sm text-slate-500">
          Configure a identidade da escola, os dados de Pix e as preferências padrão do workspace.
        </p>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      {successMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {successMessage}
        </div>
      ) : null}

      <Tabs tabs={tabs} value={activeTab} onChange={(id) => setActiveTab(id as SettingsTab)} />

      {activeTab === "perfil" ? (
        <Card className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="settings-school-name"
              label="Nome da escola"
              value={profileForm.schoolName}
              onChange={(event) => setProfileForm((current) => ({ ...current, schoolName: event.target.value }))}
            />
            <Input
              id="settings-school-phone"
              label="Telefone da escola"
              value={profileForm.schoolPhone}
              onChange={(event) => setProfileForm((current) => ({ ...current, schoolPhone: event.target.value }))}
            />
            <Input
              id="settings-school-instagram"
              label="Instagram"
              value={profileForm.schoolInstagram}
              onChange={(event) => setProfileForm((current) => ({ ...current, schoolInstagram: event.target.value }))}
              placeholder="@suaescola"
            />
            <Input
              id="settings-whatsapp-number"
              label="WhatsApp para comprovantes"
              value={profileForm.whatsappNumber}
              onChange={(event) => setProfileForm((current) => ({ ...current, whatsappNumber: event.target.value }))}
              placeholder="11999999999"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSaveProfile()} disabled={saving === "perfil"}>
              {saving === "perfil" ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Card>
      ) : null}

      {activeTab === "pagamento" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <Card className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                id="settings-pix-key-type"
                label="Tipo da chave Pix"
                value={paymentForm.pixKeyType}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, pixKeyType: event.target.value as PixKeyType }))
                }
              >
                {pixKeyTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <Input
                id="settings-pix-key"
                label="Chave Pix"
                value={paymentForm.pixKey}
                onChange={(event) => setPaymentForm((current) => ({ ...current, pixKey: event.target.value }))}
              />
              <Input
                id="settings-pix-holder"
                label="Nome do titular"
                value={paymentForm.pixHolderName}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, pixHolderName: event.target.value }))
                }
              />
              <Textarea
                id="settings-pix-preview-note"
                label="Observação do preview"
                value={`O sinal será enviado para ${paymentPreview.title} via ${paymentPreview.keyType}.`}
                readOnly
                className="min-h-[96px] bg-slate-50"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void handleSavePayment()} disabled={saving === "pagamento"}>
                {saving === "pagamento" ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </Card>

          <Card className="space-y-4 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-brand-600">Preview da página pública</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Como o Pix vai aparecer para a aluna</h3>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Pix para sinal</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{paymentPreview.title}</p>
              <p className="mt-1 text-sm text-slate-500">{paymentPreview.keyType}</p>
              <p className="mt-4 break-all rounded-2xl bg-slate-50 px-4 py-3 font-medium text-slate-900">
                {paymentPreview.key}
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "preferencias" ? (
        <Card className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="settings-default-capacity"
              label="Capacidade padrão das turmas"
              type="number"
              min={1}
              value={preferencesForm.defaultClassCapacity}
              onChange={(event) =>
                setPreferencesForm((current) => ({
                  ...current,
                  defaultClassCapacity: Number(event.target.value || 0),
                }))
              }
            />
            <Input
              id="settings-default-deposit"
              label="Percentual padrão de sinal"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={preferencesForm.defaultDepositPercentage}
              onChange={(event) =>
                setPreferencesForm((current) => ({
                  ...current,
                  defaultDepositPercentage: Number(event.target.value || 0),
                }))
              }
            />
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Workspace atual: <span className="font-semibold text-slate-900">{workspaceName || "Não informado"}</span>
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSavePreferences()} disabled={saving === "preferencias"}>
              {saving === "preferencias" ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
