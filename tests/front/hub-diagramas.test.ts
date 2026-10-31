import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ } from './ayudantes';

/**
 * Pruebas automatizadas para la Reforma Integral del Hub:
 * Pestaña Interactiva de Diagramas Mermaid y Visor Académico.
 *
 * Valida:
 * 1. Estructura de tabs accesible (role="tablist", role="tab", role="tabpanel", ARIA, hash #diagramas).
 * 2. Existencia ordenada de los 7 bloques de diagramas canónicos (DFD N0 a N3, DER, Clases UML, DCU).
 * 3. Botones y herramientas interactivas (Zoom +/-, Reset, Copiar, Descargar SVG/PNG, Fullscreen, Alternar).
 * 4. Aislamiento y modularidad del visor (diagramas-visor.js).
 * 5. Cero apariciones de términos legacy prohibidos en el código del visor y sus textos.
 */

const RUTA_HUB_HTML = join(RAIZ, '..', 'quimicashop', 'index.html');
const RUTA_VISOR_JS = join(RAIZ, '..', 'quimicashop', 'diagramas-visor.js');

describe('HU-1 (Navegante) · Pestaña de navegación accesible en el Hub', () => {
  it('el archivo quimicashop/index.html existe', () => {
    expect(existsSync(RUTA_HUB_HTML)).toBe(true);
  });

  it('cuenta con una barra de pestañas accesible con role="tablist" y aria-label', () => {
    const html = readFileSync(RUTA_HUB_HTML, 'utf8');
    expect(html).toMatch(/role=["']tablist["']/);
    expect(html).toMatch(/aria-label=["'][^"']*Hub[^"']*["']/i);
  });

  it('define las dos pestañas principales (Centro de Control y Diagramas del Sistema) con atributos ARIA', () => {
    const html = readFileSync(RUTA_HUB_HTML, 'utf8');

    // Tab Centro de Control
    expect(html).toMatch(/role=["']tab["'][^>]*id=["']tab-(centro|control)["']/);
    expect(html).toMatch(/aria-controls=["']panel-(centro|control)["']/);

    // Tab Diagramas del Sistema
    expect(html).toMatch(/role=["']tab["'][^>]*id=["']tab-diagramas["']/);
    expect(html).toMatch(/aria-controls=["']panel-diagramas["']/);

    // Texto visible de las pestañas
    expect(html).toMatch(/Centro de Control/i);
    expect(html).toMatch(/Diagramas del Sistema/i);
  });

  it('define los dos paneles correspondientes con role="tabpanel" y vinculación aria-labelledby', () => {
    const html = readFileSync(RUTA_HUB_HTML, 'utf8');

    // Panel Centro de Control
    expect(html).toMatch(/role=["']tabpanel["'][^>]*id=["']panel-(centro|control)["']/);
    expect(html).toMatch(/aria-labelledby=["']tab-(centro|control)["']/);

    // Panel Diagramas
    expect(html).toMatch(/role=["']tabpanel["'][^>]*id=["']panel-diagramas["']/);
    expect(html).toMatch(/aria-labelledby=["']tab-diagramas["']/);
  });

  it('incluye el script modular del visor de diagramas (diagramas-visor.js) y la biblioteca Mermaid', () => {
    const html = readFileSync(RUTA_HUB_HTML, 'utf8');
    expect(html).toMatch(/src=["']\.\/diagramas-visor\.js["']/);
    expect(html).toMatch(/mermaid(\.min)?\.js/);
  });
});

describe('HU-2 (Cátedra) · Existencia y secuencia de los 7 bloques de diagramas canónicos', () => {
  it('el archivo modular diagramas-visor.js existe', () => {
    expect(existsSync(RUTA_VISOR_JS)).toBe(true);
  });

  it('contiene los 7 bloques de diagramas canónicos en el orden jerárquico del Hub', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');

    // Verificamos los identificadores o claves de los 7 diagramas
    expect(js).toMatch(/id:\s*['"]dfd-n0['"]/);
    expect(js).toMatch(/id:\s*['"]dfd-n1['"]/);
    expect(js).toMatch(/id:\s*['"]dfd-n2['"]/);
    expect(js).toMatch(/id:\s*['"]dfd-n3['"]/);
    expect(js).toMatch(/id:\s*['"]der['"]/);
    expect(js).toMatch(/id:\s*['"]clases(-uml)?['"]/);
    expect(js).toMatch(/id:\s*['"]dcu['"]/);

    // Verificamos el orden relativo de aparición en la estructura del array de diagramas
    const posN0 = js.search(/id:\s*['"]dfd-n0['"]/);
    const posN1 = js.search(/id:\s*['"]dfd-n1['"]/);
    const posN2 = js.search(/id:\s*['"]dfd-n2['"]/);
    const posN3 = js.search(/id:\s*['"]dfd-n3['"]/);
    const posDER = js.search(/id:\s*['"]der['"]/);
    const posClases = js.search(/id:\s*['"]clases(-uml)?['"]/);
    const posDCU = js.search(/id:\s*['"]dcu['"]/);

    expect(posN0).toBeGreaterThan(-1);
    expect(posN1).toBeGreaterThan(posN0);
    expect(posN2).toBeGreaterThan(posN1);
    expect(posN3).toBeGreaterThan(posN2);
    expect(posDER).toBeGreaterThan(posN3);
    expect(posClases).toBeGreaterThan(posDER);
    expect(posDCU).toBeGreaterThan(posClases);
  });

  it('los 7 bloques contienen sintaxis Mermaid válida alineada a docs/academico/', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');

    // DFD N0 a N3 y DCU son flowcharts
    expect(js).toMatch(/flowchart\s+(TD|TB|LR)/);
    // DER es erDiagram con las 10 entidades canónicas
    expect(js).toMatch(/erDiagram/);
    expect(js).toMatch(/\bCLIENTE\b/);
    expect(js).toMatch(/\bPRODUCTO\b/);
    expect(js).toMatch(/\bSTOCK\b/);
    expect(js).toMatch(/\bPEDIDO\b/);
    expect(js).toMatch(/\bCOMPROBANTE\b/);
    expect(js).toMatch(/\bREMITO_VENTA\b/);
    expect(js).toMatch(/\bALERTA_STOCK\b/);

    // Clases UML es classDiagram
    expect(js).toMatch(/classDiagram/);
    expect(js).toMatch(/class\s+Cliente\b/);
    expect(js).toMatch(/class\s+ServicioCheckout\b/);
    expect(js).toMatch(/class\s+ServicioAdmin\b/);
  });
});

describe('HU-3 y HU-4 · Barra de herramientas y funciones interactivas', () => {
  it('el visor implementa controles interactivos de Zoom, Pan y Pantalla Completa', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');

    // Zoom in, zoom out, reset
    expect(js).toMatch(/zoom(In|\+|_in)/i);
    expect(js).toMatch(/zoom(Out|\-|_out)/i);
    expect(js).toMatch(/zoom(Reset|1|0|_reset)|restablecer/i);

    // Pan / arrastre interactivo con mouse o touch
    expect(js).toMatch(/mousedown|pointerdown|touchstart/);
    expect(js).toMatch(/mousemove|pointermove|touchmove/);
    expect(js).toMatch(/mouseup|pointerup|touchend/);

    // Pantalla completa (fullscreen modal)
    expect(js).toMatch(/fullscreen|pantallaCompleta|modal/i);
  });

  it('el visor implementa exportación a SVG, PNG y copia de sintaxis Mermaid', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');

    // Copia al portapapeles
    expect(js).toMatch(/clipboard\.writeText|execCommand\(['"]copy['"]\)/);

    // Exportación SVG
    expect(js).toMatch(/image\/svg\+xml/);
    expect(js).toMatch(/\.svg/i);

    // Exportación PNG mediante canvas
    expect(js).toMatch(/canvas/i);
    expect(js).toMatch(/image\/png/);
    expect(js).toMatch(/\.png/i);

    // Alternar entre SVG y Código Markdown
    expect(js).toMatch(/toggleCode|alternarCodigo|toggle-view/i);
  });

  it('index.html contiene el contenedor modal para proyección en pantalla completa', () => {
    const html = readFileSync(RUTA_HUB_HTML, 'utf8');
    expect(html).toMatch(/id=["'][^"']*fullscreen-modal[^"']*["']|class=["'][^"']*fullscreen-modal[^"']*["']/i);
  });
});

describe('HU-5 (Auditor) · Fidelidad de dominio y ausencia de términos legacy', () => {
  it('diagramas-visor.js no contiene vocabulario ni entidades legacy prohibidas', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');

    expect(js).not.toMatch(/\bverificaciones\b/i);
    expect(js).not.toMatch(/\bpre_aprobado\b/i);
    expect(js).not.toMatch(/\bcomprobante_subido\b/);
    expect(js).not.toMatch(/\blog_ia\b/i);
    expect(js).not.toMatch(/\bGemini\b/i);
    expect(js).not.toMatch(/validaci[óo]n\s+(por\s+|autom[áa]tica\s+por\s+)?IA\b/i);
  });

  it('el panel de diagramas en index.html respeta las reglas de dominio', () => {
    const html = readFileSync(RUTA_HUB_HTML, 'utf8');
    // Verificamos que mencione validación manual sin IA
    expect(html).toMatch(/validaci[óo]n\s+manual/i);
    // Verificamos que el cron sea de los viernes
    expect(html).toMatch(/viernes.*23:59/i);
  });
});

describe('HU-6 (Compactación y Optimización Visual) · Configuración y layout de DFD N0 a N3', () => {
  it('configura Mermaid flowchart con nodeSpacing, rankSpacing reducidos y curve linear o natural', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');
    expect(js).toMatch(/nodeSpacing:\s*(3[5-9]|4[0-5])/);
    expect(js).toMatch(/rankSpacing:\s*(4[0-9]|50)/);
    expect(js).toMatch(/curve:\s*['"](linear|natural)['"]/);
  });

  it('organiza DFD N0 con simetría estructural y proceso central enmarcado', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');
    expect(js).toMatch(/id:\s*['"]dfd-n0['"][\s\S]*?subgraph/);
    expect(js).toMatch(/id:\s*['"]dfd-n0['"][\s\S]*?P0\(\(["']?0\.\s*Sistema/);
  });

  it('organiza DFD N1 en carriles lógicos de Entidades, Procesos Principales y Almacenes D1–D7', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');
    expect(js).toMatch(/id:\s*['"]dfd-n1['"][\s\S]*?subgraph[\s\S]*?Entidades/i);
    expect(js).toMatch(/id:\s*['"]dfd-n1['"][\s\S]*?subgraph[\s\S]*?Procesos/i);
    expect(js).toMatch(/id:\s*['"]dfd-n1['"][\s\S]*?subgraph[\s\S]*?Almacenes/i);
  });

  it('organiza DFD N2 y N3 con subgrafos para alinear subprocesos y transacciones atómicas', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');
    expect(js).toMatch(/id:\s*['"]dfd-n2['"][\s\S]*?subgraph/);
    expect(js).toMatch(/id:\s*['"]dfd-n3['"][\s\S]*?subgraph\s+TX1/);
    expect(js).toMatch(/id:\s*['"]dfd-n3['"][\s\S]*?subgraph\s+TX2/);
  });

  it('mantiene intactos todos los almacenes canónicos D1 a D7 en DFD N1', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');
    expect(js).toMatch(/D1\[\("D1:\s*CLIENTE"\)\]/);
    expect(js).toMatch(/D2\[\("D2:\s*PRODUCTO"\)\]/);
    expect(js).toMatch(/D3\[\("D3:\s*STOCK"\)\]/);
    expect(js).toMatch(/D4\[\("D4:\s*PEDIDO"\)\]/);
    expect(js).toMatch(/D5\[\("D5:\s*COMPROBANTE"\)\]/);
    expect(js).toMatch(/D6\[\("D6:\s*REMITO_VENTA"\)\]/);
    expect(js).toMatch(/D7\[\("D7:\s*ALERTA_STOCK"\)\]/);
  });
  it('HU-54 · organiza DFD N1 con orientación vertical flowchart TD y subgrafos jerárquicos (#54)', () => {
    const js = readFileSync(RUTA_VISOR_JS, 'utf8');
    const matchN1 = js.match(/id:\s*['"]dfd-n1['"][\s\S]*?code:\s*`([\s\S]*?)`/);
    expect(matchN1).toBeTruthy();
    const codigoN1 = matchN1 ? matchN1[1] : '';

    // Orientación TD
    expect(codigoN1).toMatch(/^flowchart\s+TD/);

    // Subgrafos y carriles
    expect(codigoN1).toMatch(/subgraph\s+ENTIDADES\s+\["Entidades\s+Externas"\]/i);
    expect(codigoN1).toMatch(/subgraph\s+EXT_CLI\s+\["Entorno\s+Cliente"\]/i);
    expect(codigoN1).toMatch(/subgraph\s+EXT_GESTION\s+\["Entorno\s+Gestión\s+y\s+Control"\]/i);

    expect(codigoN1).toMatch(/subgraph\s+PROCESOS\s+\["Procesos\s+Principales"\]/i);
    expect(codigoN1).toMatch(/subgraph\s+PROC_VENTA\s+\["Flujo\s+de\s+Venta/i);
    expect(codigoN1).toMatch(/subgraph\s+PROC_GESTION\s+\["Flujo\s+de\s+Gestión/i);

    expect(codigoN1).toMatch(/subgraph\s+ALMACENES\s+\["Almacenes\s+de\s+Datos\s+\(D1–D7\)"\]/i);
    expect(codigoN1).toMatch(/subgraph\s+ALM_VENTA\s+\["Almacenes\s+de\s+Venta/i);
    expect(codigoN1).toMatch(/subgraph\s+ALM_STOCK\s+\["Almacenes\s+de\s+Catálogo/i);

    // Entidades, procesos y almacenes
    expect(codigoN1).toMatch(/CLI\["Cliente\s+\(Comprador\s+Invitado\)"\]/);
    expect(codigoN1).toMatch(/ADM\["Administrador\s+de\s+Química"\]/);
    expect(codigoN1).toMatch(/CRON\["Temporizador\s+Semanal\s+\(Vercel\s+Cron\)"\]/);

    expect(codigoN1).toMatch(/P1\(\("1\.0\s+Consultar/);
    expect(codigoN1).toMatch(/P6\(\("6\.0\s+Cancelar/);

    // Compactación de etiquetas con <br/>
    expect(codigoN1).toMatch(/<br\/>/);
    expect(codigoN1).toMatch(/Confirmación\s+de\s+compra<br\/>\(desde\s+carrito\s+en\s+cliente\)/);
    expect(codigoN1).toMatch(/RPC\s+crear_pedido/);
    expect(codigoN1).toMatch(/RPC\s+cancelar_pedidos_vencidos/);
  });
});
