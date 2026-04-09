import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

function obterNomeCompleto(user: User) {
  const nome = user.user_metadata.full_name;
  return typeof nome === "string" && nome.trim() ? nome.trim() : null;
}

function obterTelefone(user: User) {
  const phone = user.user_metadata.phone;
  return typeof phone === "string" && phone.trim() ? phone.trim() : null;
}

function obterNomeWorkspace(user: User) {
  return obterNomeCompleto(user) ?? "Meu Negócio";
}

async function buscarPerfil(userId: string) {
  return supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Perfil>();
}

async function buscarWorkspace(userId: string) {
  return supabase.from("workspaces").select("*").eq("owner_user_id", userId).maybeSingle<Workspace>();
}

async function garantirPerfil(perfil: Perfil | null, user: User) {
  if (perfil) {
    return perfil;
  }

  const { data } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: obterNomeCompleto(user),
        phone: obterTelefone(user),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single<Perfil>();

  return data ?? null;
}

async function garantirWorkspace(workspace: Workspace | null, user: User) {
  if (workspace) {
    return workspace;
  }

  await supabase.from("workspaces").insert({
    name: obterNomeWorkspace(user),
    owner_user_id: user.id,
  });

  const workspaceResponse = await buscarWorkspace(user.id);

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  return workspaceResponse.data;
}

async function carregarDadosDoUsuario(user: User) {
  const [perfilResponse, workspaceResponse] = await Promise.all([buscarPerfil(user.id), buscarWorkspace(user.id)]);

  if (perfilResponse.error) {
    throw perfilResponse.error;
  }

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  return {
    perfil: await garantirPerfil(perfilResponse.data, user),
    workspace: await garantirWorkspace(workspaceResponse.data, user),
  };
}

export function AppProviders({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const sincronizacaoAtualRef = useRef(0);

  const aplicarSessao = useCallback((novaSessao: Session | null) => {
    const sincronizacaoAtual = sincronizacaoAtualRef.current + 1;
    sincronizacaoAtualRef.current = sincronizacaoAtual;

    setSession(novaSessao);
    setUser(novaSessao?.user ?? null);
    setErro(null);

    if (!novaSessao?.user) {
      setPerfil(null);
      setWorkspace(null);
      setCarregando(false);
      return null;
    }

    setCarregando(false);

    return {
      sincronizacaoAtual,
      user: novaSessao.user,
    };
  }, []);

  const sincronizarDadosDoUsuario = useCallback(async (usuario: User, sincronizacaoAtual: number) => {
    try {
      const dados = await carregarDadosDoUsuario(usuario);

      if (sincronizacaoAtualRef.current !== sincronizacaoAtual) {
        return;
      }

      setPerfil(dados.perfil);
      setWorkspace(dados.workspace);
      setErro(null);
    } catch (error) {
      if (sincronizacaoAtualRef.current !== sincronizacaoAtual) {
        return;
      }

      setErro(error instanceof Error ? error.message : "Não foi possível carregar a sessão.");
    }
  }, []);

  const sincronizarAuth = useCallback(
    async (novaSessao: Session | null) => {
      const contexto = aplicarSessao(novaSessao);

      if (!contexto) {
        return;
      }

      await sincronizarDadosDoUsuario(contexto.user, contexto.sincronizacaoAtual);
    },
    [aplicarSessao, sincronizarDadosDoUsuario],
  );

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
    try {
      const resultado = await entrarComEmailSenha(email, senha);
      const contexto = aplicarSessao(resultado.session);

      if (contexto) {
        void sincronizarDadosDoUsuario(contexto.user, contexto.sincronizacaoAtual);
      }

      return resultado;
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
      throw error;
    }
  }, [aplicarSessao, sincronizarDadosDoUsuario]);

  const cadastrar = useCallback(
    async (dados: { nomeCompleto: string; phone: string; email: string; senha: string }) => {
      setErro(null);
      try {
        const resultado = await cadastrarComEmailSenha(dados);
        const contexto = aplicarSessao(resultado.session);

        if (contexto) {
          void sincronizarDadosDoUsuario(contexto.user, contexto.sincronizacaoAtual);
        }

        return resultado;
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível criar a conta.");
        throw error;
      }
    },
    [aplicarSessao, sincronizarDadosDoUsuario],
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
