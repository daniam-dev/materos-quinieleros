# Aprendizaje comprobado

## Toolchain

npm 11.5.2 del entorno falló al resolver peers con un error interno edgesOut. La instalación funcionó con `npx --yes npm@11.13.0`; packageManager y Netlify fijan esa versión sin cambiar npm global. Runtime probado: Node 22.14.0. Ver `docs/dependencias.md`.

Vitest 4.1.12 corrigió avisos de auditoría; override localizado de Undici 7.30.1 en Angular build corrige la dependencia transitiva. ESLint 10 necesita @eslint/js declarado explícitamente. Auditoría final de Fase 1: cero vulnerabilidades; comprobar de nuevo antes de publicar.

## Interfaz y pruebas

PrimeNG Select necesitó ariaLabel explícito para anunciar el propósito, no solo el valor seleccionado. Los textos sr-only absolutos escapaban al scroll de la tabla en tablet; position:relative en el contenedor resolvió el desbordamiento. Un min-width global fijo repartía anchura extra a la columna sticky móvil: calcular ancho por número de participantes permite dos columnas completas. E2E comprueba rectángulos y desbordamiento, no solo apariencia.

Esperar estado real de cierre de listbox evita carreras al reabrir selectores. Para capturas completas, enfocar main y volver al inicio evita artefactos del salto al contenido. Revisión Impeccable realizada; detector degradado por parsers opcionales ausentes, complementado con axe y capturas. No confundirlo con certificación WCAG.

## TS5011 en VS Code — 2026-10-26

El editor instalado y Angular Language Service usan TypeScript 6.0.3; el lockfile del proyecto mantiene 5.9.3. Con el compilador del editor se reprodujo TS5011 en tsconfig.app.json y tsconfig.spec.json por rootDir implícito. Fijar rootDir ./src en ambos elimina el diagnóstico y da cero diagnósticos semánticos con las dos versiones. La compilación Angular y las 29 unitarias siguen pasando. No hace falta actualizar TypeScript ni introducir ignoreDeprecations. Evidencia publicada: e1aadf5, ambos tsconfig y docs/verificacion.md.
