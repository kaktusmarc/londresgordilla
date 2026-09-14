/* ============================================================
   Datos del viaje.
   wiki -> titulo exacto del articulo en en.wikipedia.org (para la foto)
   fix  -> nota cuando he corregido la coordenada original
   ============================================================ */
'use strict';

const HOTEL = {
  name: 'Montcalm Chilworth Townhouse Paddington',
  short: 'Montcalm Chilworth Townhouse · Paddington',
  lat: 51.5150,
  lng: -0.1767,
  fix: 'Ajustada a Chilworth Street (W2): la original caia un poco al este.'
};

const TRIP = {
  title: 'Londres',
  subtitle: 'en 3 días',
  dates: '27 – 29 de octubre',
  hotel: HOTEL,
  days: [
    {
      id: 'd1',
      tab: 'Día 1',
      label: 'Martes 27 Oct',
      theme: 'Llegada',
      color: '#2f6fed',
      tint: '#e8effd',
      stops: [
        { time: '10:45', name: 'Llegada al hotel, dejar mochilas', blurb: 'Aterrizaje 9:10, solo equipaje de mano + tren a Paddington.', lat: 51.5150, lng: -0.1767, wiki: 'Paddington station', icon: '\u{1F6CF}' },
        { time: '11:00', name: 'Hyde Park', blurb: 'Sin prisa: cruce del parque hasta Hyde Park Corner.', lat: 51.5073, lng: -0.1657, wiki: 'Hyde Park, London' },
        { time: '12:15', name: 'Buckingham Palace', blurb: 'Vía Hyde Park Corner y Green Park.', lat: 51.5014, lng: -0.1419, wiki: 'Buckingham Palace' },
        { time: '12:45', name: 'St. James’s Park', blurb: 'Paseo corto.', lat: 51.5025, lng: -0.1346, wiki: "St James's Park" },
        { time: '13:15', name: 'Houses of Parliament & Big Ben', blurb: 'Fotos desde Parliament Square.', lat: 51.4995, lng: -0.1248, wiki: 'Big Ben' },
        { time: '13:45', name: 'Westminster Abbey', blurb: 'Reservar entrada online antes de ir.', lat: 51.4994, lng: -0.1273, wiki: 'Westminster Abbey', tag: 'Reserva' },
        { time: '15:00', name: 'London Eye', blurb: 'Reservar franja horaria con antelación.', lat: 51.5033, lng: -0.1195, wiki: 'London Eye', tag: 'Reserva' },
        { time: '16:00', name: 'South Bank', blurb: 'Paseo junto al río.', lat: 51.5055, lng: -0.1155, wiki: 'South Bank' },
        { time: '16:45', name: 'Trafalgar Square', blurb: 'Parada rápida.', lat: 51.5080, lng: -0.1281, wiki: 'Trafalgar Square' },
        { time: '17:00', name: 'National Gallery', blurb: 'Opcional, gratis, cierra sobre las 18:00.', lat: 51.5089, lng: -0.1283, wiki: 'National Gallery' },
        { time: '18:15', name: 'Piccadilly Circus & Leicester Square', blurb: 'De noche, ambiente distinto al del miércoles.', lat: 51.5100, lng: -0.1345, wiki: 'Piccadilly Circus' },
        { time: '19:00', name: 'Chinatown / Soho', blurb: 'Cena aquí.', lat: 51.5114, lng: -0.1315, wiki: 'Chinatown, London' },
        { time: '20:30', name: 'Vuelta al hotel', blurb: 'Metro, sin prisa.', lat: 51.5150, lng: -0.1767, wiki: 'Paddington station', icon: '\u{1F6CF}' }
      ]
    },
    {
      id: 'd2',
      tab: 'Día 2',
      label: 'Miércoles 28 Oct',
      theme: 'Compras y City',
      color: '#0f9d6a',
      tint: '#e4f5ee',
      stops: [
        { time: '10:00', name: 'Harrods', blurb: 'Abre a las 10:00. Metro desde Paddington o paseo por Hyde Park.', lat: 51.4994, lng: -0.1634, wiki: 'Harrods' },
        { time: '11:00', name: 'Disney Store', blurb: '350-352 Oxford St, dos plantas. La única que queda en Reino Unido. Metro Knightsbridge–Bond Street.', lat: 51.5147, lng: -0.1483, wiki: 'Oxford Street' },
        { time: '11:40', name: 'Regent Street & Hamleys', blurb: 'Parada obligatoria: la juguetería. Calculad 45 min.', lat: 51.5126, lng: -0.1397, wiki: 'Hamleys', fix: 'La original caía en Oxford Circus; Hamleys está en el 188-196 de Regent St.' },
        { time: '12:25', name: 'Carnaby Street', blurb: 'Calle peatonal con ambiente y tiendas.', lat: 51.5133, lng: -0.1389, wiki: 'Carnaby Street', fix: 'Movida ~80 m al este, sobre la propia Carnaby St.' },
        { time: '12:50', name: 'Piccadilly Circus', blurb: 'De día, bajando desde Carnaby camino del Soho.', lat: 51.5100, lng: -0.1345, wiki: 'Piccadilly Circus' },
        { time: '13:10', name: 'Chinatown / Soho', blurb: 'De día.', lat: 51.5114, lng: -0.1315, wiki: 'Soho, London' },
        { time: '13:35', name: 'Leicester Square & Lego Store', blurb: 'Segunda parada obligatoria.', lat: 51.5106, lng: -0.1300, wiki: 'Leicester Square', fix: 'La Lego Store está en Swiss Court, lado oeste de la plaza.' },
        { time: '14:05', name: 'Covent Garden', blurb: 'Comer aquí y rematar las compras en el mercado. Hasta las 15:05.', lat: 51.5119, lng: -0.1226, wiki: 'Covent Garden', fix: 'Centrada en el Market Building.' },
        { time: '15:20', name: 'St Paul’s Cathedral', blurb: 'Empieza la City. Metro Holborn–St Paul’s o 20 min andando.', lat: 51.5138, lng: -0.0984, wiki: "St Paul's Cathedral" },
        { time: '15:55', name: 'Millennium Bridge', blurb: 'Justo detrás de la catedral.', lat: 51.5095, lng: -0.0986, wiki: 'Millennium Bridge, London' },
        { time: '16:25', name: 'Leadenhall Market', blurb: 'Mercado victoriano cubierto.', lat: 51.5128, lng: -0.0833, wiki: 'Leadenhall Market' },
        { time: '16:50', name: 'St Dunstan in the East', blurb: 'Ruinas-jardín escondidas.', lat: 51.5096, lng: -0.0814, wiki: 'St Dunstan-in-the-East', fix: 'La original caía 160 m al oeste, dentro de Monument.' },
        { time: '17:15', name: 'Tower of London & Tower Bridge', blurb: 'Solo exterior: a esta hora ya no da tiempo a entrar.', lat: 51.5081, lng: -0.0759, wiki: 'Tower Bridge' },
        { time: '18:00', name: 'Sky Garden', blurb: 'RESERVA GRATIS obligatoria con antelación.', lat: 51.5113, lng: -0.0838, wiki: '20 Fenchurch Street', tag: 'Reserva' }
      ]
    },
    {
      id: 'd3',
      tab: 'Día 3',
      label: 'Jueves 29 Oct',
      theme: 'Notting Hill, Camden y salida',
      color: '#ef7723',
      tint: '#fdefe3',
      stops: [
        { time: '9:00', name: 'Check-out del hotel', blurb: 'Las mochilas se quedan en consigna.', lat: 51.5150, lng: -0.1767, wiki: 'Paddington station', icon: '\u{1F6CF}' },
        { time: '9:15', name: 'Notting Hill', blurb: 'A 15 min del hotel andando.', lat: 51.5094, lng: -0.1967, wiki: 'Notting Hill' },
        { time: '9:45', name: 'Portobello Road Market', blurb: 'Entre semana hay menos puestos que el sábado.', lat: 51.5157, lng: -0.2038, wiki: 'Portobello Road' },
        { time: '11:30', name: 'Primrose Hill', blurb: 'Subida corta, vistas de Londres.', lat: 51.5390, lng: -0.1608, wiki: 'Primrose Hill' },
        { time: '12:30', name: 'Camden Town & Market', blurb: 'Comer aquí, tiempo libre.', lat: 51.5416, lng: -0.1461, wiki: 'Camden Market' },
        { time: '16:00', name: 'Recoger mochilas en el hotel', blurb: 'Solo equipaje de mano, rápido.', lat: 51.5150, lng: -0.1767, wiki: 'Paddington station', icon: '\u{1F6CF}' },
        { time: '16:30', name: 'Salir hacia Gatwick', blurb: 'Metro a Victoria + tren, aprox 55-65 min. Vuelo a las 21:00.', lat: 51.4952, lng: -0.1441, wiki: 'London Victoria station', icon: '✈', fix: 'La original (51.47, -0.19) caía en Battersea. Puesta en Victoria Station, de donde sale el tren a Gatwick.' }
      ]
    }
  ]
};
