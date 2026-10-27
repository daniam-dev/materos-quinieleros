# Estado actual

## 2026-10-27 - Filtro de competiciones implementado en local

El usuario elige conservar boletos SELAE completos y habilitarlos o excluirlos segun sus competiciones. Implementados panel Competiciones, catalogo de siete competiciones y grupo Otras competiciones, filtro persistente privado y clasificacion manual explicita de todos los torneos presentes en los 15 cruces. Reglas y motivos en docs/competiciones.md; enlaces desde administracion, flujo y sincronizacion. API aplica filtro publico y rechazo de apuestas excluidas o pendientes; historial ya habilitado al guardar y apuestas cargadas se conservan. No se deduce torneo por equipos o fecha. Clasificacion automatica solo con los 15 torneos reconocidos; manual ligada a hash de cruces/orden. Filtro inicialmente desactivado por compatibilidad. Worker mantiene SELAE y omite OddsPapi para excluidos/pendientes usando configuracion al inicio del ciclo.

Verificacion final: npm run check aprobado (33 Angular y 47 servidor, formato, texto, lint, TypeScript, build 498,24 kB). Ocho E2E aprobados en segunda pasada final (25,1 s), con API real y persistencia temporal, proveedores deportivos simulados; cobertura de exclusion mixta, identificacion, recarga y rehabilitacion. Capturas Competiciones en escritorio/movil y auditoria axe sin defectos materiales en estados probados. La suite detecto una incompatibilidad con un fixture minimo de privacidad; se corrigio su clasificacion como desconocida y la suite completa pasa. Se verifica seleccion nula explicita y temporada publica frente a boletos excluidos. Functions empaquetadas con esbuild; git diff --check aprobado. Puertos 4200/8888 cerrados. Sin consumo de cuota real, cambios de secretos/datos locales, commit, push ni despliegue. Rama feat/automatic-journeys-results sobre 1c34c43, cambios pendientes locales.

## 2026-10-27 - Automatizacion publicada en rama

El usuario autoriza subir los cambios a una rama. Creada feat/automatic-journeys-results desde main; HEAD y origin/main coincidian en 1ca7108 tras fetch, sin necesidad de rebase. Publicado 00f17101e8eb416b2cfadae8c2b254b43d40c220 (feat: automate journey imports and result tracking), confirmado con ls-remote y conector GitHub. Incluye implementacion, pruebas y guia docs/flujo.md. main permanece en 1ca7108; no se ha fusionado ni solicitado despliegue. El registro de memoria se prepara en un commit docs adicional en la misma rama.

Validacion repetida antes del push: npm run check aprobado (33 Angular, 40 servidor, formato, UTF-8/LF, lint, TypeScript y build 497,31 kB). Los ocho E2E del turno anterior cubren el mismo codigo; no se repiten tras cambios solo documentales. Escaneo del indice sin rutas privadas, artefactos ni patrones de secretos detectados. GitHub devuelve statuses vacios para el commit funcional: no certificar CI remota. Pendientes de Netlify y OddsPapi real sin cambios; publicar la rama no acredita puesta en servicio.

## 2026-10-27 — Importación automática y resultados terminados en local

Recuperado el encargo del 26/10 tras interrupción por límite de uso, verificando primero el árbol sobre 1ca7108. Implementación sin commit, publicación ni despliegue. SELAE descubre e importa por identidad oficial; worker programado de producción, actualización de horarios, selección determinista e histórico. Administración usa jornadas importadas y conserva personas; hasta dos dobles con validación en servidor y navegador. Datos deportivos separados de apuestas privadas, revisiones y lease; ranking oficial separado del marcador provisional. OddsPapi preparado con reservas duraderas, contraste de cuenta, máximo operativo 200 y reserva de 50, sin llamadas por visitante. Detalle y límites en docs/sincronizacion.md.

Validación final: npm run check aprobado, 33 pruebas Angular y 40 servidor, build 497,31 kB; ocho E2E repetidos tras el último ajuste (24,7 s), tres Functions empaquetadas con esbuild. Revisión visual de Administración y comparativa en escritorio/móvil sin defectos materiales en estados capturados; límites en docs/verificacion.md. Seed intacto, nueve participantes, sin modificación de datos locales ni secretos. Escaneo del build sin clave/nombre de variable deportiva, endpoint OddsPapi ni contraseñas de prueba. Puertos 4200/8888 cerrados.

SELAE real comprobado: jornada 17 con 15 encuentros y jornada 16 con 15 horarios, 14 signos y Pleno. Corregido parser ante formato v3 real sin posiciones/temporada y horarios omitidos en resultados; muestra pública reducida para regresión en server/testing/selae-v3-sample.json. PowerShell fue rechazado; fetch Node funcionó. No se realizó consulta autenticada OddsPapi ni se consumió cuota. Pendientes operativos: secretos en Netlify, ejecución remota, cuenta/renovación, identidad y cobertura deportiva reales. Las simulaciones no acreditan esos pendientes.

## 2026-10-27 - Guia del flujo de la aplicacion

Creada docs/flujo.md y enlazada desde README y docs/administracion.md. Explica preparacion inicial, rutina del admin, cierre y privacidad, resultados provisionales/oficiales, clasificacion, sincronizacion, presupuesto e incidencias, con diagrama. Contrastada con rutas, worker, API, refresco y scoring. Solo documentacion: formato, UTF-8/LF, enlaces locales y git diff --check aprobados; no se repitieron pruebas de aplicacion. Sin publicacion ni despliegue.

## Referencias

Las decisiones y su evolución permanecen en DECISIONS.md. El estado de turnos previos, incluyendo publicaciones y limitaciones históricas, se conserva íntegro en [estado hasta el 26/10](topics/archive/current-through-2026-10-26.md). Para pendientes actuales consultar ROADMAP.md y docs/sincronizacion.md.
