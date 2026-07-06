-- Les plans formés par le matching de rituel sont des groupes privés fermés :
-- ils ne doivent pas apparaître dans le feed public ni être rejoignables.
alter table public.plans
  add column if not exists source text not null default 'open'
  check (source in ('open', 'ritual'));

create index if not exists idx_plans_source on public.plans (source);
