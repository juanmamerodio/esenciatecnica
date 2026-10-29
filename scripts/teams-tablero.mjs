#!/usr/bin/env node
/**
 * Puente temporal al tablero de Teams (proyecto `uchyattzuhaltsaxazce`).
 *
 * El tablero del equipo vive en el repo `quimicashop`; este script lo lee y lo escribe por PostgREST con
 * la anon key pública, sin dependencias, para que la sesión no tenga que rearmar el protocolo a mano
 * (ni caer en la trampa de PowerShell 5.1 con los cuerpos JSON). Referencia: `docs/agentes/teams.md`.
 *
 *   npm run teams -- leer [--estado review] [--asignado Isabella]
 *   npm run teams -- estado "<id o título>" <backlog|in_progress|review|done> --autor Juanma [--nota "…"]
 *   npm run teams -- nueva --titulo "…" --asignado Enzo --descripcion "…" [--estado backlog]
 *                        [--prioridad ALTA] [--tag BACKEND] [--der Pedido] [--horas 4] --autor Juanma
 *   npm run teams -- publicar --categoria AVANCE --titulo "…" --texto "…" --autor Juanma
 *   npm run teams -- papelera [--horas 24] --autor Juanma [--confirmar]
 *
 * Cuando Teams tenga su propia función, se borra este puente (ver `docs/agentes/teams.md` §8).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tareasParaPapelera } from './teams-papelera-reglas.mjs';

const AUTORES = ['Juanma', 'Isabella', 'Celeste', 'Enzo'];
const ESTADOS = ['backlog', 'in_progress', 'review', 'done'];
const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA'];
const CATEGORIAS = ['AVANCE', 'BLOQUEO', 'AYUDA', 'DEBATE', 'IDEA'];
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Config: `TEAMS_*` del entorno o la anon key pública de `quimicashop/config.js`. */
function config() {
  const { TEAMS_SUPABASE_URL: url, TEAMS_SUPABASE_ANON_KEY: key } = process.env;
  if (url && key) return { url, key };

  const hermano = resolve(RAIZ, '..', 'quimicashop', 'config.js');
  try {
    const js = readFileSync(hermano, 'utf8');
    const u = js.match(/supabaseUrl:\s*"([^"]+)"/)?.[1];
    const k = js.match(/supabaseAnonKey:\s*"([^"]+)"/)?.[1];
    if (u && k) return { url: u, key: k };
  } catch {
    // cae al error de abajo
  }
  throw new Error(
    `No encontré la config de Teams. Definí TEAMS_SUPABASE_URL y TEAMS_SUPABASE_ANON_KEY, ` +
      `o dejá el repo quimicashop como hermano de este (busqué ${hermano}).`,
  );
}

const CFG = config();

