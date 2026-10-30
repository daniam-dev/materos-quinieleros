# Próximos pasos

## Pendiente operativo de Cortex

Revisar confianza del proyecto y hooks con /hooks, reiniciar sesión y comprobar posteriormente eventos reales. Instalación local no equivale a activación verificada.

## Administración encargada el 26/10/2026

Implementados contratos público/privado, autorización de Daniel, API Functions, adaptador Blobs, panel de jornadas/quinielas/personas y bajas con histórico. Ver CURRENT y docs/administracion.md. El acceso local ya está configurado y la API confirma su disponibilidad; no se han leído los secretos del usuario. No se ha desplegado; antes de activar en Netlify hay que configurar secretos y verificar persistencia, permisos y límite de intentos reales.

## Automatización encargada el 26/10/2026

Implementada y validada localmente el 27/10. Sustituye la propuesta de integración deportiva posterior a un editor manual. Pendientes de configuración y verificación real en Netlify documentados en docs/sincronizacion.md y docs/verificacion.md; el despliegue queda fuera del encargo. Ver CURRENT para evidencia.

## Propuestas futuras; no comenzar sin encargo

1. Trazabilidad exhaustiva de correcciones y posibles herramientas técnicas para incidencias; no se ha encargado un editor manual de resultados.
2. Revisar migración Angular/PrimeNG 22 con licencia legítima y runtime compatible.
3. Antes de producción: lector de pantalla y Safari/Firefox, además de verificación remota de Functions/Blobs.

## 2026-10-27 - Seleccion de competiciones en administracion

Alternativa resuelta por el usuario: conservar boletos SELAE completos y seleccionar segun sus competiciones. Implementado y validado localmente; ver CURRENT, DECISIONS y docs/competiciones.md. Otras competiciones agrupa torneos fuera del catalogo inicial; no se ha encargado un catalogo personalizado por torneo. Publicacion, despliegue y cobertura deportiva real siguen sin acreditarse.

## Secuencia de puesta en servicio acordada - 2026-10-30

El usuario pide primero una guia para configurar los secretos administrativos actuales en Netlify, despues realizar pruebas y finalmente configurar ODDSPAPI_KEY. La clave deportiva queda pospuesta hasta esas comprobaciones. En este turno solo se prepara la guia: no se configuran valores remotos, no se despliega ni se consume cuota.

Actualizacion del 30/10: el usuario confirma que las variables administrativas en Netlify estan listas. Es una afirmacion del usuario; no se ha inspeccionado la configuracion remota ni verificado su aplicacion mediante un nuevo despliegue. Siguiente paso: despliegue y pruebas; OddsPapi sigue pospuesto.

## Propuestas ante rechazo SELAE en Netlify - 2026-10-30

El usuario solicita alternativas, sin elegir ni encargar implementacion todavia. Se propone para 1.0 importacion asistida: herramienta local consulta SELAE y genera archivo con identidad, fecha, cierre y 15 cruces; admin previsualiza/confirma y la aplicacion guarda copia independiente de disponibilidad externa. Las actualizaciones de horarios/resultados oficiales requieren el mismo mecanismo mientras persista403; OddsPapi queda solo provisional. Archivo subido se registra como importacion aprobada por admin, no autenticidad remotamente comprobada. Alternativas: editor manual como respaldo; comprobar otra region de Functions como experimento sin garantia; recolector externo automatizado solo tras verificar acceso y operacion; proveedor autorizado con cobertura real de boleto y signos. Mantener identidad/orden y apuestas al actualizar. No se ha aprobado relajar el requisito anterior de importacion automatica ni se implementan estas propuestas.

## Importacion por fotografia elegida; reglas pendientes - 2026-10-30

El usuario concreta la propuesta anterior como foto/captura cargada en panel, solo boletos jugados (decision en DECISIONS). Se propone OCR como borrador revisable, 14 cruces y Pleno, categorias y orden conservados; admin completa numero/fecha/cierre faltantes. Sin nueva clave OCR contratada ni codigo implementado. OddsPapi podria vincular horarios/marcadores de encuentros cubiertos tras verificar identidad y cuenta; no publica cierre comercial SELAE ni garantiza sus signos oficiales. El cierre automatico de la app puede ejecutar una hora aprobada por admin. Se ha preguntado si conserva clasificacion oficial con provisional deportiva+confirmacion final o prefiere definitiva deportiva (cambio de reglas); respuesta pendiente, sin asumir aprobacion. No se cambia codigo ni se consume cuota en esta consulta.

## Resolucion y entrega del flujo fotografico - 2026-10-30

Resuelta la pregunta de clasificacion: el usuario elige OddsPapi como origen definitivo de signos deportivos con posibilidad de correccion, ver DECISIONS. Implementados foto OCR local, revision/confirmacion, entrada por texto/manual, jornadas seleccionadas, cierre explicito y correcciones posteriores al cierre. La automatizacion de SELAE deja de ser requisito para las nuevas jornadas. El filtro de competiciones heredado no excluye boletos expresamente elegidos. Pendiente configurar/verificar cuenta, formatos, cobertura y cuota OddsPapi reales; sin clave se puede preparar y cargar el boleto, pero no hay resultados deportivos automaticos. Detalles y pruebas en docs/importacion-fotografia.md y docs/verificacion.md.
