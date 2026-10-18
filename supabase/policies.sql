-- ====================================================================
-- ONN — Operación Niño de la Navidad
-- Políticas de Seguridad (Modo Directo sin Autenticación)
-- Archivo: supabase/policies.sql
-- ====================================================================

-- 1. Asegurar que RLS esté activo o permitir acceso directo con clave anon
ALTER TABLE public.ninos ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza de políticas anteriores
DROP POLICY IF EXISTS "Permitir registro publico anonimo de ninos" ON public.ninos;
DROP POLICY IF EXISTS "Personal autenticado puede ver registros" ON public.ninos;
DROP POLICY IF EXISTS "Personal autenticado puede registrar ninos" ON public.ninos;
DROP POLICY IF EXISTS "Personal autenticado puede actualizar registros" ON public.ninos;
DROP POLICY IF EXISTS "Personal autenticado puede eliminar registros" ON public.ninos;
DROP POLICY IF EXISTS "Acceso total ONN anon y authenticated" ON public.ninos;

-- 3. POLÍTICA DE ACCESO COMPLETO DIRECTO (Lectura, Registro, Edición y Eliminación)
-- Permite que la aplicación web funcione rápida y directamente con la Anon Key
-- sin necesidad de que los coordinadores tengan que iniciar sesión con contraseña.
CREATE POLICY "Acceso total ONN anon y authenticated"
ON public.ninos
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
