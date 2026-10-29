# Créditos de las fotos de la demo · #22 (B5)

> **Qué es:** la atribución de las fotos que siembra la demo de la beta. Las licencias
> `CC BY-SA` **exigen** nombrar autor y licencia, así que esta página no es decorativa.
> **Fuente única:** la lista de fotos y sus autores vive en
> [`scripts/demo-reglas.mjs`](../../scripts/demo-reglas.mjs) (`FOTOS`); el test
> [`tests/front/demo.test.ts`](../../tests/front/demo.test.ts) falla si esta tabla se queda atrás.
> **Cómo se reemplazan:** subiendo la foto real desde `/admin` (bucket público `productos`), que
> pisa `producto.imagen_url`. La foto del hero es un asset del repo: `public/hero/portada.jpg`.

## Fotos de producto y del hero

| Slot | Dónde se usa | Archivo en Wikimedia Commons | Autor | Licencia |
|---|---|---|---|---|
| `heroe` | hero de la Home | Woman applying cream to hand.jpg | Moose Photos | CC0 |
| `crema` | Crema Hidratante Facial | Lip balm.jpg | HelarLukats | CC BY-SA 4.0 |
| `liquido` | Jabón Líquido Neutro | Green shampoo bottle.jpg | Mezoneni | CC BY-SA 4.0 |
| `gel` | Alcohol en Gel 70% | Soap making ingredients.jpg | Szombat78 | CC BY-SA 4.0 |
| `alepo` | Jabón Artesanal de Alepo | Savon d'Alep Laurier 12% - 2.jpg | Lionel Allorge | CC BY-SA 3.0 |
| `glicerina` | Jabón de Glicerina y Caléndula | Hand wash soap.jpg | Akshaya govindasamy | CC BY-SA 4.0 |
| `rosas` | Jabón de Pétalos de Rosa | Nizza-Soap-4070848.jpg | Ermell | CC BY-SA 4.0 |
| `hierbas` | Jabón de Hierbas Aromáticas | Aleppo soap 01.jpg | Bgag | CC BY-SA 3.0 |
| `balm` | Bálsamo Labial de Cera de Abeja | Homemade lip balm.jpg | Pava | CC BY-SA 3.0 it |
| `aceite` | Aceite Corporal de Almendras | Essential natural oils and skin care products.jpg | Kolobetsoo | CC BY-SA 4.0 |

Cada archivo de Commons está en `https://commons.wikimedia.org/wiki/File:<archivo>`; la URL directa
del objeto que se descarga está en la entrada `origen` de cada foto en `demo-reglas.mjs`.

## Dos advertencias honestas

1. **Dos fotos son aproximadas.** La de `gel` (Alcohol en Gel 70%) muestra frascos de aceites y la de
   `aceite` una mesa de productos: sirven para que la tienda se vea completa, pero no son del
   producto exacto. Se reemplazan desde `/admin` cuando estén las fotos reales del taller.
2. **La foto del hero es de un banco libre, no de la escuela.** Es la única del set; la foto real
   —alumnos elaborando— es la que corresponde para la versión final.

## Los comprobantes no son fotos

Las imágenes de `supabase/demo/comprobantes/*.png` están **generadas** con Pillow: son comprobantes
de demostración, con el monto de cada pedido de demo y la leyenda «COMPROBANTE DE DEMOSTRACIÓN» a
la vista. No acreditan ninguna transferencia. Si cambia un precio del catálogo de demo, el total del
pedido deja de coincidir con la imagen y `npm run demo:sembrar` corta con un mensaje en vez de dejar
el panel inconsistente.
