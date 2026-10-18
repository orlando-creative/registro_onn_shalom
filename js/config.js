/**
 * ====================================================================
 * ONN — Operación Niño de la Navidad
 * ARCHIVO DE CONFIGURACIÓN DIRECTA DE SUPABASE
 * Archivo: js/config.js
 * ====================================================================
 * 
 * INSERTA AQUÍ DIRECTAMENTE LA URL Y LA CLAVE ANÓNIMA DE TU SUPABASE:
 * (Encuéntralas en Supabase Dashboard > Settings > API)
 */

export const SUPABASE_CONFIG = {
  // 1. Pega aquí la URL de tu proyecto Supabase:
  URL: "https://ztlxoeyoijiofpgjuqzb.supabase.co",

  // 2. Pega aquí la clave pública anónima (anon public key):
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bHhvZXlvaWppb2ZwZ2p1cXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTk5NDEsImV4cCI6MjEwNzg5NTk0MX0.T7x-1XfBlexs55Wy5qY-cu79OlhdJToqPm-So_B81vs",

  // 3. Nombre del bucket de almacenamiento para fotos:
  STORAGE_BUCKET: "onn-fotos",

  // Parámetros de validación:
  EDAD_MINIMA: 1,
  EDAD_MAXIMA: 18,
  MAX_FOTO_BYTES: 5 * 1024 * 1024 // 5 MB
};

// También disponible globalmente para máxima compatibilidad:
if (typeof window !== 'undefined') {
  window.ONN_CONFIG = {
    SUPABASE_URL: SUPABASE_CONFIG.URL,
    SUPABASE_ANON_KEY: SUPABASE_CONFIG.ANON_KEY,
    STORAGE_BUCKET: SUPABASE_CONFIG.STORAGE_BUCKET,
    EDAD_MINIMA: SUPABASE_CONFIG.EDAD_MINIMA,
    EDAD_MAXIMA: SUPABASE_CONFIG.EDAD_MAXIMA,
    MAX_FOTO_BYTES: SUPABASE_CONFIG.MAX_FOTO_BYTES
  };
}
