-- ====================================================================
-- ONN — Operación Niño de la Navidad
-- Script de Base de Datos PostgreSQL para Supabase
-- Archivo: supabase/schema.sql
-- ====================================================================

-- Habilitar extensión para UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CREACIÓN DE LA TABLA 'ninos'
CREATE TABLE IF NOT EXISTS public.ninos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo TEXT NOT NULL,
    ci TEXT NOT NULL,
    edad INTEGER NOT NULL,
    telefono_tutor TEXT NOT NULL,
    genero TEXT NOT NULL,
    foto_path TEXT DEFAULT NULL,
    foto_reverso_path TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Restricciones de validación de negocio
    CONSTRAINT check_nombre_valido CHECK (length(trim(nombre_completo)) >= 2 AND length(nombre_completo) <= 160),
    CONSTRAINT check_ci_valido CHECK (length(trim(ci)) >= 3 AND length(ci) <= 30),
    CONSTRAINT check_edad_rango CHECK (edad >= 1 AND edad <= 18),
    CONSTRAINT check_telefono_valido CHECK (length(trim(telefono_tutor)) >= 6 AND length(telefono_tutor) <= 30),
    CONSTRAINT check_genero_opciones CHECK (genero IN ('Masculino', 'Femenino'))
);

-- 2. RESTRICCIÓN DE UNICIDAD DEL CI NORMALIZADO
-- Asegura que no puedan existir dos niños con el mismo documento
CREATE UNIQUE INDEX IF NOT EXISTS ninos_ci_unique_idx ON public.ninos (upper(trim(ci)));

-- 3. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
CREATE INDEX IF NOT EXISTS idx_ninos_nombre_lower ON public.ninos (lower(nombre_completo));
CREATE INDEX IF NOT EXISTS idx_ninos_ci ON public.ninos (ci);
CREATE INDEX IF NOT EXISTS idx_ninos_created_at ON public.ninos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ninos_genero ON public.ninos (genero);

-- 4. ASISTENCIA A LAS CUATRO CLASES
CREATE TABLE IF NOT EXISTS public.asistencias (
    nino_id UUID NOT NULL REFERENCES public.ninos(id) ON DELETE CASCADE,
    clase SMALLINT NOT NULL CHECK (clase BETWEEN 1 AND 4),
    fecha DATE NOT NULL,
    asistio BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (nino_id, clase)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_clase ON public.asistencias (clase);

-- 4. FUNCIÓN Y TRIGGER PARA NORMALIZAR CAMPOS ANTES DE INSERTAR O ACTUALIZAR
CREATE OR REPLACE FUNCTION public.normalizar_datos_nino()
RETURNS TRIGGER AS $$
BEGIN
    -- Normalizar nombre: eliminar espacios redundantes al inicio y final
    NEW.nombre_completo := trim(regexp_replace(NEW.nombre_completo, '\s+', ' ', 'g'));
    
    -- Normalizar CI: sin espacios accidentales, en mayúsculas (para complementos alfanuméricos)
    NEW.ci := upper(trim(regexp_replace(NEW.ci, '\s+', '', 'g')));
    
    -- Normalizar teléfono: eliminar espacios redundantes
    NEW.telefono_tutor := trim(regexp_replace(NEW.telefono_tutor, '\s+', ' ', 'g'));
    
    -- Forzar mayúscula en género
    IF lower(NEW.genero) = 'masculino' THEN
        NEW.genero := 'Masculino';
    ELSIF lower(NEW.genero) = 'femenino' THEN
        NEW.genero := 'Femenino';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_datos_nino ON public.ninos;
CREATE TRIGGER trg_normalizar_datos_nino
BEFORE INSERT OR UPDATE ON public.ninos
FOR EACH ROW
EXECUTE FUNCTION public.normalizar_datos_nino();

-- 5. FUNCIÓN Y TRIGGER PARA ACTUALIZAR AUTOMÁTICAMENTE 'updated_at'
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_ninos_updated_at ON public.ninos;
CREATE TRIGGER trg_actualizar_ninos_updated_at
BEFORE UPDATE ON public.ninos
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

COMMENT ON TABLE public.ninos IS 'Registro oficial de niños participantes en Operación Niño de la Navidad (ONN)';
COMMENT ON COLUMN public.ninos.ci IS 'Cédula de Identidad o documento del niño, normalizado y con restricción única';
COMMENT ON COLUMN public.ninos.foto_path IS 'Ruta relativa de la fotografía dentro del bucket privado onn-fotos en Supabase Storage';
COMMENT ON COLUMN public.ninos.foto_reverso_path IS 'Ruta relativa de la fotografía del reverso del documento dentro del bucket privado onn-fotos';
