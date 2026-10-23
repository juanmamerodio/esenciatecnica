# Testing con Vitest · guía corta

> **Para:** Celeste Cáceres (Testing QA) y quien implemente el primer ticket.
> **Estado:** Vitest todavía no está instalado. Se agrega en el primer ticket de implementación.
> **Regla:** TDD obligatorio: primero el test que falla, después el código.

---

## 1. Vitest no es Vite como bundler

Vitest usa Vite internamente para transformar los tests, pero **no reemplaza a Next.js** ni cambia el
bundler de producción. Next sigue compilando con su propio pipeline (SWC/Turbopack). No hay que tocar
`next.config.ts` ni migrar la app a Vite.

---

## 2. Instalación propuesta

Cuando arranque el primer ticket:

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

`jsdom` y Testing Library son para tests de componentes. Si el primer test es de una función pura, se
pueden agregar después.

---

## 3. Configuración mínima

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

`vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 4. Primer test (rojo → verde)

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

Comandos:

```bash
npm test          # corre una vez
npm run test:watch
```

El test debe fallar antes de implementar el cambio y pasar después. Si no falla, no está probando lo
que creés.

---

## 5. Qué testear primero

Orden sugerido:

1. Funciones puras de formato y cálculos (`formatPrice`, totales, subtotales).
2. Reglas de stock: reservar, aprobar, liberar.
3. Validación del comprobante: monto contra total.
4. Servicios de pedido con Supabase mockeado.
5. Componentes críticos: checkout y `/admin` (Testing Library).

No testees implementación interna; testea comportamiento observable.

---

## 6. Convenciones

- Un archivo `*.test.ts` al lado del archivo que prueba.
- Nombres en español, claros: `reserva stock al confirmar el pedido`.
- Un `describe` por unidad; un `it` por comportamiento.
- Sin `any`; sin mocks de más.
- Los tests no dependen de la base real ni de la red.

---

## 7. Responsabilidad

Celeste es la responsable de testing/QA. Esta guía es un punto de partida; si prefiere Jest, se cambia
antes de instalar y se actualiza este documento.
