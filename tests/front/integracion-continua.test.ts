import { describe, expect, it } from 'vitest';
import { leer } from './ayudantes';

/**
 * #39 · CI: typecheck, lint, test y `docs:links` en cada push (issue #30).
 *
 * La configuración no se testea por comportamiento: no hay forma de ejecutar GitHub Actions desde la
 * suite. El test es estructural, como el de `bd:viva`: lee el workflow y fija la decisión.
 *
 * La trampa que evita: `bd:viva` **no** entra en CI. Depende de la base viva y hoy está rojo por
 * diseño; meterlo convertiría cada push en un rojo esperado y enseñaría a ignorar el CI.
 */

const workflow = leer('.github/workflows/ci.yml');

/** Posición de la primera aparición de un comando en el workflow, o -1. */
function posicion(comando: string): number {
  return workflow.indexOf(comando);
}

describe('#39 · el workflow corre los cinco controles', () => {
  it('los pasos existen y están en orden: typecheck → lint → test → docs:links → build', () => {
    const comandos = ['npm run typecheck', 'npm run lint', 'npm run test', 'npm run docs:links', 'npm run build'];
    const posiciones = comandos.map((comando) => posicion(comando));

    for (const [i, comando] of comandos.entries()) {
      expect(posiciones[i], `falta "${comando}"`).toBeGreaterThan(-1);
    }
    for (let i = 1; i < posiciones.length; i += 1) {
      expect(posiciones[i], `"${comandos[i]}" debe ir después de "${comandos[i - 1]}"`).toBeGreaterThan(
        posiciones[i - 1] ?? -1,
      );

      // El primer paso que falla corta el job: no puede haber `continue-on-error` en los controles.
      expect(workflow.slice(posiciones[i - 1], posiciones[i])).not.toMatch(/continue-on-error/);
    }
  });

  it('no invoca bd:viva y explica por qué queda afuera', () => {
    const lineas = workflow.split('\n').filter((linea) => linea.includes('bd:viva'));

    // Se documenta en comentarios; ningún paso lo ejecuta.
    expect(lineas.length).toBeGreaterThan(0);
    for (const linea of lineas) {
      expect(linea.trim(), `bd:viva se ejecuta en: ${linea.trim()}`).toMatch(/^#/);
    }
  });

  it('los controles de repo no reciben secretos; el build conserva los suyos', () => {
    const inicioBuild = posicion('npm run build');
    expect(inicioBuild).toBeGreaterThan(-1);

    const controles = workflow.slice(0, inicioBuild);
    expect(controles).not.toMatch(/secrets\./);

    const build = workflow.slice(inicioBuild);
    expect(build).toMatch(/secrets\.NEXT_PUBLIC_SUPABASE_URL/);
    expect(build).toMatch(/secrets\.RESEND_API_KEY/);
  });

  it('dispara en push y en pull request contra main', () => {
    expect(workflow).toMatch(/push:/);
    expect(workflow).toMatch(/pull_request:/);
    expect(workflow.match(/branches:\s*\[\s*"main"\s*\]/g)).toHaveLength(2);
  });
});

describe('#39 · la instalación y la corrida', () => {
  it('usa Node 20, el lockfile y el cache de npm', () => {
    expect(workflow).toMatch(/node-version:\s*20/);
    expect(workflow).toMatch(/cache:\s*'npm'/);
    expect(workflow).toMatch(/npm ci/);
    expect(workflow).not.toMatch(/npm install/);
  });

  it('cancela la corrida anterior de la misma rama', () => {
    expect(workflow).toMatch(/concurrency:/);
    expect(workflow).toMatch(/cancel-in-progress:\s*true/);
    expect(workflow).toMatch(/github\.ref/);
  });

  it('la salida del test no se silencia en el log', () => {
    const bloque = workflow.slice(posicion('npm run test'), posicion('npm run docs:links'));
    expect(bloque).not.toMatch(/--silent|--reporter=dot|--reporter=basic/);
    expect(bloque).toMatch(/CI:\s*true/);
  });
});

describe('#39 · la definición de terminado es una sola', () => {
  /** Sólo la sección §8 de AGENTS.md, hasta el próximo `## `. */
  function seccionOcho(): string {
    const agents = leer('AGENTS.md');
    const inicio = agents.indexOf('## 8. Verificación');
    expect(inicio).toBeGreaterThan(-1);
    const siguiente = agents.indexOf('\n## ', inicio + 1);
    return agents.slice(inicio, siguiente === -1 ? undefined : siguiente);
  }

  it('AGENTS.md §8 dice que la puerta es local y de GitHub, con los mismos comandos', () => {
    const seccion = seccionOcho();
    expect(seccion).toMatch(/GitHub Actions/);
    expect(seccion).toMatch(/local/i);
    for (const comando of ['typecheck', 'lint', 'test', 'docs:links', 'build']) {
      expect(seccion, `§8 no nombra ${comando}`).toMatch(new RegExp(comando.replace(':', '\\:')));
    }
  });

  it('AGENTS.md §8 explica por qué bd:viva no entra en CI', () => {
    expect(seccionOcho()).toMatch(/`npm run bd:viva`[\s\S]{0,400}(no entra|afuera|no corre)/i);
  });

  it('el workflow está versionado y la documentación lo linkea', () => {
    expect(leer('docs/specs/integracion-continua/spec.md')).toMatch(/\.github\/workflows\/ci\.yml/);
  });
});
