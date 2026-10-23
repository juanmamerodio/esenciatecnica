import { describe, expect, it } from 'vitest';
import { leer } from './ayudantes';

/**
 * T2 · Catálogo (issue #6) — lo que se verifica en el código de la página.
 *
 * La búsqueda y el filtro operan sobre datos reales del catálogo (no hay controles
 * deshabilitados) y la consulta viaja por la URL, no por un estado de cliente que
 * duplique el filtrado. El comportamiento del filtrado se testea en
 * `catalogo-filtros.test.ts`, contra PGlite.
 */
describe('T2 · página de catálogo', () => {
  const pagina = leer('src/app/catalog/page.tsx');

  it('no deja controles deshabilitados prometiendo funciones que no existen', () => {
    expect(pagina).not.toMatch(/\bdisabled\b/);
  });

  it('la búsqueda es un formulario GET: funciona sin JavaScript y la URL es el estado', () => {
    expect(pagina).toMatch(/<form[^>]*action="\/catalog"[^>]*method="get"/);
    expect(pagina).toMatch(/role="search"/);
    expect(pagina).toMatch(/name="q"/);
    expect(pagina).toMatch(/<label[^>]*htmlFor="busqueda"/);
  });

  it('el filtro por categoría se conserva al buscar y se marca con aria-current', () => {
    expect(pagina).toMatch(/type="hidden" name="categoria"/);
    expect(pagina).toMatch(/aria-current=/);
  });

  it('el estado sin resultados es propio del catálogo y ofrece volver', () => {
    expect(pagina).toContain('Sin resultados para tu búsqueda');
    expect(pagina).toContain('Ver el catálogo completo');
  });

  it('el filtrado no se reimplementa en la página: sale del módulo de catálogo', () => {
    expect(pagina).toMatch(/leerCatalogo\(/);
    expect(pagina).not.toMatch(/\.filter\(|\.includes\(|normalize\(/);
  });
});
