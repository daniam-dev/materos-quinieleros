# Pruebas del OCR y del administrador local

Informe del 30/10/2026. La incidencia comunicada mostraba la previsualización,
«Preparando la lectura de la foto…» y un error genérico, sin cruces reconocidos.

## Causa y corrección

Una comprobación de solo lectura desde Chromium sobre el sitio publicado confirmó
que el módulo optimizado de Tesseract exponía únicamente `default`. La importación
nombrada de `createWorker` resultaba `undefined`, aunque funcionaba con el servidor
de desarrollo. El fallo ocurría antes de iniciar el reconocimiento; no era un
rechazo de SELAE ni dependía de OddsPapi.

La corrección admite la exportación por defecto y el espacio de nombres del módulo.
También se comprobó en el sitio publicado que `default.createWorker` cargaba los
recursos OCR del propio sitio y reconocía una línea de prueba. Esa comprobación no
inició sesión, no guardó jornadas y no acreditó el despliegue de la corrección.

Los errores distinguen preparación de imagen, carga del lector y reconocimiento.
El progreso anterior desaparece tras un error, se conserva el borrador y se puede
reintentar o pasar a texto o entrada manual. La inicialización tiene un límite de
treinta segundos y recibe los errores del modelo mediante `errorHandler`.

Al salir se termina el worker disponible. Si la inicialización finaliza después de
salir o de agotar el plazo, también se termina. Tesseract no entrega la referencia
del worker antes de completar su inicialización: si esta no termina nunca, se
recupera la interfaz, pero su API no permite terminar expresamente ese worker.

## Entorno aislado

Las pruebas de la compilación optimizada utilizan el administrador `codex-local`,
con la contraseña pública de prueba `localhost-test-only-2026`. El lanzador genera
su hash scrypt y un secreto de sesión nuevos en cada arranque, conserva las cookies
firmadas y los permisos habituales y solo escucha en loopback. Los datos viven en
una carpeta temporal separada, eliminada al cerrar el proceso. No lee ni modifica
el `.env` del usuario ni su almacenamiento local habitual.

