import { useState } from "react";
import { Link } from "react-router-dom";
import { FormActions } from "@/components/forms/FormActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { emailValido } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function ForgotPasswordPage() {
  const { recuperarSenha, erro, limparErro } = useAuth();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparErro();
    setMensagem("");

    if (!emailValido(email)) {
      setErroEmail("Informe um email válido.");
      return;
    }

    setErroEmail(null);

    try {
      setCarregando(true);
      await recuperarSenha(email);
      setMensagem("Enviamos um email com as instruções para redefinir sua senha.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Recuperação</p>
        <h1 className="text-3xl font-semibold text-slate-900">Esqueci minha senha</h1>
        <p className="text-sm text-slate-500">Digite seu email e enviaremos um link de recuperação.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          id="email-recuperacao"
          type="email"
          label="Email"
          placeholder="voce@exemplo.com"
          value={email}
          erro={erroEmail}
          onChange={(event) => setEmail(event.target.value)}
        />

        {erro ? <p className="text-sm font-medium text-rose-600">{erro}</p> : null}
        {mensagem ? <p className="text-sm font-medium text-emerald-600">{mensagem}</p> : null}

        <FormActions>
          <Button type="submit" disabled={carregando}>
            {carregando ? "Enviando..." : "Enviar link"}
          </Button>
        </FormActions>
      </form>

      <p className="text-sm text-slate-500">
        Lembrou sua senha?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Voltar para o login
        </Link>
      </p>
    </Card>
  );
}
