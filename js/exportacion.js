/**
 * ONN — Operación Niño de la Navidad
 * Exportación segura de registros a CSV y PDF imprimible
 * Archivo: js/exportacion.js
 */

import { getSupabase } from './supabase-client.js';

const TABLAS = {
  ninos: {
    etiqueta: 'Niños (ninos)',
    columnas: [
      { campo: 'id', etiqueta: 'ID' },
      { campo: 'nombre_completo', etiqueta: 'Nombre completo', seleccionada: true },
      { campo: 'ci', etiqueta: 'CI / Documento', seleccionada: true },
      { campo: 'edad', etiqueta: 'Edad', seleccionada: true },
      { campo: 'telefono_tutor', etiqueta: 'Teléfono del tutor', seleccionada: true },
      { campo: 'genero', etiqueta: 'Género', seleccionada: true },
      { campo: 'foto_path', etiqueta: 'Ruta de foto (anverso)' },
      { campo: 'foto_reverso_path', etiqueta: 'Ruta de foto (reverso)' },
      { campo: 'created_at', etiqueta: 'Fecha de registro', seleccionada: true },
      { campo: 'updated_at', etiqueta: 'Última actualización' },
    ],
  },
};

function escaparHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caracter]);
}

function mostrarFecha(valor) {
  if (!valor || !['created_at', 'updated_at'].includes(valor.campo)) return valor?.dato ?? '';
  const fecha = new Date(valor.dato);
  return Number.isNaN(fecha.getTime())
    ? valor.dato
    : fecha.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
}

