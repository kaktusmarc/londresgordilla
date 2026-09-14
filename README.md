# Londres en 3 días — itinerario visual

Página estática (HTML/CSS/JS, sin build ni dependencias que instalar) con el
itinerario de 3 días en Londres: mapa interactivo, tiempos reales a pie entre
paradas y fotos automáticas de cada sitio.

## Abrir

- **En local con servidor** (recomendado): `python -m http.server 5599` y abrir
  `http://localhost:5599`.
- **Doble clic en `index.html`**: el mapa y la lista funcionan, pero el
  navegador bloquea por CORS las llamadas a OSRM y Wikipedia, así que las
  distancias saldrán todas como *estimado* y no habrá fotos.

## Desplegar en Netlify

Arrastrar la carpeta a Netlify, o conectar el repo. `netlify.toml` ya publica la
raíz tal cual; no hay comando de build.

## Qué hace

| | |
|---|---|
| **Mapa** | Leaflet + tiles estándar de OpenStreetMap. Sin API key. |
| **Días** | Pestañas que filtran mapa y lista. Cada día tiene su color (azul / verde / naranja) y ese color tiñe toda la interfaz. |
| **Ruta** | Línea que une las paradas en orden. Es la ruta peatonal real calle a calle, no una recta. |
| **Lista** | Timeline con hora, nombre, descripción y foto. Clic en una parada → el mapa vuela a ella y la resalta. Clic en un marcador → se resalta y la lista hace scroll hasta ella. |
| **Tramos** | Entre cada dos paradas: minutos andando y distancia. |
| **Resumen** | Cabecera de cada día con nº de paradas, total a pie, tiempo caminando y horario. |
| **Google Maps** | Botón por parada que abre la navegación a pie con sus coordenadas. |

## Cómo se calculan los tiempos a pie

El demo público de `router.project-osrm.org` solo tiene cargado el perfil de
coche: pedirle `/foot/` devuelve tiempos de coche. Por eso hay una cadena de
tres intentos por tramo:

1. `routing.openstreetmap.de/routed-foot` — OSRM con perfil peatonal real.
   Se usan su distancia y su duración.
2. `router.project-osrm.org` — se usa su **distancia** (que sí es la de la
   calle) y el tiempo se recalcula a 4,6 km/h.
3. **Fallback**: haversine × 1,32 (factor de rodeo calle vs. línea recta), a
   4,6 km/h. Estos tramos se marcan con la etiqueta **estimado** y se dibujan
   con línea discontinua.

Un resultado de OSRM se descarta si engancha alguna parada a más de 250 m de su
coordenada o si la ruta sale más corta que la línea recta: en esos casos la
respuesta no corresponde a la parada pedida.

Los tramos de más de 2,2 km llevan el aviso **mejor en metro**.

Los tiempos cuentan solo el paseo. No incluyen colas, visitas ni paradas.

## Fotos

Por cada parada se busca imagen en la Wikipedia inglesa, en este orden:

1. `action=query&prop=pageimages&pithumbsize=640` con el título exacto del
   artículo (campo `wiki` en `js/data.js`).
2. Endpoint REST `/page/summary/<título>`.
3. Búsqueda por nombre del sitio.
4. Si no hay nada, queda un placeholder con el nombre.

Rutas y fotos se cachean en `localStorage` 30 días, así que la segunda visita
carga al instante. Los tramos con fallback no se cachean, para reintentarlos.

## Coordenadas corregidas

Las paradas que llevan una corrección la muestran en su propia ficha. Resumen:

| Parada | Cambio |
|---|---|
| Hotel Montcalm Chilworth | Movido a Chilworth Street (W2). |
| Regent Street & Hamleys | La original caía en Oxford Circus; Hamleys está en el 188-196 de Regent St. |
| Carnaby Street | ~80 m al este, sobre la propia calle. |
| Leicester Square & Lego Store | Al lado oeste de la plaza (Swiss Court), donde está la tienda. |
| Covent Garden | Centrada en el Market Building. |
| St Dunstan in the East | La original caía 160 m al oeste, dentro de Monument. |
| Salir hacia Gatwick | La original (51.47, -0.19) caía en Battersea. Puesta en Victoria Station, de donde sale el tren. |

## Editar el itinerario

Todo está en `js/data.js`. Cada parada:

```js
{ time: '12:30', name: 'Covent Garden', blurb: 'Buen sitio para comer.',
  lat: 51.5119, lng: -0.1226, wiki: 'Covent Garden',
  tag: 'Reserva',   // opcional: etiqueta amarilla
  icon: '✈',        // opcional: sustituye al número en el marcador
  fix: '...' }      // opcional: nota de coordenada corregida
```

El color de cada día son los campos `color` y `tint` del día.

## Estructura

```
index.html
css/styles.css
js/data.js    <- itinerario
js/app.js     <- mapa, rutas, fotos
netlify.toml
```
