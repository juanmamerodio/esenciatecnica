#!/usr/bin/env node
/**
 * Verifica —y opcionalmente corrige— los links entre documentos.
 *
 *   node scripts/verificar-links-docs.mjs            # informe: qué links no resuelven
 *   node scripts/verificar-links-docs.mjs --arreglar # reescribe los que se resuelven con el
 *                                                    # mapa de rutas viejas (`docs/…` aplanado)
 *
 * El mapa `RUTAS_VIEJAS` es el estado de `docs/` antes de la reorganización por carpetas. Un
 * link que hoy no resuelve pero sí resuelve contra esa disposición vieja se reescribe con la
 * ruta nueva equivalente, en el mismo estilo (relativo) que tenía.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = process.cwd().replace(/\\/g, "/");
const ARREGLAR = process.argv.includes("--arreglar");

/** Dónde vivía cada documento antes de la reorganización (relativo a la raíz del repo). */
const RUTAS_VIEJAS = {
  "docs/MODELO.md": "docs/MODELO.md",
  "docs/README.md": "docs/README.md",
  "docs/brain.md": "docs/metodo/brain.md",
  "docs/TESTING.md": "docs/metodo/TESTING.md",
  "docs/AUDITORIA.md": "docs/estado/AUDITORIA.md",
  "docs/AUDITORIA_BD.md": "docs/estado/AUDITORIA_BD.md",
  "docs/DEUDA_TECNICA.md": "docs/estado/DEUDA_TECNICA.md",
  "docs/SEPARACION.md": "docs/estado/SEPARACION.md",
  "docs/HANDOFF-ISABELLA.md": "docs/entrega/HANDOFF-ISABELLA.md",
  "docs/GUIA-ISABELLA.md": "docs/entrega/GUIA-ISABELLA.md",
  "docs/GUIA-QUEIPO.md": "docs/entrega/GUIA-QUEIPO.md",
  "docs/informe_Escencia_Tecnica.md": "docs/academico/informe_Escencia_Tecnica.md",
  "docs/prototype1.html": "docs/academico/prototype1.html",
  "docs/agents/domain.md": "docs/agentes/domain.md",
  "docs/agents/issue-tracker.md": "docs/agentes/issue-tracker.md",
  "docs/agents/triage-labels.md": "docs/agentes/triage-labels.md",
};
for (const feature of [
  "admin",
  "bd-mvp",
  "carrito",
  "catalogo",
  "checkout",
  "detalle-producto",
  "front-mvp",
  "migracion-otjph",
  "remito",
  "sobre-el-proyecto",
]) {
  RUTAS_VIEJAS[`docs/specs/${feature}/spec.md`] = `docs/specs/${feature}/spec.md`;
}
for (const adr of ["0001-modelo-normalizado-mermaid", "0002-validacion-manual-sin-ia", "0003-mvp-sin-envio", "0004-reconstruccion-esquema-mvp", "0005-basic-auth-en-middleware"]) {
  RUTAS_VIEJAS[`docs/adr/${adr}.md`] = `docs/adr/${adr}.md`;
}
// Los directorios también se resuelven: un link a `adr/` o a `specs/` tiene que seguir vivo.
for (const carpeta of ["docs/agents", "docs/adr", "docs/specs"]) {
  RUTAS_VIEJAS[carpeta] = carpeta === "docs/agents" ? "docs/agentes" : carpeta;
}

/**
 * Alias de archivos sueltos: links escritos por nombre, sin carpeta, que resolvían cuando
 * `docs/` era plano. Se completan a su ruta vieja real.
 */
const ALIAS_SUELTOS = {
  "agents/domain.md": "docs/agentes/domain.md",
  "agents/issue-tracker.md": "docs/agentes/issue-tracker.md",
  "agents/triage-labels.md": "docs/agentes/triage-labels.md",
  "AUDITORIA_BD.md": "docs/estado/AUDITORIA_BD.md",
  "AUDITORIA.md": "docs/estado/AUDITORIA.md",
  "HANDOFF-ISABELLA.md": "docs/entrega/HANDOFF-ISABELLA.md",
  "TESTING.md": "docs/metodo/TESTING.md",
};

