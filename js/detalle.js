/**
 * ONN — Operación Niño de la Navidad
 * Vista de Detalles, Edición y Eliminación Segura
 * Archivo: js/detalle.js
 */

import { getSupabase } from './supabase-client.js';
import { GestorStorage } from './storage.js';
import { Validaciones } from './validaciones.js';

export class ModuloDetalle {
  constructor(ninoId) {
    this.ninoId = ninoId;
    this.nino = null;
    this.nuevasFotosArchivo = { anverso: null, reverso: null };
    this.eliminarFotosAlGuardar = { anverso: false, reverso: false };
    this.urlsPreviaFotos = { anverso: null, reverso: null };
    this.inicializar();
  }

  async inicializar() {
    if (!this.ninoId) {
      this.mostrarError('Identificador de niño no especificado en la solicitud.');
      return;
    }

    this.enlazarEventosModalEdicion();
    this.enlazarEventosModalEliminar();
    await this.cargarDatos();
  }

  async cargarDatos() {
    const client = getSupabase();
    if (!client) {
      this.mostrarError('Supabase no está configurado.');
      return;
    }

    try {
      this.mostrarCargando(true);
      const { data, error } = await client
        .from('ninos')
        .select('*')
        .eq('id', this.ninoId)
        .single();

      if (error || !data) {
        throw new Error('No se encontró el registro del niño solicitado o no tiene permisos para consultarlo.');
      }

      this.nino = data;
      await this.renderizarDatos();
    } catch (err) {
      console.error('Error al cargar detalle del niño:', err);
      this.mostrarError(err.message);
    } finally {
      this.mostrarCargando(false);
    }
  }

  async renderizarDatos() {
    if (!this.nino) return;

    // Título y breadcrumb
    document.title = `${this.nino.nombre_completo} — Ficha ONN`;
    const elNombreTitulo = document.getElementById('detalle-nombre-titulo');
    if (elNombreTitulo) elNombreTitulo.textContent = this.nino.nombre_completo;

    // Campos de datos
    this.asignarTexto('detalle-nombre', this.nino.nombre_completo);
    this.asignarTexto('detalle-ci', this.nino.ci);
    this.asignarTexto('detalle-edad', `${this.nino.edad} años`);
    this.asignarTexto('detalle-genero', this.nino.genero);

    // Teléfono con enlaces de llamada y WhatsApp
    const elTel = document.getElementById('detalle-telefono');
    const elWhatsapp = document.getElementById('btn-whatsapp-tutor');
    if (elTel) {
      elTel.textContent = this.nino.telefono_tutor;
      elTel.href = `tel:${this.nino.telefono_tutor.replace(/\s+/g, '')}`;
    }
    if (elWhatsapp) {
      const limpioTel = this.nino.telefono_tutor.replace(/[^\d+]/g, '');
      const numWa = limpioTel.startsWith('+') ? limpioTel.replace('+', '') : `591${limpioTel}`;
      elWhatsapp.href = `https://wa.me/${numWa}?text=${encodeURIComponent(`Hola, me comunico desde la Operación Niño de la Navidad (ONN) respecto al registro de ${this.nino.nombre_completo}.`)}`;
    }

    // Fechas
    const fechaCreacion = new Date(this.nino.created_at).toLocaleString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    this.asignarTexto('detalle-fecha-registro', fechaCreacion);

    const fechaActualizacion = new Date(this.nino.updated_at).toLocaleString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    this.asignarTexto('detalle-fecha-actualizacion', fechaActualizacion);

    // Fotografía de carnet protegida
    await this.cargarFotografia();

    // Sincronizar ficha imprimible
    this.sincronizarFichaPrint();
  }

