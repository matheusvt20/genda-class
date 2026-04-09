alter table public.class_payments
  add column if not exists description text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.class_costs
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_class_payments_updated_at on public.class_payments;

create trigger set_class_payments_updated_at
  before update on public.class_payments
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_class_costs_updated_at on public.class_costs;

create trigger set_class_costs_updated_at
  before update on public.class_costs
  for each row execute procedure public.set_updated_at();

create or replace function public.recalculate_class_enrollment_payment(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_price numeric(10,2);
  v_discount_amount numeric(10,2);
  v_receivable_amount numeric(10,2);
  v_net_paid_amount numeric(10,2);
  v_deposit_paid_amount numeric(10,2);
  v_balance_due numeric(10,2);
  v_payment_status text;
begin
  select
    coalesce(sale_price, 0),
    coalesce(discount_amount, 0)
  into v_sale_price, v_discount_amount
  from public.class_enrollments
  where id = p_enrollment_id;

  if not found then
    return;
  end if;

  select
    coalesce(
      sum(
        case
          when status <> 'paid' then 0
          when payment_type = 'reembolso' then amount * -1
          else amount
        end
      ),
      0
    ),
    coalesce(
      sum(
        case
          when status = 'paid' and payment_type = 'deposito' then amount
          else 0
        end
      ),
      0
    )
  into v_net_paid_amount, v_deposit_paid_amount
  from public.class_payments
  where class_enrollment_id = p_enrollment_id;

  v_receivable_amount := greatest(v_sale_price - v_discount_amount, 0);
  v_balance_due := greatest(v_receivable_amount - v_net_paid_amount, 0);

  v_payment_status := case
    when v_receivable_amount = 0 then 'pago'
    when v_balance_due = 0 then 'pago'
    when v_net_paid_amount > 0 then 'parcial'
    else 'nao_pago'
  end;

  update public.class_enrollments
  set
    deposit_amount = greatest(v_deposit_paid_amount, 0),
    balance_due = v_balance_due,
    payment_status = v_payment_status
  where id = p_enrollment_id;
end;
$$;

create or replace function public.handle_class_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_class_enrollment_payment(old.class_enrollment_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.class_enrollment_id is distinct from new.class_enrollment_id then
    perform public.recalculate_class_enrollment_payment(old.class_enrollment_id);
  end if;

  perform public.recalculate_class_enrollment_payment(new.class_enrollment_id);
  return new;
end;
$$;

drop trigger if exists handle_class_payment_change on public.class_payments;

create trigger handle_class_payment_change
  after insert or update or delete on public.class_payments
  for each row execute procedure public.handle_class_payment_change();

create or replace function public.handle_class_enrollment_financial_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_class_enrollment_payment(new.id);
  return new;
end;
$$;

drop trigger if exists handle_class_enrollment_financial_change on public.class_enrollments;

create trigger handle_class_enrollment_financial_change
  after update of sale_price, discount_amount on public.class_enrollments
  for each row execute procedure public.handle_class_enrollment_financial_change();

create or replace view public.vw_class_financial_summary
with (security_invoker = true)
as
with enrollment_summary as (
  select
    class_id,
    workspace_id,
    count(*) filter (
      where status not in ('cancelada', 'lista_espera')
    ) as enrollment_count,
    count(*) filter (
      where status in ('aguardando_pagamento', 'confirmada', 'compareceu', 'faltou')
    ) as occupied_seats,
    coalesce(
      sum(
        case
          when status in ('cancelada', 'lista_espera') then 0
          else greatest(sale_price - coalesce(discount_amount, 0), 0)
        end
      ),
      0
    ) as expected_revenue,
    coalesce(
      sum(
        case
          when status in ('cancelada', 'lista_espera') then 0
          else greatest(balance_due, 0)
        end
      ),
      0
    ) as open_amount
  from public.class_enrollments
  group by class_id, workspace_id
),
payment_summary as (
  select
    class_id,
    workspace_id,
    coalesce(
      sum(
        case
          when status <> 'paid' then 0
          when payment_type = 'reembolso' then amount * -1
          else amount
        end
      ),
      0
    ) as received_amount,
    coalesce(
      sum(
        case
          when status = 'pending' and payment_type = 'reembolso' then amount * -1
          when status = 'pending' then amount
          else 0
        end
      ),
      0
    ) as pending_amount
  from public.class_payments
  group by class_id, workspace_id
),
cost_summary as (
  select
    class_id,
    workspace_id,
    coalesce(sum(case when status = 'previsto' then amount else 0 end), 0) as expected_costs,
    coalesce(sum(case when status = 'realizado' then amount else 0 end), 0) as realized_costs
  from public.class_costs
  group by class_id, workspace_id
)
select
  classes.id as class_id,
  classes.workspace_id,
  classes.title as class_title,
  classes.starts_at,
  classes.status as class_status,
  classes.capacity,
  classes.price_per_student,
  coalesce(enrollment_summary.enrollment_count, 0) as enrollment_count,
  coalesce(enrollment_summary.occupied_seats, 0) as occupied_seats,
  coalesce(enrollment_summary.expected_revenue, 0) as expected_revenue,
  coalesce(payment_summary.received_amount, 0) as received_amount,
  coalesce(enrollment_summary.open_amount, 0) as open_amount,
  coalesce(payment_summary.pending_amount, 0) as pending_amount,
  coalesce(cost_summary.expected_costs, 0) as expected_costs,
  coalesce(cost_summary.realized_costs, 0) as realized_costs,
  coalesce(enrollment_summary.expected_revenue, 0) - coalesce(cost_summary.expected_costs, 0) as estimated_profit,
  coalesce(payment_summary.received_amount, 0) - coalesce(cost_summary.realized_costs, 0) as realized_profit,
  case
    when coalesce(payment_summary.received_amount, 0) = 0 then 0
    else ((coalesce(payment_summary.received_amount, 0) - coalesce(cost_summary.realized_costs, 0))
      / nullif(coalesce(payment_summary.received_amount, 0), 0)) * 100
  end as realized_margin_percent,
  case
    when classes.price_per_student <= 0 then 0
    else coalesce(cost_summary.realized_costs, 0) / classes.price_per_student
  end as break_even_students
from public.classes
left join enrollment_summary
  on enrollment_summary.class_id = classes.id
  and enrollment_summary.workspace_id = classes.workspace_id
left join payment_summary
  on payment_summary.class_id = classes.id
  and payment_summary.workspace_id = classes.workspace_id
left join cost_summary
  on cost_summary.class_id = classes.id
  and cost_summary.workspace_id = classes.workspace_id;

create or replace view public.vw_financial_entries
with (security_invoker = true)
as
select
  payments.id,
  payments.workspace_id,
  payments.class_id,
  classes.title as class_title,
  classes.starts_at as class_starts_at,
  'payment'::text as entry_type,
  payments.paid_at as occurred_at,
  payments.amount,
  case
    when payments.status <> 'paid' then 0
    when payments.payment_type = 'reembolso' then payments.amount * -1
    else payments.amount
  end as impact_amount,
  payments.status,
  payments.payment_type,
  payments.payment_method,
  null::text as cost_category,
  payments.student_id,
  students.full_name as student_name,
  coalesce(payments.description, payments.notes) as description,
  payments.notes,
  payments.created_at,
  payments.updated_at
from public.class_payments as payments
left join public.classes on classes.id = payments.class_id
left join public.students on students.id = payments.student_id

union all

select
  costs.id,
  costs.workspace_id,
  costs.class_id,
  classes.title as class_title,
  classes.starts_at as class_starts_at,
  'cost'::text as entry_type,
  costs.incurred_at::timestamptz as occurred_at,
  costs.amount,
  case
    when costs.status = 'realizado' then costs.amount * -1
    else 0
  end as impact_amount,
  costs.status,
  null::text as payment_type,
  null::text as payment_method,
  costs.category as cost_category,
  null::uuid as student_id,
  null::text as student_name,
  costs.description,
  costs.notes,
  costs.created_at,
  costs.updated_at
from public.class_costs as costs
left join public.classes on classes.id = costs.class_id;

grant execute on function public.recalculate_class_enrollment_payment(uuid) to authenticated;
grant select on public.vw_class_financial_summary to authenticated;
grant select on public.vw_financial_entries to authenticated;