/** Carpeta donde vivía cada documento movido, antes de la reorganización. */
const CARPETA_VIEJA = new Map();
for (const [vieja, nueva] of Object.entries(RUTAS_VIEJAS)) {
  CARPETA_VIEJA.set(nueva, path.posix.dirname(vieja));
}

const versionados = new Set(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: RAIZ,
    encoding: "utf8",
  })
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => Boolean(linea) && existsSync(path.join(RAIZ, linea))),
);

const archivos = [...versionados].filter((archivo) => /\.md$/.test(archivo));

function relativo(desdeArchivo, destino) {
  const rel = path.posix.relative(path.posix.dirname(desdeArchivo), destino);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** Resuelve un link relativo contra la disposición ACTUAL. */
function resuelveHoy(origen, link) {
  const sinAncla = link.split("#")[0];
  if (!sinAncla) return true;
  const absoluto = path.posix.normalize(
    path.posix.join(path.posix.dirname(origen), sinAncla),
  );
  return versionados.has(absoluto) || [...versionados].some((v) => v.startsWith(`${absoluto}/`));
}

function existeVersionado(ruta) {
  return versionados.has(ruta) || [...versionados].some((v) => v.startsWith(`${ruta}/`));
}

/**
 * Si el link no resuelve hoy pero sí resolvía con la disposición vieja, devuelve el link nuevo.
 *
 * El autor escribió el link pensando en la carpeta vieja del documento, así que se resuelve el
 * destino desde ahí: `MODELO.md` dentro de `docs/entrega/HANDOFF-ISABELLA.md` apuntaba a
 * `docs/MODELO.md`, que sigue existiendo en la raíz de `docs/`.
 */
function linkCorregido(origen, link) {
  if (!link || link.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(link)) return null; // protocolo, mailto, URL
  if (/['"\s]/.test(link)) return null; // no es una ruta limpia
  if (resuelveHoy(origen, link)) return null;

  const ancla = link.includes("#") ? `#${link.split("#").slice(1).join("#")}` : "";
  const sinAncla = link.split("#")[0];
  const carpetaVieja = CARPETA_VIEJA.get(origen) ?? path.posix.dirname(origen);

  const candidato = path.posix.normalize(
    ALIAS_SUELTOS[sinAncla] ?? path.posix.join(carpetaVieja, sinAncla),
  ).replace(/\/$/, "");
  if (!existeVersionado(candidato)) return null;

  return `${relativo(origen, candidato)}${ancla}`;
}

let corregidos = 0;
const rotos = [];
const detalle = [];

for (const archivo of archivos) {
  const original = readFileSync(path.join(RAIZ, archivo), "utf8");

  const actualizado = original.replace(/\]\(([^)\s]+)\)/g, (todo, link) => {
    const corregido = linkCorregido(archivo, link);
    if (corregido) {
      corregidos += 1;
      detalle.push(`${archivo}\n  ${link}  →  ${corregido}`);
      return `](${corregido})`;
    }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(link) && !link.startsWith("#") && !resuelveHoy(archivo, link)) {
      rotos.push([archivo, link]);
    }
    return todo;
  });

  if (actualizado !== original && ARREGLAR) {
    writeFileSync(path.join(RAIZ, archivo), actualizado, "utf8");
  }
}

console.log(`Archivos .md revisados: ${archivos.length}`);
if (ARREGLAR) {
  console.log(`Links corregidos: ${corregidos}\n`);
  for (const linea of detalle) console.log(linea);
} else {
  console.log(`Links corregibles con el mapa de rutas viejas: ${corregidos}`);
  for (const linea of detalle.slice(0, 40)) console.log(linea);
}
console.log(`\nLinks que siguen sin resolver: ${rotos.length}`);
for (const [origen, link] of rotos) console.log(`  ${origen}  →  ${link}`);

if (rotos.length > 0 || (!ARREGLAR && corregidos > 0)) {
  process.exitCode = 1;
}
