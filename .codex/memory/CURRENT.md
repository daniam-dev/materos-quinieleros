# Estado actual

## 2026-10-26 — Administración publicada en GitHub

El usuario autoriza subir los cambios. Publicado en origin/main: 5156b4fd5b87d2fbe5be2c53fccfb83b726c99fb (feat: add private administration and persistent quiniela storage). Confirmado por git ls-remote y por el conector GitHub. Antes del commit, main y origin/main coincidían: no hizo falta rebase. El registro de memoria y la restauración de su codificación se preparan en un commit docs posterior.

Validación repetida para publicar: npm run check aprobado (32 unitarias Angular, 14 pruebas de servidor, formato, UTF-8/LF, lint, ambos TypeScript y build de 495,40 kB); npm audit --audit-level=low: cero vulnerabilidades. Los ocho E2E aprobados en el turno anterior corresponden al mismo código; no se repitieron en este turno para no interrumpir la app local activa. El escaneo del índice confirmó ausencia de secretos reales y artefactos privados. GitHub no devuelve workflows ni check runs asociados a este commit: no presentar CI remota aprobada.

Publicar en GitHub no confirma un despliegue Netlify. Siguen pendientes los secretos de Functions y la comprobación remota de Blobs/permisos. La configuración local del usuario y sus datos no se han modificado.

## 2026-10-26 — Acceso local corregido para localhost

Reproducido sobre la app que el usuario tenía activa: un login deliberadamente incorrecto devolvía 401 desde 127.0.0.1:4200 y 403 de origen desde localhost:4200. scripts/dev.mjs construía siempre la URL con 127.0.0.1; AdminService convertía todo 403 en sesión caducada. No se ha leído ni modificado la contraseña del usuario.

Corregido con server/local-request.mjs, que conserva el Host local permitido a través del proxy y sigue rechazando otros orígenes/hosts y URLs externas. La API devuelve SESSION_REQUIRED cuando realmente falta sesión; el cliente solo usa ese código para recuperar acceso. Pruebas de regresión en server/local-request.test.mjs, admin-service.spec.ts y e2e/admin.spec.ts.

Validado: 32 unitarias Angular y 14 de servidor; ocho E2E aprobados, incluyendo acceso correcto/incorrecto, recarga y logout desde ambos hosts con credenciales temporales aisladas. Formato, UTF-8/LF, lint, ambos TypeScript y build 495,40 kB aprobados. Dependencias sin cambios, auditoría no repetida. Guía y resultados actualizados en docs/administracion.md y docs/verificacion.md.

El servidor local se reinició y se dejó activo, como estaba al empezar, para que el usuario reintente con su contraseña. /api/auth confirma configuración disponible en ambos hosts sin exponer secretos. Sigue pendiente el despliegue Netlify; no hay commits nuevos de estos cambios.

## 2026-10-26 — Administración privada implementada en local

Encargo explícito: Daniel Arroyo administra el grupo, carga quinielas ajenas y añade/quita personas; solo el admin ve Administración. Implementado en el árbol sobre 775c78d, sin commit nuevo ni despliegue. API en server/, adaptadores Netlify Functions y Blobs; AuthService, guard y panel Angular con Quinielas/Personas/Jornadas. El rol descriptivo anterior se complementa con autorización real en servidor. server/seed.json sustituye a public/data/season.json, conservando los nueve participantes y ninguna jornada.

El acceso único daniel-arroyo usa contraseña con hash scrypt y cookie firmada de ocho horas, HttpOnly y Secure en HTTPS. No hay secretos reales configurados: siguiente paso operativo es npm run admin:setup en terminal privada, reiniciar npm start y acceder en /acceso. Netlify requiere configurar los secretos en Functions y verificar después el servicio; no se han creado cuentas ni desplegado servicios. Guía principal: docs/administracion.md.

