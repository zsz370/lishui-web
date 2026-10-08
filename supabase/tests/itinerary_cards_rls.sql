-- 在 Lishui 项目 SQL Editor 执行。所有测试用户/卡片均在事务结束回滚。
begin;
insert into auth.users(id,aud,role,email) values
 ('e46a802e-5542-4835-9e67-8f0381144011','authenticated','authenticated','rls-a@example.invalid'),
 ('e46a802e-5542-4835-9e67-8f0381144022','authenticated','authenticated','rls-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','e46a802e-5542-4835-9e67-8f0381144011',true);
insert into public.itinerary_cards(id,user_id,title,plan) values
 ('e46a802e-5542-4835-9e67-8f0381144033','e46a802e-5542-4835-9e67-8f0381144011','RLS 临时测试','{"version":2,"budget":"800"}');
do $$begin
 if (select count(*) from public.itinerary_cards where id='e46a802e-5542-4835-9e67-8f0381144033')<>1 then raise exception 'owner read failed'; end if;
end$$;
select set_config('request.jwt.claim.sub','e46a802e-5542-4835-9e67-8f0381144022',true);
do $$begin
 if (select count(*) from public.itinerary_cards where id='e46a802e-5542-4835-9e67-8f0381144033')<>0 then raise exception 'foreign read leaked'; end if;
 update public.itinerary_cards set title='wrong owner' where id='e46a802e-5542-4835-9e67-8f0381144033';
 if found then raise exception 'foreign update allowed'; end if;
 begin
  insert into public.itinerary_cards(user_id,title,plan) values('e46a802e-5542-4835-9e67-8f0381144011','wrong owner','{"version":2}');
  raise exception 'foreign insert allowed';
 exception when insufficient_privilege then null;
 end;
end$$;
select set_config('request.jwt.claim.sub','e46a802e-5542-4835-9e67-8f0381144011',true);
do $$begin
 update public.itinerary_cards set deleted_at=now() where id='e46a802e-5542-4835-9e67-8f0381144033';
 if not found then raise exception 'trash failed'; end if;
 update public.itinerary_cards set deleted_at=null, title='restored' where id='e46a802e-5542-4835-9e67-8f0381144033';
 if not found then raise exception 'restore failed'; end if;
 if (select plan->>'budget' from public.itinerary_cards where id='e46a802e-5542-4835-9e67-8f0381144033')<>'800' then raise exception 'plan lost'; end if;
 begin
  delete from public.itinerary_cards where id='e46a802e-5542-4835-9e67-8f0381144033';
  raise exception 'hard delete allowed';
 exception when insufficient_privilege then null;
 end;
end$$;
set local role anon;
do $$begin
 begin
  perform id from public.itinerary_cards limit 1;
  raise exception 'anonymous read allowed';
 exception when insufficient_privilege then null;
 end;
end$$;
rollback;
select 'PASS: owner CRUD, foreign read/update/insert blocked, anonymous blocked, hard delete blocked, test fixtures rolled back' as verification;
