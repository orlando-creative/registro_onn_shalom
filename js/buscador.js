/**
 * ONN — Operación Niño de la Navidad
 * Buscador Inteligente con Debounce y Paginación
 * Archivo: js/buscador.js
 */

import { getSupabase } from './supabase-client.js';

export class BuscadorNinos {
  constructor(opciones = {}) {
    this.inputBusqueda = document.getElementById(opciones.inputId || 'busqueda-input');
    this.btnLimpiar = document.getElementById(opciones.btnLimpiarId || 'busqueda-limpiar');
    this.contenedorResultados = document.getElementById(opciones.resultadosId || 'lista-resultados');
    this.contenedorTabla = document.getElementById(opciones.tablaBodyId || 'tabla-ninos-body');
    this.paginacionEl = document.getElementById(opciones.paginacionId || 'paginacion-ninos');
    this.selectFiltroGenero = document.getElementById(opciones.filtroGeneroId || 'filtro-genero');

    this.paginaActual = 1;
    this.porPagina = opciones.porPagina || 10;
    this.totalRegistros = 0;
    this.terminoActual = '';
    this.generoFiltro = 'todos';
    this.temporizadorDebounce = null;
    this.cargando = false;

    this.inicializar();
  }

  inicializar() {
    if (!this.inputBusqueda) return;

    this.inputBusqueda.addEventListener('input', (e) => {
      const valor = e.target.value;
      if (this.btnLimpiar) {
        if (valor.trim().length > 0) {
          this.btnLimpiar.classList.add('visible');
        } else {
          this.btnLimpiar.classList.remove('visible');
        }
      }

      clearTimeout(this.temporizadorDebounce);
      this.temporizadorDebounce = setTimeout(() => {
        this.terminoActual = valor.trim();
        this.paginaActual = 1;
        this.ejecutarConsulta();
      }, 300);
    });

    if (this.btnLimpiar) {
      this.btnLimpiar.addEventListener('click', () => {
        this.inputBusqueda.value = '';
        this.btnLimpiar.classList.remove('visible');
        this.terminoActual = '';
        this.paginaActual = 1;
        this.ejecutarConsulta();
        this.inputBusqueda.focus();
      });
    }

    if (this.selectFiltroGenero) {
      this.selectFiltroGenero.addEventListener('change', (e) => {
        this.generoFiltro = e.target.value;
        this.paginaActual = 1;
        this.ejecutarConsulta();
      });
    }

    // Ejecutar primera carga
    this.ejecutarConsulta();
  }

  async ejecutarConsulta() {
    const client = getSupabase();
    if (!client) {
      this.renderizarEstado('No se puede conectar a Supabase. Configure sus credenciales.', 'error');
      return;
    }

    this.cargando = true;
    this.renderizarCargando();

    try {
      let query = client
        .from('ninos')
        .select('id, nombre_completo, ci, edad, telefono_tutor, genero, foto_path, created_at', { count: 'exact' });

      // Filtro por búsqueda (Nombre o CI)
      if (this.terminoActual) {
        const t = this.terminoActual;
        // ilike para búsqueda insensible a mayúsculas
        query = query.or(`nombre_completo.ilike.%${t}%,ci.ilike.%${t}%`);
      }

      // Filtro por género si aplica
      if (this.generoFiltro && this.generoFiltro !== 'todos') {
        query = query.eq('genero', this.generoFiltro);
      }

      // Paginación
      const desde = (this.paginaActual - 1) * this.porPagina;
      const hasta = desde + this.porPagina - 1;

      query = query.order('created_at', { ascending: false }).range(desde, hasta);

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      this.totalRegistros = count || 0;
      this.renderizarResultados(data || []);
      this.renderizarPaginacion();
    } catch (err) {
      console.error('Error al consultar niños:', err);
      if (err.message && err.message.includes('JWT') || err.code === '401' || err.code === 'PGRST301') {
        this.renderizarEstado('Sesión expirada o no autorizada. Por favor inicie sesión nuevamente.', 'error');
      } else {
        this.renderizarEstado(`Error al consultar registros: ${err.message}`, 'error');
      }
    } finally {
      this.cargando = false;
    }
  }

