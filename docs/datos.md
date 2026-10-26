# Cargar jornadas

La app lee `public/data/season.json`. Inicialmente contiene los nueve participantes del grupo, `journeys: []` y `currentJourneyId: null`. Los cambios se realizan en el archivo y se consultan recargando la web; todavía no hay editor ni guardado desde la interfaz.

Para añadir una jornada, incorpora a `journeys` un objeto con el contrato `Journey` de `src/app/domain/models.ts`:

- `id` único, `seasonId` coincidente con la temporada y `number` del boleto.
- `competition: "league"` para Liga o `"europe"` para un boleto de Champions / Europa League, que puede incluir encuentros de ambas competiciones. El número puede coincidir entre tipos; el identificador debe ser distinto.
- `startsAt`, `endsAt`, `closesAt` y fechas de publicación en ISO con zona horaria explícita.
- `participantIds` con los identificadores existentes de quienes juegan ese boleto.
- `fixtures` con los 14 encuentros numerados, `predictions` y `officialResults` según estén disponibles.
- `pleno` con el encuentro 15, sus pronósticos y el resultado oficial cuando se publique.

Asigna su `id` a `currentJourneyId` para mostrarla como «Jornada actual». Al cambiar la actual, las jornadas anteriores permanecen en el selector. Usa `null` si todavía no hay una nueva jornada; la app mantiene accesible el histórico sin elegir otra automáticamente.

La clasificación suma todas las jornadas publicadas de la temporada, incluidas las europeas. Antes de introducir resultados, los jugadores aparecen sin posiciones y con «Sin datos» en porcentaje.

Los participantes tienen nombre, apellido, iniciales, actividad y rol descriptivo. Las iniciales corresponden a la primera letra del nombre y del apellido. El único `admin` inicial es `daniel-arroyo`; esto no concede acceso ni sustituye la futura autorización del servidor.

El archivo se sirve públicamente: incorpora únicamente apuestas que ya se puedan publicar. Para recibir y guardar apuestas privadas antes del cierre será necesario el servidor.