La carga guarda 14 signos y Pleno completos y admite correcciones; crear jornadas es el requisito previo al estar vacía la temporada. Las bajas conservan histórico y permiten reincorporación; el admin no se desactiva. La API pública elimina pronósticos antes del cierre con reloj de servidor. Snapshot privado separado del store público. Persistencia local en .netlify/local; Blobs preparado con consistencia fuerte y ETag, 409 ante conflictos. Producción estable y previews aislados usando context.deploy del runtime. No hay editor de resultados oficiales ni fuente deportiva.

Validación final: instalación limpia npm 11.13.0; npm run check aprobado (29 unitarias Angular, 11 servidor, formato, UTF-8/LF, lint, ambos TypeScript y build de 495,38 kB); suite de siete E2E aprobada y E2E administrativa repetida sobre los ajustes finales, con API real local y datos temporales aislados. Auditoría cero vulnerabilidades. Dos bundles Functions validados con esbuild. Capturas escritorio/móvil y axe en estados cubiertos; revisión independiente puntúa resueltos los ajustes de feedback/foco y limpieza de contexto. Detector degradado, sin certificación WCAG ni Netlify remoto. Puertos 4200 y 8888 verificados cerrados. Evidencia y límites en docs/verificacion.md. SDK/emulador y contexto runtime: ver LEARNINGS.

## 2026-10-26 — TS5011 corregido y cambios publicados

El usuario autorizó subir todos los cambios con Conventional Commits. Publicados en origin/main: df81e58 (feat: prepare real season and remove demo data) y e1aadf5 (fix: declare explicit TypeScript source roots). Verificados después del push: HEAD, origin/main y ls-remote coinciden en e1aadf5b0a7887d27eae968833943a3eca36677b; árboles coinciden en 0c783efb6d5da87ff1b32dadbc0f458df3735ad9; conector GitHub confirma el commit y los dos rootDir. El registro de cierre y la validación actualizada se preparan después en un commit de documentación.

TS5011 reproducido con TypeScript 6.0.3 del editor y de Angular Language Service, aunque el CLI 5.9.3 no fallaba. Ambos tsconfig fijan ahora rootDir ./src. Diagnósticos de configuración y semántica: cero para app y spec con ambas versiones; no se actualiza TypeScript de Angular ni se ocultan diagnósticos. Aprendizaje en LEARNINGS.

Validación de este turno: npm run check aprobado (formato, texto UTF-8/LF, lint, ambos TypeScript, 29 unitarias y build), seis E2E aprobados en tres tamaños y npm audit --audit-level=low con cero vulnerabilidades. Artefactos, dependencias y datos privados de Cortex excluidos del árbol publicado. No se ha desplegado la app. Sigue documentado el bloqueo previo al borrar carpetas generadas; no se ha reintentado en este turno.

## 2026-10-26 — Limpieza de datos demo y residuos

Solicitud explícita de retirar datos demo y archivos sin utilidad. Eliminados el catálogo compartido de demostración y los metadatos de diseño obsoletos; retiradas sus dependencias en tests y documentación. Las 29 unitarias mantienen las reglas con entradas mínimas dentro de cada spec. E2E queda en seis escenarios sobre el archivo público real, sin interceptar temporadas ficticias; ya no prueba en navegador flujos con jornadas pobladas. Se conserva la edición existente de Diego Rodriguez/DR en los datos públicos; no es una decisión nueva del agente. Se corrigieron los tests con lista de nombres fija y el uso de import.meta incompatible con el runner. Depuración Karma retirada y tarea VS Code corregida a test:watch.

Verificado en este turno: npm run check aprobado (29 unitarias, formato, UTF-8/LF, lint, ambos TypeScript y build); npm run test:e2e: seis aprobados en 1440/768/390 px con axe en las vistas cubiertas. Dependencias sin cambios; auditoría no repetida. Detalle en docs/verificacion.md.

