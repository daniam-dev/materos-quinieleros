# Arquitectura y reglas de dominio

## Estructura

```text
src/app/
  core/data/             Contrato HTTP, edición privada y estado
  core/auth/             Sesión y guard de administración
  core/theme/            Preset PrimeNG y traducciones
  domain/                Modelos inmutables y funciones puras
  features/journeys/     Jornada, matriz y Pleno al 15
  features/leaderboard/  Clasificación de temporada
  features/admin/        Acceso, personas, jornadas y quinielas
  shared/ui/             Componentes visuales reutilizables
src/styles/              Tokens, componentes y composición responsive
e2e/                     Flujos reales, accesibilidad y capturas
server/                  API, autenticación, validación y almacenamiento
netlify/functions/       Entradas para Netlify Functions
```

La aplicación usa componentes standalone con OnPush, rutas cargadas bajo demanda y Angular Signals. Angular 21 funciona sin Zone.js en esta configuración. `computed` deriva jornada, filtros, celdas y clasificación. Ninguna tarjeta contiene estadísticas precalculadas.

`QuinielaRepository` define `loadSeason(): Promise<SeasonSnapshot>`. `QUINIELA_REPOSITORY` desacopla interfaz y datos. `HttpQuinielaRepository` consulta `/api/season`; el servidor fija `asOf` y filtra datos privados. `QuinielaStore` expone datos, carga, error y reintento. La edición usa `AdminService` y un snapshot privado separado del store público.

La temporada arranca sin jornadas y con los nueve participantes reales. SELAE aporta jornadas con identidad oficial y orden. `currentJourneyId` selecciona automáticamente la más antigua empezada sin todos los resultados confirmados, después la próxima y finalmente la última. El histórico conserva todas las temporadas. Los valores heredados `league` y `europe` siguen admitidos; las importaciones usan `mixed` hasta disponer de evidencia de las competiciones, sin deducirlas por fecha/equipo. [Flujo habitual](datos.md).

## Cálculos

- Los primeros 14 encuentros se evalúan exclusivamente con `OfficialResult` publicado antes de `asOf`. Un sencillo o doble que incluya el signo oficial suma un acierto; máximo 14. Hasta dos dobles por persona, validados en el servidor.
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

El servidor decide el cierre con su reloj. `/api/season` elimina pronósticos y Pleno antes del cierre, también para visitantes autenticados. `/api/admin` entrega la copia privada tras comprobar la cookie firmada. `server/seed.json` sustituye al archivo público inicial. Los guards protegen la navegación; la autorización efectiva se repite en cada petición al servidor.

## Administración y próximos pasos

Implementados API pública/privada, cookie firmada, panel, disco local y Blobs con control de revisión. `season` guarda personas/apuestas y `sports-v1` las importaciones, marcadores, signos y el control de cuota. El worker no escribe el blob privado. La API compone ambos al leer, con eliminación de pronósticos antes del cierre. Los sencillos guardados siguen siendo válidos. [Configuración deportiva y concurrencia](sincronizacion.md).

Pendientes: configurar secretos y verificar Functions/Blobs desplegados, acceso real SELAE, cuenta y cobertura OddsPapi. Las vistas refrescan la copia compartida cada cinco minutos cuando son visibles. `displayPrediction` calcula aciertos provisionales para mostrar; `journeyRanking` y `seasonRanking` siguen contando exclusivamente confirmados. No se certifica directo riguroso ni trazabilidad exhaustiva de cada corrección.
