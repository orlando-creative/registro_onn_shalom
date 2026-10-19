/**
 * ONN — Operación Niño de la Navidad
 * Lógica del Formulario Público de Registro
 * Archivo: js/registro.js
 */

import { getSupabase, isConfigured } from './supabase-client.js';
import { Validaciones } from './validaciones.js';
import { GestorStorage } from './storage.js';

export class ModuloRegistro {
  constructor(formularioId) {
    this.form = document.getElementById(formularioId);
    this.archivosFotoSeleccionados = { anverso: null, reverso: null };
    this.inicializar();
  }

  inicializar() {
    if (!this.form) return;

    this.enlazarEventosCampos();
    this.enlazarEventosFoto();

    this.form.addEventListener('submit', (e) => this.manejarEnvio(e));
  }

  enlazarEventosCampos() {
    const campos = ['nombre_completo', 'ci', 'edad', 'telefono_tutor', 'genero'];
    campos.forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener('input', () => this.limpiarErrorCampo(id));
      input.addEventListener('blur', () => this.validarCampoIndividual(id));
    });
  }

  validarCampoIndividual(id) {
    const input = document.getElementById(id);
    if (!input) return true;
    const valor = input.value;

    let res = { valido: true };
    if (id === 'nombre_completo') res = Validaciones.validarNombre(valor);
    if (id === 'ci') res = Validaciones.validarCI(valor);
    if (id === 'edad') res = Validaciones.validarEdad(valor);
    if (id === 'telefono_tutor') res = Validaciones.validarTelefono(valor);
    if (id === 'genero') res = Validaciones.validarGenero(valor);

    if (!res.valido) {
      this.mostrarErrorCampo(id, res.mensaje);
      return false;
    } else {
      this.limpiarErrorCampo(id);
      return true;
    }
  }

  mostrarErrorCampo(id, mensaje) {
    const input = document.getElementById(id);
    const msgEl = document.getElementById(`error-${id}`);
    if (input) input.classList.add('invalido');
    if (msgEl) {
      msgEl.textContent = mensaje;
      msgEl.classList.add('visible');
    }
  }

  limpiarErrorCampo(id) {
    const input = document.getElementById(id);
    const msgEl = document.getElementById(`error-${id}`);
    if (input) input.classList.remove('invalido');
    if (msgEl) {
      msgEl.textContent = '';
      msgEl.classList.remove('visible');
    }
  }

  enlazarEventosFoto() {
    ['anverso', 'reverso'].forEach((lado) => {
      const inputArchivo = document.getElementById(`input-foto-${lado}`);
      const inputCamara = document.getElementById(`input-camara-${lado}`);
      const btnSeleccionar = document.querySelector(`[data-seleccionar-foto="${lado}"]`);
      const btnCapturar = document.querySelector(`[data-capturar-foto="${lado}"]`);
      const btnQuitar = document.querySelector(`[data-quitar-foto="${lado}"]`);

      if (btnSeleccionar && inputArchivo) btnSeleccionar.addEventListener('click', () => inputArchivo.click());
      if (btnCapturar && inputCamara) btnCapturar.addEventListener('click', () => inputCamara.click());

      [inputArchivo, inputCamara].forEach((input) => {
        if (!input) return;
        input.addEventListener('change', async () => {
          const file = input.files && input.files[0];
          if (!file) return;

          const val = await Validaciones.validarArchivoImagen(file);
          if (!val.valido) {
            alert(val.mensaje);
            input.value = '';
            return;
          }

          this.archivosFotoSeleccionados[lado] = file;
          this.mostrarPreviaFoto(lado, file);
        });
      });

      if (btnQuitar) {
        btnQuitar.addEventListener('click', () => {
          this.archivosFotoSeleccionados[lado] = null;
          if (inputArchivo) inputArchivo.value = '';
          if (inputCamara) inputCamara.value = '';
          this.restablecerPreviaFoto(lado);
        });
      }
    });
  }

  mostrarPreviaFoto(lado, fileOrBlob) {
    const imgPrevia = document.getElementById(`img-previa-${lado}`);
    const placeholder = document.getElementById(`foto-placeholder-${lado}`);
    const btnQuitar = document.querySelector(`[data-quitar-foto="${lado}"]`);

    if (imgPrevia && placeholder) {
      imgPrevia.src = URL.createObjectURL(fileOrBlob);
      imgPrevia.style.display = 'block';
      placeholder.style.display = 'none';
      if (btnQuitar) btnQuitar.style.display = 'inline-flex';
    }
  }

  restablecerPreviaFoto(lado) {
    const imgPrevia = document.getElementById(`img-previa-${lado}`);
    const placeholder = document.getElementById(`foto-placeholder-${lado}`);
    const btnQuitar = document.querySelector(`[data-quitar-foto="${lado}"]`);

    if (imgPrevia && placeholder) {
      imgPrevia.src = '';
      imgPrevia.style.display = 'none';
      placeholder.style.display = 'flex';
      if (btnQuitar) btnQuitar.style.display = 'none';
    }
  }

  /* ====================================================================
     ENVÍO Y GUARDADO SEGURO
     ==================================================================== */
  async manejarEnvio(e) {
    e.preventDefault();

    const alertaGlobal = document.getElementById('alerta-global');
    if (alertaGlobal) {
      alertaGlobal.style.display = 'none';
      alertaGlobal.className = 'alerta';
    }

    // 1. Validar todos los campos obligatorios
    const valNombre = Validaciones.validarNombre(document.getElementById('nombre_completo')?.value);
    const valCI = Validaciones.validarCI(document.getElementById('ci')?.value);
    const valEdad = Validaciones.validarEdad(document.getElementById('edad')?.value);
    const valTel = Validaciones.validarTelefono(document.getElementById('telefono_tutor')?.value);
    const valGen = Validaciones.validarGenero(document.getElementById('genero')?.value);

    let hayErrores = false;
    if (!valNombre.valido) { this.mostrarErrorCampo('nombre_completo', valNombre.mensaje); hayErrores = true; }
    if (!valCI.valido) { this.mostrarErrorCampo('ci', valCI.mensaje); hayErrores = true; }
    if (!valEdad.valido) { this.mostrarErrorCampo('edad', valEdad.mensaje); hayErrores = true; }
    if (!valTel.valido) { this.mostrarErrorCampo('telefono_tutor', valTel.mensaje); hayErrores = true; }
    if (!valGen.valido) { this.mostrarErrorCampo('genero', valGen.mensaje); hayErrores = true; }

    // Consentimiento legal del adulto responsable
    const checkConsentimiento = document.getElementById('check-consentimiento');
    if (checkConsentimiento && !checkConsentimiento.checked) {
      alert('Debe confirmar que cuenta con la autorización como padre o tutor responsable para registrar al menor.');
      return;
    }

    if (hayErrores) {
      window.scrollTo({ top: this.form.offsetTop - 80, behavior: 'smooth' });
      return;
    }

    if (!isConfigured()) {
      this.mostrarAlertaGlobal(
        'El sistema requiere configurar la conexión con Supabase. Haga clic en "Configurar Supabase" en la parte superior.',
        'advertencia'
      );
      return;
    }

    const btnSubmit = document.getElementById('btn-submit-registro');
    const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Registrar Niño';

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner"></span> Guardando registro...';
      }

      const rutasFotosSubidas = [];
      const rutasFoto = { anverso: null, reverso: null };

      try {
        for (const lado of ['anverso', 'reverso']) {
          if (!this.archivosFotoSeleccionados[lado]) continue;
          const resFoto = await GestorStorage.subirFotografia(this.archivosFotoSeleccionados[lado]);
          rutasFoto[lado] = resFoto.ruta;
          rutasFotosSubidas.push(resFoto.ruta);
        }
      } catch (errorFoto) {
        await Promise.all(rutasFotosSubidas.map((ruta) => GestorStorage.eliminarArchivo(ruta)));
        console.error('Fallo al subir las fotografías del documento:', errorFoto);
        throw new Error(`No se pudo subir la fotografía: ${errorFoto.message}. Puede intentar sin fotos o probar con otra imagen.`);
      }

      // 3. Insertar el registro en la tabla 'ninos'
      const client = getSupabase();
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
        .insert(payload)
        .select('id, created_at')
        .single();

      if (error) {
        // En caso de fallo en BD, limpiar foto huérfana
        await Promise.all(rutasFotosSubidas.map((ruta) => GestorStorage.eliminarArchivo(ruta)));

        // Detección de CI duplicado (código PostgreSQL 23505)
        if (error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('ninos_ci_unique')) {
          throw new Error('Ya existe un registro con este documento de identidad (CI). Si cree que se trata de un error o requiere consultar el registro existente, comuníquese con el personal de ONN.');
        }

        throw new Error(`Error al guardar en la base de datos: ${error.message}`);
      }

      // 4. Éxito: mostrar pantalla de confirmación sin exponer otros datos
      this.mostrarExito(valNombre.valor, valCI.valor, data?.id);
    } catch (err) {
      console.error('Error durante el registro:', err);
      this.mostrarAlertaGlobal(err.message || 'Ocurrió un error inesperado al procesar el registro.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
      }
    }
  }

  mostrarAlertaGlobal(mensaje, tipo = 'error') {
    const alerta = document.getElementById('alerta-global');
    if (!alerta) return;

    alerta.className = `alerta alerta-${tipo}`;
    alerta.innerHTML = `<span>${mensaje}</span>`;
    alerta.style.display = 'flex';
    alerta.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  mostrarExito(nombre, ci, id) {
    const seccionForm = document.getElementById('seccion-formulario');
    const seccionExito = document.getElementById('seccion-exito');
    const folioEl = document.getElementById('exito-folio');
    const nombreEl = document.getElementById('exito-nombre');

    if (folioEl && id) folioEl.textContent = id.slice(0, 8).toUpperCase();
    if (nombreEl) nombreEl.textContent = nombre;

    if (seccionForm && seccionExito) {
      seccionForm.style.display = 'none';
      seccionExito.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  reiniciarFormulario() {
    if (this.form) this.form.reset();
    this.archivosFotoSeleccionados = { anverso: null, reverso: null };
    ['anverso', 'reverso'].forEach((lado) => this.restablecerPreviaFoto(lado));

    const seccionForm = document.getElementById('seccion-formulario');
    const seccionExito = document.getElementById('seccion-exito');

    if (seccionForm && seccionExito) {
      seccionExito.style.display = 'none';
      seccionForm.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
