# Aprendizaje comprobado

## Toolchain

npm 11.5.2 del entorno falló al resolver peers con un error interno edgesOut. La instalación funcionó con `npx --yes npm@11.13.0`; packageManager y Netlify fijan esa versión sin cambiar npm global. Runtime probado: Node 22.14.0. Ver `docs/dependencias.md`.

Vitest 4.1.12 corrigió avisos de auditoría; override localizado de Undici 7.30.1 en Angular build corrige la dependencia transitiva. ESLint 10 necesita @eslint/js declarado explícitamente. Auditoría final de Fase 1: cero vulnerabilidades; comprobar de nuevo antes de publicar.

## Interfaz y pruebas

PrimeNG Select necesitó ariaLabel explícito para anunciar el propósito, no solo el valor seleccionado. Los textos sr-only absolutos escapaban al scroll de la tabla en tablet; position:relative en el contenedor resolvió el desbordamiento. Un min-width global fijo repartía anchura extra a la columna sticky móvil: calcular ancho por número de participantes permite dos columnas completas. E2E comprueba rectángulos y desbordamiento, no solo apariencia.

Esperar estado real de cierre de listbox evita carreras al reabrir selectores. Para capturas completas, enfocar main y volver al inicio evita artefactos del salto al contenido. Revisión Impeccable realizada; detector degradado por parsers opcionales ausentes, complementado con axe y capturas. No confundirlo con certificación WCAG.

## TS5011 en VS Code — 2026-10-26

El editor instalado y Angular Language Service usan TypeScript 6.0.3; el lockfile del proyecto mantiene 5.9.3. Con el compilador del editor se reprodujo TS5011 en tsconfig.app.json y tsconfig.spec.json por rootDir implícito. Fijar rootDir ./src en ambos elimina el diagnóstico y da cero diagnósticos semánticos con las dos versiones. La compilación Angular y las 29 unitarias siguen pasando. No hace falta actualizar TypeScript ni introducir ignoreDeprecations. Evidencia publicada: e1aadf5, ambos tsconfig y docs/verificacion.md.

## Administración y almacenamiento — 2026-10-26

Con @netlify/blobs 11.1.6, el emulador oficial local devuelve ETag en PUT pero lo omite en GET/getWithMetadata. Reproducido en server/blob-store.test.mjs: se validan persistencia y condiciones con la revisión de PUT, y el adaptador falla cerrado ante una lectura sin ETag. No atribuir esta limitación al servicio remoto sin probarlo. Desarrollo normal usa un adaptador de disco con revisiones propias; pruebas temporales aisladas.

Para separar producción de previews, usar context.deploy del runtime de Functions; CONTEXT/BRANCH/REVIEW_ID del build no son una base fiable en ejecución. server/store-name.mjs y su test comprueban producción persistente, aislamiento por despliegue y fallo cerrado sin contexto. Las credenciales se verifican sin depender de disponibilidad del almacenamiento.

En formularios administrativos largos, feedback solo al inicio puede quedar fuera del viewport y persistir en otra sección. Enfocar el resumen tras render y limpiar mensajes al cambiar de sección resolvió ambos hallazgos; E2E verifica foco, visibilidad y datos conservados tras un error real 400. Un aria-label sobre div requiere un rol válido: axe detectó el caso y se corrigió con role group. No usar selectores de tests basados en el atributo value de radios Angular cuando la propiedad no se refleja: localizar por grupo y nombre accesible.

## Origen local y errores de sesión — 2026-10-26

No construir el Request de la API local con un origen fijo si Angular acepta tanto localhost como 127.0.0.1. Se reprodujo el rechazo 403 de un login válido estructuralmente desde localhost al compararlo contra 127.0.0.1. Conservar el Host permitido del proxy y comprobar el origen exacto: no resolverlo admitiendo cualquier origen ni confiando en X-Forwarded-Host. Regresión integrada con ambos hosts en e2e/admin.spec.ts y rechazo de hosts/orígenes externos en server/local-request.test.mjs.

Un HTTP 403 no implica sesión caducada: también puede ser una comprobación de origen. La API distingue SESSION_REQUIRED y AdminService solo borra la sesión/redirige para ese código. admin-service.spec.ts cubre rechazo de origen, credenciales incorrectas y sesión ausente. En pruebas del login no leer ni mostrar el .env del usuario: credenciales de tests y almacenamiento temporales aislados; probes de credenciales deliberadamente incorrectas permiten comparar estados sin conocer la contraseña.

## Escritura de memoria y Unicode en PowerShell — 2026-10-26

Detectada pérdida de tildes y signos al pasar programas Node con texto Unicode por el pipeline de PowerShell: las notas publicables quedaron con interrogantes aunque seguían siendo bytes UTF-8 válidos, por lo que check-text no lo detectó. Se restauran los fragmentos históricos desde Git y los añadidos desde el contenido de sesión, conservando hechos y motivos; las escrituras pasan por Cortex. Para enviar el programa por stdin, usar datos JSON con escapes Unicode ASCII o un canal UTF-8 explícito. El programa debe construir el plan leyendo los archivos UTF-8 y pasarlo por stdin al runtime, sin interpolar texto Unicode sin proteger en el shell.

## OCR optimizado y regresiones - 2026-10-30

Tesseract7 importado con named exports funciona en ng serve, pero el chunk CommonJS optimizado solo exporta default. Comprobar el artefacto construido: resolver default ?? namespace y ejecutar npm run test:build. Las pruebas anteriores sobre ng serve no detectaban el fallo antesdecreateWorker. Recursos OCR200 por si solos no acreditan que la app arranque el lector. Conservar propuestas incompletas como borradores, exigir revision15 y probar errores de worker y modelo; la captura sintetica coloreada reconoce13/15, no prometer OCRperfecto. Informe principal docs/pruebas-ocr-local.md.

## Feedback de validacion en formularios largos - 2026-10-30

Un error local de save() puede no generar red ni consoleerror y quedar milesdepixeles fuera del viewport. Probar formulario revisado pero con metadatos ausentes, no solo caminofeliz que los rellena. Summary cercadeGuardar, foco trasrender y enlacealcampo recuperan accion sin perder borrador. Error de API400 tambien debequedar visible y preservarentrada. Capturastrasreload deben seleccionarjornada reciencreada explicitamente: actualpuede seguirapuntando alprimero, yuna capturaanteriornoacredita nuevoguardado. Evidencia tests e2e/photo-save.spec.ts e informe docs/pruebas-ocr-local.md.