  async cargarFotografia() {
    for (const lado of ['anverso', 'reverso']) {
      const ruta = lado === 'anverso' ? this.nino.foto_path : this.nino.foto_reverso_path;
      const suffix = lado === 'anverso' ? '' : '-reverso';
      const imgElemento = document.getElementById(`detalle-foto${suffix}-img`);
      const placeholder = document.getElementById(`detalle-foto${suffix}-placeholder`);
      let urlFirmada = null;

      if (ruta) {
        try {
          urlFirmada = await GestorStorage.obtenerUrlFirmada(ruta, 3600);
        } catch (err) {
          console.warn(`Error al obtener URL firmada para ${lado}:`, err);
        }
      }

      if (urlFirmada && imgElemento) {
        imgElemento.src = urlFirmada;
        imgElemento.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      } else {
        if (imgElemento) {
          imgElemento.src = '';
          imgElemento.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'flex';
      }

      const printSuffix = lado === 'anverso' ? '' : '-reverso';
      const imgPrint = document.getElementById(`print-foto${printSuffix}-img`);
      const placeholderPrint = document.getElementById(`print-foto${printSuffix}-placeholder`);
      if (imgPrint) {
        imgPrint.src = urlFirmada || '';
        imgPrint.style.display = urlFirmada ? 'block' : 'none';
      }
      if (placeholderPrint) placeholderPrint.style.display = urlFirmada ? 'none' : 'flex';
    }
  }

  sincronizarFichaPrint() {
    this.asignarTexto('print-nombre', this.nino.nombre_completo);
    this.asignarTexto('print-ci', this.nino.ci);
    this.asignarTexto('print-edad', `${this.nino.edad} años`);
    this.asignarTexto('print-genero', this.nino.genero);
    this.asignarTexto('print-telefono', this.nino.telefono_tutor);
    const fecha = new Date(this.nino.created_at).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    this.asignarTexto('print-fecha', fecha);
    this.asignarTexto('print-folio', this.nino.id.slice(0, 8).toUpperCase());
  }

  asignarTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto || '—';
  }

  mostrarCargando(estado) {
    const cargandoEl = document.getElementById('detalle-cargando');
    const contenidoEl = document.getElementById('detalle-contenido');
    if (cargandoEl) cargandoEl.style.display = estado ? 'block' : 'none';
    if (contenidoEl) contenidoEl.style.display = estado ? 'none' : 'block';
  }

  mostrarError(mensaje) {
    const errorEl = document.getElementById('detalle-error-alerta');
    const contenidoEl = document.getElementById('detalle-contenido');
    const cargandoEl = document.getElementById('detalle-cargando');

    if (cargandoEl) cargandoEl.style.display = 'none';
    if (contenidoEl) contenidoEl.style.display = 'none';
    if (errorEl) {
      errorEl.textContent = mensaje;
      errorEl.style.display = 'block';
    }
  }

