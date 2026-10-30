# Verificación

## Foto revisada y resultados deportivos — 30/10/2026

Implementado el [flujo actual](importacion-fotografia.md): OCR local con revisión de
quince cruces, número/fecha/cierre explícitos, solo boletos seleccionados y signos
definitivos obtenidos del resultado deportivo de OddsPapi con finalización explícita.
Las correcciones administrativas se conservan separadas y prevalecen sobre el worker.

`npm run check` aprobado: formato, texto, lint, ambos TypeScript, **40 pruebas Angular,
75 de servidor y build de 499,34 kB**. Nueve E2E aprobados en 32,9 s en pasada conjunta
final. Bundling de las tres Functions aprobado. Auditoría con npm 11.13.0: cero
vulnerabilidades. La primera instalación utilizó npm 11.5.2 y avisó del engine;
el lock se regularizó con npm 11.13.0 sin modificar el npm global.

La E2E nueva usa Tesseract real y assets locales: imagen PNG sintética con los
quince cruces transcritos de la captura del usuario, no el archivo original. Reconoce
15/15, treinta nombres exactos y categorías M/F. Comprueba confirmación obligatoria,
invalidación al editar, creación y persistencia, guardado de catorce signos y Pleno,
privacidad antes del cierre y que el filtro heredado no excluye el boleto seleccionado.
Las pruebas de servidor cubren correspondencia única por nombres/categoría/ventana,
finalización explícita, no suma de prórroga/penaltis, signos y Pleno, reservas de cuota,
revisión de final pendiente y conservación de apuestas/correcciones.

Cuatro capturas en `.impeccable/review/photo-{review,created}-{desktop,mobile}.png`:
axe sin violaciones en los estados probados, sin desbordamientos ni errores JS.
El detector mecánico no informa hallazgos, en modo degradado por parsers opcionales
ausentes. Revisión independiente de la extensión: matriz visual conforme y único
hallazgo documental de DESIGN.md corregido; verdict `ship` para ese ajuste. No es
certificación WCAG ni revisión de todas las rutas del producto.

Hubo fallos intermedios de E2E: estado accesible duplicado (corregido con `aria-live`),
espera insuficiente tras recargar la dependencia administrativa y error de la propia
prueba al cerrar un details ya abierto. La pasada conjunta final cubre sus correcciones.
El OCR está cargado de forma diferida y servidor no recibe ni guarda la imagen.

Sin consultas autenticadas OddsPapi ni consumo de cuota. La clave, formato/cobertura
reales y persistencia operativa de resultados deportivos siguen pendientes. Pruebas
con proveedores simulados y almacenamiento temporal; personas, apuestas y secretos
reales intactos. El seed continúa con nueve participantes y sin jornadas.

La batería y los hallazgos del despliegue real del 30/10/2026 están en
[Pruebas de producción](pruebas-produccion.md). Los apartados siguientes conservan
la evidencia local de implementación.

## Importación y resultados automáticos — 27/10/2026

Implementación local terminada, sin publicación ni despliegue. `npm run check` aprobado: formato, UTF-8/LF, ESLint, ambos proyectos TypeScript, 33 pruebas Angular, 40 pruebas de servidor y build de producción de 497,31 kB, dentro del presupuesto. Bundling local de las tres Functions con esbuild aprobado. Dependencias sin cambios; auditoría no repetida.

Las pruebas con proveedores simulados cubren importación idempotente, conservación de apuestas e identificadores, horarios y zona Europe/Madrid, jornadas entre semana, privacidad, revisiones independientes, cero/uno/dos dobles y rechazo del tercero/triples, correcciones oficiales y marcadores provisionales sin impacto en clasificación. Incluyen reservas duraderas antes de llamar al proveedor, concurrencia y trabajador caducado, límites reales inferiores, agotamiento, errores facturables, metadatos y ausencia de consultas deportivas por visitantes.

Ocho escenarios Playwright aprobados contra API local y persistencia temporal. El flujo administrativo incluye importar con proveedor simulado, guardar/corregir apuestas, contador y bloqueo del tercer doble, pegado, bajas/reincorporaciones, privacidad y refresco sin perder filtros. Se corrigió el bloqueo accidental de los sencillos al compartir grupo de radio con un doble deshabilitado. Capturas y revisión visual de Administración y comparativa a 1440 y 390 px en `.impeccable/review/admin-{imported,predictions,comparison}-{desktop,mobile}.png`: sin defectos materiales en esos estados. La captura móvil de comparativa corresponde al modo individual; no certifica todas las combinaciones de columnas ni nombres reales largos. Axe y las capturas no certifican conformidad WCAG.

Comprobación pública real mínima de SELAE: jornada 17 (`1326906062`), 15 encuentros y cierre/primer inicio `2026-10-27T19:00:00.000Z`; jornada 16 (`1326606061`), 15 horarios recuperados, 14 signos y Pleno confirmados. La petición inicial con PowerShell fue rechazada; fetch de Node permitió verificar el formato vigente. Se adaptaron listas y detalle sin temporada/jornada/posición explícitas, fechas escapadas y recuperación de horarios desde calendario. Las respuestas públicas reducidas quedan en `server/testing/selae-v3-sample.json` para regresiones sin red. Esto no garantiza disponibilidad continua ni acceso desde Netlify.

No se ha efectuado ninguna consulta autenticada a OddsPapi ni consumido su cuota. Su integración, cuenta, presupuesto y marcadores están probados con simulaciones. Queda verificar la suscripción real, su renovación, la cobertura y correspondencia de encuentros, y una ejecución controlada en Netlify tras configurar los secretos. Configuración y límites: [sincronización](sincronizacion.md). Se conservan los nueve participantes originales y sus datos locales.

