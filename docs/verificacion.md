# Verificación de la Fase 1

## Evidencia funcional

La suite unitaria usa Vitest a través del builder de Angular. Cubre aciertos y fallos, denominadores, ausencia de datos, desempates, inactivos, participaciones reales, resultados futuros, marcadores provisionales, partidos finalizados sin signo oficial, liquidación administrativa, Pleno, cierre inclusivo y no filtración de estadísticas de jornadas abiertas. También cubre botones y textos accesibles de pronósticos, integridad de datos y reintento del repositorio.

Playwright ejecuta dos escenarios completos en cada viewport: 1440 × 1000, 768 × 1024 y 390 × 844. Usa Chromium real en modo headless, sin mocks de navegador.

- Navegación de rutas y recarga directa de Clasificación.
- Selección de jornadas, estados abierta/cerrada/parcial/finalizada y filtros de 8 resueltos / 6 pendientes.
- Selección de Lucía, sus celdas visibles y comparación de nueve participantes.
- Desplazamiento horizontal con encuentros fijos y al menos dos columnas completas de participantes visibles en móvil.
- Ausencia de desbordamiento horizontal del documento.
- Pronósticos y rankings ausentes del DOM antes del cierre.
- Pleno oficial independiente y permanencia de Nico inactivo en la clasificación.
- Diálogo de reglas, cierre con Escape y navegación de selectores por teclado.
- Radio global 12 → 8 px en botones, navegación y PrimeNG sin cambiar componentes.
- Sin errores JavaScript no controlados.
- Axe con etiquetas WCAG 2 A/AA, 2.1 AA y 2.2 AA en jornada parcial, abierta, diálogo y clasificación.

Los análisis automáticos no constituyen una certificación WCAG ni sustituyen lectores de pantalla, navegación asistida y pruebas con usuarios.

Resultado ejecutado el 25/10/2026: **25 pruebas unitarias y 6 escenarios E2E aprobados**. Lint, TypeScript y build de producción aprobados. Bundle inicial: aproximadamente 473 kB (transferencia estimada 110 kB), dentro del presupuesto de 500 kB. Auditoría npm: cero vulnerabilidades.

## Revisión visual Impeccable

Se aplicó la skill local `C:/Users/dania/.codex/skills/impeccable/SKILL.md`: contexto, new-work y craft-floor. La dirección explícita del usuario prevaleció sobre el sorteo de concepto (`97b01b09`, 25/10/2026); se construyó directamente desde el brief, sin una imagen de referencia aprobada.

Se inspeccionaron capturas de escritorio, tablet y móvil, incluyendo las vistas abiertas, globales y de clasificación. Un reviewer independiente examinó las capturas principales y solicitó tres correcciones: temporada integrada bajo el título, retirada de flechas Unicode y aumento a 12 px de los estados pequeños. El verdict posterior fue **ship para esas tres correcciones**, no una nueva certificación completa de todos los estados.

El detector Impeccable se ejecutó una vez. Devolvió una lista vacía en **modo degradado** por ausencia de sus parsers opcionales; no evaluó contraste calculado ni selectores. El contraste automático se comprobó con axe en el navegador, además de la revisión visual. No se presenta la salida vacía del detector como una revisión completa.

Durante E2E se corrigieron etiquetas de selectores, posicionamiento de textos `sr-only` que desbordaban en tablet, foco/scroll al navegar y anchura de la columna fija en la comparación global móvil. Los tests esperan el cierre real de los desplegables y no usan pausas arbitrarias.

El paso delegado de documentación no llegó a completarse; `DESIGN.md` y su sidecar se elaboraron directamente a partir del código y de las capturas revisadas.

## Archivos y ejecución

Las capturas están en `.impeccable/review/`; el informe navegable está en `playwright-report/index.html`. Son artefactos locales regenerables, no imágenes ilustrativas generadas.

`npm run check` ejecuta Prettier, verificación UTF-8 sin BOM/LF/salto final, ESLint con reglas Angular y accesibilidad de plantillas, TypeScript de aplicación y pruebas, Vitest y build de producción con presupuestos de bundle.

`npm audit` comprueba las dependencias instaladas, incluidas las herramientas de desarrollo. Los resultados finales ejecutados se detallan en la entrega; ningún check omitido se considera aprobado.

## Pendiente antes de producción

Seguridad de publicación en servidor; autenticación y autorización reales; revisión de contrato de datos externo; pruebas de accesibilidad manual con lector de pantalla; Safari y Firefox; integración real con Netlify. No se ha desplegado esta fase.
