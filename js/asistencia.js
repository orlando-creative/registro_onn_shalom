import { getSupabase } from './supabase-client.js';

const TAMANO_LOTE = 500;

function fechaLocalISO() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

function escaparHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caracter]);
}

export const ModuloAsistencia = {
  ninos: [],

  inicializar() {
    const botonAbrir = document.getElementById('btn-tomar-asistencia');
    const modal = document.getElementById('modal-asistencia');
    const formulario = document.getElementById('form-asistencia');
    const botonCerrar = document.getElementById('btn-cerrar-asistencia');
    const botonCancelar = document.getElementById('btn-cancelar-asistencia');
    const selectorClase = document.getElementById('asistencia-clase');

    botonAbrir?.addEventListener('click', () => this.abrir());
    botonCerrar?.addEventListener('click', () => modal?.classList.remove('abierto'));
    botonCancelar?.addEventListener('click', () => modal?.classList.remove('abierto'));
    modal?.addEventListener('click', (evento) => {
      if (evento.target === modal) modal.classList.remove('abierto');
    });
    selectorClase?.addEventListener('change', () => this.cargarClase());
    formulario?.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.guardar();
    });

    document.getElementById('btn-asistencia-todos')?.addEventListener('click', () => {
      document.querySelectorAll('#asistencia-lista input[type="checkbox"]')
        .forEach((input) => { input.checked = true; });
    });
    document.getElementById('btn-asistencia-ninguno')?.addEventListener('click', () => {
      document.querySelectorAll('#asistencia-lista input[type="checkbox"]')
        .forEach((input) => { input.checked = false; });
    });
  },

  async abrir() {
    const modal = document.getElementById('modal-asistencia');
    const fecha = document.getElementById('asistencia-fecha');
    if (!modal || !fecha) throw new Error('No se encontró el formulario de asistencia.');

    fecha.value = fechaLocalISO();
    modal.classList.add('abierto');
    await this.cargarClase();
  },

  async cargarClase() {
    const client = getSupabase();
    const selectorClase = document.getElementById('asistencia-clase');
    const lista = document.getElementById('asistencia-lista');
    const estado = document.getElementById('asistencia-estado');
    const fecha = document.getElementById('asistencia-fecha');
    const botonGuardar = document.getElementById('btn-guardar-asistencia');
    if (!client || !selectorClase || !lista || !estado || !fecha || !botonGuardar) {
      estado && (estado.textContent = 'Supabase no está configurado o no se encontró el formulario.');
      return;
    }

    lista.replaceChildren();
    estado.textContent = 'Cargando niños y asistencia...';
    botonGuardar.disabled = true;
    selectorClase.disabled = true;

    try {
      if (this.ninos.length === 0) {
        const ninosCargados = [];
        let desde = 0;
        while (true) {
          const { data, error } = await client
            .from('ninos')
            .select('id, nombre_completo, ci')
            .order('nombre_completo')
            .range(desde, desde + 999);
          if (error) throw error;
          if (!data?.length) break;
          ninosCargados.push(...data);
          desde += data.length;
          if (data.length < 1000) break;
        }
        this.ninos = ninosCargados;
      }

      const clase = Number(selectorClase.value);
      const registros = [];
      let desde = 0;
      while (true) {
        const { data, error } = await client
          .from('asistencias')
          .select('nino_id, asistio, fecha')
          .eq('clase', clase)
          .order('nino_id')
          .range(desde, desde + 999);
        if (error) throw error;
        if (!data?.length) break;
        registros.push(...data);
        desde += data.length;
        if (data.length < 1000) break;
      }

      if (registros.length) fecha.value = registros[0].fecha;
      const asistenciasPorNino = new Map(registros.map((registro) => [registro.nino_id, registro]));
      lista.innerHTML = this.ninos.map((nino) => {
        const registro = asistenciasPorNino.get(nino.id);
        return `
          <label class="asistencia-nino">
            <input type="checkbox" name="nino-presente" value="${escaparHTML(nino.id)}" ${registro?.asistio ? 'checked' : ''}>
            <span class="asistencia-nino-info">
              <strong>${escaparHTML(nino.nombre_completo)}</strong>
              <small>CI: ${escaparHTML(nino.ci)}</small>
            </span>
            <span class="asistencia-nino-estado">${registro ? (registro.asistio ? 'Vino' : 'No vino') : 'Sin registrar'}</span>
          </label>
        `;
      }).join('');

      estado.textContent = this.ninos.length
        ? `${this.ninos.length} niños. Marca a quienes asistieron; los demás quedarán como ausentes.`
        : 'No hay niños registrados.';
      botonGuardar.disabled = this.ninos.length === 0;
    } catch (error) {
      console.error('Error al cargar la asistencia:', error);
      estado.textContent = `No se pudo cargar la asistencia: ${error.message}`;
    } finally {
      selectorClase.disabled = false;
    }
  },

  async guardar() {
    const client = getSupabase();
    const formulario = document.getElementById('form-asistencia');
    const estado = document.getElementById('asistencia-estado');
    const botonGuardar = document.getElementById('btn-guardar-asistencia');
    const fecha = document.getElementById('asistencia-fecha')?.value;
    const clase = Number(document.getElementById('asistencia-clase')?.value);
    if (!client || !formulario || !estado || !botonGuardar || !fecha) {
      if (estado) estado.textContent = 'Selecciona una fecha válida antes de guardar.';
      return;
    }

    const presentes = new Set(Array.from(
      document.querySelectorAll('#asistencia-lista input[name="nino-presente"]:checked'),
      (input) => input.value,
    ));
    const registros = this.ninos.map((nino) => ({
      nino_id: nino.id,
      clase,
      fecha,
      asistio: presentes.has(nino.id),
    }));

    botonGuardar.disabled = true;
    document.querySelectorAll('#form-asistencia input, #form-asistencia select, #form-asistencia button[type="button"]')
      .forEach((control) => { control.disabled = true; });
    estado.textContent = 'Guardando asistencia...';
    try {
      for (let desde = 0; desde < registros.length; desde += TAMANO_LOTE) {
        const { error } = await client
          .from('asistencias')
          .upsert(registros.slice(desde, desde + TAMANO_LOTE), { onConflict: 'nino_id,clase' });
        if (error) throw error;
      }
      estado.textContent = `Asistencia de la clase ${clase} guardada para ${registros.length} niños.`;
      document.querySelectorAll('#asistencia-lista .asistencia-nino').forEach((fila) => {
        const presente = fila.querySelector('input').checked;
        fila.querySelector('.asistencia-nino-estado').textContent = presente ? 'Vino' : 'No vino';
      });
    } catch (error) {
      console.error('Error al guardar la asistencia:', error);
      estado.textContent = `No se pudo guardar la asistencia: ${error.message}`;
    } finally {
      botonGuardar.disabled = false;
      document.querySelectorAll('#form-asistencia input, #form-asistencia select, #form-asistencia button[type="button"]')
        .forEach((control) => { control.disabled = false; });
    }
  },
};
