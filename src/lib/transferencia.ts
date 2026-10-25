/**
 * Datos de la transferencia — gate G4.
 *
 * El sistema **no inventa** datos bancarios: alias, CBU y titular los confirma la Cooperadora
 * y se publican desde el entorno. Si falta alguno, el checkout lo dice y no muestra un CBU de
 * mentira (spec del front §6.1).
 */
export type DatosDeTransferencia = {
  alias: string;
  cbu: string;
  titular: string;
};

export function datosDeTransferencia(): DatosDeTransferencia | null {
  const alias = process.env.NEXT_PUBLIC_TRANSFERENCIA_ALIAS?.trim();
  const cbu = process.env.NEXT_PUBLIC_TRANSFERENCIA_CBU?.trim();
  const titular = process.env.NEXT_PUBLIC_TRANSFERENCIA_TITULAR?.trim();

  // Los tres o ninguno: media transferencia no sirve para transferir.
  if (!alias || !cbu || !titular) return null;

  return { alias, cbu, titular };
}
