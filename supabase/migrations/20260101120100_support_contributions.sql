-- 20260101120100 — Optional contribution ledger.
--
-- Written only by the /api/support/* route handlers, which authenticate with the
-- service-role key (that key bypasses RLS). RLS is enabled with no policies and
-- the anon/authenticated grants are revoked, so no browser session can read,
-- forge or enumerate payment records.

create table if not exists public.support_contributions (
  razorpay_order_id text primary key,
  razorpay_payment_id text unique,
  amount_paise bigint check (amount_paise is null or amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'verified', 'captured', 'failed')),
  failure_reason text,
  payer_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_contributions enable row level security;
revoke all on table public.support_contributions from anon, authenticated;

drop trigger if exists support_contributions_set_updated_at on public.support_contributions;
create trigger support_contributions_set_updated_at before update on public.support_contributions
for each row execute function public.set_updated_at();
