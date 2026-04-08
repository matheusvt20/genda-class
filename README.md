# Genda Class

Aplicação independente do ecossistema Genda para gestão de turmas presenciais, alunas e financeiro de cursos.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS v3
- Supabase Auth + PostgreSQL + RLS

## Como rodar localmente

1. Instale as dependências:

```bash
npm install
```

2. Confira o arquivo `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3. Rode o projeto:

```bash
npm run dev
```

4. Para gerar build:

```bash
npm run build
```

## Estrutura

- `src/app`: router, providers e layouts
- `src/core`: cliente Supabase, sessão, tipos e utilitários compartilhados
- `src/features`: módulos da aplicação
- `src/components`: componentes reutilizáveis
- `supabase/migrations`: schema inicial com RLS e trigger de criação automática

## Banco de dados

A migration inicial fica em:

- `supabase/migrations/20260408000100_initial_schema.sql`

Ela cria:

- `profiles`
- `workspaces`
- `students`
- `classes`
- `class_enrollments`
- `class_payments`
- `class_costs`
- `workspace_settings`

Também habilita RLS e cria o trigger que gera `profile` e `workspace` automaticamente após o cadastro no Supabase Auth.

## Deploy no Cloudflare Pages

Use as configurações:

- Build command: `npm run build`
- Build output directory: `dist`

O arquivo `public/_redirects` já foi incluído para suportar as rotas da SPA.
