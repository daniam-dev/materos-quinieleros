# TO-DO: identificación eficiente con OddsPapi y simplificación de Competiciones

Estado: pendiente, sin implementar. Encargo del usuario del 30/10/2026: investigar documentación, preparar el plan y conservarlo como TO-DO; no modificar la aplicación ni desplegarlo.
Base contrastada: main b025269 (implementación funcional aa06103). La clave y cobertura reales de OddsPapi siguen pendientes; esta investigación no hace llamadas autenticadas.

## 1. Competiciones como filtro deja de aportar al nuevo flujo

Propuesta: retirar la pestaña y los interruptores globales de Competiciones del uso normal. Daniel ya selecciona el boleto al subirlo y confirmarlo; no necesita volver a autorizar sus ligas.
Conservar en el modelo los metadatos de torneo, país y categoría M/F para identificar partidos, así como el histórico y configuraciones previas. No borrar datos ni reinterpretar resultados antiguos al simplificar la interfaz.
Los casos ambiguos se resolverían en la revisión del boleto o en una acción «Revisar correspondencias», no en otro filtro de ligas.
La retirada es una propuesta de este plan, no una implementación ni una decisión de borrado aprobada.

## 2. P0: resolver el contrato del proveedor antes de activar la clave

Hechos verificados en documentación oficial el 30/10/2026:
- /fixtures documenta estados 0 no iniciado, 1 en juego, 2 finalizado, 3 cancelado.
- /fixture describe 0 pre-game, 1 scheduled, 2 in-play, 3 ended. Es una contradicción real entre páginas, no evidencia de cuál responde así en la cuenta.
- /scores muestra períodos numéricos sin semántica suficiente. La guía técnica del propio proveedor usa scores.periods.p1, fulltime y result, distinguiendo tiempo reglamentario de resultado final.

El código actual de server/providers/oddspapi.mjs y server/synchronize.mjs presupone statusId=2 final también para /fixture. Por ello no se debe considerar validado con datos reales ni activar confirmaciones automáticas sin resolver esta discrepancia.
TODO: comprobar con una muestra mínima presupuestada de la cuenta y/o confirmación del proveedor un partido programado, uno en juego y uno terminado; conservar respuestas reducidas sin secretos como regresiones. Verificar nombres de estados, tiempos y períodos. Un estado desconocido o contradictorio debe quedar pendiente, nunca confirmarse.
Verificar resultado final en prórroga/tanda: no sumar períodos ni confundir fulltime con result. No habilitar una alternativa numérica o un fallback cuando su significado sea ambiguo. Esta validación será un trabajo posterior, no está autorizada para ejecutarse en este turno.

## 3. Identificar quince cruces con una consulta compartida

TODO:
- Mantener el borrador OCR y la confirmación humana de los quince cruces, orden y M/F, además de fecha/cierre explícitos.
- Al guardar, programar desde el servidor una consulta /v4/fixtures con sportId=10 y una ventana UTC de siete días que cubra la semana indicada. El límite documentado con sportId y from/to es inferior a diez días.
- No pedir cuotas de casas, bookmakers ni mercados; no imponer hasOdds=true ni filtrar solo futuros: se perderían partidos terminados o sin cuotas.
- Reutilizar la respuesta para todos los boletos pendientes con la misma ventana o una ventana ya cubierta. Caché por deporte, rango, idioma y versión del contrato. Fusionar ventanas solo si la consulta sigue siendo inferior a diez días; dividir cuando no.
- Distinguir las filas relevantes del boleto del conjunto retornado: el proveedor puede devolver más partidos, pero la app solo vincula y sigue los seleccionados.
- Comparar los dos equipos en su orden local/visitante, fecha/rango, M/F y evidencia de torneo/categoría. Coincidencia única o revisión del admin; no elegir el primer candidato ni usar parecido difuso como aceptación.
- Normalizar espacios, acentos y abreviaturas explícitamente revisadas. Un alias se guarda con alcance de identidad/categoría; nunca unir equipos masculinos y femeninos o reservas por compartir nombre.
- Guardar fixtureId, participant1Id, participant2Id y tournamentId en el vínculo estable. Reutilizar las identidades guardadas en próximas jornadas; no volver a resolver nombres por cada actualización.
- Si falta una coincidencia, presentar candidatos del caché para confirmación manual. Una ausencia temporal en una respuesta posterior no borra el fixtureId previamente verificado; una contradicción detiene ese vínculo para revisión.
- Verificar unicidad: un fixtureId no puede asignarse a dos posiciones del mismo boleto. Si varios boletos incluyen el mismo partido, compartir caché/resultado por fixtureId y no consumir dos consultas por ello.

