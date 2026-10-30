---
name: Materos Quinieleros
description: Modern Social Club para comparar quinielas entre amigos.
colors:
  base: '#0C0E11'
  surface: '#1E2329'
  ink: '#F2F5FA'
  silver: '#DFE5ED'
  accent: '#A9C9FF'
  muted: '#AAB5C2'
  line: '#343C47'
  selected: '#263449'
  hit: '#A9CBBD'
  miss: '#E0A8AA'
  warning: '#E6C18D'
typography:
  display:
    fontFamily: 'Manrope Variable, sans-serif'
    fontSize: 'clamp(2.75rem, 5vw, 4.5rem)'
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: '-0.04em'
  body:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: '0.75rem'
  card: '1rem'
  dialog: '1rem'
  mark: '0.375rem'
  pill: '999px'
spacing:
  unit: '0.25rem'
  compact: '0.5rem'
  control: '1rem'
  section: '2rem'
  large: '3rem'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.base}'
    rounded: '{rounded.control}'
    height: '2.75rem'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    height: '2.75rem'
  card:
    backgroundColor: 'color-mix(in srgb, var(--color-surface) 55%, var(--color-base))'
    rounded: '{rounded.card}'
    padding: '2rem'
---

# Sistema de diseño: Materos Quinieleros

## Overview

**Dirección: Modern Social Club.** Identidad editorial oscura, cercana y contenida. La comparación entre amigos ocupa el espacio principal; la marca se expresa mediante tipografía, proporción y alineación, sin recursos de una plataforma de apuestas o de un panel administrativo.

Registro de la implementación al 25/10/2026. La fuente de verdad ejecutable es `src/styles/tokens.css`; este documento describe sus decisiones. Los componentes consumen variables semánticas y el preset `MaterosPreset` enlaza PrimeNG con ellas. No mantener valores paralelos de tema en las pantallas.

## Colors

Carbón y plata dominan las superficies. Azul hielo se reserva para navegación activa, selección, enlaces importantes y foco. El objetivo aprobado es aproximadamente 90 % monocromo, sin usar verde como color de marca.

Los aciertos usan salvia apagada y una marca de verificación; los fallos, rosa apagado y una cruz. Los estados en juego y administrativos usan ámbar con texto explícito. Los pronósticos pendientes llevan borde; las ausencias usan raya y una descripción accesible. Ningún estado depende exclusivamente del color.

## Typography

Manrope Variable en marca, títulos y secciones. Inter Variable en cuerpo, navegación, controles, tablas y números. Ambas se sirven localmente desde Fontsource, sin peticiones a Google Fonts.

La escala semántica va de 12, 13 y 14 px a 16, 18 y 24 px. El título principal es fluido entre 44 y 72 px. Los estados deportivos y administrativos usan 12 px; el minuto en juego acompaña al marcador. Los números son tabulares. La temporada forma parte de los metadatos bajo el título.

## Layout

Contenedor máximo de 1280 px con márgenes fluidos. Ritmo derivado de una unidad de 4 px; proximidad dentro de grupos y separación mayor entre secciones.

La navegación es superior. La matriz conserva una columna fija de encuentros, una de signo oficial y una por participante registrado. No existe un límite de nueve columnas en el modelo.

A 1000 px o menos se muestra por defecto un participante seleccionado. «Comparar todos» activa la tabla horizontal. A 600 px o menos, la navegación ocupa una fila propia y las secciones inferiores se apilan. El ancho de la tabla global móvil se deriva del número de participantes; los encuentros fijos dejan espacio para al menos dos columnas completas a 390 px.

La clasificación mantiene su tabla desplazable; el nombre permanece fijo en móvil. Los contenedores con scroll son enfocables y están etiquetados. El documento no debe desbordar horizontalmente.

## Elevation & Depth

- **Base:** carbón opaco.
- **Surface:** mezcla de superficie al 55 % sobre base, borde discreto y sin sombras de tarjeta.
- **Floating Glass:** superficie al 92 % de opacidad y desenfoque de 18 px en navegación y overlays. El diálogo utiliza la sombra flotante centralizada.

