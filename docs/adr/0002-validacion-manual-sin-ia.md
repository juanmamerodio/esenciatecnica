# Validación manual de comprobantes, sin IA

**Status:** accepted · 2026-10-22

Los Administradores de Química revisan la imagen y el monto del comprobante contra el pedido, y aprueban o rechazan a mano. La validación por IA (Gemini) se retira: en el sistema final no existe.

**Alternativa descartada:** mantener la pre-aprobación automática por IA. Se descartó porque el flujo oficial de cátedra es la revisión humana y la IA agregaba dependencia, costo y errores de validación.

**Consecuencias:** se eliminan `src/lib/gemini.ts`, el análisis de IA en `/api/verify-payment` y `GEMINI_API_KEY`. El panel `/admin` es la única vía de aprobación. El email al Cliente se envía después de la aprobación humana.