## 4. Metadatos técnicos, sin catálogo cerrado como puerta de acceso

Las respuestas de /fixtures pueden incluir nombres y torneo; /participants devuelve un diccionario ID-nombre y /tournaments los torneos.
TODO: consultar esos catálogos solo cuando falten metadatos necesarios, compartirlos entre boletos y cachearlos aproximadamente treinta días con clave de idioma/versión y caducidad real.
No consultar /participants por cada equipo ni /tournaments por cada cruce. Son endpoints facturables.
La documentación consultada no promete un campo universal de género: la categoría del torneo debe estar verificada mediante metadatos/equivalencias revisadas o confirmación; no inventar un isWomen ni deducir la liga por equipo.
Revisar la tabla cerrada tournaments del adaptador actual: debe ayudar a desambiguar, no excluir automáticamente competiciones que Daniel ya eligió para su boleto.
Separar estados de revisión de los de exclusión: pendiente de vincular no significa que el grupo haya decidido no jugar.

## 5. Actualizar horarios y finales por bloques

TODO:
- Planificador persistente por trabajos realmente pendientes; el cron puede despertar cada quince minutos sin hacer peticiones de pago si no hay trabajo vencido.
- Una consulta compartida de /fixtures cuando se necesite resolver un boleto, una revisión próxima al cierre y consultas tras bloques de encuentros. Su estado/horario puede aprovecharse para muchos fixtureId simultáneamente.
- Sustituir el patrón de una llamada /fixture por cada partido para averiguar si terminó por estados del listado en bloque, solo una vez validada su semántica. /fixture queda para incidencias puntuales justificadas.
- Mantener siempre el cierre explícito aprobado: los horarios del proveedor no son cierre comercial SELAE; no ampliar el cierre ni reabrir apuestas publicadas.
- El horario sirve para decidir cuándo mirar, nunca como prueba de final. Solo un estado terminal verificado programa /scores del ID correspondiente.
- /scores documenta un fixtureId por petición: una lectura por partido finalizado es el objetivo normal; no asumir un parámetro masivo inexistente.
- Priorizar lectura final y clasificación. Los marcadores intermedios son opcionales si queda presupuesto después de reservar los finales.
- Cachear el resultado confirmado por fixtureId y período definido. Recalcular signos 1/X/2, Pleno y clasificación en nuestra copia, sin consultas adicionales por participante o visitante.
- Conservar correcciones administrativas y sus motivos por encima de resultados deportivos posteriores.
- Estados aplazado/suspendido, cobertura incompleta o errores programan comprobaciones limitadas con enfriamiento y techo de intentos. No repetir indiscriminadamente todos los partidos ni dar por terminado uno sin evidencia.
- Leer códigos de error sanitizados, especialmente RATE_LIMITED frente a REQUEST_LIMIT_EXCEEDED; respetar retryMs/Retry-After cuando estén presentes mediante el planificador, sin bucles de reintento inmediato ni logs con la URL que contiene la clave.

## 6. Presupuesto explícito y estimación

Hechos de la documentación: cada petición a fixtures, fixture, scores, participants o tournaments consume una unidad, independientemente de cuántos elementos devuelva. Errores procesados también consumen. /account es no medido y accesible aun agotada la cuota.

