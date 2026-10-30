# Decisiones del proyecto

## Alcance solicitado por el usuario — 2026-10-25

- Fase 1 exclusivamente frontend SPA sin SSR; Jornadas y Clasificación. No mostrar Administración funcional ni simular autenticación mediante variables del navegador.
- Angular estricto, standalone, Signals/computed, OnPush, Router, Tailwind CSS 4 y PrimeNG styled mode. npm como único gestor con lockfile. Sin NgRx/Redux ni dependencias que no aporten valor.
- Sistema de diseño centralizado obligatorio: tokens semánticos y componentes compartidos. PrimeNG consume las mismas variables CSS; cambios globales de radio/altura/color no deben requerir editar pantallas.
- Solo signos oficiales publicados determinan aciertos. Marcadores provisionales no cuentan. Liquidación administrativa puede usar X sin empate deportivo. Pleno al 15 separado del porcentaje de los otros 14.
- Pronósticos y rankings derivados ocultos antes del cierre; privacidad real futura en servidor. Desactivar participantes conserva registros históricos. No inventar puntos.
- No despliegues, operaciones destructivas ni servicios contratados sin autorización.

## Elecciones de implementación documentadas, no preferencias nuevas del usuario

Se fijó Angular 21.2.25 con PrimeNG 21.1.10 y temas 2.0.3 MIT tras comprobar compatibilidad y licencias. Angular/PrimeNG 22 era la última línea estable, pero requería runtime más reciente y clave PrimeUI; no se crearon claves ni cuentas. Mantener esta distinción al proponer actualizaciones. Evidencia: `docs/dependencias.md`, package-lock.json y licencias de paquetes instalados.

Orden del ranking: aciertos, porcentaje, nombre español e id. Las jornadas ganadas se adjudican al liquidar 14 signos y se comparten si empatan en aciertos. Denominador: pronósticos registrados con signo oficial; sin evaluables se muestra ausencia de datos. Reglas y motivos en `docs/arquitectura.md`.

## Paso a temporada real — 2026-10-26

- Requisito explícito: arrancar sin jornadas y añadirlas progresivamente; conservar el selector como histórico y ofrecer «Jornada actual». Incluir boletos de Champions y Europa además de Liga.
- Requisito explícito: los nueve nombres y apellidos facilitados sustituyen a las personas ficticias; Daniel Arroyo será el administrador. Avatares con primera letra de nombre y apellido. Lista exacta en `public/data/season.json`.
- Implementación verificada: archivo público mantenido en el proyecto, currentJourneyId explícito y nullable; competition league/europe distingue Liga de boletos europeos combinados. No se infiere la actual por fecha o posición. El rol admin describe al participante y no implementa autorización. Fixtures ficticios disponibles exclusivamente en pruebas, sin modo demo de la app.
- Evoluciona el alcance inicial de datos simulados: interfaz vacía hasta incorporar jornadas; sin posiciones de clasificación asignadas cuando no hay evaluables. La futura administración y privacidad real en servidor siguen pendientes. Contrato de carga en `docs/datos.md`.

## Retirada del catálogo demo — 2026-10-26

El usuario solicita borrar los datos de demostración restantes y residuos sin utilidad. Sustituye la conservación previa del catálogo para pruebas: se elimina del proyecto, conservando solo entradas mínimas locales a las pruebas unitarias de las reglas. El navegador verifica el archivo público real; los seis escenarios actuales no cubren comparativas pobladas. Se mantienen las dependencias y herramientas necesarias para desarrollar y validar. La limpieza de artefactos generados no pudo aplicarse por rechazo de la revisión automática; estado preciso en CURRENT y docs/verificacion.md.

## Administración autorizada — 2026-10-26

El usuario encarga administración exclusiva de su cuenta (Daniel Arroyo), carga de quinielas de los demás y altas/bajas del grupo. Sustituye la restricción inicial de mantener Administración fuera de la fase frontend; no autoriza contratar servicios ni desplegar. La consulta del resto sigue sin registro, coherente con PRODUCT.md. La baja se implementa como inactividad reversible para conservar el histórico, conforme a la decisión previa.

Elecciones de implementación, no preferencias adicionales atribuidas al usuario: acceso único daniel-arroyo con contraseña configurada fuera de Git, autorización en API y cookie firmada; Functions/Blobs siguiendo la arquitectura prevista. Creación de jornadas y asignación de actual permiten cargar apuestas desde una temporada vacía. El seed deja de ser público; proyección pública filtrada por reloj de servidor y copia privada exclusiva. Correcciones de quinielas permitidas también tras el cierre, con efecto público; no se implementa todavía un editor de resultados. Contrato y límites en docs/administracion.md y docs/datos.md.

