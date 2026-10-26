# Verificación

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

No se han configurado secretos reales, publicado commits ni desplegado Functions/Blobs. Pendientes: configurar acceso, verificar persistencia y límite de intentos en Netlify, lector de pantalla y Safari/Firefox. No hay fuente deportiva externa ni editor de resultados oficiales. Axe no certifica conformidad WCAG.
