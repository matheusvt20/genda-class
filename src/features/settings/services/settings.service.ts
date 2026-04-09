import { supabase } from "@/core/supabase/client";

export type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export type WorkspaceSettings = {
  workspace_id: string;
  school_name: string | null;
  school_phone: string | null;
  school_instagram: string | null;
  whatsapp_number: string | null;
  pix_key_type: PixKeyType | null;
  pix_key: string | null;
  pix_holder_name: string | null;
  currency: string | null;
  timezone: string | null;
  default_class_capacity: number | null;
  default_deposit_percentage: number | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceSettingsData = {
  workspace: {
    id: string;
    name: string;
  };
  settings: WorkspaceSettings;
};

type WorkspaceRecord = {
  id: string;
  name: string;
};

function getDefaultWorkspaceSettings(workspaceId: string): WorkspaceSettings {
  const now = new Date().toISOString();

  return {
    workspace_id: workspaceId,
    school_name: null,
    school_phone: null,
    school_instagram: null,
    whatsapp_number: null,
    pix_key_type: null,
    pix_key: null,
    pix_holder_name: null,
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    default_class_capacity: 10,
    default_deposit_percentage: null,
    created_at: now,
    updated_at: now,
  };
}

async function ensureWorkspaceSettings(workspaceId: string) {
  const response = await supabase.from("workspace_settings").upsert({ workspace_id: workspaceId }, { onConflict: "workspace_id" });

  if (response.error) {
    throw response.error;
  }
}

async function getCurrentWorkspace() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    throw new Error("Sessão não encontrada.");
  }

  const workspaceResponse = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_user_id", session.user.id)
    .single<WorkspaceRecord>();

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  return workspaceResponse.data;
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsData> {
  const workspace = await getCurrentWorkspace();

  let settingsResponse = await supabase
    .from("workspace_settings")
    .select("*")
    .eq("workspace_id", workspace.id)
    .maybeSingle<WorkspaceSettings>();

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }

  if (!settingsResponse.data) {
    await ensureWorkspaceSettings(workspace.id);

    settingsResponse = await supabase
      .from("workspace_settings")
      .select("*")
      .eq("workspace_id", workspace.id)
      .maybeSingle<WorkspaceSettings>();

    if (settingsResponse.error) {
      throw settingsResponse.error;
    }
  }

  return {
    workspace,
    settings: settingsResponse.data ?? getDefaultWorkspaceSettings(workspace.id),
  };
}

export async function updateWorkspaceSettings(data: Partial<WorkspaceSettings>) {
  const workspace = await getCurrentWorkspace();

  await ensureWorkspaceSettings(workspace.id);

  const response = await supabase
    .from("workspace_settings")
    .upsert({ ...data, workspace_id: workspace.id }, { onConflict: "workspace_id" })
    .select("*")
    .single<WorkspaceSettings>();

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function updateWorkspaceName(name: string) {
  const workspace = await getCurrentWorkspace();

  const response = await supabase
    .from("workspaces")
    .update({ name: name.trim() })
    .eq("id", workspace.id)
    .select("id, name")
    .single<WorkspaceRecord>();

  if (response.error) {
    throw response.error;
  }

  return response.data;
}