La cuenta de prueba se rechaza fuera de los orígenes HTTP locales admitidos y no
se habilita en Netlify mediante variables de entorno. Los comandos y los detalles
de uso están en [la guía de administración](administracion.md#administrador-de-pruebas-en-localhost).

## Resultados

| Verificación                                                             | Resultado                            |
| ------------------------------------------------------------------------ | ------------------------------------ |
| Compilación optimizada: `npm run test:build`                             | 6 pruebas superadas                  |
| Axe en borrador reconocido y recuperación tras fallo, escritorio y móvil | 4 estados, 0 infracciones detectadas |
| Comprobación final de 40 pruebas Angular                                 | 40 superadas                         |
| Comprobación final de 78 pruebas de servidor                             | 78 superadas                         |
| Regresión de desarrollo, 9 pruebas E2E                                   | 9 superadas, 33,2 s                  |

La batería optimizada cubre acceso con contraseña incorrecta y correcta en
`localhost` y `127.0.0.1`, persistencia de sesión y cierre; reconocimiento real con
Tesseract; revisión, guardado y recarga de jornada y apuesta; privacidad de los
pronósticos anteriores al cierre; archivos no admitidos o corruptos; texto parcial;
fallo de carga del worker y reintento; salida durante la inicialización; y respuesta
503 al cargar el modelo con recuperación manual. Los fallos de red son simulados
mediante interceptación local de Playwright.

La imagen utilizada es **sintética**, con primera fila blanca sobre azul y filas
alternas rosas, inspirada en la captura proporcionada. No es el archivo original
del usuario. El OCR reconoce **13 de 15 encuentros** y sus **26 nombres exactos**;
las filas 1 y 9 quedan vacías. La prueba revisa y completa esas dos filas antes de
confirmar los quince encuentros, guardar la jornada y cargar la apuesta. No se
afirma reconocimiento perfecto ni cobertura de todas las fotografías.

Las capturas y las comprobaciones de anchura cubren escritorio de 1440 píxeles y
móvil de 390 píxeles. Las comprobaciones de Axe son automatizadas y no constituyen
una certificación completa de accesibilidad.

Comprobación adicional del orden: la propuesta OCR se compara posición por
posición con los quince cruces de referencia, antes de cualquier corrección
manual. Cada cruce reconocido debe coincidir exactamente con su número y categoría;
los huecos se conservan. Después de guardar y recargar se comprueban tanto los
catorce encuentros persistidos como sus etiquetas en Administración, y el Pleno
Athletic Club (M) - Real Sociedad (M) por separado. Dos regresiones unitarias
cubren líneas OCR desordenadas y la ausencia de las posiciones 1 y 9.
Esta ampliación supera `npm test` (42 pruebas), tipos, comprobación de texto y
el recorrido OCR optimizado con las nuevas aserciones (1 prueba, 7,4 s).

`npm run check` supera formato, texto, lint, tipos, las pruebas y el build
optimizado (499,50 kB iniciales). Las tres Functions se empaquetan con esbuild.
La búsqueda de usuario y contraseña de prueba en navegador compilado y Functions
no encuentra coincidencias. No se han probado Firefox ni Safari: la batería usa
Chromium. La revisión independiente Impeccable da `ship` para los cuatro estados
capturados. Su detector no encuentra incidencias, pero funciona en modo degradado
sin los parsers opcionales; no acredita contraste computado.

## Límites y trabajo pendiente

No se ha configurado ni llamado a la API real de OddsPapi y no se ha consumido su
cuota. La batería no demuestra su cobertura, su formato real de resultados ni la
finalización automática de encuentros reales. El plan de correspondencias y uso
eficiente de OddsPapi permanece como TODO sin implementar; este cambio corrige el
OCR y habilita un entorno local de pruebas.

## Publicación y comprobaciones remotas

### Incidencia posterior: guardar parecía no hacer nada

Reproducido con el administrador local y el build optimizado anterior: quince
cruces completos, revisión marcada y metadatos vacíos. Al pulsar Guardar, no se
envía petición y no aparece error de JavaScript. El aviso del cierre sí existe,
pero queda fuera del viewport, a más de 2.000 píxeles sobre el botón. Con número,
fecha y cierre completos, el mismo boleto se guarda correctamente.

La validación local ahora señala número, fecha, cierre o el primer equipo/categoría
pendiente. El aviso aparece junto al botón, recibe el foco y contiene un enlace
al campo. No se descartan los cruces ni se cambia su orden. Los rechazos del
servidor mantienen el resumen enfocado de Administración.

La nueva variante de imagen de prueba reproduce los quince cruces de la segunda
captura, con la primera fila sin selección azul. Sigue siendo una reconstrucción:
el adjunto de la conversación no está disponible como archivo para el ejecutor.

Validación de esta corrección: `npm run check` aprobado (42 Angular, 78 servidor,
formato, texto, lint, tipos y build), 9 E2E de desarrollo en 40,5 s y 8 E2E contra
el build optimizado en 26,6 s. Las dos regresiones nuevas cubren los avisos locales
sin peticiones, enlace al campo, guardado y recarga ordenados, hora ambigua de Madrid
y rechazo 400 por cruce duplicado con recuperación. Cuatro auditorías Axe nuevas:
0 infracciones y sin desbordamiento a 1440/390 px. Las capturas posteriores seleccionan
explícitamente la nueva jornada 222 tras recargar; no confunden el boleto anterior
de la batería con la jornada que acaba de guardarse.

Publicado como `2fc6dc4bc174d654f5d8bce9b85ff2ba11e73e76`
(`fix(admin): surface actionable coupon save validation beside submit`). El
30/10/2026 a las 18:52:50 UTC, Netlify referencia `main-FIRRJ6MB.js`; ese archivo
y `chunk-GLKV2PB5.js` coinciden por SHA-256 con el artefacto probado. GitHub no
devuelve estados de CI para este commit. No se han guardado jornadas reales ni
usado credenciales de Daniel en producción para validar esta corrección.

### Corrección anterior del arranque del OCR

Publicado en `origin/main` como
`c794c97b5d91264fd1f46e72ece4284375d44018`
(`fix(ocr): handle optimized exports and add isolated local admin tests`).
El 30/10/2026 a las 18:28:49 UTC, la página pública ya referencia el nuevo main;
su JavaScript, el chunk administrativo y la hoja de estilos coinciden por SHA-256
con el build local probado. Worker, núcleo WASM y modelo español responden 200
con el tipo de contenido esperado. La cuenta `codex-local` se rechaza en producción
con 401 y sin cookie de sesión; la lectura pública responde 200.

No se ha iniciado sesión como Daniel ni se han guardado jornadas en producción
en estas comprobaciones. La importación completa se valida en el build optimizado
local con almacenamiento temporal, y no se afirma haber repetido ese recorrido
autenticado en Netlify. GitHub no devuelve estados de CI para este commit;
los resultados de pruebas de este informe proceden de las ejecuciones locales.
