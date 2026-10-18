/**
 * ONN — Operación Niño de la Navidad
 * Panel Administrativo y Estadísticas Reales
 * Archivo: js/administracion.js
 */

import { getSupabase, testConnection, getActiveConfig, saveActiveConfig } from './supabase-client.js';
import { AuthONN } from './auth.js';

export class ModuloAdministracion {
  constructor() {
    this.inicializar();
  }

  async inicializar() {
    this.enlazarEventosSesion();
    this.enlazarModalConfiguracion();
    await this.cargarEstadisticasReales();
  }

  enlazarEventosSesion() {
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', async (e) => {
        e.preventDefault();
        await AuthONN.cerrarSesion();
      });
    }

    // Mostrar correo del usuario autenticado si está disponible
    AuthONN.obtenerUsuario().then((user) => {
      const emailEl = document.getElementById('usuario-email-badge');
      if (emailEl && user) {
        emailEl.textContent = user.email || 'Personal Autorizado';
      }
    });
  }

  async cargarEstadisticasReales() {
    const client = getSupabase();
    if (!client) return;

    try {
      // 1. Total general
      const { count: total, error: errTotal } = await client
        .from('ninos')
        .select('*', { count: 'exact', head: true });

      if (errTotal) throw errTotal;

      this.asignarNumero('stat-total-ninos', total || 0);

      if (total === 0) {
        this.asignarNumero('stat-ninos-varones', 0);
        this.asignarNumero('stat-ninas-mujeres', 0);
        this.asignarNumero('stat-con-foto', 0);
        this.asignarNumero('stat-edad-promedio', 0);
        return;
      }

      // 2. Conteo por género
      const { count: varones } = await client
        .from('ninos')
        .select('*', { count: 'exact', head: true })
        .eq('genero', 'Masculino');

      const { count: mujeres } = await client
        .from('ninos')
        .select('*', { count: 'exact', head: true })
        .eq('genero', 'Femenino');

      this.asignarNumero('stat-ninos-varones', varones || 0);
      this.asignarNumero('stat-ninas-mujeres', mujeres || 0);

      // 3. Niños con fotografía de carnet
      const { count: conFoto } = await client
        .from('ninos')
        .select('*', { count: 'exact', head: true })
        .not('foto_path', 'is', null);

      this.asignarNumero('stat-con-foto', conFoto || 0);

      // 4. Cálculo de edad promedio (recuperamos solo la columna edad)
      const { data: edades } = await client
        .from('ninos')
        .select('edad');

      if (edades && edades.length > 0) {
        const suma = edades.reduce((acc, curr) => acc + (curr.edad || 0), 0);
        const promedio = (suma / edades.length).toFixed(1);
        this.asignarNumero('stat-edad-promedio', `${promedio} años`);
      }
    } catch (err) {
      console.warn('Error al calcular estadísticas en tiempo real:', err.message);
    }
  }

  asignarNumero(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  }

  enlazarModalConfiguracion() {
    const btnAbrir = document.getElementById('btn-abrir-config-supabase');
    const modal = document.getElementById('modal-config-supabase');
    const btnCerrar = document.getElementById('btn-cerrar-config-supabase');
    const formConfig = document.getElementById('form-config-supabase');
    const btnTest = document.getElementById('btn-test-conexion');
    const resultadoTest = document.getElementById('resultado-test-conexion');

    if (btnAbrir) {
      btnAbrir.addEventListener('click', () => {
        const cfg = getActiveConfig();
        const inputUrl = document.getElementById('cfg-supabase-url');
        const inputKey = document.getElementById('cfg-supabase-key');
        if (inputUrl) inputUrl.value = cfg.url;
        if (inputKey) inputKey.value = cfg.anonKey;
        if (resultadoTest) resultadoTest.style.display = 'none';
        if (modal) modal.classList.add('abierto');
      });
    }

    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => modal?.classList.remove('abierto'));
    }

    if (formConfig) {
      formConfig.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('cfg-supabase-url')?.value;
        const key = document.getElementById('cfg-supabase-key')?.value;
        saveActiveConfig(url, key);
        alert('Credenciales de Supabase guardadas exitosamente.');
        modal?.classList.remove('abierto');
        window.location.reload();
      });
    }

    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        if (!resultadoTest) return;
        resultadoTest.style.display = 'block';
        resultadoTest.innerHTML = '<span class="spinner" style="border-top-color:#218838; width:0.9rem; height:0.9rem;"></span> Probando conexión con Supabase...';
        resultadoTest.className = 'alerta alerta-info';

        const res = await testConnection();
        if (res.ok) {
          resultadoTest.className = 'alerta alerta-exito';
          resultadoTest.textContent = res.mensaje;
        } else {
          resultadoTest.className = 'alerta alerta-error';
          resultadoTest.textContent = res.mensaje;
        }
      });
    }
  }
}
