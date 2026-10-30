# Pruebas sobre el despliegue real

La suite de `e2e-production/` consulta exclusivamente
`https://materosquinieleros.netlify.app`. No inicia el servidor local, no sustituye
respuestas deportivas y no guarda cambios en personas, quinielas o competiciones.
Las peticiones POST de seguridad usan visitantes sin sesión o un comando desconocido
con origen/revisión deliberadamente inválidos; no ejecutan sincronizaciones.

## Ejecución

```powershell
npm run test:production
```

Incluye API pública, navegación, accesibilidad y operación. Las pruebas privadas
quedan omitidas salvo activación explícita en una terminal local:

```powershell
$env:MQ_PRODUCTION_ADMIN_TESTS = '1'
npm run test:production
Remove-Item Env:MQ_PRODUCTION_ADMIN_TESTS
```

El bloque privado requiere `.env` local con los mismos secretos administrativos
configurados en Netlify. Genera una sesión firmada de diez minutos en memoria: no
conoce ni prueba la contraseña y no comparte la sesión del navegador del usuario.
No guarda cookies, trazas, vídeo ni estado autenticado en disco. No adjuntar `.env`
a informes. Los artefactos públicos y fallos quedan en `test-results/`, fuera de Git.

Ejecutar una sola suite cada vez. Netlify limita `/api/auth` a veinte peticiones
por IP y minuto, incluidas las consultas de sesión. Dejar al menos un minuto entre
repeticiones y evitar navegar simultáneamente durante una ejecución completa.
La suite no intenta agotar el límite ni hace intentos de contraseña.

## Informe del 30 de octubre de 2026

Pruebas ejecutadas por tres agentes y revisión principal a partir de las 11:55,
hora de Madrid (UTC+1). Ver las marcas `asOf` de los artefactos para el instante
de cada comprobación.

Resultado por escenarios únicos, combinando las últimas ejecuciones de cada
archivo: **28 escenarios: 19 aprobados, 5 fallidos y 4 omitidos**. No corresponde
a una única ejecución conjunta. Los cinco fallos reproducen el mismo defecto del
logotipo; no son cinco defectos independientes.

| Bloque                                    | Aprobados | Fallidos | Omitidos |
| ----------------------------------------- | --------: | -------: | -------: |
| API pública, privacidad y protección      |        14 |        0 |        2 |
| Operación y bundles publicados            |         3 |        0 |        2 |
| UI pública en escritorio, tableta y móvil |         0 |        3 |        0 |
| API privada y panel en escritorio/móvil   |         2 |        2 |        0 |
| Total                                     |        19 |        5 |        4 |

### Hallazgos

1. **Accesibilidad: nombre del enlace del logotipo.** Axe detecta
   `label-content-name-mismatch`, impacto `serious`, criterio WCAG 2.5.3, en
   `.brand`. El texto está dividido entre dos spans adyacentes y el enlace tiene
   `aria-label="Materos Quinieleros, Jornadas"`; la comprobación no encuentra la
   etiqueta visible completa en el nombre calculado. Se reproduce en las tres
   vistas públicas y en las cuatro secciones administrativas a 1440 y 390 px.
   Referencia de código: `src/app/shell.ts`. Revisar el espacio/separación textual
   y repetir axe; no se ha cambiado ni publicado el frontend en esta revisión.
2. **Móvil: insignia fija de Netlify sobre la tabla.** En Clasificación a 390 px,
   «Powered by Netlify» tapa parcialmente una fila al inicio. Evidencia:
   `test-results/production-ui/public-public-UI-mobile-na-d915a--keyboard-and-accessibility/leaderboard.png`.
   Revisar su configuración/posición; no se acredita una pérdida permanente de
   datos y el documento no presenta desbordamiento horizontal.
3. **Texto del estado vacío desactualizado.** Jornadas indica que el administrador
   añadirá la siguiente jornada, aunque el flujo previsto la importa desde SELAE.
   Referencia: `src/app/features/journeys/journeys-page.html`.

### Comportamiento comprobado

- Las rutas públicas cargan, navegan y recargan, con títulos, foco, navegación por
  teclado y selector operativos en 1440, 768 y 390 px. Sin errores JavaScript no
  capturados ni fallos de red/HTTP en los recorridos públicos probados.
- Los secretos administrativos están operativos: la API declara acceso
  configurado y acepta una sesión firmada con la configuración local. Los
  paneles Personas, Jornadas, Competiciones y Quinielas cargan y la sesión continúa
  tras recargar en escritorio y móvil. Las aserciones funcionales pasan; las
  pruebas completas de pantalla fallan por el hallazgo de accesibilidad.
- Visitantes y cookies fabricadas no acceden al panel privado. Se rechazan
  orígenes ajenos y escrituras públicas. Con sesión válida también se rechazan
  origen ajeno y revisión inválida (403 y 409), conservando la revisión privada.
- Las API responden con `no-store`, `nosniff` y variación por cookie; HTTPS lleva
  HSTS. No se observan configuración privada o secretos en el JSON público ni
  exposición de `/.env`, `/server/seed.json` o `/data/season.json`. El fallback
  HTML de la SPA con estado 200 no se interpreta como exposición del archivo.
- Recuperar visibilidad refresca `/api/season`; el navegador no consulta SELAE ni
  OddsPapi. Los bundles publicados incluyen Competiciones y Sincronización y los
  nombres del main/CSS coinciden con el build local integrado en main.

### Pendientes operativos y límites

En las muestras iniciales se observan nueve participantes, cero jornadas,
`currentJourneyId: null`, revisión privada `initial` y ausencia de estado de
sincronización tanto público como privado. Eso es compatible con un despliegue
sin primera escritura; **no demuestra que Blobs falle ni que el cron funcione**.
No se ha pulsado la sincronización manual para no mezclarla con evidencia de una
ejecución programada.

La última lectura pública, a las 12:00:16 de Madrid (`2026-10-30T11:00:16Z`),
seguía mostrando cero jornadas y ningún estado de sincronización. Una observación
tan próxima al cuarto de hora no basta para declarar un fallo del cron.

Quedan sin acreditar el cron de Netlify, importación real de los quince encuentros,
guardado y persistencia entre despliegues, conflictos de escrituras reales,
pronósticos poblados ocultos antes del cierre y resultados oficiales futuros.
Cuatro escenarios se omiten por no tener jornadas o estado del worker. Revisar
en Netlify el registro/ejecución de `synchronize` y repetir tras la primera importación.

**OddsPapi aún no está configurado**, según el usuario. No se llama a su API ni
se consume cuota. La ausencia de marcadores provisionales es esperada y no se
clasifica como fallo. La importación de SELAE debe funcionar sin esa clave.

La auditoría usa Chromium, no Safari/Firefox ni lector de pantalla real. Axe es una
comprobación automatizada y no certifica conformidad WCAG. La primera pasada pública
omitía la etiqueta `wcag21a`; al ampliar correctamente la cobertura se reprodujo el
hallazgo del logotipo también fuera del panel. Una repetición administrativa móvil
no completó la consulta de sesión; la siguiente completó todo el recorrido y solo
falló por axe. No hay evidencia suficiente para atribuir aquella incidencia al
límite de peticiones. Un sondeo auxiliar de diagnóstico falló por codificación del
texto del selector en PowerShell, sin ser un fallo del producto.

Los 33 tests Angular, 47 de servidor y ocho E2E locales aprobados durante la
integración de main son evidencia previa; no se han repetido en este encargo.
