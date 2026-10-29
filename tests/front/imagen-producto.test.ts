import { describe, expect, it } from 'vitest';
import { esUrlDeImagenPermitida } from '../../src/lib/imagen';
import { leer } from './ayudantes';

/**
 * #49 · La Home devuelve 500 si `producto.imagen_url` apunta a un host fuera de
 * `images.remotePatterns`.
 *
 * `next/image` valida el `src` **durante el render** y tira si el host no está en el
 * contrato (`next.config.ts`: `**.supabase.co`). El `onError` del componente no llega a
 * correr, así que una sola fila con un host ajeno tumba la página entera. La decisión de
 * qué URL se puede renderizar vive en un módulo puro —para poder testearla— y el
 * componente muestra el placeholder cuando la respuesta es «no».
 */

describe('#49 · qué URL de imagen se puede renderizar', () => {
  it('acepta la URL pública del bucket del proyecto', () => {
    expect(
      esUrlDeImagenPermitida('https://otjphjnrwihqzzhbfnmh.supabase.co/storage/v1/object/public/productos/1.jpg'),
    ).toBe(true);
    expect(esUrlDeImagenPermitida('https://algo.supabase.co/x.png')).toBe(true);
  });

  it('rechaza un host fuera del contrato: es el 500 del issue', () => {
    expect(esUrlDeImagenPermitida('https://ejemplo.com/img/alcohol.jpg')).toBe(false);
    expect(esUrlDeImagenPermitida('https://supabase.co.ejemplo.com/x.jpg')).toBe(false);
    expect(esUrlDeImagenPermitida('//ejemplo.com/x.jpg')).toBe(false);
    expect(esUrlDeImagenPermitida('https://supabase.co/x.jpg')).toBe(false);
  });

  it('rechaza lo que `next/image` tampoco acepta: http y basura', () => {
    expect(esUrlDeImagenPermitida('http://algo.supabase.co/x.png')).toBe(false);
    expect(esUrlDeImagenPermitida('data:image/png;base64,AAAA')).toBe(false);
    expect(esUrlDeImagenPermitida('no-es-una-url')).toBe(false);
    expect(esUrlDeImagenPermitida('   ')).toBe(false);
  });

  it('acepta rutas locales de `public/` y rechaza el vacío', () => {
    expect(esUrlDeImagenPermitida('/productos/jabon.jpg')).toBe(true);
    expect(esUrlDeImagenPermitida(null)).toBe(false);
    expect(esUrlDeImagenPermitida(undefined)).toBe(false);
    expect(esUrlDeImagenPermitida('')).toBe(false);
  });
});

describe('#49 · el placeholder, antes que el error de `next/image`', () => {
  it('ImagenProducto decide con el módulo puro antes de renderizar la imagen', () => {
    const componente = leer('src/components/ImagenProducto.tsx');
    expect(componente).toMatch(/from "@\/lib\/imagen"/);
    expect(componente).toMatch(/esUrlDeImagenPermitida\(/);
    // El placeholder se elige antes de llegar al `Image`: con el host ajeno no se renderiza.
    expect(componente.indexOf('esUrlDeImagenPermitida(')).toBeLessThan(componente.indexOf('<Image'));
  });
});
