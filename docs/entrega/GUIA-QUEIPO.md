# Guía paso a paso · Enzo Queipo

> **Para:** Enzo Queipo — Backend, Admin Panel & Relaciones.
> **De:** Juan Manuel Merodio · **Fecha:** 2026-10-26.
> **Cómo se lee:** de arriba hacia abajo, en orden. Cada paso trae el comando exacto, el resultado
> que tenés que ver, y el prompt que le podés pegar a Claude Code. Si el resultado no coincide, **pará
> y avisá** en la bandeja del Teams — no sigas "arreglando" a ciegas.
> **Contrato del repo:** [`AGENTS.md`](../../AGENTS.md). Si esta guía y `AGENTS.md` se contradicen, manda `AGENTS.md`.

---

## 0. En 30 segundos

El código del backend **ya está escrito**: el panel `/admin`, la aprobación del comprobante, el remito
y el email salen de `T7` y `T8` (issues #13 y #14). Lo que falta **no es programar de cero**: es
**poner las claves del entorno**, **probar de punta a punta** y **cerrar dos huecos reales**.

| # | Tarea | Por qué importa | Cómo se cierra |
|---|---|---|---|
| 1 | **Secretos y entorno** | Sin `SUPABASE_SERVICE_ROLE_KEY` el panel no lee ni escribe; sin `ADMIN_PASSWORD` `/admin` responde 503; sin `RESEND_API_KEY` no sale ningún remito. | `/admin` pide credenciales y el remito llega al mail. |
| 2 | **Verificación de punta a punta** | El front está verde en tests, pero nunca corrió contra la base migrada y las claves reales. | Una compra completa, a mano, en el navegador, con evidencia. |
| 3 | **Cron de los viernes** | `cancelar_pedidos_vencidos()` existe, pero **nadie la llama**: el stock reservado nunca se libera. | Un job agendado que la invoque, con test y ADR. |
| 4 | **El `aviso` de correo que se descarta** | Si Resend falla, el panel dice que todo salió bien y el Cliente no recibe nada. | El `aviso` llega a la pantalla, con test que falla antes y pasa después. |

**Orden:** 1 → 2. Las tareas 3 y 4 son independientes entre sí, pero cada una necesita **su propio
ticket** y **su propia sesión** (regla §2.1).

> ⚠️ **Ojo, y esto te ahorra días:** varias tareas tuyas del tablero (`Basic Auth en /admin`,
> `Admin: aprobar o rechazar comprobante`, `Comprobante: subida a Storage`, `Automatización de
> comprobantes/rémito`) **ya están implementadas** en `T5`, `T7` y `T8`. Tu trabajo ahí es
> **verificar contra la base real y cerrarlas**, no reescribirlas. Si arrancás a programarlas de nuevo,
> vas a duplicar el panel.

---

## 1. Antes de empezar (una sola vez)

### 1.1 Qué necesitás instalado

```bash
node --version    # v20 o superior
git --version
```

Y **Claude Code** abierto sobre la carpeta del repo (paso 3). Si no lo tenés, pedíselo a Juanma antes
de seguir: el resto de la guía asume que lo tenés.

### 1.2 Traer el repo

```bash
git clone https://github.com/juanmamerodio/esenciatecnica.git
cd esenciatecnica
npm install
```

### 1.3 Crear tu `.env.local`

```bash
cp .env.example .env.local
```

Lo completás en el paso 4. **`.env.local` no se commitea nunca.** Ya está en `.gitignore`. Si algún día
`git status` te lo muestra, algo está mal: pará.

### 1.4 Línea base: los comandos tienen que arrancar en verde

```bash
npm run typecheck   # esperado: 0 errores
npm run lint        # esperado: 0 errores, 0 warnings
npm test            # esperado: 230 tests en 19 archivos
```

Si alguno viene **rojo antes de que toques nada**, anotalo y avisá. No es tuyo, pero te va a ensuciar
todas las sesiones hasta que se arregle.

---

## 2. Las seis reglas que no se negocian

| Regla | Qué significa para vos |
|---|---|
| **1 ticket = 1 sesión = 1 commit** | Abrís una sesión de Claude Code por ticket y la cerrás con un commit. No arrastres contexto de una tarea a la siguiente. |
| **TDD obligatorio** | Primero el test que **falla**, después el código mínimo, después el refactor. Sin test no está terminado. |
| **Español único** | UI, emails, docs y nombres del dominio en español. No hay `[lang]`, no hay diccionarios. |
| **Sin IA y sin envío** | La validación del pago es **manual** por los Administradores de Química. El MVP termina en `Pago Validado` + remito: no prometas envío ni seguimiento. |
| **No inventes** | Ni datos bancarios, ni productos, ni datos fiscales, ni esquemas. Si falta algo, se documenta y se consulta. |
| **Verde de verdad** | **Nunca digas que algo está verde si el comando está rojo.** Reportá el comando, la salida y el error exacto. |

El detalle completo está en [`AGENTS.md`](../../AGENTS.md) §5, §6 y §7.

---

## 3. Cómo se trabaja con Claude Code y las skills

### 3.1 Abrir la sesión

```bash
cd esenciatecnica
claude
```

### 3.2 El prompt de arranque (copialo tal cual)

```
Leé AGENTS.md, GLOSSARY.md y memory.md de este repo antes de tocar nada.
Después leé el ticket <N> con `gh issue view <N>`.
No escribas código todavía: decime en 10 líneas qué hay que hacer, qué archivos vas a tocar
y qué test vas a escribir primero. Esperá mi OK.
```

La última línea es la más importante: **te obliga a revisar el plan antes de que escriba una sola línea.**

### 3.3 Las skills que tenés, y para qué sirve cada una

Escribí `/` en Claude Code y te aparece la lista. Estas son las que vas a usar:

| Skill | Cuándo la querés |
|---|---|
| `/grilling` | Antes de diseñar algo. Te interroga pregunta por pregunta hasta que el plan no tiene huecos. Usala para el cron de los viernes. |
| `/research` | Cuando necesitás un dato que no está en el repo (cómo funciona la API de Resend, cómo se agenda un cron en Vercel). Deja el hallazgo en un `.md`. |
| `/tdd` | Para **todo** código: primero el test rojo, después el verde. |
| `/diagnosing-bugs` | Cuando algo falla y no sabés por qué. Es un bucle de diagnóstico, no de parches. |
| `/code-review` | Al terminar un ticket, **en una sesión limpia**. Revisa contra `AGENTS.md` y contra el ticket. |
| `/pr` | Para escribir el cuerpo del PR cuando el trabajo está listo. |
| `/domain-modeling` | Si aparece un término nuevo o hay que tocar `GLOSSARY.md` o un ADR. |
| `/find-skills` | Si no sabés qué skill usar, o buscás una que no ves. |

> ⚠️ **Aviso importante sobre `docs/metodo/brain.md`.** Su §3 muestra un ciclo con `/grill-me`, `/to-spec`,
> `/to-tickets`, `/implement-spec` y `/retro`. **Esos nombres no existen en el runtime actual**:
> escribirlos no hace nada. La tabla de arriba es la lista real. Si querés ese flujo, se arma con
> `/grilling` + una spec escrita a mano + `/tdd`.

### 3.4 El ciclo, aplicado a este repo

1. `/grilling` sobre el ticket → se cierran las decisiones.
2. Si la decisión es difícil de revertir → un ADR nuevo en [`docs/adr/`](../adr).
3. `/tdd` → test que falla primero.
4. Verificar: `npm run typecheck && npm run lint && npm test`.
5. `/code-review` en contexto limpio (no en la sesión que escribió el código).
6. Commit quirúrgico + push. Después, `/pr` si hace falta.
7. Cerrar el issue y avisar en la bandeja del Teams.

---

## 4. Tarea 1 · Secretos y entorno (bloquea todo lo demás)

**Ticket del tablero:** *Secretos y entorno: service role, ADMIN_PASSWORD y Resend.*

### 4.1 Las variables que faltan

Tu `.env.local` hoy tiene solo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`VERCEL_OIDC_TOKEN`. Faltan estas:

| Variable | De dónde sale | Dónde va |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → proyecto **`otjph…`** → Settings → API → `service_role` | `.env.local` + Vercel |
| `ADMIN_PASSWORD` | La inventás vos. **Larga y única**, no `admin123` | `.env.local` + Vercel |
| `RESEND_API_KEY` | Resend → API Keys | `.env.local` + Vercel |
| `RESEND_FROM_EMAIL` | `Esencia Técnica <ventas@ascender.uno>` | `.env.local` + Vercel |
| `NEXT_PUBLIC_TRANSFERENCIA_ALIAS` / `_CBU` / `_TITULAR` | Los da la **Cooperadora** (gate G4). | `.env.local` + Vercel |

**Reglas duras:**

- La `service_role` **jamás** va en una variable que empiece con `NEXT_PUBLIC_`. Es la llave maestra:
  salta todas las RLS.
- No inventes los datos de transferencia. Si la Cooperadora no los mandó, dejá las tres vacías: el
  sistema no muestra la franja si falta alguna ([`docs/specs/front-mvp/spec.md`](../specs/front-mvp/spec.md) §6.1).
- Ojo con el proyecto: es **`otjphjnrwihqzzhbfnmh`** (e-commerce). Nunca el de Teams
  (`uchy…`), que tiene el catálogo viejo.

### 4.2 Paso a paso

**Paso 1.** Abrí `.env.local` y completá las cinco variables del cuadro.

**Paso 2.** Reiniciá el servidor: las variables de entorno se leen al arrancar.

```bash
npm run dev
```

**Paso 3.** Cargá las mismas variables en **Vercel** → tu proyecto → *Settings* → *Environment
Variables*. Marcá **Production** y **Preview**. Después **Redeploy**: las variables nuevas no llegan a
un deploy viejo.

**Paso 4.** Verificá de verdad, en el navegador:

```
http://localhost:3000/admin
```

**Resultado esperado:** el navegador te pide **usuario y contraseña** (Basic Auth). El usuario se
ignora (el MVP no tiene administradores en base: `ADMIN`/`ROL` son fase 2); la contraseña es tu
`ADMIN_PASSWORD`. Si en cambio ves un **503**, falta la variable. Si ves el panel sin pedirte nada,
`ADMIN_PASSWORD` no está llegando al middleware.

> El porqué de esa decisión está en [`docs/adr/0005-basic-auth-en-middleware.md`](../adr/0005-basic-auth-en-middleware.md)
> y en [`src/lib/admin-auth.ts`](../../src/lib/admin-auth.ts).

### 4.3 Prompt para esta tarea

```
Leé AGENTS.md y .env.example.
Completá .env.local con SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, RESEND_API_KEY y
RESEND_FROM_EMAIL. Yo te paso los valores; no los inventes ni los imprimas en pantalla.
Después decime, uno por uno, los lugares del código donde se lee cada variable, para
confirmar que ninguna termina en el cliente. No commitees .env.local.
```

**Definición de terminado:** `/admin` pide credenciales con la contraseña real, y `git status` no
muestra `.env.local`.

---

## 5. Tarea 2 · Verificación de punta a punta

Sin esto, "está implementado" es una creencia, no un dato. Necesitás que la base esté migrada
(lo cierra Isabella con el [issue #15](https://github.com/juanmamerodio/esenciatecnica/issues/15))
y las claves puestas.

### 5.1 El recorrido, en orden

| # | Ruta | Qué tiene que pasar |
|---|---|---|
| 1 | `/` | La Home carga; sin errores en la consola del navegador. |
| 2 | `/catalog` | Se ven productos con su disponibilidad real. Si ves "todo agotado", el esquema de la vista está mal: avisá, no lo parchees. |
| 3 | `/producto/<id>` | El detalle abre y el botón de carrito funciona. |
| 4 | `/cart` | Cambiar cantidades, quitar, y que el total cierre. |
| 5 | `/checkout` | Completás los datos, confirmás el pedido y **sube la foto del comprobante**. |
| 6 | `/admin` | Ves el pedido, la foto y el monto. Aprobás comparando a mano. |
| 7 | `/admin/remito/<idComprobante>` | El remito abre, se imprime bien y **no promete envío**. |
| 8 | Email | El remito **llega** al mail del Cliente. |
| 9 | Base | El pedido quedó `Pago Validado` y el stock descontado. |
| 10 | Caso triste | Rechazás un comprobante y la reserva se libera. |

### 5.2 Evidencia

Un ticket no se cierra con "anduvo". Anotá en el issue, por cada ruta: qué viste, qué falló y qué
quedó pendiente. Si algo no se puede probar porque falta un dato (por ejemplo el mail real), decilo
así: *"no verificado, falta X"*. **No lo declares verde.**

---

## 6. Tarea 3 · Cron de los viernes

**Ticket del tablero:** *Cron de los viernes: cancelar pedidos sin comprobante aprobado.*

### 6.1 La regla

Los pedidos sin comprobante aprobado se cancelan **los viernes** y liberan su reserva de stock
([`AGENTS.md`](../../AGENTS.md) §5.6). La función que lo hace ya existe: RPC
`cancelar_pedidos_vencidos()`. **Lo que falta es que alguien la llame.** Hoy no hay `vercel.json`
ni un `schedule:` en `.github/workflows/ci.yml`.

### 6.2 Antes de escribir código: decidí

Esta es una decisión de arquitectura, así que **no la tomes solo en la cabeza ni en el chat**:

1. `/grilling` con este prompt:

```
Leé AGENTS.md §5.6 y docs/specs/migracion-otjph/spec.md §6.
Hay que agendar la RPC cancelar_pedidos_vencidos() los viernes.
Interrogame hasta que decidamos: ¿Vercel Cron o GitHub Actions? ¿Qué ruta del servidor la
invoca? ¿Cómo se protege para que no la pueda llamar cualquiera desde afuera? ¿Qué pasa
si corre dos veces? Preguntá de a una y proponé tu recomendación.
```

2. Con la decisión cerrada, escribí el ADR en `docs/adr/` (formato de los que ya están).

### 6.3 Restricciones que no se negocian

- La RPC necesita **service_role**: tiene que correr **en el servidor**. Nunca desde el navegador.
- La ruta que la invoca tiene que estar **protegida** (un secreto compartido o Basic Auth), o
  cualquiera con la URL puede cancelar pedidos.
- La función tiene que ser **idempotente**: si el job corre dos veces, no puede romper nada.
- TDD: un test que verifique que la ruta existe y que rechaza a quien no está autorizado. El test se
  escribe **antes**.

---

## 7. Tarea 4 · El `aviso` de correo que se descarta

Esta es la más chica y la más clara. Tiene un síntoma exacto.

### 7.1 El bug

`src/app/api/admin/comprobantes/route.ts` (líneas 40-46) **sí** devuelve un `aviso` cuando Resend
falla al mandar el remito. Pero `pedirAlPanel`, en
[`src/components/admin/comun.ts`](../../src/components/admin/comun.ts) (líneas 12-26), **solo lee
`estado` y `mensaje`**. El `aviso` se pierde.

**Consecuencia para el usuario:** el Administrador aprueba, el correo falla, y el panel igual dice
*"quedó aprobado y la base emitió el remito"*. El Cliente no recibió nada y nadie se enteró.

Esto incumple la **HU-4** de [`docs/specs/remito/spec.md`](../specs/remito/spec.md): *"la respuesta avisa
del fallo sin revertir nada"*.

### 7.2 Cómo lo arreglás

1. **No existe ticket todavía.** Creá el issue primero (ver §8):

```bash
gh issue create --title "El aviso de fallo de correo se descarta en el panel" \
  --body "$(cat <<'EOF'
`POST /api/admin/comprobantes` devuelve `aviso` cuando falla el envío del remito, pero
`pedirAlPanel` (src/components/admin/comun.ts) solo lee `estado` y `mensaje`: el aviso se
pierde y el panel afirma que el remito se emitió.

Incumple HU-4 de docs/specs/remito/spec.md ("la respuesta avisa del fallo sin revertir nada").

Criterio de cierre: un fallo simulado de correo muestra el aviso en el panel, y un test
cubre el camino del aviso.
EOF
)"
```

2. `/tdd`: el test **primero**, en `tests/front/`.
3. `ResultadoDeAccion` tiene que poder llevar el aviso; el llamador (`PanelDePedidos.tsx`) lo muestra.

### 7.3 Guardrails

- **No cambies el orden:** la venta la cierra la base primero; el correo es posterior y **no
  bloqueante**. Un fallo de correo **no** revierte ni duplica la aprobación.
- **No inventes reintentos automáticos**: el reenvío es manual y explícito
  ([`docs/specs/remito/spec.md`](../specs/remito/spec.md) §5).
- Logueá el fallo con su motivo. No lo silencies con un `catch {}` vacío.

---

## 8. Crear el ticket (antes de cada tarea)

Todo trabajo arranca en un issue. No hay excepción (§6.2 de `AGENTS.md`). Tenés `gh` configurado:

```bash
gh issue create --title "..." --body "..."     # crear
gh issue view <N>                              # leer
gh issue comment <N> --body "..."              # reportar avance
gh issue close <N> --comment "..."             # cerrar
```

Más detalle en [`docs/agentes/issue-tracker.md`](../agentes/issue-tracker.md).

---

## 9. Definición de terminado (checklist)

Un ticket tuyo está terminado solo si **todo** esto es cierto:

- [ ] El test nuevo **fallaba antes** y pasa después.
- [ ] `npm run typecheck` sin errores nuevos.
- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm test` sin tests rojos.
- [ ] El ticket del tablero está actualizado, con la evidencia pegada.
- [ ] Si cambió una decisión, `GLOSSARY.md`, `MODELO.md` o un ADR lo reflejan.
- [ ] El commit es quirúrgico y tiene mensaje claro. Sin archivos sueltos.
- [ ] Avisaste en la bandeja del Teams.

---

## 10. Qué NO hacer

- No commitees `.env.local`, la `service_role` ni `RESEND_API_KEY`.
- No pongas la service role en una variable `NEXT_PUBLIC_*`.
- No apuntes este repo al Supabase de Teams (`uchy…`).
- No uses los términos retirados: `productos`, `pedidos`, `verificaciones`, `verificacion`, `Gemini`,
  `QuimicaShop`. Están prohibidos en código nuevo (`AGENTS.md` §2).
- No prometas envío, seguimiento ni estados posteriores a `Pago Validado`.
- No reimplementes lo que ya está en `T7`/`T8`: verificalo y cerralo.
- No digas que algo quedó verde sin pegar la salida del comando.

---

## 11. Si te trabás

**Regla: trabate 20 minutos, no dos horas.** Cuando te trabás:

1. Escribí la traba en la **bandeja del Teams** (categoría `BLOQUEO` o `AYUDA`), con:
   - qué querías hacer,
   - qué comando corriste,
   - **el error exacto, pegado tal cual**,
   - qué ya probaste.
2. Adjuntá el link del issue.
3. Seguí con otra tarea que no dependa de eso.

Un mensaje como *"no me anda"* no sirve. Uno como *"corrí `npm run dev` y `/admin` devuelve 503;
`ADMIN_PASSWORD` está en `.env.local`, ¿el middleware la lee del entorno correcto?"* se resuelve en
dos minutos.

---

## 12. Enlaces

| Documento | Para qué |
|---|---|
| [`AGENTS.md`](../../AGENTS.md) | El contrato operativo. Si dudás, se lee acá. |
| [`GLOSSARY.md`](../../GLOSSARY.md) | El vocabulario. Si un término no está, no se inventa un sinónimo. |
| [`docs/MODELO.md`](../MODELO.md) | El modelo de datos aprobado. |
| [`docs/specs/admin/spec.md`](../specs/admin/spec.md) | El panel, las alertas y el Basic Auth. |
| [`docs/specs/remito/spec.md`](../specs/remito/spec.md) | El remito y el email. Tu tarea 4 sale de acá. |
| [`docs/specs/checkout/spec.md`](../specs/checkout/spec.md) | El checkout y la subida del comprobante. |
| [`docs/agentes/issue-tracker.md`](../agentes/issue-tracker.md) | Cómo usar `gh`. |
| [`docs/metodo/TESTING.md`](../metodo/TESTING.md) | Vitest y TDD, en corto. |
| [`memory.md`](../../memory.md) | El estado real del build, al día. |
