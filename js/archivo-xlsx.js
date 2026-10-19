export async function descargarXlsx(nombreArchivo, nombreHoja, encabezados, filas) {
  const ExcelJS = globalThis.ExcelJS;
  if (!ExcelJS) {
    throw new Error('No se pudo cargar la librería para generar archivos Excel.');
  }

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Operación Niño de la Navidad';
  libro.created = new Date();

  const hoja = libro.addWorksheet(nombreHoja.slice(0, 31));
  hoja.addRow(encabezados);
  filas.forEach((fila) => {
    hoja.addRow(fila.map((valor) => (valor === null || valor === undefined ? '' : String(valor))));
  });
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  hoja.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: encabezados.length },
  };
  hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' },
  };
  hoja.columns = encabezados.map((encabezado, indice) => ({
    key: `columna${indice + 1}`,
    width: Math.min(50, Math.max(
      String(encabezado).length + 2,
      ...filas.slice(0, 100).map((fila) => String(fila[indice] ?? '').length + 2),
    )),
  }));

  const contenido = await libro.xlsx.writeBuffer();
  const blob = new Blob([contenido], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
