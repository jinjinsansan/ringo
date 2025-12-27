create extension if not exists "pgcrypto";

create table if not exists public.wishlist_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    title text,
    price integer not null,
    url text not null,
    assigned_purchase_id integer references public.purchases (id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);
create index if not exists wishlist_items_assigned_purchase_idx on public.wishlist_items (assigned_purchase_id);
