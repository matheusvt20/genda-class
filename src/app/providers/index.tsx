import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/core/supabase/client";
import type { Perfil, UsuarioAutenticado, Workspace } from "@/core/types";
import {
  cadastrarComEmailSenha,
  entrarComEmailSenha,
  enviarRecuperacaoSenha,
  sairDaConta,
} from "@/features/auth/services/auth.service";

export const AuthContext = createContext<UsuarioAutenticado | null>(null);

async function carregarDadosDoUsuario(user: User) {
  const [perfilResponse, workspaceResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Perfil>(),
    supabase
      .from("workspaces")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle<Workspace>(),
  ]);

  if (perfilResponse.error) {
    throw perfilResponse.error;
  }

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  return {
    perfil: perfilResponse.data,
    workspace: workspaceResponse.data,
  };
}

export function AppProviders({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const sincronizarAuth = useCallback(async (novaSessao: Session | null) => {
    setSession(novaSessao);
    setUser(novaSessao?.user ?? null);

    if (!novaSessao?.user) {
      setPerfil(null);
      setWorkspace(null);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      const dados = await carregarDadosDoUsuario(novaSessao.user);
      setPerfil(dados.perfil);
      setWorkspace(dados.workspace);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar a sessão.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!ativo) {
          return;
        }

        if (error) {
          setErro(error.message);
          setCarregando(false);
          return;
        }

        void sincronizarAuth(data.session);
      })
      .catch((error) => {
        if (!ativo) {
          return;
        }

        setErro(error instanceof Error ? error.message : "Falha ao iniciar a autenticação.");
        setCarregando(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      void sincronizarAuth(novaSessao);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [sincronizarAuth]);

  const entrar = useCallback(async (email: string, senha: string) => {
    setErro(null);
    await entrarComEmailSenha(email, senha);
  }, []);

  const cadastrar = useCallback(
    async (dados: { nomeCompleto: string; email: string; senha: string }) => {
      setErro(null);
      await cadastrarComEmailSenha(dados);
    },
    [],
  );

  const recuperarSenha = useCallback(async (email: string) => {
    setErro(null);
    await enviarRecuperacaoSenha(email);
  }, []);

  const sair = useCallback(async () => {
    setErro(null);
    await sairDaConta();
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  const valor = useMemo<UsuarioAutenticado>(
    () => ({
      user,
      session,
      perfil,
      workspace,
      carregando,
      erro,
      entrar,
      cadastrar,
      recuperarSenha,
      sair,
      limparErro,
    }),
    [carregando, cadastrar, entrar, erro, limparErro, perfil, recuperarSenha, sair, session, user, workspace],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
