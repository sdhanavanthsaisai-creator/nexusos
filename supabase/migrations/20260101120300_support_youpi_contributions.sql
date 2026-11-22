-- 20260101120300 — YOUPI PG contribution ledger.
--
-- A second, optional checkout next to Razorpay. YOUPI PG is a self-hosted UPI
-- gateway that settles straight into the operator's bank account, so it has no
-- per-transaction platform fee. Its public payment id is the session identifier
-- and is known the moment a session is created, which makes it the natural
-- primary key here.
--
-- Written only by the /api/support/youpi/* route handlers, which authenticate
-- with the service-role key. RLS is enabled with no policies and the anon and
-- authenticated grants are revoked, exactly like support_contributions: no
-- browser session can read, forge or enumerate a payment record.

create table if not exists public.support_youpi_contributions (
  youpi_payment_id text primary key,
  order_id text not null,
  amount_paise bigint check (amount_paise is null or amount_paise > 0),
  currency text not null default 'INR',
  -- Mirrors the gateway's own lifecycle so the stored row never has to be
  -- interpreted. SUCCESS is the only value that means money arrived.
  status text not null default 'INITIATED' check (status in (
    'INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING',
    'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'
  )),
  -- 12-digit bank reference the gateway's observers extract from the credit alert.
  utr text,
  failure_reason text,
  payer_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The return page only knows the merchant order id, so this lookup has to be cheap.
create index if not exists support_youpi_contributions_order_idx
  on public.support_youpi_contributions (order_id);

alter table public.support_youpi_contributions enable row level security;
revoke all on table public.support_youpi_contributions from anon, authenticated;

drop trigger if exists support_youpi_contributions_set_updated_at on public.support_youpi_contributions;
create trigger support_youpi_contributions_set_updated_at before update on public.support_youpi_contributions
for each row execute function public.set_updated_at();
