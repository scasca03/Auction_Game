# BID/XI — Football Auction

La nueva versión de **Football Auction** con diseño, marca y mecánicas propias. Funciona en navegador (ordenador / móvil) como PWA, sin servidor propio ni proceso de compilación. PeerJS se carga desde CDN para las salas multijugador.

## Inicio rápido

1. Descomprime el ZIP **manteniendo todos los archivos en la misma carpeta**.
2. Para jugar en local, abre `index.html`. Para funciones PWA, fotografías y multijugador, sirve la carpeta por HTTP: `python -m http.server 8080` y abre `http://localhost:8080`. En partidas por Internet, publica la app bajo HTTPS.
3. Para publicarlo, sube **todo el contenido de la carpeta** a la raíz del repositorio GitHub Pages o a Netlify. **No basta con subir `index.html`**.
4. En iOS o Android, selecciona *Añadir a pantalla de inicio* (PWA, tras publicar bajo HTTPS).

## Incluye

- Identidad visual original **BID/XI**, logo SVG, iconos de instalación y diseño responsive. No incorpora artes originales ni marcas oficiales de EA SPORTS.
- **100 futbolistas masculinos**, tomados de un listado FC 26 / modo carrera (medias y valoración estimada de OVRBase, consulta: noviembre de 2026). Clubes y datos representativos de ese listado; pueden diferir de las versiones vigentes de plantillas.
- Cartas de categoría **TITAN / ELITE / STAR / GOLD** con acabados distintos y 6 atributos posicionales simulados (*no son atributos oficiales*).
- Retratos fotográficos reales: el navegador solicita miniaturas de los artículos de **Wikipedia/Wikimedia** mediante la API pública (necesita conexión). En la tarjeta del jugador se muestra un enlace al archivo/autor/licencia de la foto cuando se carga. En caso de ausencia, fallo o bloqueo de la API, se usa monograma gráfico. **Las fotos no están empaquetadas en el ZIP**. La disponibilidad y los permisos de reutilización comercial varían por foto y deben verificarse en el enlace de la imagen.
- Un **orden aleatorio nuevo por partida**, sin repeticiones durante esa partida. Las cartas siguientes se mantienen ocultas.
- Pujas por turnos, incremento mínimo, presupuestos, reserva de presupuesto para plazas, pases, adjudicación, descartes, resumen de equipos, clasificación y álbum de cartas vistas.
- Salas multijugador tipo Kahoot: el anfitrión crea una sala y comparte un código de 8 caracteres, enlace o invitación de WhatsApp. Cada invitado solo introduce su nombre. El anfitrión puede participar (opción predeterminada) o actuar como moderador, expulsar participantes antes de empezar, pausar/reanudar la subasta y cerrar la sala.
- Temporizador de puja configurable (15 segundos por defecto, 30/45/60 o sin límite); al terminar, el turno pasa automáticamente. Los invitados pueden volver a entrar tras una desconexión o recarga usando su sesión local. Solo se permite una conexión activa por equipo.
- Al terminar la partida se muestra el resultado con ranking y se puede compartir o descargar como texto.
- Las salas usan PeerJS y su servicio público de señalización, sin desplegar un servidor propio. Todos necesitan Internet; si se bloquea PeerJS o WebRTC en la red/navegador, no se podrá conectar. El anfitrión debe mantener la página abierta: el estado compartido no se conserva si cierra la página o pierde su sesión.
- En ordenador, la pantalla de partida ocupa el viewport y muestra solo jugador, consola de pujas y ranking en tres columnas. En móvil, jugador y puja van juntos y se desliza horizontalmente para consultar los equipos; presupuesto y plantilla se actualizan en el ranking.
- Animación de revelación, celebración con confeti por fichaje, feedback auditivo opcional, adaptación a móvil y opción de reducir movimiento.
- Guardado local de partida en el navegador, sujeto a disponibilidad de almacenamiento.

## Cómo personalizar

- `players.js`: listado de futbolistas con `Nombre|POS|Club|OVR|Valor en M€|Código país|Título de Wikipedia opcional`.
- `styles.css`: colores, tipografía, tarjetas, animaciones y responsive.
- `logo.svg` y `icon.svg`: identidad e iconografía SVG.
- En partidas locales, los nombres se escriben en la configuración; no hay participantes con nombre precargado.
- `app.js`: lógica de juego, fotos y guardado.

**Fuentes de datos:** [OVRBase, FC 26 Top 100](https://ovrbase.com/fc/top-100) y [EA SPORTS FC 26 Ratings](https://www.ea.com/es/games/ea-sports-fc/ratings). **Fotografías:** artículo/fichero de cada jugador en [Wikimedia Commons](https://commons.wikimedia.org/) o Wikipedia, sujetos a las licencias de sus autores.

Este es un proyecto independiente, no afiliado con EA SPORTS, FIFPro, clubes, ni los deportistas mencionados. No incluye imágenes de cartas ni insignias oficiales de los equipos.

### Opcional: incluir imágenes reales en el ZIP / funcionar sin conexión

Si quieres incorporar al propio proyecto las fotos que cuenten con licencia abierta verificada, desde un equipo **con conexión a Internet** ejecuta:

```bash
pip install requests pillow
python tools/fetch-photos.py
```

El programa crea `photos/`, `photo-manifest.json` y `PHOTO_CREDITS.md` con autor, licencia y página original de las imágenes que se puedan reutilizar legalmente. La aplicación prioriza esas fotos locales; los retratos sin licencia comprobable conservan la opción de consulta online. **No ejecutes el script sin revisar los permisos de las imágenes para el uso previsto.**
