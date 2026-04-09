-- Revisao manual de dados criados hoje.
-- Este arquivo NAO deleta nada.
-- Filtro baseado no dia atual de Sao Paulo (America/Sao_Paulo).
-- Observacao: assume que public.class_leads possui a coluna created_at,
-- o que esta alinhado com as consultas atuais do app.

with parametros as (
  select timezone('America/Sao_Paulo', now())::date as hoje_sp
)
select
  'class_leads' as tabela,
  count(*) as total_registros
from public.class_leads, parametros
where timezone('America/Sao_Paulo', class_leads.created_at)::date = parametros.hoje_sp

union all

select
  'students' as tabela,
  count(*) as total_registros
from public.students, parametros
where timezone('America/Sao_Paulo', students.created_at)::date = parametros.hoje_sp

union all

select
  'class_enrollments' as tabela,
  count(*) as total_registros
from public.class_enrollments, parametros
where timezone('America/Sao_Paulo', class_enrollments.enrolled_at)::date = parametros.hoje_sp

order by tabela;

-- 1) Leads criados hoje
with parametros as (
  select timezone('America/Sao_Paulo', now())::date as hoje_sp
)
select
  leads.id,
  leads.workspace_id,
  leads.class_id,
  classes.title as turma,
  leads.full_name,
  leads.phone,
  leads.instagram,
  leads.how_found,
  leads.status,
  leads.pix_status,
  timezone('America/Sao_Paulo', leads.created_at) as criado_em_sp
from public.class_leads as leads
left join public.classes on classes.id = leads.class_id
cross join parametros
where timezone('America/Sao_Paulo', leads.created_at)::date = parametros.hoje_sp
order by leads.created_at desc;

-- 2) Alunas criadas hoje
with parametros as (
  select timezone('America/Sao_Paulo', now())::date as hoje_sp
)
select
  students.id,
  students.workspace_id,
  students.full_name,
  students.phone,
  students.email,
  students.instagram,
  students.notes,
  timezone('America/Sao_Paulo', students.created_at) as criado_em_sp
from public.students
cross join parametros
where timezone('America/Sao_Paulo', students.created_at)::date = parametros.hoje_sp
order by students.created_at desc;

-- 3) Inscricoes criadas hoje
with parametros as (
  select timezone('America/Sao_Paulo', now())::date as hoje_sp
)
select
  enrollments.id,
  enrollments.workspace_id,
  enrollments.class_id,
  classes.title as turma,
  enrollments.student_id,
  students.full_name as aluna,
  enrollments.status,
  enrollments.payment_status,
  enrollments.sale_price,
  enrollments.deposit_amount,
  enrollments.balance_due,
  timezone('America/Sao_Paulo', enrollments.enrolled_at) as inscrita_em_sp
from public.class_enrollments as enrollments
left join public.classes on classes.id = enrollments.class_id
left join public.students on students.id = enrollments.student_id
cross join parametros
where timezone('America/Sao_Paulo', enrollments.enrolled_at)::date = parametros.hoje_sp
order by enrollments.enrolled_at desc;
