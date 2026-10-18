/**
 * ONN — Operación Niño de la Navidad
 * Impresión de Fichas Individuales Oficiales
 * Archivo: js/impresion.js
 */

export const ModuloImpresion = {
  /**
   * Ejecuta la impresión asegurándose de que la fotografía haya finalizado su carga
   */
  imprimirFichaActual() {
    const imgPrint = document.getElementById('print-foto-img');

    if (imgPrint && imgPrint.src && imgPrint.style.display !== 'none' && !imgPrint.complete) {
      // Esperar a que la imagen cargue completamente antes de disparar el diálogo
      imgPrint.onload = () => {
        window.print();
      };
      imgPrint.onerror = () => {
        window.print();
      };
    } else {
      window.print();
    }
  }
};
