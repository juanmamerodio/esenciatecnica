import type { ReactNode } from "react";

/** Encabezado de sección: título, subtítulo y una acción opcional (spec §3.2). */
export default function EncabezadoSeccion({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{titulo}</h2>
        {subtitulo ? <p className="text-sm leading-relaxed text-muted sm:text-base">{subtitulo}</p> : null}
      </div>
      {accion}
    </div>
  );
}
