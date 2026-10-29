// Datos y reglas de la siembra de demo (#22 · B5) — la **fuente única** del contenido de la beta.
//
// Por qué un módulo aparte y no `supabase/seed.sql`: el seed versionado es el del `db reset` y
// `tests/db/seed.test.ts` lo fija (tres productos, `imagen_url` nulo, stock 24/48/6). Los datos de
// demo —nueve productos con foto, clientes y pedidos de prueba— no pueden vivir ahí sin romper ese
// contrato. Acá viven una sola vez: el adaptador `scripts/sembrar-demo.mjs` los aplica contra el
// proyecto vivo y `tests/front/demo.test.ts` los verifica sin red.
//
// El vocabulario es el del glosario: cosmética e higiene elaboradas por el Departamento de Química
// (#51). El test lo chequea, porque este archivo alimenta la tienda que se ve en la demo.

/** Id de la foto que va al hero. Vive en `public/` (asset del repo), no en el bucket. */
export const FOTO_DEL_HERO = "heroe";

/**
 * Fotos reales de Wikimedia Commons. Cada una guarda su origen y su atribución: las licencias
 * CC BY-SA exigen nombrar autor y licencia, y `docs/entrega/CREDITOS-FOTOS.md` es la copia legible
 * (el test verifica que las dos listas no se separen).
 *
 * Cada producto referencia su foto por clave y hay **una foto por slot**: la del hero vive en
 * `public/` (asset del repo) y las demás se suben al bucket público `productos` con la clave
 * `productos/<id_producto>/<slug>.jpg`, que arma `claveDeFotoDeProducto`.
 */
export const FOTOS = {
  heroe: {
    archivo: "Woman applying cream to hand.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Woman_applying_cream_to_hand.jpg/960px-Woman_applying_cream_to_hand.jpg",
    autor: "Moose Photos",
    licencia: "CC0",
    pagina: "https://commons.wikimedia.org/wiki/File:Woman_applying_cream_to_hand.jpg",
  },
  crema: {
    archivo: "Lip balm.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Lip_balm.jpg/960px-Lip_balm.jpg",
    autor: "HelarLukats",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Lip_balm.jpg",
  },
  liquido: {
    archivo: "Green shampoo bottle.jpg",
    origen: "https://upload.wikimedia.org/wikipedia/commons/9/96/Green_shampoo_bottle.jpg",
    autor: "Mezoneni",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Green_shampoo_bottle.jpg",
  },
  gel: {
    archivo: "Soap making ingredients.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Soap_making_ingredients.jpg/960px-Soap_making_ingredients.jpg",
    autor: "Szombat78",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Soap_making_ingredients.jpg",
  },
  alepo: {
    archivo: "Savon d'Alep Laurier 12% - 2.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Savon_d%27Alep_Laurier_12%25_-_2.jpg/960px-Savon_d%27Alep_Laurier_12%25_-_2.jpg",
    autor: "Lionel Allorge",
    licencia: "CC BY-SA 3.0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Savon_d%27Alep_Laurier_12%25_-_2.jpg",
  },
  glicerina: {
    archivo: "Hand wash soap.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Hand_wash_soap.jpg/960px-Hand_wash_soap.jpg",
    autor: "Akshaya govindasamy",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Hand_wash_soap.jpg",
  },
  rosas: {
    archivo: "Nizza-Soap-4070848.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Nizza-Soap-4070848.jpg/960px-Nizza-Soap-4070848.jpg",
    autor: "Ermell",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Nizza-Soap-4070848.jpg",
  },
  balm: {
    archivo: "Homemade lip balm.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Homemade_lip_balm.jpg/960px-Homemade_lip_balm.jpg",
    autor: "Pava",
    licencia: "CC BY-SA 3.0 it",
    pagina: "https://commons.wikimedia.org/wiki/File:Homemade_lip_balm.jpg",
  },
  hierbas: {
    archivo: "Aleppo soap 01.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Aleppo_soap_01.jpg/960px-Aleppo_soap_01.jpg",
    autor: "Bgag",
    licencia: "CC BY-SA 3.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Aleppo_soap_01.jpg",
  },
  aceite: {
    archivo: "Essential natural oils and skin care products.jpg",
    origen:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Essential_natural_oils_and_skin_care_products.jpg/960px-Essential_natural_oils_and_skin_care_products.jpg",
    autor: "Kolobetsoo",
    licencia: "CC BY-SA 4.0",
    pagina:
      "https://commons.wikimedia.org/wiki/File:Essential_natural_oils_and_skin_care_products.jpg",
  },
};

