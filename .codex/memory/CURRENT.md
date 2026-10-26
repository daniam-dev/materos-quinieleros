# Estado actual

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
