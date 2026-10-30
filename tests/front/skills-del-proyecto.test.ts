import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, leer } from './ayudantes';

/**
 * #45 · Las dos skills propias del repo (spec `skills-del-proyecto`, issue #28).
 *
 * El test es estructural: recorre las skills de `.agents/skills/` y falla si una está mal formada
 * para el runtime (archivo, un solo nivel, frontmatter sin `model:` ni `tools:`). Una skill que el
 * entorno no carga es código muerto, así que la forma se testea, no sólo el texto.
 *
 * Lo que el texto sí garantiza: que cada skill **apunte** a su fuente en vez de copiarla, que la del
 * tablero exija `--autor` y deje bitácora y auditoría, y que la de `bd:viva` no confunda
 * «`npm test` verde» con «base viva en verde».
 */

const SKILLS = join(RAIZ, '.agents', 'skills');

/** Las dos skills propias acordadas el 27-10 (spec §4). */
const ESPERADAS = ['bd-viva', 'tablero-teams'];

type Skill = { carpeta: string; frontmatter: string; cuerpo: string };

function frontmatterDe(contenido: string): string | null {
  const encontrado = contenido.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return encontrado ? (encontrado[1] ?? '') : null;
}

function valorDe(frontmatter: string, clave: string): string | null {
  const encontrado = frontmatter.match(new RegExp(`^${clave}:[^\n]*$`, 'm'));
  if (!encontrado) return null;
  return (encontrado[0].slice(clave.length + 1) ?? '').trim().replace(/^["']|["']$/g, '');
}

/** Los directorios bajo `.agents/skills/`, ordenados. Devuelve `[]` si el directorio no existe. */
function carpetas(): string[] {
  if (!existsSync(SKILLS)) return [];
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort();
}

function skills(): Skill[] {
  return carpetas()
    .filter((carpeta) => existsSync(join(SKILLS, carpeta, 'SKILL.md')))
    .map((carpeta) => {
      const contenido = readFileSync(join(SKILLS, carpeta, 'SKILL.md'), 'utf8');
      const frontmatter = frontmatterDe(contenido) ?? '';
      return {
        carpeta,
        frontmatter,
        cuerpo: contenido.slice(frontmatter ? contenido.indexOf(frontmatter) + frontmatter.length : 0),
      };
    });
}

describe('#45 · las skills del proyecto existen y el runtime las puede cargar', () => {
  it('`.agents/skills/` existe con las dos skills acordadas', () => {
    expect(existsSync(SKILLS), 'no existe `.agents/skills/`').toBe(true);
    expect(carpetas()).toEqual(ESPERADAS);
    expect(skills().map((skill) => skill.carpeta)).toEqual(ESPERADAS);
  });

  it('cada skill vive en su `<nombre-kebab>/SKILL.md`, en un solo nivel', () => {
    for (const carpeta of carpetas()) {
      expect(carpeta, `«${carpeta}» no es kebab-case`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(existsSync(join(SKILLS, carpeta, 'SKILL.md')), `${carpeta}: falta SKILL.md`).toBe(true);
    }
  });

  it('el frontmatter es el mínimo que el entorno lee', () => {
    for (const { carpeta, frontmatter } of skills()) {
      expect(frontmatter, `${carpeta}: falta el frontmatter`).not.toBe('');

      const nombre = valorDe(frontmatter, 'name');
      expect(nombre, `${carpeta}: falta «name»`).toBeTruthy();
      expect(nombre, `${carpeta}: «name» no es kebab-case`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(nombre, `${carpeta}: «name» no coincide con el directorio`).toBe(carpeta);

      expect(valorDe(frontmatter, 'description'), `${carpeta}: falta «description»`).toBeTruthy();
      expect(valorDe(frontmatter, 'whenToUse'), `${carpeta}: falta «whenToUse»`).toBeTruthy();

      expect(frontmatter, `${carpeta}: el frontmatter no puede tener «model:»`).not.toMatch(
        /^\s*model\s*:/m,
      );
      expect(frontmatter, `${carpeta}: el frontmatter no puede tener «tools:»`).not.toMatch(
        /^\s*tools\s*:/m,
      );
    }
  });

  it('cada skill apunta a su fuente en vez de copiarla', () => {
    for (const { carpeta, cuerpo } of skills()) {
      expect(cuerpo, `${carpeta}: no linkea ninguna fuente`).toMatch(/\]\(\.\.\/[^)]+\.md/);
      expect(cuerpo.split('\n').length, `${carpeta}: copia documentación en vez de apuntarla`).toBeLessThan(
        100,
      );
    }

    const tablero = skills().find((skill) => skill.carpeta === 'tablero-teams');
    expect(tablero?.cuerpo).toContain('docs/agentes/teams.md');

    const viva = skills().find((skill) => skill.carpeta === 'bd-viva');
    expect(viva?.cuerpo).toContain('docs/specs/migracion-otjph/spec.md');
    expect(viva?.cuerpo).toContain('scripts/verificar-bd-viva.mjs');
  });

  it('sigue la anatomía de brain.md §4.1 en orden: PROPÓSITO → PARÁMETROS DE ENTRADA → GUARDRAILS → PASOS DE EJECUCIÓN', () => {
    const secciones = ['PROPÓSITO', 'PARÁMETROS DE ENTRADA', 'GUARDRAILS', 'PASOS DE EJECUCIÓN'];
    for (const { carpeta, cuerpo } of skills()) {
      const posiciones = secciones.map((s) => cuerpo.indexOf(s));
      for (const [i, s] of secciones.entries()) {
        expect(posiciones[i], `${carpeta}: falta la sección «${s}»`).toBeGreaterThan(-1);
      }
      for (let i = 1; i < posiciones.length; i += 1) {
        expect(posiciones[i], `${carpeta}: «${secciones[i]}» va antes que «${secciones[i - 1]}»`).toBeGreaterThan(
          posiciones[i - 1] ?? -1,
        );
      }
    }
  });

  it('la skill del tablero exige `--autor` y deja bitácora y auditoría', () => {
    const tablero = skills().find((skill) => skill.carpeta === 'tablero-teams');
    expect(tablero).toBeDefined();
    const cuerpo = tablero?.cuerpo ?? '';

    expect(cuerpo).toMatch(/--autor/);
    for (const estado of ['backlog', 'in_progress', 'review', 'done']) {
      expect(cuerpo, `la skill no nombra el estado «${estado}»`).toContain(estado);
    }
    expect(cuerpo).toMatch(/task_notes|bitácora/i);
    expect(cuerpo).toMatch(/task_audit_logs|auditoría/i);
  });

  it('la skill de `bd:viva` distingue el cache de PostgREST y no confunde `npm test` con la base viva', () => {
    const viva = skills().find((skill) => skill.carpeta === 'bd-viva');
    expect(viva).toBeDefined();
    const cuerpo = viva?.cuerpo ?? '';

    expect(cuerpo).toContain('npm run bd:viva');
    expect(cuerpo, 'no explica el cache de PostgREST').toMatch(/reload schema|cache/i);
    expect(cuerpo, 'no separa `npm test` de la base viva').toContain('npm test');
  });

  it('`AGENTS.md` §11 nombra cada skill real y mantiene la regla del entorno', () => {
    const agents = leer('AGENTS.md');
    const inicio = agents.indexOf('## 11.');
    const siguiente = agents.indexOf('\n## 12.', inicio + 1);
    const seccion = agents.slice(inicio, siguiente === -1 ? undefined : siguiente);

    expect(seccion).toMatch(/SKILL\.md/);
    expect(seccion).toMatch(/model/);
    expect(seccion).toMatch(/tools/);
    expect(seccion, '§11 no declara el descubrimiento de un solo nivel').toMatch(/un solo nivel/i);
    for (const carpeta of carpetas()) {
      expect(seccion, `§11 no nombra la skill «${carpeta}»`).toContain(carpeta);
    }
  });

  it('`AGENTS.md` aplica divulgación progresiva (brain.md §2.3) y no supera las 100 líneas', () => {
    const lineas = leer('AGENTS.md').trimEnd().split(/\r?\n/);
    expect(lineas.length, `AGENTS.md tiene ${lineas.length} líneas (máximo 100)`).toBeLessThanOrEqual(100);
  });
});