## Corrección del acceso local — 26/10/2026

Reproducido el fallo informado por el usuario: con credenciales deliberadamente incorrectas, `127.0.0.1:4200` devolvía 401 y `localhost:4200` devolvía 403 de origen. El adaptador local fijaba siempre el primer host; el cliente convertía cualquier 403 en «La sesión ha caducado».

El adaptador preserva ahora el host local permitido a través del proxy; siguen rechazándose otros orígenes, hosts arbitrarios y URLs externas. La API identifica la falta de sesión con `SESSION_REQUIRED`, y solo ese código activa la recuperación de sesión en el cliente. Los errores de credenciales y de origen conservan su mensaje real.

Validación: 32 unitarias Angular y 14 pruebas de servidor aprobadas; ocho E2E aprobados, incluyendo login correcto/incorrecto, recarga, permiso privado y logout desde ambos hosts con credenciales temporales. Formato, UTF-8/LF, lint, ambos TypeScript y build de 495,40 kB aprobados. Dependencias sin cambios; auditoría no repetida. No se ha leído ni cambiado la contraseña del usuario ni sus datos. Se reinició la app local que ya estaba activa y se dejó disponible para reintentar el acceso.

## Validación inicial de administración — 26/10/2026

Instalación limpia reproducible con Node 22.14.0 y npm 11.13.0, sin modificar npm global. `npm run check` aprobado: Prettier, UTF-8/LF, ESLint, ambos proyectos TypeScript, 29 unitarias de Angular, 11 pruebas de servidor y build. Bundle inicial final: 495,38 kB, dentro del presupuesto de 500 kB.

Las unitarias de Angular conservan la cobertura de cierre inclusivo, signos oficiales futuros, marcadores provisionales, liquidaciones administrativas, aciertos y ausencias, porcentajes, desempates, inactivos, victorias, Pleno, selección de jornada y componentes. Los dos tsconfig conservan `rootDir: "./src"`; el arreglo TS5011 del editor se verificó previamente en e1aadf5 con TypeScript 5.9.3 y 6.0.3. No se cambió la versión TypeScript de Angular.

Las pruebas de servidor cubren lectura pública, rechazo de accesos y escrituras sin sesión, credenciales incorrectas, cookies manipuladas/caducadas y rotación de secretos, origen y JSON acotado, configuración ausente, altas/bajas/reincorporaciones, protección del admin y roles, jornadas inválidas, apuestas completas/corrección, privacidad antes del cierre, resultados futuros, histórico y conflictos concurrentes. El adaptador usa el emulador oficial de Blobs para persistencia y condiciones de escritura; su GET no devuelve ETag en SDK 11.1.6 y se comprueba el fallo cerrado. Esto no verifica Netlify remoto.

La prueba de namespace comprueba persistencia de producción entre deploys, aislamiento de previews por `context.deploy` del runtime y fallo cerrado sin contexto. La autenticación no requiere disponibilidad del almacenamiento.

`npm run test:e2e`: siete escenarios aprobados en Chromium. Los seis públicos cubren temporada vacía, participantes reales, iniciales, clasificación, navegación, recarga, teclado, tokens y axe a 1440/768/390 px. El séptimo recorre la administración contra la API local y almacenamiento temporal, sin interceptar peticiones: login erróneo/correcto, recarga de sesión, alta, cancelar baja, creación de jornada, carga de signos y Pleno, corrección, persistencia, baja conservando histórico, reincorporación, segundo navegador sin sesión y logout.

Tras la revisión visual se corrigieron el feedback fuera del viewport y los mensajes ajenos al cambiar de sección. La E2E administrativa se volvió a aprobar sobre el código final, comprobando foco y visibilidad de confirmaciones y de un error real 400 al guardar un formulario largo; conserva los valores introducidos. También se ajustó el rol accesible del resumen tras un hallazgo de axe. Revisión independiente: ambos hallazgos puntuados resolved, disposición ship en ese alcance.

Diez capturas reales en `.impeccable/review/admin-{login,empty,people,create,predictions}-{desktop,mobile}.png`, con axe sin violaciones en los estados cubiertos. Detector mecánico ejecutado una vez sin hallazgos, en modo degradado por parsers opcionales ausentes: no evalúa contraste calculado ni certifica accesibilidad.

Bundling de las dos entradas Functions con esbuild aprobado localmente. El build público no contiene el antiguo `data/season.json`, secretos administrativos ni contraseñas de pruebas. `npm audit --audit-level=low`: cero vulnerabilidades.

## Aislamiento y límites

Las pruebas usan credenciales efímeras y directorios temporales propios; no cambian los datos ni la contraseña del usuario. El seed conserva los nueve participantes y ninguna jornada; las entradas pobladas solo existen en pruebas. Los puertos locales se comprueban cerrados al finalizar.

El informe HTML es opcional; las trazas de fallos quedan en `test-results`. Dependencias, build, informes, capturas, datos locales y secretos están excluidos de Git. El bloqueo histórico al limpiar artefactos de turnos anteriores permanece documentado en Cortex; esta tarea no ha intentado esa limpieza.

No se han configurado secretos reales ni desplegado Functions/Blobs durante estas verificaciones. Pendientes: configuración inicial, persistencia y límite de intentos en Netlify, integración autenticada de OddsPapi, lector de pantalla y Safari/Firefox. Las fuentes deportivas se incorporaron el 27/10; no hay editor manual de resultados oficiales. Axe no certifica conformidad WCAG.
