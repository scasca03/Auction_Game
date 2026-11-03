# The Auction

**The Auction** es un juego de subastas deportivas para navegador (ordenador / móvil) y PWA. Elige fútbol o basket en la configuración; las partidas locales y las salas multijugador usan el mismo deporte y sus respectivas colecciones de jugadores. No requiere proceso de compilación; PeerJS se carga desde CDN para las salas.

## Inicio rápido

1. Descomprime [`The_Auction_v3.zip`](./The_Auction_v3.zip) **manteniendo todos los archivos en la misma carpeta**.
2. Para jugar en local, abre `index.html`. Para funciones PWA, fotografías y multijugador, sirve la carpeta por HTTP: `python -m http.server 8080` y abre `http://localhost:8080`. En partidas por Internet, publica la app bajo HTTPS.
3. Para publicarlo, sube **todo el contenido de la carpeta** a la raíz del repositorio GitHub Pages o a Netlify. **No basta con subir `index.html`**.
4. En iOS o Android, selecciona *Añadir a pantalla de inicio* (PWA, tras publicar bajo HTTPS).

## Incluye

- Identidad visual original **The Auction**, logo SVG e iconos de instalación. El tema de basket usa una paleta de cancha azul y naranja, con cartas y presentación originales; no incluye recursos oficiales de NBA 2K.
- Dos colecciones independientes de **100 jugadores**: fútbol en `players.js` y basket/NBA en `basketball.js`. Las medias, posiciones y valores de mercado son datos ilustrativos del juego, no ratings oficiales ni una clasificación oficial actualizada.
- Cartas de categoría **TITAN / ELITE / STAR / GOLD** con acabados distintos y seis atributos posicionales simulados (*no son atributos oficiales*).
- Retratos fotográficos reales: el navegador solicita miniaturas de **Wikipedia** mediante su API pública (necesita conexión). En la tarjeta del jugador se muestra un enlace a la fuente. En caso de ausencia, fallo o bloqueo de la API, se usa un monograma gráfico. **Las fotos no están empaquetadas en el ZIP**; la disponibilidad y los permisos de reutilización varían por foto.
- Un **orden aleatorio nuevo por partida**, sin repeticiones durante esa partida. Las cartas siguientes se mantienen ocultas.
- Pujas por turnos, incremento mínimo, presupuestos, reserva de presupuesto para plazas, pases, adjudicación, descartes, resumen de equipos, clasificación y álbum de cartas vistas.
- Salas multijugador: el anfitrión crea una sala y comparte un código de 8 caracteres, enlace o invitación de WhatsApp. El deporte seleccionado se comparte con los participantes; cada invitado solo introduce su nombre.
- Temporizador de puja configurable (15 segundos por defecto, 30/45/60 o sin límite); al terminar, el turno pasa automáticamente. Los invitados pueden volver a entrar tras una desconexión o recarga usando su sesión local. Solo se permite una conexión activa por equipo.
- Al terminar la partida se muestra el resultado con ranking y se puede compartir o descargar como texto.
- Las salas usan PeerJS y su servicio público de señalización, sin desplegar un servidor propio. Todos necesitan Internet; si se bloquea PeerJS o WebRTC en la red/navegador, no se podrá conectar. El anfitrión debe mantener la página abierta: el estado compartido no se conserva si cierra la página o pierde su sesión.
- En ordenador, la pantalla de partida ocupa el viewport y muestra solo jugador, consola de pujas y ranking en tres columnas. En móvil, la subasta usa una página vertical sencilla con jugador y controles juntos, y una navegación fija para alternar claramente entre pujas y equipos; el ranking muestra presupuesto y plantilla en directo.
- Animación de revelación, celebración con confeti por fichaje, feedback auditivo opcional, adaptación a móvil y opción de reducir movimiento.
- Guardado local independiente para cada deporte en el navegador, sujeto a disponibilidad de almacenamiento.

## Cómo personalizar

- `players.js` y `basketball.js`: colecciones de futbolistas y jugadores de basket con `Nombre|POS|Equipo|OVR|Valor|Código país|Título de Wikipedia opcional`.
- `styles.css`: colores, tipografía, tarjetas, animaciones y responsive.
- `logo.svg` y `icon.svg`: identidad e iconografía SVG de The Auction.
- En partidas locales, los nombres se escriben en la configuración; no hay participantes con nombre precargado.
- `app.js`: lógica de juego, fotos y guardado.

**Fotografías:** artículo/fichero de cada jugador en Wikipedia o [Wikimedia Commons](https://commons.wikimedia.org/), sujetos a las licencias de sus autores. The Auction es un proyecto independiente, no afiliado a EA SPORTS, NBA, NBA 2K, FIFPro, clubes ni deportistas; no utiliza marcas, logos ni artes oficiales.

### Opcional: incluir imágenes reales en el ZIP / funcionar sin conexión

Si quieres incorporar al propio proyecto las fotos que cuenten con licencia abierta verificada para cualquiera de las dos colecciones, desde un equipo **con conexión a Internet** ejecuta:

```bash
pip install requests pillow
python tools/fetch-photos.py
```

El programa crea `photos/football/`, `photos/basketball/`, `photo-manifest-{football,basketball}.json` y archivos `PHOTO_CREDITS-{sport}.md` con autor, licencia y página original. La aplicación prioriza esas fotos locales; los retratos sin licencia comprobable conservan la opción de consulta online. **No ejecutes el script sin revisar los permisos de las imágenes para el uso previsto.**
