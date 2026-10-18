/**
 * ONN — Operación Niño de la Navidad
 * Validaciones de Negocio y Sanitización de Datos
 * Archivo: js/validaciones.js
 */

export const Validaciones = {
  /**
   * Normaliza un nombre eliminando espacios repetidos y extremos
   */
  normalizarNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return '';
    return nombre.trim().replace(/\s+/g, ' ');
  },

  /**
   * Valida nombre completo en español (admite tildes, diéresis, ñ, apóstrofes)
   */
  validarNombre(nombre) {
    const limpio = this.normalizarNombre(nombre);
    if (!limpio) {
      return { valido: false, mensaje: 'El nombre completo es obligatorio.' };
    }
    if (limpio.length < 2) {
      return { valido: false, mensaje: 'El nombre debe tener al menos 2 caracteres.' };
    }
    if (limpio.length > 160) {
      return { valido: false, mensaje: 'El nombre no debe exceder los 160 caracteres.' };
    }
    // Acepta letras del alfabeto español, espacios, guiones y apóstrofes
    const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!regexNombre.test(limpio)) {
      return { valido: false, mensaje: 'El nombre contiene caracteres no permitidos.' };
    }
    return { valido: true, valor: limpio };
  },

  /**
   * Normaliza el CI como texto estricto sin espacios y en mayúsculas
   */
  normalizarCI(ci) {
    if (!ci || typeof ci !== 'string') return '';
    return ci.trim().replace(/\s+/g, '').toUpperCase();
  },

  /**
   * Valida el formato del CI (admite números, guiones y letras de complemento como 1234567-1A)
   */
  validarCI(ci) {
    const limpio = this.normalizarCI(ci);
    if (!limpio) {
      return { valido: false, mensaje: 'El documento de identidad (CI) es obligatorio.' };
    }
    if (limpio.length < 3) {
      return { valido: false, mensaje: 'El CI debe tener al menos 3 caracteres.' };
    }
    if (limpio.length > 30) {
      return { valido: false, mensaje: 'El CI no debe exceder los 30 caracteres.' };
    }
    // Permite caracteres alfanuméricos y guiones
    const regexCI = /^[A-Z0-9-]+$/;
    if (!regexCI.test(limpio)) {
      return { valido: false, mensaje: 'El CI solo debe contener números, letras y guiones.' };
    }
    return { valido: true, valor: limpio };
  },

  /**
   * Valida que la edad sea un número entero dentro del rango del proyecto (1 a 18 años)
   */
  validarEdad(edad, min = 1, max = 18) {
    if (edad === '' || edad === null || edad === undefined) {
      return { valido: false, mensaje: 'La edad es obligatoria.' };
    }
    const num = Number(edad);
    if (isNaN(num) || !Number.isInteger(num)) {
      return { valido: false, mensaje: 'La edad debe ser un número entero sin decimales.' };
    }
    if (num < min || num > max) {
      return { valido: false, mensaje: `La edad debe estar comprendida entre ${min} y ${max} años.` };
    }
    return { valido: true, valor: num };
  },

  /**
   * Normaliza teléfono del tutor
   */
  normalizarTelefono(tel) {
    if (!tel || typeof tel !== 'string') return '';
    return tel.trim().replace(/\s+/g, ' ');
  },

  /**
   * Valida teléfono del tutor (admite formatos bolivianos como +591, 70000000, 2223344, etc.)
   */
  validarTelefono(tel) {
    const limpio = this.normalizarTelefono(tel);
    if (!limpio) {
      return { valido: false, mensaje: 'El teléfono del tutor es obligatorio.' };
    }
    if (limpio.length < 6) {
      return { valido: false, mensaje: 'El teléfono debe tener al menos 6 dígitos.' };
    }
    if (limpio.length > 30) {
      return { valido: false, mensaje: 'El teléfono no debe exceder los 30 caracteres.' };
    }
    // Acepta +, números, espacios y guiones
    const regexTel = /^[+]?[\d\s-]{6,30}$/;
    if (!regexTel.test(limpio)) {
      return { valido: false, mensaje: 'Formato de teléfono no válido. Use números y opcionalmente prefijo +.' };
    }
    return { valido: true, valor: limpio };
  },

  /**
   * Valida la selección de género
   */
  validarGenero(genero) {
    if (!genero || (genero !== 'Masculino' && genero !== 'Femenino')) {
      return { valido: false, mensaje: 'Debe seleccionar un género válido (Masculino o Femenino).' };
    }
    return { valido: true, valor: genero };
  },

  /**
   * Valida archivo de imagen de carnet (tamaño, tipo MIME y comprobación de cabecera)
   */
  async validarArchivoImagen(file, maxBytes = 5 * 1024 * 1024) {
    if (!file) {
      return { valido: true, archivo: null }; // Opcional
    }

    if (file.size > maxBytes) {
      const mbMax = Math.round(maxBytes / (1024 * 1024));
      return {
        valido: false,
        mensaje: `La fotografía supera el límite máximo permitido de ${mbMax} MB. Seleccione una imagen más liviana.`
      };
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      return {
        valido: false,
        mensaje: 'Formato de imagen no permitido. Solo se aceptan archivos JPG, PNG y WebP.'
      };
    }

    // Comprobación de bytes mágicos
    try {
      const cabecera = await this.leerCabeceraBytes(file, 4);
      const esValido = this.verificarCabeceraMagica(cabecera);
      if (!esValido) {
        return {
          valido: false,
          mensaje: 'El archivo seleccionado no es una imagen válida o está dañado.'
        };
      }
    } catch {
      // Si el navegador no permite leer la cabecera, nos basamos en el tipo de archivo validado
    }

    return { valido: true, archivo: file };
  },

  /**
   * Lee los primeros N bytes del archivo para inspección de firma
   */
  leerCabeceraBytes(file, numBytes = 4) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!reader.result) {
          resolve([]);
          return;
        }
        const arr = new Uint8Array(reader.result).subarray(0, numBytes);
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16).padStart(2, '0');
        }
        resolve(header.toLowerCase());
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file.slice(0, numBytes));
    });
  },

  /**
   * Verifica firmas mágicas de JPEG, PNG y WebP
   */
  verificarCabeceraMagica(headerHex) {
    if (!headerHex) return true;
    // JPEG: ffd8ff
    if (headerHex.startsWith('ffd8ff')) return true;
    // PNG: 89504e47
    if (headerHex.startsWith('89504e47')) return true;
    // RIFF (WebP): 52494646
    if (headerHex.startsWith('52494646')) return true;
    return false;
  }
};
