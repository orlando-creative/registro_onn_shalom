CREATE TABLE IF NOT EXISTS public.asistencias (
    nino_id UUID NOT NULL REFERENCES public.ninos(id) ON DELETE CASCADE,
    clase SMALLINT NOT NULL CHECK (clase BETWEEN 1 AND 4),
    fecha DATE NOT NULL,
    asistio BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (nino_id, clase)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_clase ON public.asistencias (clase);

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total ONN asistencias anon y authenticated" ON public.asistencias;
CREATE POLICY "Acceso total ONN asistencias anon y authenticated"
ON public.asistencias
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.asistencias TO anon, authenticated;
