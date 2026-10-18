/**
 * ONN — Operación Niño de la Navidad
 * Archivo de configuración de ejemplo para Supabase
 * Archivo: js/config.example.js
 * 
 * INSTRUCCIONES:
 * 1. Copie este archivo o declare las credenciales en su proyecto.
 * 2. Ingrese la URL y la Clave Anónima (anon / public) de su proyecto Supabase.
 *    (NUNCA coloque la clave 'service_role' en este archivo).
 */

window.ONN_CONFIG = {
  // URL de su proyecto Supabase (Ej: https://xyzcompany.supabase.co)
  SUPABASE_URL: "",

  // Clave pública/anónima de su proyecto Supabase (anon public key)
  SUPABASE_ANON_KEY: "",

  // Nombre del bucket de almacenamiento para fotografías de carnet
  STORAGE_BUCKET: "onn-fotos",

  // Rango de edad permitido para niños participantes
  EDAD_MINIMA: 1,
  EDAD_MAXIMA: 18,

  // Límite máximo de tamaño para fotografía (en bytes: 5MB)
  MAX_FOTO_BYTES: 5 * 1024 * 1024,

  // Formatos de imagen aceptados
  FORMATOS_IMAGEN: ["image/jpeg", "image/png", "image/webp"]
};
