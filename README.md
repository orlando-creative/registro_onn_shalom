# ONN — Operación Niño de la Navidad
## Sistema de Registro, Gestión y Fichas de Niños Participantes

Sistema web funcional, rápido, moderno y seguro para el registro de niños beneficiarios de la **Operación Niño de la Navidad (ONN)**, con base de datos en tiempo real en **Supabase PostgreSQL**, almacenamiento privado de fotografías de carnet en **Supabase Storage**, autenticación para personal autorizado (**Supabase Auth**) y protección estricta de datos personales mediante **Row Level Security (RLS)**.

---

## 1. Arquitectura del Proyecto

El sistema está construido con estándares web nativos (HTML5, CSS3 puro y JavaScript ES6+ modular), sin frameworks pesados ni dependencias complejas de servidor propio, permitiendo su despliegue en cualquier servicio de hosting estático o CDN.

```text
onn-registro/
├── index.html                   # Formulario público de registro de niños con cámara en vivo
├── login.html                   # Acceso seguro para personal autorizado (Supabase Auth)
├── dashboard.html               # Panel de control administrativo, estadísticas reales y buscador
├── detalle.html                 # Ficha individual del niño, edición, eliminación e impresión
├── css/
│   ├── styles.css               # Estilos principales, variables de color y componentes UI
│   ├── responsive.css           # Estrategia mobile-first, tarjetas táctiles y cuadrículas
│   └── print.css                # Ficha oficial de registro optimizada para impresión y PDF
├── js/
│   ├── config.example.js        # Plantilla de configuración de Supabase
│   ├── supabase-client.js       # Inicializador y gestor de conexión con Supabase v2
│   ├── auth.js                  # Manejador de sesiones y autenticación administrativa
│   ├── validaciones.js          # Validaciones de negocio, sanitización y firmas mágicas
│   ├── storage.js               # Subida a bucket privado, URLs firmadas y limpieza de huérfanos
│   ├── registro.js              # Controlador del formulario de registro y cámara web/móvil
│   ├── buscador.js              # Buscador inteligente con debounce, filtros y paginación
│   ├── detalle.js               # Visualización segura, edición en caliente y confirmación de borrado
│   ├── administracion.js        # Estadísticas reales calculadas en la base de datos
│   ├── exportacion.js           # Exportación configurable por tabla y columnas a CSV e impresión PDF
│   └── impresion.js             # Módulo de impresión sincronizada de fichas
├── assets/
│   └── logo-onn.svg             # Logotipo vectorial oficial ONN
├── supabase/
│   ├── schema.sql               # Esquema PostgreSQL: tabla 'ninos', restricciones, índices y triggers
│   ├── policies.sql             # Políticas RLS (acceso anónimo ciego + admin autenticado)
│   ├── storage.sql              # Configuración de bucket 'onn-fotos' privado y políticas
│   └── functions/
│       └── registrar-nino/      # Supabase Edge Function para registro en servidor
│           └── index.ts
└── README.md
```

---

## 2. Paleta Cromática y Diseño Visual

- **Verde Principal**: `#218838` (Acciones primarias, botones, identidad)
- **Verde Oscuro**: `#166534` (Títulos, contraste alto)
- **Verde Suave**: `#E8F5E9` (Insignias, fondos de aviso y confirmación)
- **Blanco**: `#FFFFFF` (Superficie de tarjetas y formularios)
- **Fondo General**: `#F7F9F7` (Lienzo suave y descansado)
- **Texto Principal**: `#1F2937` (Máxima legibilidad)
- **Texto Secundario**: `#6B7280` (Metadatos y descripciones)
- **Bordes**: `#E5E7EB` (Líneas sutiles de separación)
- **Rojo de Alerta**: `#DC2626` (Acciones destructivas y errores)

---

## 3. Guía de Despliegue en Supabase (Paso a Paso)

