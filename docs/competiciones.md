# Elegir los boletos que juega el grupo

En **Administración → Competiciones**, activa **Filtrar boletos por competición**, elige las competiciones habilitadas y pulsa **Guardar competiciones**. Solo Daniel puede guardar esta configuración. Se conserva en el almacenamiento privado del grupo, entre sesiones y sincronizaciones; no requiere cambiar variables de entorno ni desplegar para cada selección.

El catálogo permite elegir Primera División, Segunda División, Liga F, Copa del Rey, Champions League, Europa League y Conference League. **Otras competiciones** agrupa los torneos restantes: no permite distinguir individualmente entre ellos. Es un catálogo de selección del grupo, no una garantía de cobertura deportiva ni una lista de torneos que SELAE vaya a incluir.

## Regla para boletos mixtos

Un boleto SELAE mantiene siempre sus **14 encuentros y el Pleno al 15**. Si contiene varias competiciones, todas deben estar habilitadas. Por ejemplo, un boleto con Primera y Segunda queda excluido si Segunda está deshabilitada. No se quitan partidos sueltos ni se inventan otros para sustituirlos.

Con el filtro activo:

- **Habilitado:** los 15 encuentros tienen identificación completa y todas las competiciones están activas.
- **Pendiente:** falta identificación completa. No aparece en la web pública ni permite cargar apuestas.
- **Excluido:** contiene alguna competición deshabilitada. Tampoco aparece públicamente ni permite cargar apuestas nuevas.
- **Conservado:** pertenece al histórico que ya estaba habilitado al guardar la configuración o tiene quinielas cargadas. Se conserva íntegro, con sus resultados y clasificación, aunque después deshabilites una competición.

El paso del tiempo por sí solo no habilita un boleto pendiente o excluido. Puedes rehabilitarlo identificándolo o habilitando todas sus competiciones. Si deshabilitas todas las competiciones, no se admiten boletos nuevos; el histórico y las apuestas cargadas siguen disponibles. La jornada actual se elige entre los boletos visibles.

La primera instalación deja el filtro **desactivado** para conservar el comportamiento anterior. Con el filtro desactivado están disponibles todos los boletos importados; los interruptores de competición solo se aplican al activar y guardar el filtro.

## Identificar un boleto

SELAE no siempre publica la competición de cada partido. La aplicación no la deduce del equipo ni del día de la semana. Puede usar los nombres de torneo del proveedor deportivo solo si reconoce los 15 encuentros, incluido el Pleno.

Cuando falte información:

1. Selecciona el boleto en **Identificar un boleto**, o usa **Identificar competiciones** desde Jornadas.
2. Revisa los 15 cruces que aparecen en pantalla.
3. Marca **todas** las competiciones presentes. Usa Otras competiciones si alguna no pertenece al catálogo.
4. Confirma que has revisado los 15 encuentros y guarda.

Esta es una declaración manual del administrador y así se identifica en el panel; no se presenta como información verificada por el proveedor. La aplicación comprueba que el boleto conserve los mismos cruces y orden al guardar. Si ha cambiado, exige recargar y revisarlo. Los cambios de horario y las sincronizaciones de resultados conservan la clasificación manual del mismo boleto.

## Sincronización y privacidad

La importación y confirmación oficial de SELAE continúan para todos los boletos, incluidos los excluidos. Las consultas de marcadores OddsPapi se omiten para los pendientes y excluidos; no se gasta cuota para intentar identificarlos automáticamente. Cuando los identifiques y habilites, el siguiente ciclo podrá consultar sus marcadores conforme a la cuota y cobertura existentes. Una ejecución del worker usa la configuración leída al iniciar ese ciclo.

La API pública aplica el filtro en el servidor y conserva la privacidad de los pronósticos hasta el cierre. El panel recibe todos los boletos para poder revisarlos. Las preferencias y las asignaciones manuales se guardan separadas de los datos deportivos, con sesión, origen y revisión privada obligatorios. Un cambio simultáneo desde otra sesión exige recargar; no se sobrescribe silenciosamente.