export const ModuloExportacion = {
  sanitizarCeldaCSV(valor) {
    if (valor === null || valor === undefined) return '""';
    let texto = String(valor);

    if (/^[=+\-@\t\r]/.test(texto)) {
      texto = `'${texto}`;
    }

    return `"${texto.replace(/"/g, '""')}"`;
  },

  abrirConfiguracion() {
    const modal = document.getElementById('modal-exportacion');
    const selectorTabla = document.getElementById('export-tabla');
    const listaColumnas = document.getElementById('export-columnas');
    if (!modal || !selectorTabla || !listaColumnas) {
      throw new Error('No se encontró el formulario de exportación.');
    }

    if (selectorTabla.options.length === 0) {
      selectorTabla.replaceChildren(...Object.entries(TABLAS).map(([valor, tabla]) => {
        const opcion = document.createElement('option');
        opcion.value = valor;
        opcion.textContent = tabla.etiqueta;
        return opcion;
      }));
      this.actualizarColumnas(selectorTabla.value);
    }
    modal.classList.add('abierto');
  },

  actualizarColumnas(nombreTabla) {
    const lista = document.getElementById('export-columnas');
    const tabla = TABLAS[nombreTabla];
    if (!lista || !tabla) return;

    lista.replaceChildren(...tabla.columnas.map(({ campo, etiqueta, seleccionada }) => {
      const label = document.createElement('label');
      label.className = 'export-columna-opcion';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'export-columna';
      input.value = campo;
      input.checked = Boolean(seleccionada);

      const texto = document.createElement('span');
      texto.textContent = etiqueta;
      label.append(input, texto);
      return label;
    }));
  },

  seleccionarColumnas(seleccionar) {
    document.querySelectorAll('#export-columnas input[name="export-columna"]')
      .forEach((input) => { input.checked = seleccionar; });
  },

  async exportar(formato, terminoBusqueda = '', generoFiltro = 'todos') {
    const nombreTabla = document.getElementById('export-tabla')?.value || '';
    const tabla = TABLAS[nombreTabla];
    const seleccionadas = Array.from(
      document.querySelectorAll('#export-columnas input[name="export-columna"]:checked'),
      (input) => input.value,
    );
    const columnas = tabla?.columnas.filter(({ campo }) => seleccionadas.includes(campo)) || [];

    if (!tabla || columnas.length === 0) {
      alert('Selecciona al menos una columna para exportar.');
      return;
    }

    const ventanaPDF = formato === 'pdf' ? window.open('', '_blank') : null;
    if (formato === 'pdf' && !ventanaPDF) {
      alert('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.');
      return;
    }

    const client = getSupabase();
    if (!client) {
      ventanaPDF?.close();
      alert('Supabase no está configurado.');
      return;
    }

    const botones = Array.from(document.querySelectorAll('[data-exportar-formato]'));
    botones.forEach((boton) => { boton.disabled = true; });

    try {
      const campos = columnas.map(({ campo }) => campo).join(',');
      const registros = [];
      let desde = 0;
      const lote = 1000;

      while (true) {
        let query = client
          .from(nombreTabla)
          .select(campos)
          .order('created_at', { ascending: false })
          .range(desde, desde + lote - 1);

        if (terminoBusqueda) {
          query = query.or(`nombre_completo.ilike.%${terminoBusqueda}%,ci.ilike.%${terminoBusqueda}%`);
        }
        if (generoFiltro && generoFiltro !== 'todos') {
          query = query.eq('genero', generoFiltro);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data?.length) break;

        registros.push(...data);
        desde += lote;
        if (data.length < lote) break;
      }

      if (registros.length === 0) {
        ventanaPDF?.close();
        alert('No hay registros disponibles para exportar con los criterios seleccionados.');
        return;
      }

      const filas = registros.map((registro) => columnas.map(({ campo }) => ({
        campo,
        dato: registro[campo],
      })));

      if (formato === 'csv') {
        this.descargarCSV(columnas, filas);
      } else if (formato === 'pdf') {
        this.imprimirPDF(ventanaPDF, tabla.etiqueta, columnas, filas);
      } else {
        ventanaPDF?.close();
        throw new Error('Formato de exportación no reconocido.');
      }
    } catch (err) {
      ventanaPDF?.close();
      console.error('Error al exportar registros:', err);
      alert(`Error al generar la exportación: ${err.message}`);
    } finally {
      botones.forEach((boton) => { boton.disabled = false; });
    }
  },

  descargarCSV(columnas, filas) {
    const lineas = [
      columnas.map(({ etiqueta }) => this.sanitizarCeldaCSV(etiqueta)).join(','),
      ...filas.map((fila) => fila
        .map((celda) => this.sanitizarCeldaCSV(mostrarFecha(celda)))
        .join(',')),
    ];
    const contenidoCSV = '\uFEFF' + lineas.join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `ONN_${document.getElementById('export-tabla').value}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  },

  imprimirPDF(ventana, nombreTabla, columnas, filas) {
    const encabezados = columnas.map(({ etiqueta }) => `<th>${escaparHTML(etiqueta)}</th>`).join('');
    const cuerpo = filas.map((fila) => `<tr>${fila.map((celda) =>
      `<td>${escaparHTML(mostrarFecha(celda))}</td>`).join('')}</tr>`).join('');
    const documento = `<!doctype html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Exportación ${escaparHTML(nombreTabla)}</title>
        <style>
          @page { size: landscape; margin: 14mm; }
          body { font: 12px Arial, sans-serif; color: #1f2937; }
          h1 { font-size: 20px; margin: 0 0 6px; }
          p { color: #6b7280; margin: 0 0 18px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; overflow-wrap: anywhere; }
          th { background: #e8f5e9; color: #166534; }
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
        </style>
      </head>
      <body>
        <h1>${escaparHTML(nombreTabla)}</h1>
        <p>${filas.length} registros · Generado ${escaparHTML(new Date().toLocaleString('es-ES'))}</p>
        <table><thead><tr>${encabezados}</tr></thead><tbody>${cuerpo}</tbody></table>
      </body>
      </html>`;

    ventana.requestAnimationFrame(() => {
      ventana.focus();
      ventana.print();
    });
    ventana.document.open();
    ventana.document.write(documento);
    ventana.document.close();
  },
};
