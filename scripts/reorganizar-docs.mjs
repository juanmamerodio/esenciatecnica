#!/usr/bin/env node
/**
 * Reorganiza `docs/` en carpetas por tema, sin romper ningún link.
 *
 * Uso:
 *   node scripts/reorganizar-docs.mjs            # informe (no toca nada)
 *   node scripts/reorganizar-docs.mjs --aplicar  # mueve y reescribe los links
 *
 * Cómo resuelve los links: cada destino se resuelve a un path absoluto relativo a la raíz del
 * repo, se mapea por el plan de mudanza y se vuelve a renderizar en el mismo estilo que tenía
 * (relativo `../`, desde la raíz, o URL de GitHub). Un archivo que ya está en su lugar no se
 * declara en el plan y no se toca.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = process.cwd().replace(/\\/g, "/");
const APLICAR = process.argv.includes("--aplicar");

/** plan: path actual (posix, relativo a la raíz) → path nuevo. */
export const PLAN = {
  // ── raíz de docs/: el índice y el modelo, que son el punto de entrada ──
  "docs/README.md": "docs/README.md",
  "docs/MODELO.md": "docs/MODELO.md",

  // ── Entrega: briefs y guías operativas por persona ──
  "docs/HANDOFF-ISABELLA.md": "docs/entrega/HANDOFF-ISABELLA.md",
  "docs/GUIA-ISABELLA.md": "docs/entrega/GUIA-ISABELLA.md",
  "docs/GUIA-QUEIPO.md": "docs/entrega/GUIA-QUEIPO.md",

  // ── Estado y auditoría ──
  "docs/AUDITORIA.md": "docs/estado/AUDITORIA.md",
  "docs/AUDITORIA_BD.md": "docs/estado/AUDITORIA_BD.md",
  "docs/DEUDA_TECNICA.md": "docs/estado/DEUDA_TECNICA.md",
  "docs/SEPARACION.md": "docs/estado/SEPARACION.md",

  // ── Método de trabajo ──
  "docs/brain.md": "docs/metodo/brain.md",
  "docs/TESTING.md": "docs/metodo/TESTING.md",

  // ── Artefactos académicos ──
  "docs/DER-quimica.csv": "docs/academico/DER-quimica.csv",
  "docs/DCU-Quimica.csv": "docs/academico/DCU-Quimica.csv",
  "docs/DFD1-Quimica.csv": "docs/academico/DFD1-Quimica.csv",
  "docs/DFD2-Quimica.csv": "docs/academico/DFD2-Quimica.csv",
  "docs/DFD3-Quimica.csv": "docs/academico/DFD3-Quimica.csv",
  "docs/informe_Escencia_Tecnica.md": "docs/academico/informe_Escencia_Tecnica.md",
  "docs/prototype1.html": "docs/academico/prototype1.html",

  // ── Configuración de agentes ──
  "docs/agents/domain.md": "docs/agentes/domain.md",
  "docs/agents/issue-tracker.md": "docs/agentes/issue-tracker.md",
  "docs/agents/triage-labels.md": "docs/agentes/triage-labels.md",

  // ── Decisiones (no se mueven: los issues de GitHub las linkean por URL) ──
  "docs/adr/0001-modelo-normalizado-mermaid.md": "docs/adr/0001-modelo-normalizado-mermaid.md",
  "docs/adr/0002-validacion-manual-sin-ia.md": "docs/adr/0002-validacion-manual-sin-ia.md",
  "docs/adr/0003-mvp-sin-envio.md": "docs/adr/0003-mvp-sin-envio.md",
  "docs/adr/0004-reconstruccion-esquema-mvp.md": "docs/adr/0004-reconstruccion-esquema-mvp.md",
  "docs/adr/0005-basic-auth-en-middleware.md": "docs/adr/0005-basic-auth-en-middleware.md",

  // ── Specs (no se mueven: los issues de GitHub las linkean por URL) ──
  "docs/specs/bd-mvp/spec.md": "docs/specs/bd-mvp/spec.md",
  "docs/specs/catalogo/spec.md": "docs/specs/catalogo/spec.md",
  "docs/specs/carrito/spec.md": "docs/specs/carrito/spec.md",
  "docs/specs/checkout/spec.md": "docs/specs/checkout/spec.md",
  "docs/specs/detalle-producto/spec.md": "docs/specs/detalle-producto/spec.md",
  "docs/specs/front-mvp/spec.md": "docs/specs/front-mvp/spec.md",
  "docs/specs/migracion-otjph/spec.md": "docs/specs/migracion-otjph/spec.md",
  "docs/specs/remito/spec.md": "docs/specs/remito/spec.md",
  "docs/specs/admin/spec.md": "docs/specs/admin/spec.md",
  "docs/specs/sobre-el-proyecto/spec.md": "docs/specs/sobre-el-proyecto/spec.md",
};

const mudanza = new Map();
for (const [viejo, nuevo] of Object.entries(PLAN)) {
  if (viejo !== nuevo) mudanza.set(viejo, nuevo);
}

// ── 1 · Recolectar los archivos versionados que se van a inspeccionar ──
function listarVersionados() {
  const salida = execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" });
  return salida.split("\n").map((linea) => linea.trim()).filter(Boolean);
}

const archivosVersionados = listarVersionados();

// ── 2 · Mover los archivos (git mv para no perder la historia) ──
function mover() {
  const movidos = [];
  for (const [viejo, nuevo] of mudanza) {
    const origen = path.join(RAIZ, viejo);
    const destino = path.join(RAIZ, nuevo);
    if (!existsSync(origen)) {
      console.warn(`  ! no existe, se saltea: ${viejo}`);
      continue;
    }
    mkdirSync(path.dirname(destino), { recursive: true });
    try {
      execFileSync("git", ["mv", viejo, nuevo], { cwd: RAIZ, encoding: "utf8" });
    } catch {
      renameSync(origen, destino);
    }
    movidos.push([viejo, nuevo]);
  }
  return movidos;
}

