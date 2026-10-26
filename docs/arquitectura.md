# Arquitectura y reglas de dominio

## Estructura

```text
src/app/
  core/data/             Contrato, adaptador de archivo público y estado
  core/theme/            Preset PrimeNG y traducciones
  domain/                Modelos inmutables y funciones puras
  features/journeys/     Jornada, matriz y Pleno al 15
  features/leaderboard/  Clasificación de temporada
  shared/ui/             Componentes visuales reutilizables
src/styles/              Tokens, componentes y composición responsive
e2e/                     Flujos reales, accesibilidad y capturas
```

La aplicación usa componentes standalone con OnPush, rutas cargadas bajo demanda y Angular Signals. Angular 21 funciona sin Zone.js en esta configuración. `computed` deriva jornada, filtros, celdas y clasificación. Ninguna tarjeta contiene estadísticas precalculadas.

`QuinielaRepository` define `loadSeason(): Promise<SeasonSnapshot>`. El token de inyección `QUINIELA_REPOSITORY` desacopla interfaz y datos. `FileQuinielaRepository` lee `public/data/season.json` por HTTP y añade el instante de lectura como `asOf`; `QuinielaStore` expone señales de datos, carga y error, e incluye reintento. Sustituir el proveedor permitirá integrar el servidor sin modificar la presentación.

La temporada arranca sin jornadas y con nueve participantes reales. `currentJourneyId` asigna la jornada actual explícitamente y admite `null`; nunca se usa la primera jornada como sustituto. El histórico se ordena por fecha descendente y distingue `league` (Liga) de `europe` (boletos de Champions / Europa League), incluso con el mismo número. Los identificadores deben ser únicos dentro de la temporada. [Carga manual](datos.md).

## Cálculos

- Los primeros 14 encuentros se evalúan exclusivamente con `OfficialResult` publicado antes de `asOf`.
- Un marcador en curso o finalizado sin signo oficial no cuenta como resultado evaluable.
- Una liquidación administrativa usa su signo de boleto; una X administrativa no inventa un empate deportivo.
- Una predicción ausente se muestra como «Sin apuesta» y no entra en el denominador.
- Porcentaje: aciertos / pronósticos registrados con signo oficial × 100. Sin evaluables: `null`, presentado como «Sin datos».
- El Pleno exige coincidencia de ambos valores (0, 1, 2 o M). M equivale a tres o más goles. No modifica los aciertos ni el porcentaje de los otros 14.
- Orden determinista: aciertos descendentes, porcentaje descendente (ausencia de datos al final), nombre con comparación española e identificador. No se introducen puntos.
- Una victoria solo se adjudica con los 14 signos oficiales publicados. Empates en aciertos comparten victoria; el desempate de ordenación no altera ese reconocimiento. No se exige que el Pleno esté liquidado.
- Una jornada participada es la inscripción explícita en `participantIds`, aunque aún no haya resultados o falte algún pronóstico. Solo las jornadas publicadas de la temporada contribuyen al histórico público.
- La actividad actual del participante no filtra sus registros históricos. Una inscripción histórica se mantiene tras la desactivación.

## Pruebas

Las pruebas unitarias definen sus entradas mínimas dentro de cada archivo `.spec.ts`, sin un catálogo de participantes o jornadas de demostración compartido. Cubren las reglas de publicación, resultados oficiales, clasificación, Pleno y selección de jornada. Playwright comprueba la temporada pública real, la navegación, las iniciales, el teclado y la accesibilidad en escritorio, tablet y móvil. El alcance actual está en [Verificación](verificacion.md).

## Frontera de privacidad

La comparación, el Pleno y el Top 3 no se renderizan antes de `closesAt`. Las funciones de evaluación devuelven `hidden`, y la clasificación excluye esas jornadas. El cierre se evalúa como un instante ISO con zona horaria explícita, inclusive en el instante exacto.

**La ocultación visual no es una medida de seguridad.** El archivo de temporada es público, por lo que solo puede contener pronósticos reales después del cierre. El servidor futuro debe decidir el cierre con su propio reloj y devolver un DTO público sin pronósticos ocultos ni datos derivados que permitan reconstruirlos. Los guards de Angular no resuelven esa obligación.

## Próxima integración

1. Definir DTO público y privado, validación de entradas y política de publicación en servidor.
2. Implementar autenticación y autorización del administrador en Netlify Functions.
3. Implementar repositorio persistente con Blobs, identificadores estables y desactivación sin borrado histórico.
4. Añadir administración y registro de pronósticos manteniendo el dominio puro.
5. Incorporar resultados oficiales y trazabilidad de correcciones; revisar entonces el contrato de actualización de resultados y el refresco asíncrono.

No hay Functions, Blobs, autenticación falsa ni panel administrativo público en esta fase.
