# Dependencias, compatibilidad y licencias

Comprobación realizada el 25 de octubre de 2026 mediante el registro npm, documentación oficial y archivos de licencia de los paquetes instalados. El lockfile es la referencia exacta reproducible.

## Decisión de versión

La versión estable publicada de Angular es 22.2.3, con CLI 22.2.4. Requiere Node `^22.22.3 || ^24.15.0 || >=26.0.0`, superior al Node 22.14.0 disponible. PrimeNG 22.1.4 exige Angular 22.1 o posterior y una clave PrimeUI.

La entrega usa **Angular 21.2.25, CLI/build 21.2.28 y PrimeNG 21.1.10**, la combinación estable compatible más reciente de la línea MIT de PrimeNG. Angular 21 está en LTS; esta elección no se presenta como la última versión absoluta de Angular. Evita registrar una licencia a nombre del usuario o inventar una clave. Una migración a Angular/PrimeNG 22 queda pendiente de disponer de una licencia legítima y actualizar Node.

Angular 21 admite Node `^20.19.0 || ^22.12.0 || ^24.0.0` y TypeScript `>=5.9.0 <6.0.0`. Aquí se verificó con Node 22.14.0 y TypeScript 5.9.3. [Compatibilidad oficial de Angular](https://angular.dev/reference/versions).

## PrimeNG Community vigente

PrimeUI documenta que PrimeNG 21 y anteriores permanecen bajo MIT. PrimeNG 22 se distribuye bajo la nueva licencia PrimeUI: Community requiere una clave por desarrollador y renovación anual; las organizaciones deben cumplir sus umbrales de elegibilidad. No se han solicitado claves, creado cuentas, aceptado suscripciones ni contratado servicios. [Condiciones Community](https://primeui.dev/licenses/community) y [acuerdo Community](https://primeui.dev/eula/community).

La documentación de instalación actual pide la clave, mientras que un archivo LICENSE de la rama `master` todavía puede reflejar términos MIT antiguos. Para esta entrega se ha comprobado **el LICENSE.md del paquete 21.1.10 instalado**, que concede MIT a la edición Community; no se usan versiones `-lts` comerciales.

## Otras dependencias

| Paquete                          | Uso                                 | Licencia comprobada |
| -------------------------------- | ----------------------------------- | ------------------- |
| Angular, CDK                     | Framework y controles               | MIT                 |
| PrimeNG 21.1.10                  | Select y Dialog en styled mode      | MIT (Community)     |
| @primeuix/themes 2.0.3           | Base Aura para preset propio        | MIT                 |
| Tailwind CSS 4.3.3               | Tokens `@theme`, capas y utilidades | MIT                 |
| Inter Variable, Manrope Variable | Fuentes alojadas localmente         | SIL OFL 1.1         |
| Playwright                       | Navegador real y capturas           | Apache-2.0          |
| Vitest                           | Tests unitarios                     | MIT                 |

Se conservan los avisos de terceros de los paquetes; el build genera `3rdpartylicenses.txt`. No se usan imágenes de terceros ni servicios remotos de fuentes. Chart.js no se instala: las tablas y barras de proporción sencillas cubren el caso sin añadir una librería de gráficos.

## Reproducibilidad y auditoría

Solo se usa npm, con `package-lock.json`. npm 11.5.2 del sistema falló con un error interno `edgesOut` al resolver peers. Se utilizó npm 11.13.0 mediante `npx`, sin modificar la instalación global. El campo `packageManager` y Netlify fijan esa versión.

Vitest se actualizó a 4.1.12 para corregir avisos de auditoría. Angular build 21.2.28 fija Undici 7.29.1; se aplica un override localizado a 7.30.1 para corregir sus avisos, sin cambiar la versión principal. Revisar y retirar ese override cuando Angular build incorpore la corrección. No se usó `--force` ni `--legacy-peer-deps`.

Integración Tailwind conforme a la [guía oficial para Angular](https://tailwindcss.com/docs/installation/framework-guides/angular). PrimeNG se configura mediante `providePrimeNG` y `definePreset`, enlazando tokens CSS propios.
