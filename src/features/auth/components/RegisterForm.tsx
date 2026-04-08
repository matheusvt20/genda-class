import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormActions } from "@/components/forms/FormActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { emailValido } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function RegisterForm() {
  const navigate = useNavigate();
  const { cadastrar, erro, limparErro } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{
    nomeCompleto?: string;
    email?: string;
    senha?: string;
  }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparErro();

    const proximosErros = {
      nomeCompleto: nomeCompleto.trim() ? undefined : "Informe seu nome completo.",
      email: emailValido(email) ? undefined : "Informe um email válido.",
      senha: senha.length >= 6 ? undefined : "A senha precisa ter pelo menos 6 caracteres.",
    };

    setErros(proximosErros);

    if (proximosErros.nomeCompleto || proximosErros.email || proximosErros.senha) {
      return;
    }

    try {
      setCarregando(true);
      await cadastrar({ nomeCompleto, email, senha });
      navigate("/dashboard", { replace: true });
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

        {erro ? <p className="text-sm font-medium text-rose-600">{erro}</p> : null}

        <FormActions>
          <Button type="submit" disabled={carregando}>
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
