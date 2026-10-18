/**
 * ONN — Operación Niño de la Navidad
 * Autenticación Desactivada (Acceso Libre y Rápido para el Equipo)
 * Archivo: js/auth.js
 */

export const AuthONN = {
  async iniciarSesion() {
    return { user: { email: 'equipo@onn.org' } };
  },

  async cerrarSesion() {
    window.location.href = '/';
  },

  async obtenerSesion() {
    return { user: { email: 'equipo@onn.org' } };
  },

  async obtenerUsuario() {
    return { email: 'Coordinador ONN' };
  },

  /**
   * En modo rápido sin autenticación, permite el acceso inmediato a todas las funciones
   */
  async protegerRutaAdministrativa() {
    return true; // Acceso directo sin redirecciones ni contraseñas
  },

  escucharCambios() {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
};