/**
 * Catálogo de la demo. Los tres primeros ya existen en `otjph…`: el adaptador los reconoce por
 * nombre (sin distinguir mayúsculas) y los **actualiza** en vez de duplicarlos — que es el defecto
 * que el seed versionado todavía tiene (`Alcohol en Gel` vs `Alcohol en Gel 70%`).
 *
 * `stock.actual` y `stock.warning` se eligen para que la demo muestre los tres casos de la tienda:
 * stock holgado, alerta de stock y una card sin stock.
 */
export const PRODUCTOS = [
  {
    nombre: "Crema Hidratante Facial",
    categoria: "Cosmética",
    tipo: "Emulsión",
    descripcion:
      "Crema de día con aloe vera y manzanilla, de absorción rápida y sin fragancia agregada.",
    precio: 2500,
    tiempoProduccion: 3,
    stock: { actual: 48, warning: 10 },
    foto: "crema",
  },
  {
    nombre: "Jabón Líquido Neutro",
    categoria: "Higiene",
    tipo: "Líquido",
    descripcion:
      "Fórmula hipoalergénica para piel sensible, pensada para el lavado diario de manos y cuerpo.",
    precio: 1800,
    tiempoProduccion: 2,
    // Por debajo del umbral: dispara la alerta del panel.
    stock: { actual: 6, warning: 10 },
    foto: "liquido",
  },
  {
    nombre: "Alcohol en Gel 70%",
    categoria: "Desinfección",
    tipo: "Gel",
    descripcion:
      "Gel sanitizante con glicerina para no resecar la piel, elaborado por el Departamento de Química.",
    precio: 1200,
    tiempoProduccion: 1,
    stock: { actual: 24, warning: 8 },
    foto: "gel",
  },
  {
    nombre: "Jabón Artesanal de Alepo",
    categoria: "Higiene",
    tipo: "Sólido",
    descripcion:
      "Barra de proceso en frío con aceite de oliva y laurel, curada durante seis semanas.",
    precio: 2200,
    tiempoProduccion: 6,
    stock: { actual: 12, warning: 6 },
    foto: "alepo",
  },
  {
    nombre: "Jabón de Glicerina y Caléndula",
    categoria: "Higiene",
    tipo: "Sólido",
    descripcion:
      "Jabón transparente con pétalos de caléndula, pensado para pieles reactivas.",
    precio: 1600,
    tiempoProduccion: 3,
    // Sin stock: la card se muestra marcada y no ofrece agregarlo (HU-3).
    stock: { actual: 0, warning: 5 },
    foto: "glicerina",
  },
  {
    nombre: "Jabón de Pétalos de Rosa",
    categoria: "Higiene",
    tipo: "Sólido",
    descripcion:
      "Barra con infusión de pétalos de rosa y manteca de cacao, de espuma cremosa.",
    precio: 2400,
    tiempoProduccion: 5,
    stock: { actual: 30, warning: 8 },
    foto: "rosas",
  },
  {
    nombre: "Bálsamo Labial de Cera de Abeja",
    categoria: "Cosmética",
    tipo: "Bálsamo",
    descripcion:
      "Cera de abeja y manteca de cacao para labios partidos, en envase reutilizable.",
    precio: 1500,
    tiempoProduccion: 2,
    stock: { actual: 15, warning: 5 },
    foto: "balm",
  },
  {
    nombre: "Jabón de Hierbas Aromáticas",
    categoria: "Higiene",
    tipo: "Sólido",
    descripcion:
      "Barra curada con romero, salvia y aceite de oliva, de aroma intenso y espuma densa.",
    precio: 2000,
    tiempoProduccion: 5,
    stock: { actual: 20, warning: 6 },
    foto: "hierbas",
  },
  {
    nombre: "Aceite Corporal de Almendras",
    categoria: "Cosmética",
    tipo: "Aceite",
    descripcion:
      "Aceite de almendras dulces con vitamina E, para masaje y piel muy seca.",
    precio: 3200,
    tiempoProduccion: 4,
    stock: { actual: 18, warning: 8 },
    foto: "aceite",
  },
];

