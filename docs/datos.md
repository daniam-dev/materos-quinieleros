# Cargar jornadas y quinielas

Daniel Arroyo entra en `/acceso` como `daniel-arroyo`. **Administración** solo aparece con su sesión validada. [Preparar el acceso](administracion.md).

1. En **Jornadas**, introduce número, Liga o Champions / Europa League, cierre y los 15 encuentros reales con sus fechas. Se usa la zona horaria del dispositivo y se guarda en UTC. El cierre no puede ser posterior a ningún encuentro. La primera jornada se asigna como actual.
2. En **Quinielas**, selecciona jornada y participante. Marca los 14 signos o pega 14 valores `1`, `X`, `2` separados por espacios, comas o saltos de línea. Completa el Pleno con `0`, `1`, `2` o `M` y guarda.
3. Para corregir, selecciona persona y jornada. Se recuperan los valores; **Actualizar quiniela** sustituye la apuesta sin duplicarla.
4. En **Personas**, añade nombre y apellidos. **Dar de baja** exige confirmar y conserva el histórico. **Reincorporar** permite volver a jugar. Daniel no se puede desactivar desde el panel.
5. En **Jornadas**, cambia la actual o selecciona «Sin jornada actual». Las anteriores permanecen en el histórico.

Los pronósticos quedan fuera de la respuesta pública hasta `closesAt`, inclusive en el instante de cierre. Daniel puede corregirlos también después del cierre; esas correcciones afectan a la comparativa pública. Las vistas públicas se actualizan al recargar, sin sincronización en tiempo real.

El contrato está en `src/app/domain/models.ts`. La API valida las relaciones y guarda la quiniela completa (14 signos y Pleno), inscribiendo al participante en la jornada. Una persona inactiva conserva sus apuestas; se puede corregir una jornada en la que ya participó.

Los datos iniciales están en `server/seed.json`, fuera de los archivos públicos. Se usan solo si aún no hay snapshot guardado. Los cambios se conservan en `.netlify/local/season.json` en desarrollo o en Netlify Blobs en servidor. Editar el seed no reemplaza datos guardados. No hay jornadas ficticias en los datos iniciales; los tests crean entradas temporales aisladas.

No hay todavía editor de resultados oficiales ni conexión deportiva. No se deducen signos oficiales a partir de marcadores.
