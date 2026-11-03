# BID/XI — Football Auction

La nueva versión de **Football Auction** con diseño, marca y mecánicas propias. Funciona en navegador (ordenador / móvil) como PWA, sin servidor de juego y sin dependencias JavaScript externas.

## Inicio rápido

1. Descomprime el ZIP **manteniendo todos los archivos en la misma carpeta**.
2. Abre `index.html` en el navegador. Para funciones PWA y el mejor soporte de fotografías, sirve la carpeta por HTTP: `python -m http.server 8080` y abre `http://localhost:8080`.
3. Para publicarlo, sube **todo el contenido de la carpeta** a la raíz del repositorio GitHub Pages o a Netlify. **No basta con subir `index.html`**.
4. En iOS o Android, selecciona *Añadir a pantalla de inicio* (PWA, tras publicar bajo HTTPS).

## Incluye

- Identidad visual original **BID/XI**, logo SVG, iconos de instalación y diseño responsive. No incorpora artes originales ni marcas oficiales de EA SPORTS.
- **100 futbolistas masculinos**, tomados de un listado FC 26 / modo carrera (medias y valoración estimada de OVRBase, consulta: noviembre de 2026). Clubes y datos representativos de ese listado; pueden diferir de las versiones vigentes de plantillas.
- Cartas de categoría **TITAN / ELITE / STAR / GOLD** con acabados distintos y 6 atributos posicionales simulados (*no son atributos oficiales*).
- Retratos fotográficos reales: el navegador solicita miniaturas de los artículos de **Wikipedia/Wikimedia** mediante la API pública (necesita conexión). En la tarjeta del jugador se muestra un enlace al archivo/autor/licencia de la foto cuando se carga. En caso de ausencia, fallo o bloqueo de la API, se usa monograma gráfico. **Las fotos no están empaquetadas en el ZIP**. La disponibilidad y los permisos de reutilización comercial varían por foto y deben verificarse en el enlace de la imagen.
- Un **orden aleatorio nuevo por partida**, sin repeticiones durante esa partida. Las cartas siguientes se mantienen ocultas.
- Pujas por turnos, incremento mínimo, presupuestos, reserva de presupuesto para plazas, pases, adjudicación, descartes, resumen de equipos, clasificación y álbum de cartas vistas.
- Animación de revelación, celebración con confeti por fichaje, feedback auditivo opcional, adaptación a móvil y opción de reducir movimiento.
- Guardado local de partida en el navegador, sujeto a disponibilidad de almacenamiento.

## Cómo personalizar

- `players.js`: listado de futbolistas con `Nombre|POS|Club|OVR|Valor en M€|Código país|Título de Wikipedia opcional`.
- `styles.css`: colores, tipografía, tarjetas, animaciones y responsive.
- `logo.svg` y `icon.svg`: identidad e iconografía SVG.
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
