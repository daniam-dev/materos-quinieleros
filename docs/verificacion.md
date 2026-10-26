# Verificación

## Suite actual

`npm run check` ejecuta formato, UTF-8 sin BOM/LF/salto final, lint, TypeScript de aplicación y pruebas, Vitest y build de producción.

`tsconfig.app.json` y `tsconfig.spec.json` fijan `rootDir: "./src"`. Se reprodujo TS5011 con TypeScript 6.0.3 del editor antes del cambio y se verificaron ambos proyectos sin ese diagnóstico después; la compilación de Angular mantiene TypeScript 5.9.3 del lockfile. La raíz explícita evita depender de la inferencia de directorios de cada versión.

Las 29 pruebas unitarias comprueban las reglas con entradas mínimas locales a cada `.spec.ts`: publicación y cierre inclusivo, signos oficiales futuros, marcadores provisionales, liquidación administrativa, aciertos y ausencias, denominadores, desempates, inactivos, inscripciones, victorias compartidas, Pleno independiente, selección de jornada, componentes y reintento de carga. No dependen de un catálogo de demostración.

Playwright ejecuta dos escenarios en 1440 × 1000, 768 × 1024 y 390 × 844. Lee el archivo público real, sin interceptar peticiones con temporadas alternativas:

- Temporada sin jornadas, participantes publicados, iniciales de nombre y apellido, administrador, ausencia de posiciones, navegación y recarga.
- Teclado, salto al contenido, selector, ausencia de desbordamiento, tokens compartidos y axe en las pantallas cubiertas.

Los flujos de comparación con jornadas pobladas ya no se ejecutan en navegador tras retirar el catálogo ficticio; sus reglas de dominio mantienen cobertura unitaria. Se ampliará la cobertura de navegador al incorporar jornadas reales. Axe no certifica conformidad WCAG ni sustituye la revisión manual.

## Artefactos y limpieza

Playwright muestra resultados en consola. Solo los fallos generan capturas y trazas en `test-results`; el informe HTML se solicita con `npm run test:e2e -- --reporter=html`. No se guardan capturas permanentes de cada ejecución correcta.

Se retiraron el catálogo demo, sus escenarios e instrucciones antiguas y los metadatos de diseño obsoletos. También se retiró la configuración de depuración de Karma: el proyecto usa Vitest y la tarea de VS Code llama a `test:watch`.

Validación ejecutada: `npm run check` aprobado (29 unitarias y build) y seis escenarios E2E aprobados. Se corrigió la lista fija del test para leer los participantes publicados, conservando la edición existente de Diego Rodriguez/DR; se evitó `import.meta` al leer JSON por la configuración de módulos del runner. Las dependencias no han cambiado; no se repite la auditoría npm.

La revisión automática rechazó la eliminación de los artefactos con «blocked by policy», tanto por carpetas como por archivos individuales. Permanecen `.angular`, `dist`, `playwright-report`, `test-results` y las capturas de `.impeccable`. El borrado del catálogo de código y del archivo de metadatos sí se aplicó; no se presenta la limpieza de carpetas generadas como completada.

## Pendiente antes de producción

Publicación segura en servidor, autenticación y autorización reales, contrato de datos externo, lector de pantalla, Safari/Firefox e integración real con Netlify. No se ha desplegado la app.
