// service-worker.js

const CACHE_NAME_PREFIX = 'cahier-de-tests-cache-';
const CACHE_VERSION = 'v1.3'; // << IMPORTANT: Incrémentez ceci à chaque modification majeure de vos fichiers !
const CACHE_NAME = `${CACHE_NAME_PREFIX}${CACHE_VERSION}`;

// Fichiers essentiels de l'application (App Shell)
const APP_SHELL_FILES = [
  '/', // Alias pour index.html à la racine
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  // Ajoutez les icônes principales utilisées par le manifest et pour le fallback
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // Si vous avez une image placeholder pour le mode hors-ligne, ajoutez-la ici
  // '/images/offline-placeholder.png'
];

// Fichiers externes (CDN)
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js'
];

const ALL_URLS_TO_CACHE = [...APP_SHELL_FILES, ...EXTERNAL_ASSETS];

// --- Événement d'Installation ---
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Événement d'installation détecté pour la version : ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[Service Worker] Mise en cache de l'App Shell et des assets externes pour ${CACHE_NAME}:`, ALL_URLS_TO_CACHE);
        // addAll est atomique : si un fichier échoue, toute l'opération échoue.
        return cache.addAll(ALL_URLS_TO_CACHE)
          .catch(error => {
            console.error('[Service Worker] Échec de la mise en cache initiale. Certains fichiers pourraient être manquants:', error);
            // Il est crucial de comprendre pourquoi cela échoue (ex: fichier 404)
            // Pour le développement, on peut vouloir que l'installation continue même si un asset externe optionnel échoue.
            // Pour la production, il est préférable de s'assurer que tous les fichiers essentiels sont mis en cache.
          });
      })
      .then(() => {
        console.log(`[Service Worker] App Shell mis en cache avec succès. Passage à l'activation (skipWaiting).`);
        // Force le service worker installé à devenir le service worker actif.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error("[Service Worker] Erreur lors de l'étape d'installation :", error);
      })
  );
});

// --- Événement d'Activation ---
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Événement d'activation détecté pour la version : ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches de cette application spécifique
          if (cacheName.startsWith(CACHE_NAME_PREFIX) && cacheName !== CACHE_NAME) {
            console.log(`[Service Worker] Suppression de l'ancien cache : ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`[Service Worker] Anciens caches nettoyés. Le SW version ${CACHE_VERSION} est actif et contrôle les clients.`);
      // Permet à un service worker activé de prendre le contrôle de la page immédiatement.
      return self.clients.claim();
    }).catch(error => {
      console.error("[Service Worker] Erreur lors de l'étape d'activation :", error);
    })
  );
});

// --- Événement Fetch (Interception des requêtes) ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Ignorer les requêtes non-GET (POST, PUT, etc.)
  if (request.method !== 'GET') {
    // console.log(`[Service Worker] Ignorer la requête non-GET : ${request.method} ${request.url}`);
    return;
  }

  // Stratégie pour les requêtes de navigation (HTML)
  // Network first, falling back to cache: On essaie toujours d'obtenir la version la plus fraîche.
  if (request.mode === 'navigate' || 
      (request.destination === 'document' && requestUrl.origin === self.location.origin)) {
    // console.log(`[Service Worker] Requête de navigation (Network First) pour : ${request.url}`);
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Si la réponse réseau est valide, la cloner, la mettre en cache et la retourner.
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // console.log(`[Service Worker] Mise en cache de la réponse réseau pour : ${request.url}`);
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si le réseau échoue, essayer de servir depuis le cache.
          console.warn(`[Service Worker] Réseau indisponible pour ${request.url}. Tentative depuis le cache.`);
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Optionnel: retourner une page offline générique si rien n'est en cache.
              // return caches.match('/offline.html'); // Assurez-vous que offline.html est dans APP_SHELL_FILES
              console.error(`[Service Worker] Ni le réseau ni le cache ne sont disponibles pour la requête de navigation : ${request.url}`);
              // Retourner une réponse d'erreur basique si rien d'autre n'est possible
              return new Response("Contenu hors ligne non disponible.", { status: 503, statusText: "Service Unavailable", headers: { 'Content-Type': 'text/plain' }});
            });
        })
    );
    return;
  }

  // Stratégie pour les autres assets (CSS, JS, images, polices, CDN)
  // Cache first, falling back to network: Servir rapidement depuis le cache si disponible.
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // console.log(`[Service Worker] Servi depuis le cache : ${request.url}`);
          return cachedResponse;
        }

        // Si non trouvé dans le cache, requête réseau.
        // console.log(`[Service Worker] Non trouvé dans le cache, requête réseau pour : ${request.url}`);
        return fetch(request)
          .then((networkResponse) => {
            // Mettre en cache la nouvelle ressource seulement si la réponse est valide.
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                // console.log(`[Service Worker] Mise en cache de la nouvelle ressource : ${request.url}`);
                cache.put(request, responseToCache);
              });
            } else if (networkResponse && !networkResponse.ok) {
              // Ne pas mettre en cache les réponses d'erreur (404, 500, etc.)
              console.warn(`[Service Worker] Réponse réseau non valide (status: ${networkResponse.status}) pour ${request.url}. Non mis en cache.`);
            }
            return networkResponse;
          })
          .catch(error => {
            console.error(`[Service Worker] Erreur de fetch pour l'asset ${request.url}:`, error);
            // Optionnel: retourner une réponse de fallback pour certains types d'assets (ex: image placeholder)
            // if (request.destination === 'image') {
            //   return caches.match('/images/placeholder-image.png');
            // }
            // Pour les autres erreurs, laisser le navigateur gérer (ce qui affichera une erreur standard)
          });
      })
  );
});

// Optionnel: Écouter les messages provenant des clients (pages)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Message SKIP_WAITING reçu, activation immédiate.');
    self.skipWaiting();
  }
});
