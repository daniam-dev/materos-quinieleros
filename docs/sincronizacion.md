# Importación y seguimiento automático

## Configuración inicial

Se mantienen Angular, Netlify Functions y Netlify Blobs. La publicación queda fuera del encargo.

1. Configurar `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET` solo en **Functions**, según [Administración](administracion.md).
2. Configurar **`ODDSPAPI_KEY` exclusivamente en Functions y producción**, con una suscripción exclusiva de Materos. No poner su valor en Angular, repositorio, documentación o logs. Sin ella funciona SELAE y se informa de que faltan los marcadores OddsPapi.
3. En el futuro despliegue, comprobar que Netlify registra `synchronize` con `*/15 * * * *` (UTC). No depende de visitantes. Previews y ramas no ejecutan el horario automáticamente; el código también desactiva OddsPapi fuera de producción.
4. Verificar allí SELAE, importación, persistencia y privacidad. Contrastar `/account` y comprobar deliberadamente una muestra de identidad y marcadores antes de acreditar cobertura real. Una muestra de fixtures y un marcador consume al menos dos llamadas, más metadatos si faltan nombres/torneos.

Las funciones programadas tienen un límite de **30 segundos**. El worker deja de iniciar trabajo a los 18 segundos, usa timeouts HTTP de tres segundos, guarda avances y continúa en la siguiente ejecución. Hasta cuatro boletos y doce llamadas facturables por ejecución, limitados también por tiempo y cuota. [Programación y límites de Netlify](https://docs.netlify.com/build/functions/scheduled-functions/).

Producción usa `quinielas-production`, estable entre despliegues. Previews y ramas conservan el aislamiento por contexto e ID de deploy. **OddsPapi no se consulta en previews ni desarrollo local**, aunque el proceso herede una clave. El botón local consulta SELAE; E2E utiliza proveedores simulados y almacenamiento temporal. No ejecutar dos procesos locales sobre el mismo directorio.

## SELAE y calendario

`server/providers/selae.mjs` encapsula:

- `proximosv3?game_id=LAQU&num=3`: descubrimiento cada seis horas, sin asumir fines de semana.
- `sorteov3?game_id=LAQU&target=igual&idsorteo=…`: lectura por ID oficial.
- `fechav3?game_id=LAQU&fecha_sorteo=AAAAMMDD`: alternativa a una respuesta vacía por ID y recuperación rotatoria de hoy y los siete días anteriores. Cada fecha se comprueba como máximo una vez al día.
- `buscadorSorteos`: complemento de horarios para respuestas de resultados que ya omiten la fecha de los encuentros jugados. Se exige el mismo ID, fecha y los 15 cruces en el mismo orden antes de usar su calendario.

La identidad exige juego, ID, temporada, jornada y fecha del sorteo. El listado v3 publica `fecha`, `jornada` y `cierre`, sin temporada; esta se deriva de la fecha publicada siguiendo julio-junio. El detalle debe confirmar ID, juego y fecha; cualquier temporada/jornada explícita contradictoria se rechaza. El detalle compacto no publica posiciones: se respeta su orden de array. Si trae posiciones, se exigen las 15 únicas y consecutivas; una numeración parcial se rechaza. Los IDs internos `selae-ID-posicion` son estables. Un cambio de horario conserva apuestas; cambiar cruce, orden o categoría produce error y conserva la jornada para revisión técnica. No se inventan partidos ni se pide completar el boleto a mano. Las importaciones pendientes se conservan entre ejecuciones.

Las horas locales se convierten usando `Europe/Madrid`, con invierno/verano. Se rechazan horas inexistentes o ambiguas por cambio de reloj; no se añade `Z` a una hora local. Un horario ausente es `null`. Los sufijos publicados `(m)` y `(f)` conservan género, pero no deducen liga. Sin evidencia se muestra **Boleto SELAE**, no una competición supuesta por día o equipo.

Las jornadas pendientes se revisan en cada ejecución por turnos; las confirmadas, cada 24 horas, para recoger correcciones. Una respuesta completa válida puede corregir o retirar un signo. Un signo sin cambios conserva su fecha de publicación anterior. SELAE puede confirmar una X sin que exista marcador: no se inventa un 0–0 ni se fuerza la equivalencia con goles deportivos.

La selección actual y el cierre están en [Datos](datos.md). Se conservan los IDs de temporada existentes (`2026-27`); al cambiar de temporada, la copia toma la de la jornada actual. El selector conserva todas las anteriores.

## OddsPapi: identidad y resultados

`/v4/fixtures` se consulta por rango menor de diez días, sin filtrar por cuotas disponibles ni excluir partidos iniciados. Se exigen ambos equipos, local/visitante, género, torneo explícito y una diferencia horaria máxima de una hora. Hay equivalencias revisadas, nunca aproximaciones por parecido. La coincidencia ambigua o fuera del catálogo queda sin cobertura deportiva; SELAE sigue independiente. Si faltan nombres/torneos, `/participants` y `/tournaments` se cachean 30 días y también se cuentan. [Contrato de fixtures](https://oddspapi.io/en/docs/get-fixtures).

Se planifican consultas a inicio +60 y +120 minutos usando horarios actualizados. Si la ejecución llega después de +120, se omite la intermedia atrasada. Un intento se registra antes del HTTP y no se repite tras error o interrupción. Un horario cambiado permite nuevo descubrimiento, pero no borra intentos gastados. Futuros, cancelados/suspendidos conocidos y confirmados oficialmente quedan excluidos del seguimiento de marcadores. Una cola puede desplazar la consulta al siguiente ciclo: no hay directo riguroso.

`/scores` recibe **un fixtureId**. Ante error conserva el último marcador y lo señala desactualizado. No se deducen minuto, descanso o final por el reloj. Solo `fulltime` se muestra como provisional a 90 minutos; prórroga, agregado y tanda permanecen separados, nunca se suman ni se convierten en resultado oficial. El parser rechaza periodos numéricos ambiguos: [GET scores](https://oddspapi.io/en/docs/get-scores) muestra ese formato, mientras la [guía actual del proveedor](https://oddspapi.io/blog/football-data-api-betting-predictions/) documenta `scores.periods.fulltime` y `result`. Falta contrastar esa discrepancia con la suscripción real.

## Presupuesto y concurrencia

Antes del trabajo facturable se consulta `/account`. Se conserva solo periodo, fechas, límite y uso, nunca la respuesta completa que incluye la clave. La identidad procede de la suscripción activa y sus fechas. No se reinicia por el calendario local ni por un descenso inexplicado. Si al renovar el proveedor no cambia la identidad del periodo, el contador permanece: habrá que verificar el ciclo antes de una intervención técnica. [Cuenta](https://oddspapi.io/en/docs/get-account).

Límite absoluto: `min(250, request_limit)`. Operativo: `min(200, max(0, request_limit - 50))`. Los 50 restantes se protegen; el botón normal no los consume. Una suscripción inferior a 50 detiene todo consumo facturable. No se ha habilitado gasto de emergencia sin control.

El contador prudente es el mayor entre uso observado y reservas locales. Cada llamada se carga **antes de salir**: descubrimiento, metadatos, marcadores, errores y transporte incierto. No hay retries HTTP automáticos. Se reserva margen para los finales conocidos o dos jornadas por semana hasta fin del periodo (31 días si se desconoce), más cuatro llamadas de descubrimiento/metadatos. Si no cabe, se omiten las intermedias. El límite operativo se mantiene aunque aparezcan más jornadas de las previstas. [Cuota y errores facturables](https://oddspapi.io/en/docs/requests-and-quota).

`season` contiene personas y apuestas con su revisión privada; `sports-v1`, jornadas, resultados, estados, intentos y presupuesto. La API los une al leer. El sincronizador **nunca escribe `season`**. El guardado administrativo modifica solo datos privados; los sencillos existentes siguen válidos sin una migración destructiva. Los comandos antiguos de creación/selección se conservan por compatibilidad, pero el panel ya no los usa.

Un bloqueo con token y CAS/ETag protege el worker. Cada escritura comprueba token, vigencia y revisión. El bloqueo caduca a los dos minutos para recuperar procesos muertos; los intentos/reservas **no caducan ni se devuelven**, porque pudieron facturarse. Un worker antiguo no sobrescribe a otro. [Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).

Las rutas públicas solo leen la copia compartida. La sincronización privada exige sesión, mismo origen y revisión, con enfriamiento de un minuto. El navegador refresca cada cinco minutos visible y al recuperar visibilidad, sin consultas deportivas por visitante.

## Evidencia y límites

Revisados en solo lectura los cuatro archivos solicitados de `daniam-dev/quiniela-ai`. Se reutilizan criterios de identidad estricta, Madrid, presupuesto prudente y separación de marcadores/liquidación. No se modificó ese repositorio, no se ejecutaron sus comandos ni se usó su clave. No se ha añadido ESPN/Losilla como proveedor adicional.

La primera consulta SELAE con PowerShell devolvió **Access Denied**. La comprobación posterior con el cliente HTTP de Node obtuvo respuestas públicas válidas: jornada 17, ID `1326906062`, 15 encuentros y cierre `2026-10-27T19:00:00Z`; jornada 16, ID `1326606061`, 15 horarios, 14 signos y Pleno. Se adaptaron las diferencias v3 (`fecha`, fechas escapadas, metadatos ausentes y orden de array). La muestra reducida y su captura están en `server/testing/selae-v3-sample.json`; las pruebas reproducen esas respuestas sin red. Esto comprueba esas muestras, no disponibilidad continua de SELAE desde Netlify.

No se han hecho consultas autenticadas a OddsPapi ni consumido cuota real. No se ha desplegado ni verificado Blobs remoto, cron real o cobertura deportiva de una suscripción. [Verificación local](verificacion.md).
