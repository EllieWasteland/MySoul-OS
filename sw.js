// Define un nombre y una versión para tu caché.
// Cambiar la versión forzará al navegador a actualizar el service worker y la caché.
const CACHE_NAME = 'mysoul-os-cache-v2'; // Updated cache version

// Lista completa de archivos y recursos para que la app funcione sin conexión.
const urlsToCache = [
  // --- Archivos base ---
  './',
  './index.html',
  './manifest.json',
  './data-manager.js',

  // --- Módulo MyTime ---
  './mytime.html',
  './mytime.css',
  './mytime.js',

  // --- Módulo MyMemory ---
  './mymemory.html',
  './mymemory.css',
  './mymemory.js',

  // --- Módulo MyRoute ---
  './myroute.html',
  './myroute.css',
  './myroute.js',

  // --- Módulo MyMood ---
  './mymood.html',
  './mymood.css',
  './mymood.js',
  
  // --- Iconos de la app ---
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',

  // --- CDNs y Recursos Externos ---
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Bitcount+Prop+Single:wght@400;600&family=Montserrat:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Bitcount+Prop+Single:wght@400;600&family=Inter:wght@300;400;500&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;700&display=swap',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js',
  'https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.js',
  'https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.css',
  'https://unpkg.com/@phosphor-icons/web'
];

// Evento 'install': Se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta, guardando archivos esenciales...');
        // Usamos addAll para cachear todos los recursos de la lista.
        // Si una de las peticiones falla, la promesa se rechaza y la instalación falla.
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Fallo al cachear uno o más recursos durante la instalación:', error);
        });
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la app realiza una petición de red.
self.addEventListener('fetch', event => {
  // Estrategia "Cache First": primero busca en la caché, si no lo encuentra, va a la red.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en la caché, la devolvemos.
        if (response) {
          return response;
        }
        
        // Si no está en caché, la pedimos a la red.
        return fetch(event.request).then(
          networkResponse => {
            // Opcional: Podemos cachear la nueva respuesta si queremos.
            // Esto es útil para recursos dinámicos o que no estaban en la lista inicial.
            // No lo haremos por defecto para no llenar la caché con datos innecesarios.
            return networkResponse;
          }
        ).catch(error => {
            console.error('Error de fetch del Service Worker:', error);
            // Opcional: Devolver una página de fallback si falla la red.
            // return caches.match('./offline.html');
        });
      })
  );
});

// Evento 'activate': Se dispara cuando un nuevo Service Worker se activa.
// Es el lugar ideal para limpiar cachés antiguas.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si una caché no está en nuestra lista blanca, la eliminamos.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