/**
 * Clientes de la demo. El correo es `@example.com` a propósito: es el dominio reservado por la
 * RFC 2606, así que si alguien aprueba un comprobante y el remito sale, no le llega a nadie real.
 */
export const CLIENTES = [
  {
    nombre: "Martina Ferreyra",
    dni: "41234567",
    email: "martina.ferreyra@example.com",
    telefono: "3489 445566",
  },
  {
    nombre: "Lautaro Giménez",
    dni: "39876543",
    email: "lautaro.gimenez@example.com",
    telefono: "3489 512233",
  },
  {
    nombre: "Camila Aguirre",
    dni: "42345678",
    email: "camila.aguirre@example.com",
    telefono: "3489 667788",
  },
  {
    nombre: "Tomás Benítez",
    dni: "40123456",
    email: "tomas.benitez@example.com",
    telefono: "3489 334455",
  },
  {
    nombre: "Sofía Quiroga",
    dni: "43567890",
    email: "sofia.quiroga@example.com",
    telefono: "3489 221100",
  },
  {
    nombre: "Bruno Salvatierra",
    dni: "38765432",
    email: "bruno.salvatierra@example.com",
    telefono: "3489 998877",
  },
];

/**
 * Pedidos de la demo: uno por cliente y los cuatro desenlaces del MVP, para que la tabla del panel
 * se vea con datos reales y el flujo de validación se pueda mostrar entero.
 *
 * `desenlace`:
 *   - `pendiente`  → queda `Pendiente de Pago` con el comprobante subido (listo para aprobar).
 *   - `sinComprobante` → queda `Pendiente de Pago` sin comprobante (el estado que avisa del viernes).
 *   - `aprobado`   → se aprueba el comprobante: descuenta stock, libera reserva y emite remito.
 *   - `rechazado`  → se rechaza: libera la reserva.
 *   - `cancelado`  → lo cancela el cron: es el pedido vencido del viernes.
 *
 * `montoDelComprobante` es el total que el adaptador tiene que ver en la base antes de subir la
 * imagen: si un precio cambió, la imagen dejaría de coincidir con el pedido y el adaptador corta
 * con un mensaje en vez de dejar el panel inconsistente (la validación es manual y compara montos).
 */
export const PEDIDOS = [
  {
    cliente: "martina.ferreyra@example.com",
    items: [{ producto: "Crema Hidratante Facial", cantidad: 2 }],
    desenlace: "pendiente",
    montoDelComprobante: 5000,
  },
  {
    cliente: "lautaro.gimenez@example.com",
    items: [
      { producto: "Jabón Artesanal de Alepo", cantidad: 3 },
      { producto: "Alcohol en Gel 70%", cantidad: 1 },
    ],
    desenlace: "aprobado",
    montoDelComprobante: 7800,
  },
  {
    cliente: "camila.aguirre@example.com",
    items: [{ producto: "Jabón de Pétalos de Rosa", cantidad: 2 }],
    desenlace: "aprobado",
    montoDelComprobante: 4800,
  },
  {
    cliente: "tomas.benitez@example.com",
    items: [{ producto: "Aceite Corporal de Almendras", cantidad: 1 }],
    desenlace: "rechazado",
    montoDelComprobante: 3200,
  },
  {
    cliente: "sofia.quiroga@example.com",
    items: [{ producto: "Jabón de Hierbas Aromáticas", cantidad: 2 }],
    desenlace: "cancelado",
    montoDelComprobante: 4000,
  },
  {
    cliente: "bruno.salvatierra@example.com",
    items: [
      { producto: "Alcohol en Gel 70%", cantidad: 4 },
      { producto: "Jabón Líquido Neutro", cantidad: 2 },
    ],
    desenlace: "sinComprobante",
    montoDelComprobante: null,
  },
];

