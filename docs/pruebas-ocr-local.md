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

La validación local del artefacto optimizado no sustituye la verificación de un
nuevo despliegue de Netlify. La publicación y sus comprobaciones remotas se deben
registrar por separado cuando se ejecuten.
