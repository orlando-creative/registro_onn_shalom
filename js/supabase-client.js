/**
 * ONN — Operación Niño de la Navidad
 * Cliente de Supabase v2 con Configuración Directa y Rápida
 * Archivo: js/supabase-client.js
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';

const STORAGE_KEY = 'ONN_SUPABASE_CONFIG';
let _cachedClient = null;

/**
 * Obtiene la configuración activa dando prioridad al archivo js/config.js,
 * seguido de localStorage y variables globales.
 */
export function getActiveConfig() {
  let stored = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // Si localStorage no está disponible
  }

  const windowConfig = (typeof window !== 'undefined' && window.ONN_CONFIG) || {};

  // Prioridad: 1. js/config.js, 2. localStorage, 3. window.ONN_CONFIG
  const url = (SUPABASE_CONFIG.URL && SUPABASE_CONFIG.URL.trim()) || stored.url || windowConfig.SUPABASE_URL || '';
  const anonKey = (SUPABASE_CONFIG.ANON_KEY && SUPABASE_CONFIG.ANON_KEY.trim()) || stored.anonKey || windowConfig.SUPABASE_ANON_KEY || '';
  const bucket = SUPABASE_CONFIG.STORAGE_BUCKET || stored.bucket || windowConfig.STORAGE_BUCKET || 'onn-fotos';

  return { url: url.trim(), anonKey: anonKey.trim(), bucket: bucket.trim() };
}

/**
 * Guarda credenciales opcionalmente en el navegador
 */
export function saveActiveConfig(url, anonKey, bucket = 'onn-fotos') {
  const cfg = { url: (url || '').trim(), anonKey: (anonKey || '').trim(), bucket: (bucket || 'onn-fotos').trim() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  _cachedClient = null;
  return cfg;
}

/**
 * Retorna la instancia de Supabase lista para usar a máxima velocidad
 */
export function getSupabase() {
  if (_cachedClient) return _cachedClient;

  const cfg = getActiveConfig();
  if (!cfg.url || !cfg.anonKey) {
    return null;
  }

  try {
    _cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return _cachedClient;
  } catch (err) {
    console.error('Error al inicializar cliente Supabase:', err);
    return null;
  }
}

/**
 * Comprueba si la base de datos está configurada
 */
export function isConfigured() {
  const cfg = getActiveConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('https://') && !cfg.url.includes('tu-proyecto'));
}

/**
 * Prueba la conectividad en tiempo real con Supabase
 */
export async function testConnection() {
  const client = getSupabase();
  if (!client) {
    return { ok: false, mensaje: 'Credenciales no configuradas. Ingrese la URL y la Anon Key en js/config.js o en el botón de ajustes.' };
  }

  try {
    const { count, error } = await client.from('ninos').select('*', { head: true, count: 'exact' });
    if (error) {
      if (error.code === '42P01') {
        return {
          ok: false,
          mensaje: 'Conectado a Supabase pero la tabla "ninos" no existe. Ejecute supabase/schema.sql en el SQL Editor de Supabase.'
        };
      }
      return { ok: false, mensaje: `Error de Supabase: ${error.message}` };
    }
    return { ok: true, mensaje: `¡Conexión exitosa! Hay ${count || 0} registros en la tabla ninos.` };
  } catch (err) {
    return { ok: false, mensaje: `Fallo de red o URL incorrecta: ${err.message}` };
  }
}
