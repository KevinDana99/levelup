create extension if not exists pgcrypto;

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  consumed_at timestamptz not null default now(),
  total_calories numeric not null check (total_calories >= 0),
  total_protein numeric not null check (total_protein >= 0),
  total_carbohydrates numeric not null check (total_carbohydrates >= 0),
  total_fat numeric not null check (total_fat >= 0),
  created_at timestamptz not null default now()
);

create table public.meal_foods (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  position integer not null check (position >= 0),
  name text not null check (length(trim(name)) > 0),
  estimated_grams numeric not null check (estimated_grams > 0),
  calories numeric not null check (calories >= 0),
  protein numeric not null check (protein >= 0),
  carbohydrates numeric not null check (carbohydrates >= 0),
  fat numeric not null check (fat >= 0),
  created_at timestamptz not null default now(),
  unique (meal_id, position)
);

create index meals_latest_idx
  on public.meals (consumed_at desc, created_at desc);

create index meals_user_latest_idx
  on public.meals (user_id, consumed_at desc, created_at desc);

create index meal_foods_meal_idx
  on public.meal_foods (meal_id, position);

alter table public.meals enable row level security;
alter table public.meal_foods enable row level security;

create or replace function public.confirm_meal(
  p_foods jsonb,
  p_consumed_at timestamptz default null,
  p_user_id uuid default null
)
returns table (
  meal_id uuid,
  created_at timestamptz,
  total_calories numeric,
  total_protein numeric,
  total_carbohydrates numeric,
  total_fat numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_meal public.meals%rowtype;
begin
  if jsonb_typeof(p_foods) <> 'array' or jsonb_array_length(p_foods) = 0 then
    raise exception 'foods must be a non-empty array';
  end if;

  insert into public.meals (
    user_id,
    consumed_at,
    total_calories,
    total_protein,
    total_carbohydrates,
    total_fat
  )
  select
    p_user_id,
    coalesce(p_consumed_at, now()),
    sum((food->'nutrition'->>'calories')::numeric),
    sum((food->'nutrition'->>'protein')::numeric),
    sum((food->'nutrition'->>'carbohydrates')::numeric),
    sum((food->'nutrition'->>'fat')::numeric)
  from jsonb_array_elements(p_foods) as food
  returning * into inserted_meal;

  insert into public.meal_foods (
    meal_id,
    position,
    name,
    estimated_grams,
    calories,
    protein,
    carbohydrates,
    fat
  )
  select
    inserted_meal.id,
    (ordinality - 1)::integer,
    food->>'name',
    (food->>'estimatedGrams')::numeric,
    (food->'nutrition'->>'calories')::numeric,
    (food->'nutrition'->>'protein')::numeric,
    (food->'nutrition'->>'carbohydrates')::numeric,
    (food->'nutrition'->>'fat')::numeric
  from jsonb_array_elements(p_foods) with ordinality as foods(food, ordinality);

  return query
  select
    inserted_meal.id,
    inserted_meal.created_at,
    inserted_meal.total_calories,
    inserted_meal.total_protein,
    inserted_meal.total_carbohydrates,
    inserted_meal.total_fat;
end;
$$;

revoke all on function public.confirm_meal(jsonb, timestamptz, uuid) from public;
grant execute on function public.confirm_meal(jsonb, timestamptz, uuid) to service_role;
