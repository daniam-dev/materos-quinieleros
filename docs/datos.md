# Jornadas importadas y quinielas

Daniel Arroyo entra en `/acceso` como `daniel-arroyo`. **Administración** solo aparece con su sesión validada. [Preparar el acceso](administracion.md).

1. Las jornadas se importan automáticamente de SELAE. En **Jornadas** se muestran sus estados y el de las fuentes; el reintento es para incidencias, no un paso semanal.
2. En **Quinielas**, selecciona jornada y participante. Marca los 14 signos o pega 14 valores `1`, `X`, `2`, `1X`, `12`, `X2` separados por espacios, comas, punto y coma o saltos de línea. También se aceptan 14 sencillos sin separadores. Hasta dos dobles por persona, sin triples. Completa el Pleno con `0`, `1`, `2` o `M` y guarda. El contador y el servidor rechazan el tercer doble. El listado indica qué personas tienen la quiniela completa.
3. Para corregir, selecciona persona y jornada. Se recuperan los valores; **Actualizar quiniela** sustituye la apuesta sin duplicarla.
4. En **Personas**, añade nombre y apellidos. **Dar de baja** exige confirmar y conserva el histórico. **Reincorporar** permite volver a jugar. Daniel no se puede desactivar desde el panel.
5. La actual se selecciona automáticamente: primero la más antigua empezada sin los 14 signos y el Pleno confirmados; después la próxima; finalmente la última disponible. Un aplazamiento no liquidado mantiene esa jornada actual. El selector conserva el histórico de todas las temporadas.

Los pronósticos quedan fuera de la respuesta pública antes de `closesAt` y se publican en el instante de cierre. Se usa el cierre de venta publicado por SELAE, limitado por el primer inicio conocido. Si SELAE no publica cierre, se usa el primer inicio únicamente cuando se conocen los 15 horarios; ese sustituto es una regla de la app, no una hora de venta oficial. Sin cierre ni todos los horarios siguen privados. Los cambios anteriores al cierre recalculan ese instante; una jornada publicada no se vuelve a ocultar. Daniel puede corregir también después del cierre.

Las vistas leen la copia compartida cada cinco minutos mientras la pestaña está visible y al volver a ella, conservando selección, filtros y posición. El panel conserva los campos sin guardar y detecta revisiones privadas de otra sesión. Abrir la web no consulta proveedores deportivos.

El contrato está en `src/app/domain/models.ts`. La API valida las relaciones y guarda la quiniela completa (14 signos y Pleno), inscribiendo al participante en la jornada. Una persona inactiva conserva sus apuestas; se puede corregir una jornada en la que ya participó.

Los datos iniciales están en `server/seed.json`, fuera de los archivos públicos. Se usan solo si aún no hay snapshot guardado. Los cambios se conservan en `.netlify/local/season.json` en desarrollo o en Netlify Blobs en servidor. Editar el seed no reemplaza datos guardados. No hay jornadas ficticias en los datos iniciales; los tests crean entradas temporales aisladas.

Los marcadores son provisionales. Solo los signos SELAE confirman aciertos, fallos y victorias históricas. Un doble acertado suma un acierto, hasta 14; el Pleno sigue separado. No hay premios económicos ni un sistema nuevo de puntos. [Configuración y funcionamiento de las fuentes](sincronizacion.md).