// ── 3 · Reescribir los links ──
/** Convierte un path relativo a la raíz en un path relativo a `desde` (ambos posix). */
function relativo(desdeArchivo, destino) {
  const desdeDir = path.posix.dirname(desdeArchivo);
  const rel = path.posix.relative(desdeDir, destino);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Reescribe un link si su destino se movió. Devuelve el link nuevo, o null si no cambia.
 * `origen` es el archivo que contiene el link (posix, relativo a la raíz) y su path ya puede
 * ser el viejo o el nuevo.
 */
function reescribirLink(origen, link) {
  // 1 · URL absoluta de GitHub a la rama main.
  const urlGithub = /^https:\/\/github\.com\/juanmamerodio\/esenciatecnica\/blob\/main\/(.+?)(#.*)?$/;
  const comoUrl = urlGithub.exec(link);
  if (comoUrl) {
    const destinoViejo = decodeURIComponent(comoUrl[1]);
    const destinoNuevo = mudanza.get(destinoViejo);
    if (!destinoNuevo) return null;
    return `https://github.com/juanmamerodio/esenciatecnica/blob/main/${destinoNuevo}${comoUrl[2] ?? ""}`;
  }

  // 2 · Link desde la raíz del repo: `docs/...`
  if (link.startsWith("docs/")) {
    const destinoNuevo = mudanza.get(link);
    return destinoNuevo ?? null;
  }

  // 3 · Link relativo: se resuelve a un path absoluto desde la raíz.
  if (/^\.{1,2}\//.test(link) && !link.includes("://")) {
    const destinoNuevo = mudanza.get(path.posix.normalize(path.posix.join(path.posix.dirname(origen), link)));
    if (!destinoNuevo) return null;
    return relativo(origen, destinoNuevo);
  }

  return null;
}

/**
 * Reescribe tanto los links markdown `[…](destino)` como los code spans con backticks que
 * nombran un archivo movido (p. ej. `` `docs/brain.md` ``).
 */
function reescribirArchivo(rutaAbsoluta, origenPosix) {
  const original = readFileSync(rutaAbsoluta, "utf8");
  const cambios = [];

  let actualizado = original.replace(/\]\(([^)\s]+)\)/g, (todo, link) => {
    const nuevo = reescribirLink(origenPosix, link);
    if (!nuevo) return todo;
    cambios.push(`link  ${link}  →  ${nuevo}`);
    return `](${nuevo})`;
  });

  actualizado = actualizado.replace(/`(docs\/[A-Za-z0-9_\-/.]+\.(?:md|csv|html))`/g, (todo, ruta) => {
    const nuevo = mudanza.get(ruta);
    if (!nuevo) return todo;
    cambios.push(`code  ${ruta}  →  ${nuevo}`);
    return `\`${nuevo}\``;
  });

  // Los links relativos sin `./` ni `../` (p. ej. `[x](MODELO.md)`) también cuentan.
  actualizado = actualizado.replace(/\]\((?!\.{0,2}\/|[a-z]+:\/\/)([A-Za-z0-9_\-.]+\.(?:md|csv|html))\)/g, (todo, archivo) => {
    const destinoNuevo = mudanza.get(path.posix.normalize(path.posix.join(path.posix.dirname(origenPosix), archivo)));
    if (!destinoNuevo) return todo;
    const nuevo = relativo(origenPosix, destinoNuevo);
    cambios.push(`link  ${archivo}  →  ${nuevo}`);
    return `](${nuevo})`;
  });

  if (actualizado === original) return cambios;
  if (APLICAR) writeFileSync(rutaAbsoluta, actualizado, "utf8");
  return cambios;
}

// ── Ejecución ──
console.log(`Plan: ${mudanza.size} archivos se mueven.\n`);

let movidos = [];
if (APLICAR) {
  console.log("Moviendo…");
  movidos = mover();
  console.log(`  ${movidos.length} archivos movidos.\n`);
}

// El origen de cada link se calcula siempre desde la ubicación FINAL del archivo (las rutas
// relativas nuevas), pero en dry run el archivo todavía se lee desde donde está hoy.
const aRevisar = archivosVersionados
  .filter((archivo) => /\.(md|csv|html)$/.test(archivo))
  .map((viejo) => ({
    nuevo: PLAN[viejo] ?? viejo,
    leerDe: APLICAR ? (PLAN[viejo] ?? viejo) : viejo,
  }));

let totalCambios = 0;
const porArchivo = [];
for (const { nuevo, leerDe } of aRevisar) {
  const rutaAbsoluta = path.join(RAIZ, leerDe);
  if (!existsSync(rutaAbsoluta)) continue;
  const cambios = reescribirArchivo(rutaAbsoluta, nuevo);
  if (cambios.length > 0) {
    totalCambios += cambios.length;
    porArchivo.push([nuevo, cambios]);
  }
}

console.log(`Links reescritos: ${totalCambios} en ${porArchivo.length} archivos.\n`);
for (const [archivo, cambios] of porArchivo) {
  console.log(APLICAR ? `${archivo}` : `${archivo}  (hoy se lee de su ruta actual)`);
  for (const cambio of cambios) console.log(`  ${cambio}`);
}
console.log(APLICAR ? "\nAplicado." : "\nDry run: nada se escribió. Corré con --aplicar.");
