-- ============================================================================
-- hackscore — Sistema de avaliação de hackathon por banca
-- Schema do banco (Supabase / PostgreSQL)
--
-- Uso: execute este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- O script é idempotente — pode ser re-executado sem perder dados.
--
-- Modelo de segurança:
--   • A chave anônima (front-end) só LÊ equipes e avaliações.
--   • Toda escrita passa por funções SECURITY DEFINER que validam a senha
--     do admin ou o código da banca (guardados na tabela config, que é
--     inacessível pela API pública).
--   • Senha e código são comparados sem distinção de maiúsculas/minúsculas
--     e com espaços das pontas ignorados.
-- ============================================================================

-- ─── Tabelas ────────────────────────────────────────────────────────────────

create table if not exists public.config (
  key   text primary key,
  value text not null default ''
);

create table if not exists public.equipes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cat        text not null check (cat in ('emp', 'liv', 'pio')),
  created_at timestamptz not null default now()
);

create table if not exists public.avaliacoes (
  id         uuid primary key default gen_random_uuid(),
  equipe_id  uuid not null references public.equipes (id) on delete cascade,
  avaliador  text not null,
  notas      jsonb not null,
  created_at timestamptz not null default now(),
  unique (equipe_id, avaliador)   -- um avaliador avalia cada equipe UMA vez
);

-- ─── Valores iniciais (altere a senha ao reutilizar em outro projeto) ──────

insert into public.config (key, value) values ('admin_pwd', '123456') on conflict (key) do nothing;
insert into public.config (key, value) values ('banca_code', '')        on conflict (key) do nothing;

-- ─── RLS: anônimo só lê equipes e avaliações; config é inacessível ─────────

alter table public.config     enable row level security;
alter table public.equipes    enable row level security;
alter table public.avaliacoes enable row level security;

drop policy if exists "leitura equipes"    on public.equipes;
drop policy if exists "leitura avaliacoes" on public.avaliacoes;

create policy "leitura equipes"    on public.equipes    for select using (true);
create policy "leitura avaliacoes" on public.avaliacoes for select using (true);

-- ─── Funções internas (NÃO expostas na API — ver revokes abaixo) ───────────

create or replace function public.app_config(p_key text) returns text
language sql security definer set search_path = public as
$$
  select value from public.config where key = p_key
$$;

create or replace function public._exigir_admin(p_pwd text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if upper(trim(p_pwd)) is distinct from upper(public.app_config('admin_pwd'))
     or coalesce(trim(p_pwd), '') = '' then
    raise exception 'Senha incorreta.';
  end if;
end $$;

revoke execute on function public.app_config(text)    from public, anon, authenticated;
revoke execute on function public._exigir_admin(text) from public, anon, authenticated;

-- ─── API pública: autenticação ──────────────────────────────────────────────

create or replace function public.admin_login(p_pwd text) returns boolean
language sql security definer set search_path = public as
$$
  select upper(trim(p_pwd)) = upper(public.app_config('admin_pwd'))
         and coalesce(trim(p_pwd), '') <> ''
$$;

create or replace function public.check_banca_code(p_code text) returns boolean
language sql security definer set search_path = public as
$$
  select upper(trim(p_code)) = upper(public.app_config('banca_code'))
         and coalesce(public.app_config('banca_code'), '') <> ''
$$;

-- ─── API pública: operações do admin (exigem a senha) ──────────────────────

create or replace function public.admin_get_banca_code(p_pwd text) returns text
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  return public.app_config('banca_code');
end $$;

create or replace function public.admin_set_banca_code(p_pwd text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  insert into public.config (key, value) values ('banca_code', upper(trim(p_code)))
    on conflict (key) do update set value = excluded.value;
end $$;

create or replace function public.admin_add_equipe(p_pwd text, p_nome text, p_cat text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  insert into public.equipes (nome, cat) values (trim(p_nome), p_cat);
end $$;

create or replace function public.admin_rename_equipe(p_pwd text, p_id uuid, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  update public.equipes set nome = trim(p_nome) where id = p_id;
end $$;

create or replace function public.admin_remove_equipe(p_pwd text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  delete from public.equipes where id = p_id;  -- avaliações caem em cascata
end $$;

create or replace function public.admin_remove_avaliador(p_pwd text, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  delete from public.avaliacoes where avaliador = p_nome;
end $$;

-- Cadastro em lote: insere várias equipes de uma vez na mesma categoria
create or replace function public.admin_add_equipes(p_pwd text, p_nomes text[], p_cat text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  insert into public.equipes (nome, cat)
  select trim(n), p_cat from unnest(p_nomes) as n
  where coalesce(trim(n), '') <> '';
end $$;

-- Reset total: apaga equipes e avaliações; preserva config (senha e código)
create or replace function public.admin_reset_all(p_pwd text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_admin(p_pwd);
  delete from public.avaliacoes where true;
  delete from public.equipes where true;
end $$;

-- ─── API pública: envio de avaliação (exige o código da banca) ─────────────
-- Retorna: 'ok' | 'duplicada' | 'codigo_invalido'

create or replace function public.enviar_avaliacao(
  p_code text, p_equipe uuid, p_avaliador text, p_notas jsonb
) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_banca_code(p_code) then
    return 'codigo_invalido';
  end if;
  begin
    insert into public.avaliacoes (equipe_id, avaliador, notas)
    values (p_equipe, trim(p_avaliador), p_notas);
  exception when unique_violation then
    return 'duplicada';
  end;
  return 'ok';
end $$;
