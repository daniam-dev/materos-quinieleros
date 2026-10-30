# Jornadas desde foto y resultados deportivos

Este es el flujo elegido por el grupo el 30/10/2026. Sustituye la importación
automática desde SELAE: solo se añaden los boletos que Daniel confirma en el panel.
El rechazo HTTP 403 de SELAE deja de bloquear la preparación de una jornada.

## Preparar una jornada

1. Entra en **Administración → Jornadas → Añadir jornada desde una foto**.
2. Sube un JPG, PNG o WebP de hasta 12 MB, con los quince encuentros y su orden
   visibles. También puedes pegar texto numerado, por ejemplo
   `1. Levante (M) - At. Madrid (M)`, o introducir los encuentros manualmente.
3. Revisa los equipos, el orden y la categoría masculino/femenino. Los cruces no
   reconocidos quedan vacíos; no se inventan ni se reordenan. El último es el Pleno.
4. Introduce número y fecha de jornada y el cierre de apuestas. La hora se interpreta
   siempre en **Europe/Madrid**, independientemente del dispositivo. No se deduce
   el cierre de una foto que no lo contiene. La temporada julio-junio procede de la fecha.
5. Marca que has revisado los quince cruces, categorías y cierre, y guarda.
6. En **Quinielas**, elige participante, completa los catorce pronósticos y el Pleno.
   Se mantienen hasta dos dobles: un doble acertado suma un acierto.

El OCR usa Tesseract.js y el modelo español servidos desde el propio sitio. Se
cargan al elegir una imagen, fuera del bundle inicial. La foto se procesa en un
worker del navegador, no se envía a terceros ni se guarda en Blobs. El servidor
solo recibe los datos revisados. Si hay errores de lectura, se pueden corregir
en el formulario antes de confirmar. Las fotos de más de 24 megapíxeles se rechazan
para limitar memoria; el lienzo de trabajo se reduce a un máximo de 2200 píxeles.
Cambiar de sección termina el worker disponible y libera la previsualización.
Si todavía se está inicializando, se termina cuando devuelve su referencia.

La lectura distingue preparación de la imagen, carga del lector y reconocimiento.
Un fallo elimina el mensaje de progreso anterior, conserva los cruces del borrador
y permite volver a seleccionar la foto o continuar con texto o entrada manual.
La carga del lector tiene un límite de treinta segundos. Tesseract no expone el
worker antes de completar la inicialización: si esta nunca termina, se recupera
el formulario, pero no se puede terminar expresamente ese worker mediante su API.

El OCR propone datos y no garantiza reconocer todos los encuentros. Una prueba
con una imagen sintética coloreada reconoció trece de quince; las filas 1 y 9
quedaron vacías. La revisión y corrección de los quince cruces sigue siendo
obligatoria antes de guardar. No se ha probado el archivo original de la foto
adjunta del usuario; la imagen sintética reproduce su formato de forma aproximada.
Consulta [el informe de pruebas](pruebas-ocr-local.md) y
[el administrador exclusivo de localhost](administracion.md#administrador-de-pruebas-en-localhost).

El filtro anterior de competiciones se conserva para el histórico importado de
SELAE. Un boleto añadido por el administrador ya representa una selección explícita
y no se excluye por ese filtro, aunque mezcle competiciones. Se conservan histórico
y apuestas anteriores, sin convertir sus signos SELAE en resultados deportivos.

## Qué se actualiza automáticamente

El worker de Netlify sigue programado cada quince minutos, sin depender de visitantes.
En producción usa `selectedOnly`: no llama a SELAE ni descubre nuevos boletos.
Adopta exclusivamente las jornadas deportivas guardadas por el administrador;
el almacenamiento deportivo no copia los pronósticos privados.

Con `ODDSPAPI_KEY` configurada, busca los encuentros dentro de los siete días que
rodean la fecha indicada. Exige local, visitante, categoría, torneo/categoría explícitos
del proveedor y una coincidencia única. Nunca elige entre candidatos ambiguos.
Si el administrador ya conocía un horario, también se exige una diferencia menor
o igual a una hora. Los nombres admiten solo equivalencias revisadas, no similitud difusa.
Un partido sin correspondencia queda pendiente; no se inventan ni horario ni resultado.

Los horarios se revisan como máximo una vez al día mientras el boleto esté pendiente
y dentro de la ventana operativa de cinco días antes/después de su fecha. El cierre
aprobado por el administrador nunca se amplía: si se conoce un comienzo anterior,
se adelanta el cierre. Después del cierre la proyección pública incluye los pronósticos;
el cálculo lo hace el reloj del servidor.

Se planifica una consulta de marcador a +60 minutos si hay presupuesto. Desde +120
se comprueba el estado de `/fixture`; solo `statusId: 2` con identidad coincidente
permite confirmar. Un reloj, un campo de marcador o `fulltime` por sí solos no prueban
que el partido haya terminado. Si todavía no terminó, hay comprobaciones acotadas
a +180 minutos, +6 horas y +24 horas; se omiten las intermedias ya atrasadas.

El resultado final usa `scores.periods.result` si existe, o `fulltime` tras la
finalización explícita. No se suman prórroga ni tanda. El mismo resultado alimenta
marcador confirmado y signo: local gana **1**, empate **X**, visitante gana **2**.
El Pleno convierte tres o más goles en **M**. No se presenta este dato como un signo
oficial de SELAE. El proveedor real y su formato todavía deben contrastarse con la cuenta.

## Clasificación y correcciones

Los resultados deportivos confirmados generan los signos que utiliza el cálculo
existente de aciertos, porcentajes y victorias. Un sencillo o doble acertado suma
uno, máximo catorce; el Pleno sigue separado. Los empates en aciertos comparten la
victoria. Los marcadores provisionales no liquidan resultados ni ganadores.

Después del cierre puedes entrar en **Administración → Resultados**, elegir la
jornada y corregir signos o el Pleno indicando un motivo. Las correcciones se guardan
en la revisión privada y prevalecen sobre el worker. Dejar «Usar OddsPapi» restaura
el resultado deportivo disponible; si falta, vuelve a estar pendiente. Para el Pleno
se completan ambos valores o se dejan ambos en blanco. Una actualización concurrente
de deportes no borra apuestas ni correcciones.

## Presupuesto y puesta en servicio

Se mantienen el máximo operativo de 200 peticiones, reserva protegida de 50 y techo
absoluto de 250 o el límite inferior real de la cuenta. Descubrimiento, metadatos,
estado de finalización y marcadores consumen reservas **antes** de cada petición;
también cuentan errores y transportes inciertos. No hay reintentos HTTP inmediatos.
La consulta de estado final añade consumo respecto al flujo de marcadores provisionales;
si no hay margen, se omiten intermedias y los resultados pueden quedar pendientes.
No se promete actualización en directo ni cobertura completa con esa cuota.

Sin clave deportiva puedes crear jornadas, cargar apuestas y usar el cierre automático.
No habrá actualización de horarios/marcadores ni signos automáticos hasta configurar
y verificar la clave. Puedes corregir resultados tras el cierre. La clave continúa
solo en Functions de producción; no se usa en el navegador ni en desarrollo local.
Las pruebas simuladas no acreditan cobertura real, finalización o renovación de cuota.

La implementación SELAE anterior se conserva para regresiones y compatibilidad;
el modo normal de producción y desarrollo ya no la consulta. Las E2E antiguas
mantienen proveedores de prueba aislados, sin red ni datos del usuario.
