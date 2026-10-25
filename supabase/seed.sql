-- Seed del catálogo MVP. Idempotente: se puede correr varias veces.
-- Solo para desarrollo/demo: `supabase db reset` lo aplica después de las migraciones.

insert into public.producto (nombre, categoria, tipo, descripcion, precio, tiempo_produccion, imagen_url)
select v.nombre, v.categoria, v.tipo, v.descripcion, v.precio, v.tiempo_produccion, v.imagen_url
from (values
  ('Crema Hidratante Facial', 'Cosmética', 'Emulsión', 'Base de aloe vera y manzanilla', 2500.00, 3, '/productos/crema-hidratante.jpg'),
  ('Jabón Líquido Neutro', 'Higiene', 'Líquido', 'Fórmula suave hipoalergénica', 1800.00, 2, '/productos/jabon-liquido.jpg')
) as v(nombre, categoria, tipo, descripcion, precio, tiempo_produccion, imagen_url)
where not exists (
  select 1 from public.producto p where lower(p.nombre) = lower(v.nombre)
);

update public.stock
   set cantidad_actual = 48,
       cantidad_reservada = 5,
       cantidad_warning = 10
 where id_producto = (
   select id_producto from public.producto where lower(nombre) = lower('Crema Hidratante Facial')
 );

update public.stock
   set cantidad_actual = 6,
       cantidad_reservada = 0,
       cantidad_warning = 10
 where id_producto = (
   select id_producto from public.producto where lower(nombre) = lower('Jabón Líquido Neutro')
 );
