begin;
create table private.platform_handbook (
 section text primary key check(section in ('about','sop')),
 content text not null default '',
 updated_at timestamptz not null default now()
);
commit;
