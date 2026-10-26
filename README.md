# Materos Quinieleros

Frontend de La Quiniela del grupo Materos Quinieleros. Jornadas y Clasificación con diseño editorial oscuro y cálculos de dominio. SPA Angular, sin SSR ni backend. Arranca con los nueve participantes del grupo y sin jornadas cargadas.

## Ejecutar

Requisitos verificados: Node **22.14.0** y npm **11.13.0**. `.nvmrc` fija el runtime. Si tienes otra versión de npm, puedes ejecutar la instalación indicada sin modificar tu npm global:

```sh
npx --yes npm@11.13.0 ci
npm start
```

Abre `http://localhost:4200`. Con npm 11.13.0 ya disponible, basta con `npm ci`.

## Qué incluye

- Jornadas: matriz de 14 encuentros por participantes registrados, signos oficiales, marcadores, estados y filtros.
- Escritorio con nueve participantes; móvil y tablet con selector individual y comparación horizontal con encuentros fijos.
- Selector con «Jornada actual» e histórico de jornadas de Liga y Champions / Europa League. La actual se asigna expresamente; no se deduce por número o fecha.
- Top 3 calculado y Pleno al 15 independiente.
- Clasificación de temporada con participación real, aciertos, evaluables, porcentajes y victorias compartidas cuando corresponde.
- Nueve participantes reales, iniciales de nombre y apellido y Daniel Arroyo identificado como administrador en los datos. Histórico de inactivos y distinción de apuestas ausentes.
- Sistema de diseño centralizado con Tailwind CSS 4, preset PrimeNG styled mode, Manrope e Inter locales.
- Componentes compartidos de botones, superficies, encabezados, estados, badges, diálogo y pronósticos.
- Estados de carga, error con reintento, filtros vacíos y ruta desconocida.
- Teclado, foco visible, salto al contenido, restauración de scroll/foco al navegar, etiquetas en español, estados con símbolos y movimiento reducido.

## Stack y decisión de licencia

Angular **21.2.25**, CLI/build **21.2.28**, TypeScript strict, standalone, Signals, computed, OnPush y Router. PrimeNG **21.1.10**, temas PrimeUIX **2.0.3** y Tailwind **4.3.3**.

Angular 22 es la última línea estable, pero PrimeNG 22 requiere una clave PrimeUI y condiciones Community renovables. Se eligió la combinación estable más reciente compatible con **PrimeNG MIT**, sin claves ni registros externos. Esta decisión, los requisitos de Node y las fuentes oficiales están en [Dependencias y licencias](docs/dependencias.md). No se ha modificado el Node del sistema.

## Arquitectura

`domain` contiene modelos y reglas puras; `core/data` separa el contrato del repositorio, los mocks y el estado; `features` organiza Jornadas y Clasificación; `shared/ui` contiene la biblioteca visual. Las rutas se cargan bajo demanda.

El proveedor `QUINIELA_REPOSITORY` carga el archivo público `public/data/season.json`. Ahí se mantienen por ahora los participantes, las jornadas y `currentJourneyId` (inicialmente `null`). [Cómo cargar jornadas](docs/datos.md). [Arquitectura, cálculos y frontera de privacidad](docs/arquitectura.md).

Los valores visuales viven en `src/styles/tokens.css`; PrimeNG referencia esas mismas variables. Cambiar `--radius-control` de `0.75rem` a `0.5rem` cambia botones, navegación y selectores sin editar las pantallas. Playwright verifica ese comportamiento. [Sistema de diseño](DESIGN.md).

## Verificación

```sh
npm run check          # Formato, UTF-8/LF, lint, TypeScript, unitarias y build
npx playwright install chromium
npm run test:e2e       # Navegador real: 1440, 768 y 390 px
npm run test:e2e:ui    # Inspector interactivo
npm run format        # Aplicar Prettier
npm audit
```

Playwright inicia el servidor local si no está disponible y comprueba la app con su archivo público real. Muestra el resultado en consola y conserva capturas y trazas únicamente ante fallos en `test-results`. Puedes generar un informe HTML expresamente con `npm run test:e2e -- --reporter=html`. [Alcance de las pruebas](docs/verificacion.md).

## Build y Netlify

```sh
npm run build
```

Salida: `dist/materos-quinieleros/browser`. `netlify.toml` configura el build, las versiones de herramientas y la reescritura SPA de rutas a `index.html`. No se ha realizado ningún despliegue.

## Límites y siguiente fase

**El archivo de temporada es público.** Solo debe contener información que ya pueda publicarse. La ocultación visual antes del cierre no protege los datos del archivo: no introducir apuestas reales previas al cierre hasta implementar en servidor la proyección pública.

No hay autenticación, panel administrativo, persistencia de cambios desde la web, Functions, Blobs ni resultados externos. El rol de administrador es un dato descriptivo, sin permisos efectivos hasta incorporar el servidor. Tampoco se añaden Chart.js o un sistema de puntos: aquí no aportan valor.

Siguiente fase: contrato público/privado y autorización del servidor, después persistencia y administración. La actualización Angular/PrimeNG 22 requiere resolver primero la licencia y el runtime. Las pruebas actuales cubren Chromium; una revisión con lectores de pantalla y Safari/Firefox queda pendiente antes de producción.
