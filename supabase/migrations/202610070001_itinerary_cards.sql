begin;
create table if not exists public.itinerary_cards (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 80),
 plan jsonb not null check(jsonb_typeof(plan)='object' and plan->>'version'='2' and octet_length(plan::text)<=24000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index if not exists itinerary_cards_owner_updated on public.itinerary_cards(user_id,updated_at desc);
alter table public.itinerary_cards enable row level security;
alter table public.itinerary_cards force row level security;
revoke all on public.itinerary_cards from anon,authenticated;
grant select,insert,update on public.itinerary_cards to authenticated;
create policy itinerary_cards_read_own on public.itinerary_cards for select to authenticated using ((select auth.uid())=user_id);
create policy itinerary_cards_create_own on public.itinerary_cards for insert to authenticated with check ((select auth.uid())=user_id);
create policy itinerary_cards_update_own on public.itinerary_cards for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create function public.itinerary_cards_before_write() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then
  perform pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  if (select count(*) from public.itinerary_cards where user_id=NEW.user_id)>=50 then
   raise exception 'account card limit reached' using errcode='23514';
  end if;
 else
  if NEW.user_id<>OLD.user_id or NEW.id<>OLD.id then raise exception 'card ownership is immutable'; end if;
  NEW.created_at:=OLD.created_at;
 end if;
 NEW.updated_at:=clock_timestamp();
 return NEW;
end;
$$;
revoke all on function public.itinerary_cards_before_write() from public;
create trigger itinerary_cards_write_guard before insert or update on public.itinerary_cards for each row execute function public.itinerary_cards_before_write();
commit;
