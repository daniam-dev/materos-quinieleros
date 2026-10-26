# Materos Quinieleros

Aplicación de La Quiniela del grupo Materos Quinieleros. SPA Angular con API para Netlify Functions, administración privada y almacenamiento persistente. Arranca con los nueve participantes del grupo y sin jornadas cargadas.

## Ejecutar

Requisitos verificados: Node **22.14.0** y npm **11.13.0**. `.nvmrc` fija el runtime. Si tienes otra versión de npm, puedes ejecutar la instalación indicada sin modificar tu npm global:

```sh
npx --yes npm@11.13.0 ci
npm start
```

Abre `http://127.0.0.1:4200`. Con npm 11.13.0 ya disponible, basta con `npm ci`. El comando inicia Angular y la API local; los cambios se conservan en `.netlify/local/`, fuera de Git.

Para activar tu acceso local, ejecuta `npm run admin:setup` en una terminal. Pide una contraseña sin mostrarla y guarda su hash y un secreto de sesión en `.env`, excluido de Git. Reinicia `npm start` y entra en `/acceso` con el usuario **daniel-arroyo**. Sin configurar los secretos, la consulta pública sigue funcionando y el acceso privado permanece deshabilitado. [Configuración de administración y Netlify](docs/administracion.md).

## Qué incluye

- Jornadas: matriz de 14 encuentros por participantes registrados, signos oficiales, marcadores, estados y filtros.
- Escritorio con nueve participantes; móvil y tablet con selector individual y comparación horizontal con encuentros fijos.
- Selector con «Jornada actual» e histórico de jornadas de Liga y Champions / Europa League. La actual se asigna expresamente; no se deduce por número o fecha.
- Top 3 calculado y Pleno al 15 independiente.
- Clasificación de temporada con participación real, aciertos, evaluables, porcentajes y victorias compartidas cuando corresponde.
- Nueve participantes reales, iniciales de nombre y apellido y Daniel Arroyo identificado como administrador en los datos. Histórico de inactivos y distinción de apuestas ausentes.
- Administración exclusiva de Daniel: altas, bajas y reincorporaciones; creación y selección de jornadas; carga y corrección de los 14 signos y el Pleno de cualquier participante.
- Autorización en servidor, cookie HttpOnly y pronósticos excluidos de la respuesta pública antes del cierre.
- Sistema de diseño centralizado con Tailwind CSS 4, preset PrimeNG styled mode, Manrope e Inter locales.
- Componentes compartidos de botones, superficies, encabezados, estados, badges, diálogo y pronósticos.
- Estados de carga, error con reintento, filtros vacíos y ruta desconocida.
- Teclado, foco visible, salto al contenido, restauración de scroll/foco al navegar, etiquetas en español, estados con símbolos y movimiento reducido.

## Stack y decisión de licencia

Angular **21.2.25**, CLI/build **21.2.28**, TypeScript strict, standalone, Signals, computed, OnPush y Router. PrimeNG **21.1.10**, temas PrimeUIX **2.0.3** y Tailwind **4.3.3**.

Angular 22 es la última línea estable, pero PrimeNG 22 requiere una clave PrimeUI y condiciones Community renovables. Se eligió la combinación estable más reciente compatible con **PrimeNG MIT**, sin claves ni registros externos. Esta decisión, los requisitos de Node y las fuentes oficiales están en [Dependencias y licencias](docs/dependencias.md). No se ha modificado el Node del sistema.

## Arquitectura

`domain` contiene modelos y reglas puras; `core/data` separa el contrato HTTP y el estado; `core/auth` gestiona la sesión; `features` organiza Jornadas, Clasificación y Administración; `shared/ui` contiene la biblioteca visual. Las rutas se cargan bajo demanda. `server` contiene autenticación, validación y API; `netlify/functions` adapta esa API a Netlify.

El proveedor `QUINIELA_REPOSITORY` consulta `/api/season`. Los participantes iniciales viven en `server/seed.json`, fuera de los archivos públicos. Netlify guarda los cambios en Blobs con revisión ETag y protección frente a escrituras concurrentes. [Cómo cargar jornadas](docs/datos.md). [Arquitectura y privacidad](docs/arquitectura.md).

Los valores visuales viven en `src/styles/tokens.css`; PrimeNG referencia esas mismas variables. Cambiar `--radius-control` de `0.75rem` a `0.5rem` cambia botones, navegación y selectores sin editar las pantallas. Playwright verifica ese comportamiento. [Sistema de diseño](DESIGN.md).

## Verificación

```sh
npm run check          # Formato, UTF-8/LF, lint, TypeScript, unitarias, servidor y build
npx playwright install chromium
npm run test:e2e       # Navegador real: 1440, 768 y 390 px
npm run test:e2e:ui    # Inspector interactivo
npm run format        # Aplicar Prettier
npm audit
```

Playwright inicia API y Angular con almacenamiento temporal y credenciales exclusivas de prueba. No intercepta peticiones API ni modifica datos locales del usuario. Comprueba consulta y edición; guarda capturas de revisión en `.impeccable/review/` y trazas de fallos en `test-results`. Informe HTML: `npm run test:e2e -- --reporter=html`. [Alcance de las pruebas](docs/verificacion.md).

## Build y Netlify

```sh
npm run build
```

Salida: `dist/materos-quinieleros/browser`. `netlify.toml` configura el build, las funciones y la reescritura SPA. El frontend necesita la API. Los secretos se configuran para Functions según [administracion.md](docs/administracion.md). No se ha desplegado.

## Límites y siguiente fase

La API excluye pronósticos y Pleno antes del cierre usando su reloj. El frontend público nunca recibe la copia privada. El rol de los datos no concede permisos: solo una sesión validada por el servidor permite administrar.

Hay un único acceso administrativo para Daniel; el resto consulta sin registrarse. No hay recuperación por correo, editor de resultados oficiales ni conexión deportiva externa. No se añaden Chart.js ni un sistema de puntos.

Antes de producción queda configurar secretos y verificar Functions, Blobs y límite de intentos en un despliegue real. La actualización Angular/PrimeNG 22 requiere resolver licencia y runtime. Las pruebas cubren Chromium; quedan pendientes lectores de pantalla y Safari/Firefox.
