import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormActions } from "@/components/forms/FormActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { emailValido } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function LoginForm() {
  const navigate = useNavigate();
  const { entrar, erro, limparErro } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparErro();

    const proximosErros = {
      email: emailValido(email) ? undefined : "Informe um email válido.",
      senha: senha ? undefined : "Informe sua senha.",
    };

    setErros(proximosErros);

    if (proximosErros.email || proximosErros.senha) {
      return;
    }

    try {
      setCarregando(true);
      await entrar(email, senha);
      navigate("/dashboard", { replace: true });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Acesso</p>
        <h1 className="text-3xl font-semibold text-slate-900">Entrar no Genda Class</h1>
        <p className="text-sm text-slate-500">Use seu email e senha para acessar o painel.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="voce@exemplo.com"
          value={email}
          erro={erros.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="senha"
          type="password"
          label="Senha"
          placeholder="Sua senha"
          value={senha}
          erro={erros.senha}
          onChange={(event) => setSenha(event.target.value)}
        />

        {erro ? <p className="text-sm font-medium text-rose-600">{erro}</p> : null}

        <FormActions>
          <Button type="submit" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
          <Link className="text-sm font-medium text-brand-600 hover:text-brand-700" to="/esqueci-senha">
            Esqueci minha senha
          </Link>
        </FormActions>
      </form>

      <p className="text-sm text-slate-500">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-semibold text-brand-600 hover:text-brand-700">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}