Mantener límites del proyecto: operativo min(200, max(0, request_limit - 50)); absoluto min(250, request_limit); jamás usar los cincuenta protegidos automáticamente.
Consultar /account antes de trabajo facturable, guardar solo uso/límite/identidad/fechas necesarios y reservar cada llamada durablemente antes de salir. Mantener lease/CAS, límites de tiempo y contadores compartidos.
Verificar la renovación real de la suscripción: la página de cuota habla del primer día del mes para el plan gratuito, pero no basta para inventar el período de cualquier cuenta. Resolver el caso de subscription_id/valid_from estables, valid_until=null y renovación de request_count; no reiniciar silenciosamente por calendario local o un descenso aislado.

Ejemplo ideal propuesto, no medida ni garantía de cobertura:
| Trabajo para un boleto de 15 encuentros | Peticiones de pago |
| --- | ---: |
| Descubrimiento de la semana | 1 |
| Revisión de horarios próxima al cierre | 1 |
| Estados agrupados en tres bloques | 3 |
| Resultado final de cada encuentro | 15 |
| Total con caché de metadatos caliente | 20 |

Ocho boletos así supondrían 160 llamadas, dejando cuarenta del margen operativo para metadatos compartidos, bloques extra e incidencias; los cincuenta protegidos permanecen fuera. Los catálogos en frío pueden añadir hasta dos consultas compartidas si hacen falta. Nueve o diez boletos, más bloques, errores o cobertura tardía requieren redistribuir presupuesto y pueden dejar resultados pendientes: no prometer finalización con un número fijo de llamadas.
Una lectura intermedia de los quince encuentros añade otras quince llamadas por boleto; no puede prometerse para todos con doscientos operativos.
Frente a ello, el código actual usa estado individual /fixture más /scores para finales: ya son treinta llamadas por boleto antes de búsquedas, revisiones y provisionales. El beneficio principal del plan es compartir estados y consultas por identidad, no consultar más endpoints.

## 7. Orden y aceptación del trabajo futuro

1. Resolver contrato de estados/períodos y cubrirlo con regresiones antes de activar confirmación real.
2. Retirar filtro visible de Competiciones conservando histórico y metadatos.
3. Vínculos estables por ID, caché de ventanas y alias/candidatos revisables.
4. Estados compartidos en lote, final único por partido y presupuesto por trabajo real.
5. Prueba controlada de cuenta/cobertura y evidencia de consumo antes de habilitar operación automática.

Aceptación:
- Quince cruces, incluido Pleno, no generan quince búsquedas; dos boletos solapados reutilizan respuesta/IDs.
- Mismo nombre M/F, local/visitante invertidos, alias y partidos repetidos no producen falsos vínculos.
- Ausencia temporal no destruye un vínculo válido; categoría o identidad contradictoria requiere revisión.
- Evento en juego nunca confirma un signo aunque ya tenga marcador; períodos ambiguos nunca liquidan.
- Cachear finales impide llamadas duplicadas por visitante, recarga, ejecución concurrente o boleto compartido.
- Errores, cooldown, renovación y cuota inferior a cincuenta conservan los límites y la reserva.
- Apuestas privadas, histórico, cierre y correcciones sobreviven al cambio; simulaciones y verificación real se informan separadamente.

## Fuentes primarias consultadas el 30/10/2026

- [Fixtures, filtros y campos](https://oddspapi.io/en/docs/get-fixtures)
- [Fixture individual; contradicción de estados](https://oddspapi.io/en/docs/get-fixture)
- [Participants](https://oddspapi.io/en/docs/get-participants)
- [Tournaments](https://oddspapi.io/en/docs/get-tournaments)
- [Scores; ejemplo de períodos numéricos](https://oddspapi.io/en/docs/get-scores)
- [Guía del proveedor; períodos result/fulltime](https://oddspapi.io/blog/football-data-api-betting-predictions/)
- [Cuota y endpoints medidos](https://oddspapi.io/en/docs/requests-and-quota)
- [Cuenta y suscripción](https://oddspapi.io/en/docs/get-account)
- [Errores y limitación de frecuencia](https://oddspapi.io/en/docs/errors)
