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
    this.urlsPrevia = { anverso: null, reverso: null };
    this.cameraStream = null;
    this.cameraSide = null;
    this.cameraRequestId = 0;
    this.cameraReturnFocus = null;
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
      const btnSeleccionar = document.querySelector(`[data-seleccionar-foto="${lado}"]`);
      const btnCapturar = document.querySelector(`[data-capturar-foto="${lado}"]`);
      const btnQuitar = document.querySelector(`[data-quitar-foto="${lado}"]`);

      if (btnSeleccionar && inputArchivo) btnSeleccionar.addEventListener('click', () => inputArchivo.click());
      if (btnCapturar) btnCapturar.addEventListener('click', () => this.abrirCamara(lado));

      if (inputArchivo) {
        inputArchivo.addEventListener('change', async () => {
          const file = inputArchivo.files && inputArchivo.files[0];
          if (!file) return;

          const val = await Validaciones.validarArchivoImagen(file);
          if (!val.valido) {
            alert(val.mensaje);
            inputArchivo.value = '';
            return;
          }

          this.archivosFotoSeleccionados[lado] = file;
          this.mostrarPreviaFoto(lado, file);
        });
      }

      if (btnQuitar) {
        btnQuitar.addEventListener('click', () => {
          this.archivosFotoSeleccionados[lado] = null;
          if (inputArchivo) inputArchivo.value = '';
          this.restablecerPreviaFoto(lado);
        });
      }
    });

    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('camara-video');
    const btnCerrar = document.getElementById('btn-cerrar-camara');
    const btnCancelar = document.getElementById('btn-cancelar-camara');
    const btnCapturar = document.getElementById('btn-tomar-foto');

    if (btnCerrar) btnCerrar.addEventListener('click', () => this.cerrarCamara());
    if (btnCancelar) btnCancelar.addEventListener('click', () => this.cerrarCamara());
    if (btnCapturar) btnCapturar.addEventListener('click', () => this.capturarFoto());
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) this.cerrarCamara();
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal?.classList.contains('abierto')) this.cerrarCamara();
    });
  }

  mostrarPreviaFoto(lado, fileOrBlob) {
    const imgPrevia = document.getElementById(`img-previa-${lado}`);
    const placeholder = document.getElementById(`foto-placeholder-${lado}`);
    const btnQuitar = document.querySelector(`[data-quitar-foto="${lado}"]`);

    if (imgPrevia && placeholder) {
      if (this.urlsPrevia[lado]) URL.revokeObjectURL(this.urlsPrevia[lado]);
      this.urlsPrevia[lado] = URL.createObjectURL(fileOrBlob);
      imgPrevia.src = this.urlsPrevia[lado];
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
      if (this.urlsPrevia[lado]) URL.revokeObjectURL(this.urlsPrevia[lado]);
      this.urlsPrevia[lado] = null;
      imgPrevia.src = '';
      imgPrevia.style.display = 'none';
      placeholder.style.display = 'flex';
      if (btnQuitar) btnQuitar.style.display = 'none';
    }
  }

  async abrirCamara(lado) {
    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('camara-video');
    const titulo = document.getElementById('camara-titulo');
    const estado = document.getElementById('camara-estado');
    const btnCapturar = document.getElementById('btn-tomar-foto');
    if (!modal || !video || !estado || !btnCapturar) return;

    this.cerrarCamara(false);
    const requestId = ++this.cameraRequestId;
    this.cameraSide = lado;
    this.cameraReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titulo.textContent = `Tomar fotografía del ${lado}`;
    estado.textContent = 'Iniciando cámara...';
    btnCapturar.disabled = true;
    modal.classList.add('abierto');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('camara-activa');
    document.getElementById('btn-cerrar-camara')?.focus();

    if (!navigator.mediaDevices?.getUserMedia) {
      estado.textContent = 'Este navegador no permite usar la cámara aquí. Verifique que el sitio esté abierto con HTTPS o elija una imagen guardada.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        }
      });

      if (requestId !== this.cameraRequestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.cameraStream = stream;
      video.srcObject = stream;
      await video.play();
      if (requestId !== this.cameraRequestId) return;

      estado.textContent = 'Acomode el documento dentro del encuadre y capture la foto.';
      btnCapturar.disabled = false;
    } catch (error) {
      if (requestId !== this.cameraRequestId) return;
      console.error('No se pudo iniciar la cámara del dispositivo:', error);
      this.cerrarCamara();
      const mensaje = error?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Habilítelo en el navegador e inténtelo de nuevo.'
        : `No se pudo iniciar la cámara. Compruebe los permisos y que otra aplicación no la esté usando. ${error?.message || ''}`.trim();
      this.mostrarAlertaGlobal(mensaje, 'error');
    }
  }

  async capturarFoto() {
    const video = document.getElementById('camara-video');
    const estado = document.getElementById('camara-estado');
    const btnCapturar = document.getElementById('btn-tomar-foto');
    if (!video || !estado || !btnCapturar || !this.cameraSide) return;

    const requestId = this.cameraRequestId;
    const anchoOriginal = video.videoWidth;
    const altoOriginal = video.videoHeight;
    if (!anchoOriginal || !altoOriginal) {
      estado.textContent = 'La cámara todavía se está preparando. Espere un momento e inténtelo otra vez.';
      return;
    }

    btnCapturar.disabled = true;
    estado.textContent = 'Procesando fotografía...';
    const escala = Math.min(1, 1600 / Math.max(anchoOriginal, altoOriginal));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(anchoOriginal * escala);
    canvas.height = Math.round(altoOriginal * escala);

    try {
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('No se pudo preparar la imagen en este dispositivo.');
      contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
      if (requestId !== this.cameraRequestId) return;
      if (!blob) throw new Error('No se pudo generar la fotografía. Inténtelo de nuevo.');

      const lado = this.cameraSide;
      const archivo = new File([blob], `onn-${lado}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const validacion = await Validaciones.validarArchivoImagen(archivo);
      if (requestId !== this.cameraRequestId) return;
      if (!validacion.valido) throw new Error(validacion.mensaje);

      this.archivosFotoSeleccionados[lado] = archivo;
      this.mostrarPreviaFoto(lado, archivo);
      this.cerrarCamara();
    } catch (error) {
      estado.textContent = error.message || 'No se pudo procesar la fotografía.';
      btnCapturar.disabled = false;
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  cerrarCamara(restaurarFoco = true) {
    this.cameraRequestId += 1;
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }

    const modal = document.getElementById('modal-camara');
    const video = document.getElementById('camara-video');
    const btnCapturar = document.getElementById('btn-tomar-foto');
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    if (btnCapturar) btnCapturar.disabled = true;
    if (modal) {
      modal.classList.remove('abierto');
      modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('camara-activa');
    this.cameraSide = null;

    const focusTarget = this.cameraReturnFocus;
    this.cameraReturnFocus = null;
    if (restaurarFoco && focusTarget?.isConnected) focusTarget.focus();
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
