# Testing con Vitest · guía corta

> **Para:** Celeste Cáceres (Testing QA) y quien implemente el próximo ticket.
> **Estado:** Vitest instalado. La suite actual cubre la base de datos (59 tests, sin red).
> **Regla:** TDD obligatorio: primero el test que falla, después el código.

---

## 1. Vitest no es Vite como bundler

Vitest usa Vite internamente para transformar los tests, pero **no reemplaza a Next.js** ni cambia el
bundler de producción. Next sigue compilando con su propio pipeline (SWC/Turbopack). No hay que tocar
`next.config.ts` ni migrar la app a Vite.

---

## 2. Instalación

Ya instalado:

```bash
npm i -D vitest @electric-sql/pglite
```

`@electric-sql/pglite` es PostgreSQL real compilado a WASM: permite correr las migraciones y probar
constraints, triggers y RLS sin Docker, sin red y sin tocar Supabase.

Cuando haga falta testear componentes, se agregan `jsdom`, `@testing-library/react` y
`@testing-library/jest-dom` en ese ticket, no antes.

---

## 3. Configuración actual

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
```

`package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "db:types": "node scripts/generar-tipos-bd.mjs"
  }
}
```

Cuando se agreguen tests de componentes, se cambia `environment` a `jsdom` para esos archivos con el
comentario `// @vitest-environment jsdom` en la cabecera, sin romper los tests de base.

---

## 4. Tests de base de datos

Los tests viven en `tests/db/`. Cada uno levanta una base limpia y aplica `supabase/migrations/*.sql`
en orden con `crearBase()` (`tests/db/ayudantes.ts`).

```ts
const db = await crearBase();                 // base vacía + migraciones
const db = await crearBase({ seed: true });   // + supabase/seed.sql
```

Reglas:

- **Se testea el comportamiento**, no los internals: se usan las tablas y las RPC (`crear_pedido`,
  `aprobar_comprobante`, …), no los nombres de los triggers.
- **RLS**: `comoAnon(db, () => db.query(...))` ejecuta como el rol `anon`, que es el de la clave pública.
- **Nunca** se apunta a la base real: no hay credenciales en los tests y no deben agregarse.

Comandos:

```bash
npm test          # corre todo una vez
npm run test:watch
npm run db:types  # regenera los tipos desde el SQL después de cambiar una migración
```

Qué cubre hoy: contrato de tablas, reserva de stock, aprobación/rechazo/vencimiento, remito único,
RLS de la anon key, migración sobre el esquema legacy y seed idempotente.

---

## 5. Primer test de una feature

`src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formatea un precio en pesos sin decimales', () => {
    expect(formatPrice(4500)).toContain('4.500');
  });
});
```

El test debe fallar antes de implementar el cambio y pasar después. Si no falla, no está probando lo
que creés.

---

## 6. Orden sugerido

1. Reglas de base y RPC (ya cubierto en `tests/db/`).
2. Funciones puras de formato y cálculos (`formatPrice`, totales, subtotales).
3. Servicios de pedido con Supabase mockeado (validar el mapeo de errores `ET00x`).
4. Componentes críticos: checkout y `/admin` (Testing Library).

No testees implementación interna; testea comportamiento observable.

---

## 7. Convenciones

- Un archivo `*.test.ts` por unidad; en base, un archivo por área (`pedidos`, `aprobacion`, `rls`).
- Nombres en español, claros: `reserva stock al confirmar el pedido`.
- Un `describe` por unidad; un `it` por comportamiento.
- Sin `any`; sin mocks de más.
- Los tests no dependen de la base real ni de la red.

---

## 8. Responsabilidad

Celeste es la responsable de testing/QA. Si prefiere Jest, se cambia antes de escribir el próximo test
y se actualiza este documento.