  renderizarCargando() {
    const placeholderHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-texto-secundario);">
          <span class="spinner" style="border-color: rgba(33, 136, 56, 0.2); border-top-color: #218838; width: 1.5rem; height: 1.5rem; margin-right: 0.5rem; vertical-align: middle;"></span>
          Consultando registros...
        </td>
      </tr>
    `;
    if (this.contenedorTabla) this.contenedorTabla.innerHTML = placeholderHTML;

    if (this.contenedorResultados) {
      this.contenedorResultados.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--color-texto-secundario);">
          <span class="spinner" style="border-color: rgba(33, 136, 56, 0.2); border-top-color: #218838; width: 1.5rem; height: 1.5rem; margin-right: 0.5rem; vertical-align: middle;"></span>
          Buscando...
        </div>
      `;
    }
  }

  renderizarEstado(mensaje, tipo = 'info') {
    const color = tipo === 'error' ? 'var(--color-rojo)' : 'var(--color-texto-secundario)';
    const html = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: ${color};">
          <p style="font-weight: 500;">${mensaje}</p>
        </td>
      </tr>
    `;
    if (this.contenedorTabla) this.contenedorTabla.innerHTML = html;

    if (this.contenedorResultados) {
      this.contenedorResultados.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: ${color}; background: #FFFFFF; border: 1px solid var(--color-bordes); border-radius: var(--radio-md);">
          <p style="font-weight: 500;">${mensaje}</p>
        </div>
      `;
    }

    if (this.paginacionEl) this.paginacionEl.innerHTML = '';
  }

  renderizarResultados(lista) {
    if (lista.length === 0) {
      const msg = this.terminoActual
        ? `No se encontraron niños que coincidan con "${this.terminoActual}".`
        : 'Aún no hay niños registrados en el sistema.';
      this.renderizarEstado(msg, 'info');
      return;
    }

    // 1. Renderizar tabla de escritorio
    if (this.contenedorTabla) {
      this.contenedorTabla.innerHTML = lista.map((nino) => {
        const fecha = new Date(nino.created_at).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const tieneFoto = Boolean(nino.foto_path);

        return `
          <tr data-id="${nino.id}">
            <td style="width: 50px; text-align: center;">
              ${tieneFoto 
                ? '<span title="Tiene foto de carnet" style="color: var(--color-verde-oscuro);">Con foto</span>' 
                : '<span title="Sin foto" style="color: var(--color-texto-apagado);">Sin foto</span>'
              }
            </td>
            <td style="font-weight: 600;">
              <a href="/detalle.html?id=${nino.id}" style="color: var(--color-texto-principal); text-decoration: none;" class="enlace-hover-verde">
                ${this.escaparHTML(nino.nombre_completo)}
              </a>
            </td>
            <td><code class="ci-mono">${this.escaparHTML(nino.ci)}</code></td>
            <td class="num">${nino.edad} años</td>
            <td>
              <a href="tel:${this.escaparHTML(nino.telefono_tutor)}" style="color: var(--color-verde-oscuro); text-decoration: none;" class="ci-mono">
                ${this.escaparHTML(nino.telefono_tutor)}
              </a>
            </td>
            <td>${this.escaparHTML(nino.genero)}</td>
            <td class="tabular-nums" style="color: var(--color-texto-secundario); font-size: 0.8125rem;">${fecha}</td>
            <td style="text-align: right; white-space: nowrap;">
              <a href="/detalle.html?id=${nino.id}" class="btn btn-sm btn-secundario" title="Ver ficha y detalles">
                Ver Ficha
              </a>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Renderizar lista de tarjetas en móvil
    if (this.contenedorResultados) {
      this.contenedorResultados.innerHTML = lista.map((nino) => {
        const tieneFoto = Boolean(nino.foto_path);
        return `
          <div class="tarjeta-nino-movil" onclick="window.location.href='/detalle.html?id=${nino.id}'">
            <div style="width: 48px; height: 60px; background: #E8F5E9; border-radius: var(--radio-sm); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #166534; flex-shrink: 0;">
              ${tieneFoto ? 'Con foto' : 'Sin foto'}
            </div>
            <div class="tarjeta-nino-info">
              <h4 class="tarjeta-nino-nombre">${this.escaparHTML(nino.nombre_completo)}</h4>
              <div class="tarjeta-nino-meta">
                <span>CI: <strong class="ci-mono">${this.escaparHTML(nino.ci)}</strong></span>
                <span>·</span>
                <span>${nino.edad} años</span>
                <span>·</span>
                <span>${this.escaparHTML(nino.genero)}</span>
              </div>
              <div style="margin-top: 0.25rem; font-size: 0.8125rem; color: var(--color-verde-oscuro);">
                Tutor: <span class="ci-mono">${this.escaparHTML(nino.telefono_tutor)}</span>
              </div>
            </div>
            <span style="color: var(--color-texto-apagado); font-size: 1.25rem;">›</span>
          </div>
        `;
      }).join('');
    }
  }

  renderizarPaginacion() {
    if (!this.paginacionEl) return;

    const totalPaginas = Math.ceil(this.totalRegistros / this.porPagina) || 1;
    const desde = this.totalRegistros === 0 ? 0 : (this.paginaActual - 1) * this.porPagina + 1;
    const hasta = Math.min(this.paginaActual * this.porPagina, this.totalRegistros);

    this.paginacionEl.innerHTML = `
      <div class="paginacion-info">
        Mostrando <strong class="num">${desde}</strong> a <strong class="num">${hasta}</strong> de <strong class="num">${this.totalRegistros}</strong> registros
      </div>
      <div class="paginacion-botones">
        <button class="btn btn-sm btn-secundario" id="btn-pag-ant" ${this.paginaActual <= 1 ? 'disabled' : ''}>
          ← Anterior
        </button>
        <span style="display: inline-flex; align-items: center; padding: 0 0.5rem; font-size: 0.8125rem; font-weight: 600;">
          Pág. ${this.paginaActual} de ${totalPaginas}
        </span>
        <button class="btn btn-sm btn-secundario" id="btn-pag-sig" ${this.paginaActual >= totalPaginas ? 'disabled' : ''}>
          Siguiente →
        </button>
      </div>
    `;

    const btnAnt = document.getElementById('btn-pag-ant');
    const btnSig = document.getElementById('btn-pag-sig');

    if (btnAnt) {
      btnAnt.addEventListener('click', () => {
        if (this.paginaActual > 1) {
          this.paginaActual--;
          this.ejecutarConsulta();
        }
      });
    }

    if (btnSig) {
      btnSig.addEventListener('click', () => {
        if (this.paginaActual < totalPaginas) {
          this.paginaActual++;
          this.ejecutarConsulta();
        }
      });
    }
  }

  escaparHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
