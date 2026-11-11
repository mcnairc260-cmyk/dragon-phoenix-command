// Lifeline database schema (PostgreSQL). Idempotent: safe to run at every start.
//
// Security notes that the code alone does not express:
// - The triggers below are defence in depth. The API layer performs the same
//   checks first. A database owner or superuser can drop a trigger, so these
//   are NOT "absolute immutability". See docs/VAULTLOCK.md.
// - `lifeline.ctx` is a transaction-local setting used by the two narrow code
//   paths that may touch sealed data: 'recovery' (delayed release) and
//   'consent' (a Lifeline opting in or out). It guards against application
//   bugs, not against an attacker who can already run arbitrary SQL.
export const SCHEMA_SQL = String.raw`
create table if not exists users (
  id uuid primary key,
  email text not null,
  name text not null default '',
  email_verified_at timestamptz,
  password_hash text not null,
  checkin_secret_hash text,
  plan text not null default 'basic',
  sub_status text not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null
);
create unique index if not exists users_email_idx on users (lower(email));

create table if not exists sessions (
  id uuid primary key,
  user_id uuid not null references users(id),
  token_hash text not null unique,
  pending_mfa boolean not null default false,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  idle_expires_at timestamptz not null,
  expires_at timestamptz not null,
  stepup_at timestamptz,
  revoked_at timestamptz,
  ip text,
  user_agent text
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists auth_tokens (
  id uuid primary key,
  user_id uuid not null references users(id),
  kind text not null,
  token_hash text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists webauthn_credentials (
  id uuid primary key,
  user_id uuid not null references users(id),
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text,
  label text not null default 'Passkey',
  created_at timestamptz not null,
  last_used_at timestamptz
);

create table if not exists webauthn_challenges (
  id uuid primary key,
  user_id uuid not null references users(id),
  session_id uuid,
  purpose text not null,
  challenge text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null,
  primary key (key, window_start)
);

create table if not exists protection (
  user_id uuid primary key references users(id),
  status text not null default 'setup',
  interval_seconds int not null default 86400,
  grace_seconds int not null default 3600,
  reminder_offsets jsonb not null default '[7200]',
  escalation_mode text not null default 'simultaneous',
  stage_wait_seconds int not null default 1800,
  cycle int not null default 0,
  armed_at timestamptz,
  last_checkin_at timestamptz,
  deadline_at timestamptz,
  vaultlock_active boolean not null default false,
  sealed_policy_id uuid,
  updated_at timestamptz not null
);
create index if not exists protection_due_idx on protection (deadline_at) where status in ('active','grace');

create table if not exists contacts (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  relationship text not null default '',
  email text not null,
  phone text,
  channels jsonb not null default '["email"]',
  stage int not null default 1,
  priority int not null default 1,
  message text not null default '',
  consent_status text not null default 'pending',
  consent_channels jsonb not null default '[]',
  consent_token_hash text unique,
  consent_at timestamptz,
  consent_evidence jsonb,
  created_at timestamptz not null,
  removed_at timestamptz
);
create index if not exists contacts_user_idx on contacts (user_id);

create table if not exists sealed_policies (
  id uuid primary key,
  user_id uuid not null references users(id),
  version int not null,
  policy text not null,
  policy_hash text not null,
  mac text not null,
  prev_policy_hash text,
  recovery_key_hash text not null,
  status text not null default 'active',
  sealed_at timestamptz not null,
  released_at timestamptz,
  unique (user_id, version)
);

create table if not exists recovery_requests (
  id uuid primary key,
  user_id uuid not null references users(id),
  policy_id uuid not null references sealed_policies(id),
  status text not null default 'pending',
  requested_at timestamptz not null,
  effective_at timestamptz not null,
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz
);
create unique index if not exists recovery_one_pending_idx on recovery_requests (user_id) where status = 'pending';

create table if not exists incidents (
  id uuid primary key,
  user_id uuid not null references users(id),
  cycle int not null,
  status text not null default 'open',
  policy jsonb not null,
  integrity text not null default 'unsealed',
  stage int not null default 0,
  next_stage_at timestamptz,
  opened_at timestamptz not null,
  resolved_at timestamptz,
  resolution text,
  unique (user_id, cycle)
);
create index if not exists incidents_open_idx on incidents (next_stage_at) where status = 'open';

create table if not exists notifications (
  id uuid primary key,
  user_id uuid not null references users(id),
  incident_id uuid references incidents(id),
  contact_id uuid,
  kind text not null,
  channel text not null,
  recipient text not null,
  subject text not null default '',
  body text not null,
  stage int,
  status text not null default 'queued',
  attempts int not null default 0,
  next_attempt_at timestamptz,
  locked_at timestamptz,
  provider text,
  provider_ref text,
  simulated boolean not null default true,
  dedupe_key text not null unique,
  ack_token_hash text unique,
  acknowledged_at timestamptz,
  last_error text,
  created_at timestamptz not null,
  sent_at timestamptz
);
create index if not exists notifications_queue_idx on notifications (next_attempt_at) where status in ('queued','sending');
create index if not exists notifications_user_idx on notifications (user_id, created_at);

create table if not exists audit_events (
  seq bigserial primary key,
  chain text not null,
  user_id uuid,
  actor text not null,
  type text not null,
  detail text not null,
  created_at timestamptz not null,
  prev_hash text not null,
  hash text not null
);
create index if not exists audit_chain_idx on audit_events (chain, seq);

create table if not exists audit_heads (
  chain text primary key,
  hash text not null,
  count bigint not null
);

create table if not exists waitlist (
  email text primary key,
  created_at timestamptz not null
);

create table if not exists stripe_events (
  id text primary key,
  received_at timestamptz not null
);

-- ---------------------------------------------------------------- guards

create or replace function ll_ctx() returns text language sql stable as $$
  select coalesce(current_setting('lifeline.ctx', true), '')
$$;

-- Takes a row lock on the user's protection row before it reads the VaultLock flag.
-- Sealing holds the same lock, so a change that races with sealing either commits
-- before the snapshot is taken or sees the seal and is rejected. Never in between.
create or replace function ll_vault_active(uid uuid) returns boolean language plpgsql as $$
declare v boolean;
begin
  select vaultlock_active into v from protection where user_id = uid for update;
  return coalesce(v, false);
end $$;

create or replace function ll_guard_contacts() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'LL_IMMUTABLE: Lifeline records are never hard-deleted';
  end if;
  if not ll_vault_active(new.user_id) or ll_ctx() = 'recovery' then
    return new;
  end if;
  if tg_op = 'UPDATE' and ll_ctx() = 'consent'
     and new.user_id = old.user_id and new.name = old.name and new.relationship = old.relationship
     and new.email = old.email and new.phone is not distinct from old.phone
     and new.channels = old.channels and new.stage = old.stage and new.priority = old.priority
     and new.message = old.message and new.removed_at is not distinct from old.removed_at
     and new.consent_token_hash is not distinct from old.consent_token_hash then
    return new;
  end if;
  raise exception 'LL_VAULTLOCK: Lifelines are sealed';
end $$;
drop trigger if exists ll_guard_contacts on contacts;
create trigger ll_guard_contacts before insert or update or delete on contacts
  for each row execute function ll_guard_contacts();

create or replace function ll_guard_protection() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.vaultlock_active and ll_ctx() <> 'recovery' then
      raise exception 'LL_VAULTLOCK: protection is sealed';
    end if;
    return old;
  end if;
  if not old.vaultlock_active or ll_ctx() = 'recovery' then
    return new;
  end if;
  if new.interval_seconds <> old.interval_seconds or new.grace_seconds <> old.grace_seconds
     or new.reminder_offsets <> old.reminder_offsets or new.escalation_mode <> old.escalation_mode
     or new.stage_wait_seconds <> old.stage_wait_seconds
     or new.vaultlock_active <> old.vaultlock_active
     or new.sealed_policy_id is distinct from old.sealed_policy_id
     or new.status not in ('active','grace','escalating')
     or new.cycle < old.cycle then
    raise exception 'LL_VAULTLOCK: protection is sealed';
  end if;
  return new;
end $$;
drop trigger if exists ll_guard_protection on protection;
create trigger ll_guard_protection before update or delete on protection
  for each row execute function ll_guard_protection();

create or replace function ll_guard_users() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if ll_vault_active(old.id) and ll_ctx() <> 'recovery' then
      raise exception 'LL_VAULTLOCK: account is sealed';
    end if;
    return old;
  end if;
  if new.checkin_secret_hash is distinct from old.checkin_secret_hash
     and ll_vault_active(old.id) and ll_ctx() <> 'recovery' then
    raise exception 'LL_VAULTLOCK: check-in passphrase is sealed';
  end if;
  return new;
end $$;
drop trigger if exists ll_guard_users on users;
create trigger ll_guard_users before update or delete on users
  for each row execute function ll_guard_users();

create or replace function ll_guard_credentials() returns trigger language plpgsql as $$
declare uid uuid;
begin
  if tg_op = 'DELETE' then uid := old.user_id; else uid := new.user_id; end if;
  if ll_vault_active(uid) and ll_ctx() <> 'recovery' then
    if tg_op = 'UPDATE' and new.credential_id = old.credential_id
       and new.public_key = old.public_key and new.user_id = old.user_id then
      return new;
    end if;
    raise exception 'LL_VAULTLOCK: authentication devices are sealed';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists ll_guard_credentials on webauthn_credentials;
create trigger ll_guard_credentials before insert or update or delete on webauthn_credentials
  for each row execute function ll_guard_credentials();

create or replace function ll_guard_policies() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'LL_IMMUTABLE: sealed policies are never deleted';
  end if;
  if new.policy <> old.policy or new.policy_hash <> old.policy_hash or new.mac <> old.mac
     or new.version <> old.version or new.user_id <> old.user_id
     or new.recovery_key_hash <> old.recovery_key_hash or new.sealed_at <> old.sealed_at then
    raise exception 'LL_IMMUTABLE: sealed policy content cannot change';
  end if;
  if ll_ctx() <> 'recovery' then
    raise exception 'LL_VAULTLOCK: policy status can only change through recovery';
  end if;
  return new;
end $$;
drop trigger if exists ll_guard_policies on sealed_policies;
create trigger ll_guard_policies before update or delete on sealed_policies
  for each row execute function ll_guard_policies();

create or replace function ll_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'LL_IMMUTABLE: % on % is not permitted', tg_op, tg_table_name;
end $$;
drop trigger if exists ll_audit_rows on audit_events;
create trigger ll_audit_rows before update or delete on audit_events
  for each row execute function ll_append_only();
drop trigger if exists ll_audit_truncate on audit_events;
create trigger ll_audit_truncate before truncate on audit_events
  for each statement execute function ll_append_only();
drop trigger if exists ll_notifications_delete on notifications;
create trigger ll_notifications_delete before delete on notifications
  for each row execute function ll_append_only();
drop trigger if exists ll_incidents_delete on incidents;
create trigger ll_incidents_delete before delete on incidents
  for each row execute function ll_append_only();
`;
