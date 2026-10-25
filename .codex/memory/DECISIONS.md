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