async function rest(ruta, { metodo = 'GET', cuerpo, prefer } = {}) {
  const headers = {
    apikey: CFG.key,
    Authorization: `Bearer ${CFG.key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${CFG.url}/rest/v1/${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await res.text();
  if (!res.ok) {
    let detalle = texto;
    try {
      detalle = JSON.parse(texto).message ?? texto;
    } catch {
      // el cuerpo no era JSON: se muestra tal cual
    }
    throw new Error(`PostgREST ${res.status}: ${detalle}`);
  }
  return texto ? JSON.parse(texto) : null;
}

function parsear(argv) {
  const posicionales = [];
  const banderas = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      posicionales.push(arg);
      continue;
    }
    const [nombre, ...resto] = arg.slice(2).split('=');
    if (resto.length > 0) banderas[nombre] = resto.join('=');
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      banderas[nombre] = argv[i + 1];
      i += 1;
    } else banderas[nombre] = true;
  }
  return { posicionales, banderas };
}

function exigir(valor, mensaje) {
  if (valor === undefined || valor === null || valor === '' || valor === true) throw new Error(mensaje);
  return valor;
}

function autorDe(banderas) {
  const autor = exigir(banderas.autor ?? process.env.TEAMS_AUTOR, `Falta --autor (${AUTORES.join(' · ')})`);
  if (!AUTORES.includes(autor)) throw new Error(`Autor desconocido: "${autor}". Son ${AUTORES.join(' · ')}.`);
  return autor;
}

function unoDe(valor, permitidos, etiqueta) {
  if (!permitidos.includes(valor)) throw new Error(`${etiqueta} inválido: "${valor}". Son ${permitidos.join(' · ')}.`);
  return valor;
}

function tabla(filas, columnas) {
  const celdas = filas.map((fila) => columnas.map((c) => String(c.valor(fila) ?? '')));
  const anchos = columnas.map((c, i) => Math.max(c.titulo.length, ...celdas.map((f) => f[i].length)));
  const linea = (valores) => valores.map((v, i) => v.padEnd(anchos[i])).join('  ').trimEnd();
  const out = [linea(columnas.map((c) => c.titulo)), linea(anchos.map((a) => '─'.repeat(a)))];
  for (const fila of celdas) out.push(linea(fila));
  return out.join('\n');
}

async function resolverTarea(referencia) {
  if (UUID.test(referencia)) {
    const [tarea] = await rest(`team_tasks?select=id,title,status,assignee&id=eq.${referencia}`);
    if (!tarea) throw new Error(`No existe la tarea ${referencia}.`);
    return tarea;
  }
  const candidatas = await rest(
    `team_tasks?select=id,title,status,assignee&title=ilike.*${encodeURIComponent(referencia)}*`,
  );
  if (candidatas.length === 0) throw new Error(`Ninguna tarea coincide con "${referencia}".`);
  if (candidatas.length > 1) {
    const lista = candidatas.map((t) => `  · ${t.title} (${t.status}, ${t.id})`).join('\n');
    throw new Error(`"${referencia}" coincide con ${candidatas.length} tareas:\n${lista}`);
  }
  return candidatas[0];
}

async function registrar({ taskId, accion, autor, previo, nuevo, resumen, nota }) {
  await rest('task_notes', {
    metodo: 'POST',
    cuerpo: { task_id: taskId, author: autor, content: nota },
  });
  await rest('task_audit_logs', {
    metodo: 'POST',
    cuerpo: {
      task_id: taskId,
      action: accion,
      changed_by: autor,
      previous_state: previo ?? null,
      new_state: nuevo,
      diff_summary: resumen,
    },
  });
}

async function leer(banderas) {
  const filtros = ['select=id,title,status,assignee,priority,tag,der_entity,updated_at', 'order=created_at.asc'];
  if (banderas.estado) filtros.push(`status=eq.${unoDe(banderas.estado, ESTADOS, 'Estado')}`);
  if (banderas.asignado) filtros.push(`assignee=eq.${banderas.asignado}`);
  if (banderas.tag) filtros.push(`tag=eq.${banderas.tag}`);

  const tareas = await rest(`team_tasks?${filtros.join('&')}`);
  if (tareas.length === 0) {
    console.log('Sin tareas para ese filtro.');
    return;
  }
  console.log(
    tabla(tareas, [
      { titulo: 'ESTADO', valor: (t) => t.status },
      { titulo: 'ASIGNADO', valor: (t) => t.assignee },
      { titulo: 'PRIO', valor: (t) => t.priority },
      { titulo: 'TAG', valor: (t) => t.tag },
      { titulo: 'TÍTULO', valor: (t) => t.title },
    ]),
  );
  const conteo = ESTADOS.map((e) => `${e}=${tareas.filter((t) => t.status === e).length}`);
  console.log(`\n${tareas.length} tareas · ${conteo.join(' · ')}`);
}

async function estado(posicionales, banderas) {
  const [referencia, nuevoEstado] = posicionales;
  exigir(referencia, 'Uso: npm run teams -- estado "<id o título>" <estado> --autor <key> [--nota "…"]');
  unoDe(exigir(nuevoEstado, 'Falta el estado nuevo.'), ESTADOS, 'Estado');
  const autor = autorDe(banderas);

  const tarea = await resolverTarea(referencia);
  if (tarea.status === nuevoEstado) {
    console.log(`"${tarea.title}" ya está en ${nuevoEstado}; no se toca.`);
    return;
  }

  const ahora = new Date().toISOString();
  const cuerpo = { status: nuevoEstado, last_modified_by: autor, updated_at: ahora };
  if (nuevoEstado === 'done') cuerpo.completed_at = ahora;

  await rest(`team_tasks?id=eq.${tarea.id}`, { metodo: 'PATCH', cuerpo, prefer: 'return=representation' });

  const nota = banderas.nota && banderas.nota !== true ? banderas.nota : `Estado a ${nuevoEstado} (${autor}).`;
  await registrar({
    taskId: tarea.id,
    accion: 'STATUS_CHANGE',
    autor,
    previo: { status: tarea.status },
    nuevo: { status: nuevoEstado },
    resumen: `${tarea.status} -> ${nuevoEstado}: ${tarea.title}`,
    nota,
  });

  console.log(`✔ ${tarea.title}\n  ${tarea.status} -> ${nuevoEstado} (${autor}) · bitácora y log escritos`);
}

async function nueva(banderas) {
  const autor = autorDe(banderas);
  const cuerpo = {
    title: exigir(banderas.titulo, 'Falta --titulo'),
    description: exigir(banderas.descripcion, 'Falta --descripcion'),
    assignee: unoDe(exigir(banderas.asignado, 'Falta --asignado'), AUTORES, 'Asignado'),
    status: unoDe(banderas.estado ?? 'backlog', ESTADOS, 'Estado'),
    priority: unoDe(banderas.prioridad ?? 'MEDIA', PRIORIDADES, 'Prioridad'),
    tag: banderas.tag ?? 'BACKEND',
    der_entity: banderas.der ?? 'General',
    estimated_hours: Number(banderas.horas ?? 2),
    created_by: autor,
    last_modified_by: autor,
    updated_at: new Date().toISOString(),
  };
  if (cuerpo.status === 'done') cuerpo.completed_at = cuerpo.updated_at;

  const [creada] = await rest('team_tasks', { metodo: 'POST', cuerpo, prefer: 'return=representation' });
  await registrar({
    taskId: creada.id,
    accion: 'CREATE',
    autor,
    previo: null,
    nuevo: cuerpo,
    resumen: `Tarea creada por ${autor} para ${cuerpo.assignee}`,
    nota: banderas.nota && banderas.nota !== true ? banderas.nota : 'Creada desde la sesión de esenciatecnica.',
  });

  console.log(`✔ ${creada.title}\n  ${creada.status} · ${creada.assignee} · ${creada.id}`);
}

async function publicar(banderas) {
  const autor = autorDe(banderas);
  const autorNombre = {
    Juanma: 'Juan Manuel Merodio',
    Isabella: 'Isabella Infante',
    Celeste: 'Celeste Cáceres',
    Enzo: 'Enzo Queipo',
  }[autor];

  const [nota] = await rest('team_discussions', {
    metodo: 'POST',
    prefer: 'return=representation',
    cuerpo: {
      title: exigir(banderas.titulo, 'Falta --titulo'),
      content: exigir(banderas.texto, 'Falta --texto'),
      author_key: autor,
      author_name: autorNombre,
      category: unoDe(banderas.categoria ?? 'AVANCE', CATEGORIAS, 'Categoría'),
      read_by: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  console.log(`✔ Bandeja [${nota.category}] ${nota.title}\n  ${nota.id} · no se envía ningún email`);
}

async function papelera(banderas) {
  const autor = autorDe(banderas);
  const horas = banderas.horas === undefined ? 24 : Number(banderas.horas);
  if (banderas.horas === true || !Number.isFinite(horas) || horas <= 0) {
    throw new Error(`--horas inválido: "${banderas.horas}".`);
  }

  const ahora = new Date();
  const tareas = await rest('team_tasks?select=*&status=eq.done&order=completed_at.asc');
  const viejas = tareasParaPapelera(tareas, { horas, ahora });

  if (viejas.length === 0) {
    console.log(`Sin tareas done con más de ${horas} h. Nada que mover.`);
    return;
  }

  const corte = new Date(ahora.getTime() - horas * 60 * 60 * 1000);
  console.log(`Tareas done con más de ${horas} h (${viejas.length}):`);
  for (const t of viejas) {
    console.log(`  · ${t.title} (${t.assignee}) — cerrada ${t.completed_at ?? t.updated_at}`);
  }
  console.log(`\nCorte: ${corte.toISOString()} · ahora: ${ahora.toISOString()}`);

  if (!banderas.confirmar) {
    console.log('\nModo seguro: no se borró nada. Para moverlas a la papelera, repetí con --confirmar.');
    return;
  }

  const carpeta = resolve(RAIZ, 'docs/agentes/papelera');
  mkdirSync(carpeta, { recursive: true });
  const sello = ahora.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const ruta = resolve(carpeta, `tareas-${sello}.json`);

  const respaldo = {
    generado: ahora.toISOString(),
    autor,
    criterio: `status=done y completed_at (o updated_at) anterior a ${corte.toISOString()}`,
    tareas: [],
  };
  for (const t of viejas) {
    const notas = await rest(`task_notes?select=*&task_id=eq.${t.id}`);
    respaldo.tareas.push({ tarea: t, notas });
  }
  writeFileSync(ruta, `${JSON.stringify(respaldo, null, 2)}\n`, 'utf8');

  for (const t of viejas) {
    await rest(`team_tasks?id=eq.${t.id}`, { metodo: 'DELETE' });
    try {
      await rest('task_audit_logs', {
        metodo: 'POST',
        cuerpo: {
          task_id: t.id,
          action: 'DELETE',
          changed_by: autor,
          previous_state: t,
          new_state: null,
          diff_summary: `Tarea movida a la papelera por ${autor}`,
        },
      });
    } catch (error) {
      console.warn(`  ⚠ ${t.title}: se borró pero no se pudo dejar el log (${error.message}).`);
    }
  }

  console.log(`\n✔ ${viejas.length} tareas movidas a la papelera. Respaldo: ${ruta}`);
}

function ayuda() {
  console.log(
    [
      'Tablero de Teams · npm run teams -- <comando>',
      '',
      '  leer [--estado review] [--asignado Isabella] [--tag BACKEND]',
      '  estado "<id o título>" <backlog|in_progress|review|done> --autor <key> [--nota "…"]',
      '  nueva --titulo "…" --asignado <key> --descripcion "…" [--estado …] [--prioridad …] [--tag …] [--der …] [--horas n] --autor <key>',
      '  publicar --categoria <AVANCE|BLOQUEO|AYUDA|DEBATE|IDEA> --titulo "…" --texto "…" --autor <key>',
      '  papelera [--horas 24] --autor <key> [--confirmar]',
      '           lista las done con más de N h; con --confirmar las borra y respalda en docs/agentes/papelera/',
      '',
      `Autores: ${AUTORES.join(' · ')} (o TEAMS_AUTOR en el entorno)`,
      'Estados: backlog · in_progress · review · done — `review` = hecho en repo, sin verificar en vivo.',
      'Referencia: docs/agentes/teams.md',
    ].join('\n'),
  );
}

const { posicionales, banderas } = parsear(process.argv.slice(2));
const comando = posicionales.shift() ?? 'ayuda';

try {
  if (comando === 'leer') await leer(banderas);
  else if (comando === 'estado') await estado(posicionales, banderas);
  else if (comando === 'nueva') await nueva(banderas);
  else if (comando === 'publicar') await publicar(banderas);
  else if (comando === 'papelera') await papelera(banderas);
  else if (comando === 'ayuda' || banderas.ayuda) ayuda();
  else throw new Error(`Comando desconocido: "${comando}". Probá: npm run teams -- ayuda`);
} catch (error) {
  console.error(`✘ ${error.message}`);
  process.exitCode = 1;
}
