import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormActions } from "@/components/forms/FormActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { emailValido } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";

function formatarTelefoneBrasileiro(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPasswordStrength(password: string) {
  const hasLetters = /[A-Za-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  if (password.length < 6) {
    return {
      label: "Fraca",
      level: 1,
      color: "bg-rose-500",
      textColor: "text-rose-600",
    };
  }

  if (password.length >= 8 && hasLetters && hasNumbers) {
    return {
      label: "Forte",
      level: 3,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    };
  }

  return {
    label: "Média",
    level: 2,
    color: "bg-orange-500",
    textColor: "text-orange-600",
  };
}

export function RegisterForm() {
  const navigate = useNavigate();
  const { cadastrar, erro, limparErro } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{
    nomeCompleto?: string;
    phone?: string;
    email?: string;
    senha?: string;
    confirmarSenha?: string;
  }>({});

  const passwordStrength = getPasswordStrength(senha);
  const nomeValido = nomeCompleto.trim().length > 0;
  const phoneValido = phone.replace(/\D/g, "").length >= 10;
  const emailEhValido = emailValido(email);
  const senhaValida = senha.length >= 6;
  const confirmarSenhaValida = confirmarSenha.length > 0 && confirmarSenha === senha;
  const formValido = nomeValido && phoneValido && emailEhValido && senhaValida && confirmarSenhaValida;
  const erroConfirmacaoEmTempoReal =
    confirmarSenha.length > 0 && confirmarSenha !== senha ? "As senhas não coincidem" : undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparErro();

    const proximosErros = {
      nomeCompleto: nomeCompleto.trim() ? undefined : "Informe seu nome completo.",
      phone: phone.replace(/\D/g, "").length >= 10 ? undefined : "Informe um WhatsApp válido.",
      email: emailValido(email) ? undefined : "Informe um email válido.",
      senha: senha.length >= 6 ? undefined : "A senha precisa ter pelo menos 6 caracteres.",
      confirmarSenha: confirmarSenha === senha ? undefined : "As senhas não coincidem",
    };

    setErros(proximosErros);

    if (
      proximosErros.nomeCompleto ||
      proximosErros.phone ||
      proximosErros.email ||
      proximosErros.senha ||
      proximosErros.confirmarSenha
    ) {
      return;
    }

    try {
      setCarregando(true);
      const resultado = await cadastrar({ nomeCompleto, phone, email, senha });

      if (resultado.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          cadastroPendente: true,
          email,
        },
      });
    } catch {
      return;
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Cadastro</p>
        <h1 className="text-3xl font-semibold text-slate-900">Criar conta</h1>
        <p className="text-sm text-slate-500">Seu workspace será criado automaticamente no primeiro acesso.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          id="nome-completo"
          label="Nome completo"
          placeholder="Seu nome"
          value={nomeCompleto}
          erro={erros.nomeCompleto}
          onChange={(event) => setNomeCompleto(event.target.value)}
        />
        <Input
          id="whatsapp-cadastro"
          label="WhatsApp"
          placeholder="(21) 99999-9999"
          inputMode="tel"
          value={phone}
          erro={erros.phone}
          onChange={(event) => setPhone(formatarTelefoneBrasileiro(event.target.value))}
        />
        <Input
          id="email-cadastro"
          type="email"
          label="Email"
          placeholder="voce@exemplo.com"
          value={email}
          erro={erros.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="senha-cadastro"
          type="password"
          label="Senha"
          placeholder="Crie uma senha"
          value={senha}
          erro={erros.senha}
          onChange={(event) => setSenha(event.target.value)}
        />
        <div className="-mt-2 space-y-2">
          <div className="flex gap-2">
            {[0, 1, 2].map((segment) => (
              <div
                key={segment}
                className={`h-2 flex-1 rounded-full ${
                  segment < passwordStrength.level ? passwordStrength.color : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <p className={`text-xs font-medium ${passwordStrength.textColor}`}>Força da senha: {passwordStrength.label}</p>
        </div>
        <Input
          id="confirmar-senha-cadastro"
          type="password"
          label="Repetir senha"
          placeholder="Repita sua senha"
          value={confirmarSenha}
          erro={erroConfirmacaoEmTempoReal ?? erros.confirmarSenha}
          onChange={(event) => setConfirmarSenha(event.target.value)}
        />

        {erro ? <p className="text-sm font-medium text-rose-600">{erro}</p> : null}

        <FormActions>
          <Button type="submit" disabled={carregando || !formValido}>
            {carregando ? "Criando conta..." : "Criar conta"}
          </Button>
        </FormActions>
      </form>

      <p className="text-sm text-slate-500">
        Já tem conta?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