  /* ====================================================================
     MODAL DE EDICIÓN
     ==================================================================== */
  enlazarEventosModalEdicion() {
    const btnAbrir = document.getElementById('btn-abrir-editar');
    const modal = document.getElementById('modal-editar');
    const btnCerrar = document.getElementById('btn-cerrar-editar');
    const btnCancelar = document.getElementById('btn-cancelar-editar');
    const formEditar = document.getElementById('form-editar-nino');

    if (btnAbrir) {
      btnAbrir.addEventListener('click', () => this.abrirModalEdicion());
    }
    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => this.cerrarModalEdicion());
    }
    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => this.cerrarModalEdicion());
    }
    if (formEditar) {
      formEditar.addEventListener('submit', (e) => this.guardarEdicion(e));
    }

    ['anverso', 'reverso'].forEach((lado) => {
      const inputFoto = document.getElementById(`edit-foto-${lado}-input`);
      const btnCambiarFoto = document.querySelector(`[data-edit-cambiar-foto="${lado}"]`);
      const btnQuitarFoto = document.querySelector(`[data-edit-quitar-foto="${lado}"]`);

      if (btnCambiarFoto && inputFoto) {
        btnCambiarFoto.addEventListener('click', () => inputFoto.click());
        inputFoto.addEventListener('change', async () => {
          const file = inputFoto.files && inputFoto.files[0];
          if (!file) return;

          const val = await Validaciones.validarArchivoImagen(file);
          if (!val.valido) {
            alert(val.mensaje);
            inputFoto.value = '';
            return;
          }

          this.nuevasFotosArchivo[lado] = file;
          this.eliminarFotosAlGuardar[lado] = false;
          if (this.urlsPreviaFotos[lado]) URL.revokeObjectURL(this.urlsPreviaFotos[lado]);
          this.urlsPreviaFotos[lado] = URL.createObjectURL(file);
          const imgPrevia = document.getElementById(`edit-foto-${lado}-previa`);
          if (imgPrevia) {
            imgPrevia.src = this.urlsPreviaFotos[lado];
            imgPrevia.style.display = 'block';
          }
          inputFoto.value = '';
        });
      }

      if (btnQuitarFoto) {
        btnQuitarFoto.addEventListener('click', () => {
          this.nuevasFotosArchivo[lado] = null;
          this.eliminarFotosAlGuardar[lado] = true;
          if (this.urlsPreviaFotos[lado]) URL.revokeObjectURL(this.urlsPreviaFotos[lado]);
          this.urlsPreviaFotos[lado] = null;
          if (inputFoto) inputFoto.value = '';
          const imgPrevia = document.getElementById(`edit-foto-${lado}-previa`);
          if (imgPrevia) {
            imgPrevia.src = '';
            imgPrevia.style.display = 'none';
          }
        });
      }
    });
  }

  abrirModalEdicion() {
    if (!this.nino) return;

    // Rellenar campos con valores actuales
    document.getElementById('edit-nombre').value = this.nino.nombre_completo;
    document.getElementById('edit-ci').value = this.nino.ci;
    document.getElementById('edit-edad').value = this.nino.edad;
    document.getElementById('edit-telefono').value = this.nino.telefono_tutor;
    document.getElementById('edit-genero').value = this.nino.genero;

    this.nuevasFotosArchivo = { anverso: null, reverso: null };
    this.eliminarFotosAlGuardar = { anverso: false, reverso: false };

    ['anverso', 'reverso'].forEach((lado) => {
      const suffix = lado === 'anverso' ? '' : '-reverso';
      const imgPrevia = document.getElementById(`edit-foto-${lado}-previa`);
      const imgPrincipal = document.getElementById(`detalle-foto${suffix}-img`);
      const inputFoto = document.getElementById(`edit-foto-${lado}-input`);
      if (inputFoto) inputFoto.value = '';
      if (this.urlsPreviaFotos[lado]) URL.revokeObjectURL(this.urlsPreviaFotos[lado]);
      this.urlsPreviaFotos[lado] = null;
      if (imgPrevia) {
        if (imgPrincipal && imgPrincipal.style.display !== 'none' && imgPrincipal.src) {
          imgPrevia.src = imgPrincipal.src;
          imgPrevia.style.display = 'block';
        } else {
          imgPrevia.src = '';
          imgPrevia.style.display = 'none';
        }
      }
    });

    const modal = document.getElementById('modal-editar');
    if (modal) modal.classList.add('abierto');
  }

  cerrarModalEdicion() {
    const modal = document.getElementById('modal-editar');
    if (modal) modal.classList.remove('abierto');
  }

  async guardarEdicion(e) {
    e.preventDefault();

    const valNombre = Validaciones.validarNombre(document.getElementById('edit-nombre').value);
    const valCI = Validaciones.validarCI(document.getElementById('edit-ci').value);
    const valEdad = Validaciones.validarEdad(document.getElementById('edit-edad').value);
    const valTel = Validaciones.validarTelefono(document.getElementById('edit-telefono').value);
    const valGen = Validaciones.validarGenero(document.getElementById('edit-genero').value);

    if (!valNombre.valido || !valCI.valido || !valEdad.valido || !valTel.valido || !valGen.valido) {
      alert('Por favor verifique que todos los campos cumplan los formatos requeridos.');
      return;
    }

    const btnGuardar = document.getElementById('btn-submit-editar');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : 'Guardar Cambios';

    try {
      if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner"></span> Guardando...';
      }

      const client = getSupabase();
      const rutasFoto = {
        anverso: this.nino.foto_path || null,
        reverso: this.nino.foto_reverso_path || null,
      };
      const rutasAnteriores = [];
      const rutasNuevas = [];

      for (const lado of ['anverso', 'reverso']) {
        const propiedad = lado === 'anverso' ? 'foto_path' : 'foto_reverso_path';
        if (this.nuevasFotosArchivo[lado]) {
          rutasAnteriores.push(this.nino[propiedad]);
          try {
            const resSubida = await GestorStorage.subirFotografia(this.nuevasFotosArchivo[lado]);
            rutasNuevas.push(resSubida.ruta);
            rutasFoto[lado] = resSubida.ruta;
          } catch (errorSubida) {
            await Promise.all(rutasNuevas.map((ruta) => GestorStorage.eliminarArchivo(ruta)));
            throw errorSubida;
          }
        } else if (this.eliminarFotosAlGuardar[lado]) {
          rutasAnteriores.push(this.nino[propiedad]);
          rutasFoto[lado] = null;
        }
      }

      // 2. Actualizar registro en PostgreSQL
      const payload = {
        nombre_completo: valNombre.valor,
        ci: valCI.valor,
        edad: valEdad.valor,
        telefono_tutor: valTel.valor,
        genero: valGen.valor,
        foto_path: rutasFoto.anverso,
        foto_reverso_path: rutasFoto.reverso,
      };

      const { data, error } = await client
        .from('ninos')
        .update(payload)
        .eq('id', this.nino.id)
        .select()
        .single();

      if (error) {
        await Promise.all(rutasNuevas.map((ruta) => GestorStorage.eliminarArchivo(ruta)));

        if (error.code === '23505' || error.message.includes('unique constraint')) {
          throw new Error('Ya existe otro niño registrado con este CI. No se pueden duplicar documentos.');
        }
        throw new Error(`Error al actualizar el registro: ${error.message}`);
      }

      // 3. Si la actualización en base de datos fue exitosa, eliminar la foto anterior de Storage
      await Promise.all(rutasAnteriores.filter(Boolean).map((ruta) => GestorStorage.eliminarArchivo(ruta)));

      this.nino = data;
      await this.renderizarDatos();
      this.cerrarModalEdicion();
      alert('Registro actualizado exitosamente.');
    } catch (err) {
      console.error('Error al guardar edición:', err);
      alert(err.message || 'Error al guardar cambios.');
    } finally {
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
      }
    }
  }

  /* ====================================================================
     MODAL DE ELIMINACIÓN CON CONFIRMACIÓN EXPLÍCITA
     ==================================================================== */
  enlazarEventosModalEliminar() {
    const btnAbrir = document.getElementById('btn-abrir-eliminar');
    const modal = document.getElementById('modal-eliminar');
    const btnCerrar = document.getElementById('btn-cerrar-eliminar');
    const btnCancelar = document.getElementById('btn-cancelar-eliminar');
    const btnConfirmar = document.getElementById('btn-confirmar-eliminar');

    if (btnAbrir) {
      btnAbrir.addEventListener('click', () => {
        if (!this.nino) return;
        const nombreEl = document.getElementById('eliminar-nombre-nino');
        if (nombreEl) nombreEl.textContent = this.nino.nombre_completo;
        if (modal) modal.classList.add('abierto');
      });
    }

    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => modal?.classList.remove('abierto'));
    }
    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => modal?.classList.remove('abierto'));
    }

    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => this.ejecutarEliminacion());
    }
  }

  async ejecutarEliminacion() {
    if (!this.nino) return;

    const btnConfirmar = document.getElementById('btn-confirmar-eliminar');
    const textoOriginal = btnConfirmar ? btnConfirmar.innerHTML : 'Sí, Eliminar Definitivamente';

    try {
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<span class="spinner"></span> Eliminando...';
      }

      const client = getSupabase();

      // 1. Eliminar foto asociada en Storage si existe
      const rutasFotos = [this.nino.foto_path, this.nino.foto_reverso_path].filter(Boolean);
      await Promise.all(rutasFotos.map((ruta) => GestorStorage.eliminarArchivo(ruta)));

      // 2. Eliminar registro en PostgreSQL
      const { error } = await client
        .from('ninos')
        .delete()
        .eq('id', this.nino.id);

      if (error) {
        throw new Error(`Error al eliminar registro de la base de datos: ${error.message}`);
      }

      alert(`El registro de ${this.nino.nombre_completo} ha sido eliminado permanentemente.`);
      window.location.href = '/dashboard.html';
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      alert(err.message || 'Error al eliminar el registro.');
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = textoOriginal;
      }
    }
  }
}
