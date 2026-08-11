alter table public.asset_components
add column if not exists photo_storage_path text,
add column if not exists ai_confidence integer,
add column if not exists ai_identified boolean not null default false,
add column if not exists ai_visible_text jsonb not null default '[]'::jsonb;