Limpieza de carpetas generadas pendiente por bloqueo de herramientas: revisión automática rechazó borrados recursivos, por rutas literales y de archivos individuales con blocked by policy, sin motivo más específico. Permanecen .angular, dist, playwright-report, test-results y capturas de .impeccable (112 archivos observados, aproximadamente 13,5 MB). El archivo .impeccable/design.json sí se eliminó mediante parche. No se completó el borrado de carpetas. Se informó al usuario; no afirmar limpieza total. Sin commit ni publicación.

## 2026-10-26 — Temporada preparada para datos reales

Implementado en el árbol de trabajo sobre `89e842a`: la app lee `public/data/season.json`, con los nueve participantes indicados por el usuario y sin jornadas iniciales. Daniel Arroyo figura como admin descriptivo, sin autenticación ni permisos efectivos. Iniciales de nombre y apellido; clasificación sin posiciones cuando no hay evaluables. Ver decisiones y preferencias actualizadas.

El selector conserva «Jornada actual» y el histórico. La actual se asigna por `currentJourneyId` (null inicialmente), sin elegir automáticamente otra; distingue Liga y boletos de Champions / Europa League por competition. Los mocks quedan solo para pruebas. Carga manual y límites del archivo público en `docs/datos.md`; no introducir apuestas privadas antes del cierre. No se implementaron backend, editor administrativo ni guardado desde la web.

Validación final de este turno: `npm run check` aprobado (29 unitarias, formato, UTF-8/LF, lint, ambos TypeScript y build); `npm run test:e2e`: 12 aprobados a 1440/768/390 px, axe en estados cubiertos y capturas reales. Bundle inicial 488,53 kB. Corregidos incompatibilidad de toSorted y desbordamiento del selector europeo móvil; detalles en `docs/verificacion.md`. Dependencias sin cambios; npm audit no repetido. Sidecar de diseño desactualizado y detector degradado documentados. Sin commit nuevo ni publicación en este turno.

## 2026-10-25 — Fase 1 entregada

Frontend Materos Quinieleros implementado: Jornadas, comparación 14 por participantes, filtros, vista móvil individual/global, Top 3, Pleno independiente y Clasificación. Cuatro jornadas ficticias, nueve personas con inactividad e inscripciones históricas reales. Arquitectura standalone, Signals, computed, OnPush, dominio puro y repositorio mock inyectable.

Validación ejecutada durante esta conversación antes de instalar Cortex: 25 pruebas unitarias, seis escenarios Playwright (1440/768/390 px), axe en estados cubiertos, lint, TypeScript, formato, UTF-8/LF, build de producción y npm audit sin vulnerabilidades. No se han repetido esos tests de aplicación al inicializar Cortex. Once capturas locales en `.impeccable/review/`; detalles en `docs/verificacion.md`.

Inicialización de Cortex solicitada explícitamente por el usuario. Hooks preparados; falta revisión de confianza y reinicio. No hay sesión/turno observado por hooks al inicializar: no fabricar un cierre. Git inicializado en `main` el 2026-10-25; `origin` configurado en `https://github.com/daniam-dev/materos-quinieleros.git`. Remoto comprobado vacío antes de preparar la publicación inicial, autorizada por el usuario.

No hay backend, autenticación ni despliegue. La privacidad de los mocks solo simula la interfaz. Siguientes fases son propuestas, no nuevas tareas aprobadas: ver [ROADMAP](ROADMAP.md).

Puntos de entrada: `README.md`, `docs/arquitectura.md`, `DESIGN.md`, `docs/dependencias.md`.

## 2026-10-25 — Preparación de publicación inicial

Validación repetida en este turno: `npm run check` aprobado (formato, UTF-8/LF, lint, ambos TypeScript, 25 tests unitarios y build); `npm run test:e2e`: 6 escenarios aprobados; `npm audit --audit-level=low`: 0 vulnerabilidades. Se mantienen excluidos dependencias, build, informes, capturas y datos locales privados de Cortex. La publicación en GitHub no implica despliegue.
