-- Run in Supabase Dashboard > SQL Editor to restore missing starter iPhones.
-- Safe to rerun: existing products with the same model are left unchanged.
insert into public.products(name, model, description, base_price, image_url)
values
  ('Apple iPhone 13', 'iPhone 13', 'Apple iPhone 13 smartphone.', 23990, null),
  ('Apple iPhone 14', 'iPhone 14', 'Apple iPhone 14 smartphone.', 28990, null),
  ('Apple iPhone 15', 'iPhone 15', 'Apple iPhone 15 smartphone.', 34990, null),
  ('Apple iPhone 16 Pro', 'iPhone 16 Pro', 'Apple iPhone 16 Pro smartphone.', 59990, null),
  ('Apple iPhone 17 Pro', 'iPhone 17 Pro', 'Apple iPhone 17 Pro smartphone.', 69990, null)
on conflict (model) do update
set is_active = true;

select name, model, base_price, is_active
from public.products
where model in ('iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16 Pro', 'iPhone 17 Pro')
order by model;