Transiciones de estado de 160 ms. No hay animaciones ornamentales. `prefers-reduced-motion` reduce animaciones y transiciones. El spinner solo comunica carga.

## Shapes

Controles a 44 px de altura y radio de 12 px; tarjetas y diálogos a 16 px. Marcas de pronóstico a 6 px. Los badges y avatares usan radio circular.

**Prueba de coherencia:** cambiar `--radius-control` de `0.75rem` a `0.5rem` actualiza botones, enlaces de navegación y selectores PrimeNG. Playwright verifica sus estilos calculados en el navegador. Los estilos del preset deben seguir referenciando estas variables.

## Components

| Componente          | Responsabilidad y API                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MqButton`          | Variantes primary, secondary, danger y quiet; disabled, loading, pressed y evento activated. Botón nativo, foco visible y bloqueo durante carga. |
| `MqCard`            | Superficie de contenido mediante proyección; no añade comportamiento.                                                                            |
| `MqPageHeader`      | Título y ranuras de metadatos/acciones, adaptadas a móvil.                                                                                       |
| `MqBadge`           | Etiqueta neutral, accent o warning.                                                                                                              |
| `MqStatusIndicator` | Convierte estado de jornada en etiqueta legible.                                                                                                 |
| `MqEmptyState`      | Título, explicación y acción opcional. También explica la privacidad previa al cierre.                                                           |
| `MqLoadingState`    | Estado de carga con anuncio accesible.                                                                                                           |
| `MqDialog`          | Wrapper PrimeNG con título, estado visible bidireccional y contenido proyectado.                                                                 |
| `MqPredictionMark`  | Valor y estado tipados; símbolos y descripción accesible.                                                                                        |

PrimeNG Select se utiliza directamente: no hay wrapper artificial para cada control. Select y Dialog consumen el preset común y etiquetas españolas. Las opciones conservan un área táctil cómoda. El foco usa azul hielo con separación del control.

La administración permite preparar una jornada desde una foto, texto pegado o introducción manual. La revisión presenta los 15 encuentros numerados, conserva las categorías y separa el Pleno; número, fecha y cierre en hora de Madrid quedan explícitos antes de la confirmación obligatoria. Tras crear la jornada, la acción principal conduce a cargar las quinielas. La pestaña «Resultados» permite corregir signos y Pleno después del cierre, con un motivo visible y prioridad sobre los datos deportivos automáticos. Estos formularios reutilizan las superficies, controles y estados de Modern Social Club.

La carga de quinielas identifica cada persona como «Completa» o «Pendiente» y mantiene visible el contador de dobles (de 0 a 2), con el Pleno separado. Al alcanzar dos dobles se bloquean únicamente nuevas opciones dobles en otros encuentros; los signos sencillos siguen disponibles. La lista de personas se adapta al ancho disponible, conservando nombre y estado juntos.

En la comparativa, `MqPredictionMark` distingue aciertos y fallos confirmados mediante sus símbolos habituales. Los provisionales usan borde discontinuo y el texto «prov.», explicado en la leyenda; sus descripciones accesibles indican también si el resultado es confirmado o provisional. Estos estados conservan la paleta y la sobriedad de Modern Social Club.

## Do's and Don'ts

- Usar tokens semánticos para color, radio, tipografía, altura, espacio y estados compartidos.
- Reutilizar encabezados, superficies, botones y estados antes de introducir un patrón nuevo.
- Mantener los signos alineados y separar el Pleno de los primeros 14 encuentros.
- Verificar teclado, contraste y scroll con contenido real antes de dar por terminada una pantalla.
- Evitar fotos de fondo, neones, motivos gaming, sombras fuertes, gradientes llamativos y tarjetas KPI redundantes.
- No envolver todos los componentes PrimeNG ni utilizar cristal en cada celda.
- No tratar axe o las capturas como certificación completa de WCAG. El informe de alcance está en `docs/verificacion.md`.
