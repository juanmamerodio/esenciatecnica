# Documentación para el cliente · Esencia Técnica

> **Para quién:** Departamento de Química · E.E.S.T N°1 Luciano Reyes.
> **Para qué:** entender cómo funciona la tienda y operar el panel de gestión sin saber de
> programación.

Estos dos documentos son el manual de uso del sistema. No hace falta leer nada más de este
repositorio para usar la tienda y el panel.

| Documento | Cuándo leerlo | Qué encontrás |
|---|---|---|
| **[`MANUAL.md`](MANUAL.md)** | Primero, una vez, de punta a punta | Qué hace el sistema, el circuito de una compra, la tienda pantalla por pantalla, el panel a grandes rasgos, la rutina sugerida y las preguntas frecuentes |
| **[`PANEL-DE-ADMIN.md`](PANEL-DE-ADMIN.md)** | Antes de validar el primer pago | Cómo entrar, el checklist para aprobar un comprobante, alertas de stock, corrección de stock, mantenimiento del catálogo y qué **no** se puede hacer |

## Lo mínimo que hay que saber

1. **El pago lo valida una persona.** El sistema no cobra ni lee comprobantes solo.
2. **Confirmar un pedido reserva stock.** Aprobar el pago lo descuenta; rechazarlo libera la reserva.
3. **Las alertas de stock se ven solo en el panel.** No llegan por email: hay que entrar seguido.
4. **Los pedidos sin comprobante aprobado se cancelan los viernes** y liberan el stock.
5. **Ningún producto se borra:** se da de baja y conserva su historial.

---

La documentación técnica del proyecto (modelo de datos, decisiones y specs) vive en
[`docs/`](../README.md).