/** Desenlaces que el adaptador sabe aplicar. Un `desenlace` fuera de acá es un error de datos. */
export const DESENLACES = ["pendiente", "sinComprobante", "aprobado", "rechazado", "cancelado"];

/** Sanea un nombre para usarlo como clave de objeto en el bucket (misma regla que `archivo.ts`). */
export function slug(texto) {
  return String(texto)
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** El bucket público de las fotos de producto (no es la tabla legacy: excepción del glosario). */
const BUCKET_FOTOS = "productos";

/**
 * Clave de la foto de un producto.
 *
 * **Incluye el bucket como primer segmento**, igual que `claveDelArchivo("foto", …)` del panel
 * (`src/lib/archivo.ts`). No es un capricho: el panel sube a `from("productos").upload(clave)` y
 * publica con `getPublicUrl(clave)`, así que el objeto vive en `productos/productos/<id>/…` y la
 * clave tiene que ser la misma para que volver a subir la foto desde `/admin` **reemplace** este
 * objeto en vez de dejar otro al lado.
 */
export function claveDeFotoDeProducto(idProducto, nombre) {
  return `${BUCKET_FOTOS}/${idProducto}/${slug(nombre)}.jpg`;
}

/** Clave de la imagen de un comprobante en el bucket **privado** `comprobantes`. */
export function claveDeComprobante(idPedido) {
  return `comprobantes/${idPedido}/transferencia-demo.png`;
}

/**
 * URL pública de la foto de un producto: lo que el panel guarda en `producto.imagen_url` y lo que
 * consume `next/image`.
 *
 * Es el equivalente de `getPublicUrl(clave)` del panel, y por eso el bucket aparece **dos veces**:
 * una porque la ruta pública lo nombra y otra porque la clave ya lo traía. Con una sola, el objeto
 * no existe y el bucket contesta `400 NoSuchKey` — verificado contra la base viva.
 */
export function urlPublicaDeFoto(urlBase, clave) {
  return `${String(urlBase).replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_FOTOS}/${clave}`;
}

/**
 * Orden en que se siembran los pedidos.
 *
 * El pedido `cancelado` va **primero** y se cancela antes de crear el resto: `cancelar_pedidos_
 * vencidos()` recorre *todos* los pedidos `Pendiente de Pago`, así que si corriera al final
 * cancelaría también los que la demo necesita abiertos. Es la trampa del cron, no un detalle.
 */
export function ordenDeSiembra(pedidos = PEDIDOS) {
  const cancelados = pedidos.filter((pedido) => pedido.desenlace === "cancelado");
  const resto = pedidos.filter((pedido) => pedido.desenlace !== "cancelado");
  return [...cancelados, ...resto];
}

/**
 * Total de un pedido a partir del precio de cada producto, con la precisión del modelo
 * (`NUMERIC(12,2)`): se multiplica en centavos enteros para no arrastrar el error del punto
 * flotante. Es la verificación previa del adaptador, no un segundo cálculo del dominio: el total
 * que se guarda lo deriva el trigger de la base.
 */
export function totalDePedido(pedido, precioPorNombre) {
  const centavos = pedido.items.reduce((suma, item) => {
    const precio = precioPorNombre.get(item.producto);
    if (typeof precio !== "number") {
      throw new Error(`El pedido pide un producto que no está en el catálogo: ${item.producto}`);
    }
    return suma + Math.round(precio * 100) * item.cantidad;
  }, 0);
  return centavos / 100;
}

/** Mapa `nombre → precio` del catálogo de demo, para `totalDePedido`. */
export function preciosDeCatalogo(productos = PRODUCTOS) {
  return new Map(productos.map((producto) => [producto.nombre, producto.precio]));
}

/**
 * Producto del catálogo cuyo nombre coincide ignorando mayúsculas y espacios. El catálogo vivo no
 * es idéntico al del repo (`Alcohol en Gel 70%` contra `Alcohol en Gel`), así que el adaptador
 * necesita reconocer lo que ya está para actualizarlo en vez de duplicarlo.
 */
export function productoPorNombre(productos, nombre) {
  const buscado = String(nombre).trim().toLowerCase();
  return productos.find((producto) => String(producto.nombre).trim().toLowerCase() === buscado);
}
