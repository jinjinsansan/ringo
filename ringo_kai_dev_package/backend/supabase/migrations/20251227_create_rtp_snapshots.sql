create table if not exists public.rtp_snapshots (
    id bigserial primary key,
    rtp numeric not null,
    probabilities jsonb not null,
    captured_at timestamptz not null default timezone('utc', now())
);

create index if not exists rtp_snapshots_captured_at_idx on public.rtp_snapshots (captured_at desc);
