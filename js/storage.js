/**
 * ONN — Operación Niño de la Navidad
 * Gestor de Almacenamiento Rápido de Fotografías (Supabase Storage)
 * Archivo: js/storage.js
 */

import { getSupabase, getActiveConfig } from './supabase-client.js';
import { Validaciones } from './validaciones.js';

export const GestorStorage = {
  obtenerExtension(file) {
    const mapa = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    if (file.type && mapa[file.type]) return mapa[file.type];
    const partes = (file.name || '').split('.');
    return partes.length > 1 ? partes.pop().toLowerCase() : 'jpg';
  },

  /**
   * Sube una fotografía de carnet al bucket 'onn-fotos'
   */
  async subirFotografia(file) {
    if (!file) return { exito: true, ruta: null };

    const val = await Validaciones.validarArchivoImagen(file);
    if (!val.valido) {
      throw new Error(val.mensaje);
    }

    const client = getSupabase();
    if (!client) {
      throw new Error('Supabase no está configurado en js/config.js');
    }

    const config = getActiveConfig();
    const bucket = config.bucket || 'onn-fotos';
    const ext = this.obtenerExtension(file);
    const idAleatorio = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10);
    const rutaArchivo = `carnets/${Date.now()}_${idAleatorio}.${ext}`;

    const { data, error } = await client.storage
      .from(bucket)
      .upload(rutaArchivo, file, {
        cacheControl: '86400',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (error) {
      console.error('Error al subir fotografía:', error);
      throw new Error(`Error al subir la fotografía: ${error.message}`);
    }

    return {
      exito: true,
      ruta: data.path,
    };
  },

  /**
   * Retorna la URL directa de la fotografía de forma instantánea sin demora de red
   */
  async obtenerUrlFirmada(fotoPath) {
    if (!fotoPath) return null;

    const client = getSupabase();
    if (!client) return null;

    const config = getActiveConfig();
    const bucket = config.bucket || 'onn-fotos';

    try {
      // Intentar primero URL pública instantánea (0 latencia)
      const { data } = client.storage.from(bucket).getPublicUrl(fotoPath);
      if (data && data.publicUrl) {
        return data.publicUrl;
      }
    } catch {
      // Fallback
    }

    try {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(fotoPath, 86400);

      if (error) return null;
      return data.signedUrl;
    } catch (err) {
      console.warn('Excepción al obtener URL de foto:', err);
      return null;
    }
  },

  /**
   * Elimina un archivo de Storage
   */
  async eliminarArchivo(fotoPath) {
    if (!fotoPath) return true;

    const client = getSupabase();
    if (!client) return false;

    const config = getActiveConfig();
    const bucket = config.bucket || 'onn-fotos';

    try {
      const { error } = await client.storage.from(bucket).remove([fotoPath]);
      return !error;
    } catch {
      return false;
    }
  }
};