## Automatización autorizada — 2026-10-26/27

El usuario encarga importación automática de jornadas SELAE y seguimiento espaciado OddsPapi, manteniendo Angular, Functions, Blobs y autenticación privada. Sustituye la creación manual y asignación manual de actual: conservar una jornada iniciada sin liquidar antes de avanzar a la siguiente. Su tarea habitual será cargar pronósticos de los nueve participantes existentes. Permite cero, uno o dos dobles en los 14 partidos, máximo 14 aciertos; Pleno independiente. SELAE confirma resultados oficiales; los marcadores provisionales pueden mostrar acierto provisional sin afectar clasificación histórica. Estas decisiones sustituyen las restricciones anteriores de solo sencillos y ausencia de evaluación provisional visual.

Exige cuota exclusiva: 200 llamadas operativas, reserva 50, nunca superar 250 ni límite inferior real. Configuración inicial separada de operación automática; pruebas simuladas y comprobación real mínima sin consumo inesperado. Publicación/despliegue expresamente fuera del encargo. Implementación y validación actual en CURRENT; reglas, limitaciones del proveedor y motivo de separación entre apuestas y deportes en docs/sincronizacion.md. La referencia quiniela-ai se consultó solo en lectura, sin usar su clave ni ejecutar sobre sus datos.

## Seleccion de boletos por competicion - 2026-10-27

El usuario resuelve la alternativa pendiente eligiendo mantener boletos oficiales SELAE y habilitarlos o excluirlos segun sus competiciones; no encarga quinielas propias ni recortar partidos del boleto. Sustituye la pregunta pendiente en ROADMAP. Elecciones de implementacion: todas las competiciones de un mixto deben estar habilitadas; falta de identificacion completa queda pendiente al activar el filtro; confirmacion manual del administrador cuando SELAE no publica torneos; preservar historico y apuestas cargadas. Catalogo inicial de siete mas Otras agrupadas, sin prometer cobertura real del proveedor ni catalogo exhaustivo. Reglas detalladas en docs/competiciones.md y validacion en CURRENT.

## Cambio a seleccion por fotografia - 2026-10-30

El usuario elige importacion asistida y concreta que quiere fotografiar el boleto para cargar su informacion en Administracion, conservando solo las quinielas que juega el grupo. Sustituye el descubrimiento automatico de todos los boletos como entrada habitual. La foto aportada muestra los 15 cruces y categorias M/F, pero no numero, fecha o cierre: no se deducen esos datos. Pregunta que automatizacion puede conservarse con OddsPapi; no ha aprobado convertir sus resultados deportivos en signos oficiales ni cambiar la regla de clasificacion.

## Resultados deportivos definitivos elegidos - 2026-10-30

El usuario confirma que el signo ganador se obtenga automaticamente de OddsPapi, con correccion administrativa disponible. Sustituye para las jornadas nuevas la regla anterior de OddsPapi solo provisional y SELAE como unica confirmacion. Local gana1, empateX, visitante2; sencillo o doble acertado suma uno, maximo14, Pleno separado y victorias compartidas por empate en aciertos. Se conserva el historico sin reinterpretarlo. Implementacion exige finalizacion explicita del proveedor e identidad coincidente, no el reloj ni un marcador aislado. El cierre es la hora de Madrid que el administrador confirma al revisar el boleto, sin deducir cierre comercial desde OddsPapi.

## Administrador de pruebas local - 2026-10-30

Peticion explicita: crear usuario SOLO localhost con el mismo flujo hasheado para probar sin credenciales personales. Implementado launcher codex-local: hash scrypt/secreto nuevos, mismas cookies y propietario interno, datos temporales separados, sin .env. No nuevo participante ni acceso de prueba en Netlify; Daniel conserva acceso habitual. Guia docs/administracion.md e informe docs/pruebas-ocr-local.md.

## Orden obligatorio de encuentros - 2026-10-30

El usuario exige mantener exactamente el orden numerado del boleto en Administracion: posiciones1a14 y Pleno15. Usar el numero impreso, no orden de lineas reconocido, nombres, categoria ni horarios. Un cruce no reconocido mantiene su hueco sin desplazar los siguientes; no confirmar hasta revision15. Regresiones en coupon-import.spec.ts y e2e/photo-build.spec.ts verifican propuesta sin correcciones, guardado y recarga.
