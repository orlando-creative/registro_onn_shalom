ALTER TABLE public.ninos
ADD COLUMN IF NOT EXISTS foto_reverso_path TEXT DEFAULT NULL;

COMMENT ON COLUMN public.ninos.foto_reverso_path IS
'Ruta relativa de la fotografía del reverso del documento dentro del bucket privado onn-fotos';