### Paso 1: Crear el Proyecto en Supabase
1. Ingrese a [https://supabase.com](https://supabase.com) y cree un nuevo proyecto.
2. Anote la **Project URL** y la **anon public API key** que aparecen en `Project Settings > API`.

### Paso 2: Ejecutar los Scripts SQL en Supabase
1. En el panel lateral de Supabase, ingrese a **SQL Editor**.
2. Abra y pegue el contenido de `supabase/schema.sql` y haga clic en **Run**.
   - Crea la tabla `public.ninos`.
   - Crea la restricción `UNIQUE` en el CI normalizado (`ninos_ci_unique_idx`).
   - Crea las restricciones `CHECK` para edad (1 a 18), nombres y teléfonos.
   - Crea los triggers automáticos para normalización de texto y actualización de `updated_at`.
3. Abra y pegue el contenido de `supabase/policies.sql` y haga clic en **Run**.
   - Habilita **Row Level Security (RLS)** en la tabla `ninos`.
   - Permite la inserción pública ciega (visitantes no autenticados solo pueden hacer `INSERT`).
   - Concede `SELECT`, `UPDATE` y `DELETE` exclusivamente al rol `authenticated`.
4. Abra y pegue el contenido de `supabase/storage.sql` y haga clic en **Run**.
   - Crea el bucket privado `onn-fotos` (con límite de 5 MB y tipos JPG/PNG/WebP).
   - Configura las políticas para permitir subida anónima de carnet y lectura mediante URLs firmadas solo para personal autenticado.

### Paso 3: Configurar la URL y Anon Key Directamente en el Código
Abre el archivo `js/config.js` y pega directamente tus credenciales de Supabase:

```javascript
export const SUPABASE_CONFIG = {
  // Pega aquí la URL de tu proyecto Supabase:
  URL: "https://TU_PROYECTO.supabase.co",

  // Pega aquí la clave pública anónima (anon public key):
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsIn...",

  STORAGE_BUCKET: "onn-fotos"
};
```

¡Listo! No hace falta iniciar sesión ni registrar usuarios en Auth. El sistema se conectará directamente a tu base de datos y cargará todo con máxima velocidad.

### Ejecución y despliegue
El proyecto se despliega como sitio estático y no requiere Vite. Para generar los archivos de publicación, ejecuta `npm install` y `npm run build`; el resultado queda en `dist/`. Vercel está configurado para instalar con npm, ejecutar ese build estático y publicar `dist/`. Si sirves los HTML fuente directamente desde otro hosting estático, el navegador resolverá Supabase mediante `esm.sh`, por lo que necesitará acceso a internet.

---

## 4. Medidas de Seguridad y Protección de Datos de Menores

1. **Aislamiento Público Ciego**: Un usuario anónimo puede completar el formulario de registro, pero la base de datos tiene **prohibido el comando SELECT** para usuarios sin sesión. Ningún visitante puede consultar la lista de niños registrados, ni verificar nombres ajenos, ni descargar fotos privadas.
2. **Fotografías con URLs Firmadas**: Las fotografías se guardan en un bucket estrictamente privado (`public = false`). Para visualizarlas en el panel administrativo, el sistema genera URLs firmadas temporales con caducidad (TTL de 1 hora).
3. **Limpieza Automática de Archivos Huérfanos**: Si por algún error de conexión o duplicidad de documento la base de datos rechaza la inserción, el sistema elimina inmediatamente la imagen recién subida a Storage, impidiendo la acumulación de archivos huérfanos.
4. **Prevención de Inyección en CSV**: Al exportar los registros a Excel, los valores que comienzan con `=`, `+`, `-` o `@` se sanitizan anteponiendo un apóstrofe para neutralizar la ejecución de macros o fórmulas maliciosas en hojas de cálculo.
5. **Normalización y Unicidad de CI**: El CI se almacena como texto en mayúsculas y sin espacios. La base de datos impide a nivel de motor de PostgreSQL que se registre el mismo documento dos veces.

---

## 5. Criterios de Aceptación Verificados

- [x] Registro público sin necesidad de crear cuenta previa.
- [x] Datos almacenados en Supabase PostgreSQL.
- [x] CI único validado en servidor y cliente.
- [x] Fotografía opcional con opción de captura con cámara en vivo o archivo.
- [x] Fotografías almacenadas en Supabase Storage privado.
- [x] Autenticación de personal mediante Supabase Auth.
- [x] Buscador con debounce por nombre o CI y paginación.
- [x] Consulta de ficha completa con fotografía segura.
- [x] Edición y eliminación con confirmación explícita.
- [x] Exportación configurable por tabla y columnas a CSV compatible con Excel (UTF-8 con BOM) y PDF mediante impresión del navegador.
- [x] Ficha individual imprimible y descargable en PDF con `@media print`.
- [x] Interfaz 100% responsive optimizada para celulares y computadoras.
# registro_onn_shalom
