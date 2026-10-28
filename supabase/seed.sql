-- Seed del catálogo MVP (B5 · issue #22). Idempotente: se puede correr varias veces.
-- Solo para desarrollo/demo: `supabase db reset` lo aplica después de las migraciones.
--
-- Tres productos de demo, stock para los tres y uno por debajo del umbral para que dispare la
-- alerta del panel. **Las fotos no se siembran**: se suben desde `/admin` al bucket público
-- `productos` y `producto.imagen_url` queda con la URL pública. No se siembran rutas locales
-- muertas (`/productos/*.jpg`), que era el defecto del seed anterior.
--
-- El stock se completa solo si el producto todavía no se tocó (`0/0`): volver a correr el seed no
-- pisa cantidades reales después de una venta.

insert into public.producto (nombre, categoria, tipo, descripcion, precio, tiempo_produccion)
select v.nombre, v.categoria, v.tipo, v.descripcion, v.precio, v.tiempo_produccion
from (values
  ('Crema Hidratante Facial', 'Cosmética', 'Emulsión', 'Base de aloe vera y manzanilla', 2500.00, 3),
  ('Jabón Líquido Neutro', 'Higiene', 'Líquido', 'Fórmula suave hipoalergénica', 1800.00, 2),
  ('Alcohol en Gel', 'Higiene', 'Gel', 'Alcohol en gel con glicerina, elaborado en el laboratorio', 1200.00, 1)
) as v(nombre, categoria, tipo, descripcion, precio, tiempo_produccion)
where not exists (
  select 1 from public.producto p where lower(p.nombre) = lower(v.nombre)
);

-- Fotografías: el seed no inventa rutas locales. Si el catálogo venía del esquema viejo con
-- `/productos/*.jpg`, se limpia para que la tienda muestre el placeholder hasta subir la foto real
-- desde `/admin` (bucket público `productos`).
update public.producto
   set imagen_url = null
 where imagen_url like '/productos/%';

-- Crema: stock alto, sin alerta.
update public.stock
   set cantidad_actual = 48,
       cantidad_reservada = 0,
       cantidad_warning = 10
 where id_producto = (
   select id_producto from public.producto where lower(nombre) = lower('Crema Hidratante Facial')
 )
   and cantidad_actual = 0
   and cantidad_reservada = 0;

-- Jabón: por debajo del umbral (10). Dispara la alerta del panel al correr el seed.
update public.stock
   set cantidad_actual = 6,
       cantidad_reservada = 0,
       cantidad_warning = 10
 where id_producto = (
   select id_producto from public.producto where lower(nombre) = lower('Jabón Líquido Neutro')
 )
   and cantidad_actual = 0
   and cantidad_reservada = 0;

-- Alcohol en Gel: stock medio, por encima del umbral.
update public.stock
   set cantidad_actual = 24,
       cantidad_reservada = 0,
       cantidad_warning = 8
 where id_producto = (
   select id_producto from public.producto where lower(nombre) = lower('Alcohol en Gel')
 )
   and cantidad_actual = 0
   and cantidad_reservada = 0;
