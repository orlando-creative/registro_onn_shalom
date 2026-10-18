-- ====================================================================
-- ONN — Operación Niño de la Navidad
-- Configuración de Supabase Storage para Fotografías (Modo Directo Rápido)
-- Archivo: supabase/storage.sql
-- ====================================================================

-- 1. CREACIÓN DEL BUCKET 'onn-fotos' PÚBLICO PARA CARGA RÁPIDA DE FOTOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'onn-fotos',
    'onn-fotos',
    true, -- Permite carga y visualización directa y ultrarrápida
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. POLÍTICAS DE ACCESO PARA 'onn-fotos'
DROP POLICY IF EXISTS "Permitir subida publica controlada de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Personal autenticado puede ver fotos privadas" ON storage.objects;
DROP POLICY IF EXISTS "Personal autenticado puede actualizar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Personal autenticado puede eliminar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Acceso total a fotos ONN anon y authenticated" ON storage.objects;

-- Permite lectura, subida, actualización y eliminación de fotos directamente con la anon key
CREATE POLICY "Acceso total a fotos ONN anon y authenticated"
ON storage.objects
FOR ALL
TO anon, authenticated
USING (bucket_id = 'onn-fotos')
WITH CHECK (bucket_id = 'onn-fotos');
