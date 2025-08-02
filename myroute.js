// Importa las funciones del gestor de datos unificado.
// Asegúrate de que 'data-manager.js' esté en el mismo directorio.
import { getUnifiedData, saveUnifiedData } from './data-manager.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Selectores de Elementos DOM ---
    const getEl = (id) => document.getElementById(id);
    const DOMElements = {
        body: document.body,
        map: getEl('map'),
        statusOverlay: getEl('status-overlay'),
        statusText: getEl('status-text'),
        recordBtn: getEl('record-btn'),
        recordIcon: getEl('record-icon'),
        statsDisplay: getEl('stats-display'),
        statDistance: getEl('stat-distance'),
        statTime: getEl('stat-time'),
        recenterBtn: getEl('recenter-btn'),
        menuBtn: getEl('menu-btn'),
        sidePanel: getEl('side-panel'),
        closePanelBtn: getEl('close-panel-btn'),
        savedRoutesList: getEl('saved-routes-list'),
        saveModal: getEl('save-modal'),
        routeNameInput: getEl('route-name-input'),
        discardBtn: getEl('discard-btn'),
        saveRouteBtn: getEl('save-route-btn'),
        backToTrackingBtn: getEl('back-to-tracking-btn'),
        routeStatsPanel: getEl('route-stats-panel'),
        statsPanelName: getEl('stats-panel-name'),
        statsPanelDist: getEl('stats-panel-dist'),
        statsPanelTime: getEl('stats-panel-time'),
        statsPanelDate: getEl('stats-panel-date'),
        themeSelector: getEl('theme-selector'),
        clockDisplay: getEl('clock-display'),
    };

    // --- Estado de la Aplicación ---
    let map;
    let userMarker;
    let watchId;
    let lastKnownPosition = null;
    let isRecording = false;
    let currentPath = [];
    let recordingStartTime;
    let statsInterval;

    // ✅ CAMBIO: Usamos un estilo de mapa de OpenStreetMap que no requiere API key.
    const openStreetMapStyle = {
        'version': 8,
        'sources': {
            'osm': {
                'type': 'raster',
                'tiles': ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                'tileSize': 256,
                'attribution': '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
        },
        'layers': [
            {
                'id': 'osm',
                'type': 'raster',
                'source': 'osm'
            }
        ]
    };

    // El mapa base será el mismo para todos los temas de la UI.
    const mapStyles = {
        dark: openStreetMapStyle,
        light: openStreetMapStyle,
        black: openStreetMapStyle
    };

    // --- Módulo de Gestión de Datos (Integrado con data-manager.js) ---
    const appDataManager = {
        getRoutes: () => getUnifiedData().myRoute.routes || [],
        getMapTheme: () => getUnifiedData().myRoute.settings.mapStyle || 'dark',
        saveRoute: (name, path, startTime) => {
            const unifiedData = getUnifiedData();
            const routeData = {
                id: Date.now(),
                name: name,
                date: new Date().toISOString(),
                path: path,
                distance: util.calculateDistance(path),
                durationMs: Date.now() - startTime,
            };
            if (!unifiedData.myRoute.routes) {
                unifiedData.myRoute.routes = [];
            }
            unifiedData.myRoute.routes.unshift(routeData);
            saveUnifiedData(unifiedData);
        },
        deleteRoute: (id) => {
            const unifiedData = getUnifiedData();
            unifiedData.myRoute.routes = unifiedData.myRoute.routes.filter(r => r.id != id);
            saveUnifiedData(unifiedData);
        },
        saveMapTheme: (theme) => {
            const unifiedData = getUnifiedData();
            if (!unifiedData.myRoute.settings) {
                unifiedData.myRoute.settings = {};
            }
            unifiedData.myRoute.settings.mapStyle = theme;
            saveUnifiedData(unifiedData);
        }
    };

    // --- Módulo Controlador del Mapa ---
    const mapController = {
        init: (theme) => {
            if (map) return; // Evitar reinicializar el mapa
            
            map = new maplibregl.Map({
                container: 'map',
                style: mapStyles[theme], // Se pasa el objeto de estilo de OSM
                center: [-79.0045, -2.9001], // Cuenca, Ecuador
                zoom: 13,
                pitch: 30,
            });
            map.on('load', () => {
                mapController.createArrowImage();
                mapController.setupLayers();
                geolocation.start();
            });
             map.on('error', (e) => {
                console.error("Error del mapa:", e);
            });
        },
        updateTheme: (theme) => {
            // La UI cambia de tema, pero el mapa base de OSM no.
            // Esta función ya no necesita cambiar el estilo del mapa.
        },
        createArrowImage: () => {
            const width = 16, height = 16;
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const context = canvas.getContext('2d');
            context.fillStyle = 'white';
            context.beginPath();
            context.moveTo(2, height / 2);
            context.lineTo(width - 2, height / 2);
            context.lineTo(width / 2, 2);
            context.closePath();
            context.fill();
            if (!map.hasImage('arrow')) {
                map.addImage('arrow', context.getImageData(0, 0, width, height), { sdf: true });
            }
        },
        setupLayers: () => {
            const brandColor = getComputedStyle(document.body).getPropertyValue('--brand-color').trim();
            const secondaryColor = getComputedStyle(document.body).getPropertyValue('--secondary-color').trim();
            const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim();
            
            ['live-route-layer', 'saved-route-arrows', 'saved-route-line', 'saved-route-casing'].forEach(l => map.getLayer(l) && map.removeLayer(l));
            ['live-route-source', 'saved-route-source'].forEach(s => map.getSource(s) && map.removeSource(s));

            map.addSource('live-route-source', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
            map.addLayer({ id: 'live-route-layer', type: 'line', source: 'live-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': brandColor, 'line-width': 4 } });
            
            map.addSource('saved-route-source', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
            map.addLayer({ id: 'saved-route-casing', type: 'line', source: 'saved-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': bgColor, 'line-width': 7 } });
            map.addLayer({ id: 'saved-route-line', type: 'line', source: 'saved-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': secondaryColor, 'line-width': 4 } });
            map.addLayer({ id: 'saved-route-arrows', type: 'symbol', source: 'saved-route-source', layout: { 'symbol-placement': 'line', 'symbol-spacing': 100, 'icon-image': 'arrow', 'icon-size': 0.5, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-rotate': 90, 'icon-rotation-alignment': 'map' }, paint: { 'icon-color': brandColor } });
        },
        drawRoute: (sourceId, path) => {
            if (map && map.getSource(sourceId)) {
                map.getSource(sourceId).setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: path } });
            }
        },
        fitBounds: (path) => {
            if (path.length < 2) return;
            const bounds = path.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(path[0], path[0]));
            map.fitBounds(bounds, { padding: { top: 120, bottom: 40, left: 40, right: 40 }, duration: 1000 });
        },
        recenter: () => {
            if (lastKnownPosition) {
                map.easeTo({ center: [lastKnownPosition.coords.longitude, lastKnownPosition.coords.latitude], zoom: 16 });
            }
        }
    };

    // --- Módulo de Geolocalización ---
    const geolocation = {
        start: () => {
            if (!navigator.geolocation) {
                ui.updateStatus("Geolocalización no soportada.");
                return;
            }
            if (userMarker) userMarker.remove();
            const markerEl = document.createElement('div');
            markerEl.className = 'user-marker';
            userMarker = new maplibregl.Marker({ element: markerEl }).setLngLat([-79.0045, -2.9001]).addTo(map);
            if (watchId) navigator.geolocation.clearWatch(watchId);
            watchId = navigator.geolocation.watchPosition(geolocation.onSuccess, geolocation.onError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        },
        onSuccess: (position) => {
            lastKnownPosition = position;
            const coords = [position.coords.longitude, position.coords.latitude];
            userMarker.setLngLat(coords);

            if (DOMElements.statusOverlay.style.display !== 'none') {
                DOMElements.statusOverlay.style.display = 'none';
                mapController.recenter();
            }
            if (isRecording) {
                currentPath.push(coords);
                mapController.drawRoute('live-route-source', currentPath);
                map.panTo(coords);
            }
        },
        onError: (error) => {
            ui.updateStatus(`Error de GPS: ${error.message}`);
        }
    };

    // --- Módulo Controlador de UI ---
    const ui = {
        init: () => {
            const savedTheme = appDataManager.getMapTheme();
            ui.applyTheme(savedTheme);
            ui.renderSavedRoutes();
            ui.addEventListeners();
        },
        addEventListeners: () => {
            DOMElements.recordBtn.addEventListener('click', () => { isRecording ? ui.stopRecording() : ui.startRecording(); });
            DOMElements.recenterBtn.addEventListener('click', mapController.recenter);
            DOMElements.menuBtn.addEventListener('click', () => DOMElements.sidePanel.classList.remove('hidden'));
            DOMElements.closePanelBtn.addEventListener('click', () => DOMElements.sidePanel.classList.add('hidden'));
            DOMElements.saveRouteBtn.addEventListener('click', ui.handleSaveRoute);
            DOMElements.discardBtn.addEventListener('click', () => {
                DOMElements.saveModal.classList.remove('active');
                ui.resetRecordingState();
            });
            DOMElements.backToTrackingBtn.addEventListener('click', ui.backToTrackingView);
            DOMElements.savedRoutesList.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.classList.contains('view-route-btn')) ui.viewRoute(id);
                if (btn.classList.contains('delete-route-btn')) ui.handleDeleteRoute(id);
            });
            DOMElements.themeSelector.addEventListener('click', (e) => {
                const btn = e.target.closest('button.theme-btn');
                if (btn) ui.applyTheme(btn.dataset.theme);
            });
        },
        startRecording: () => {
            if (!lastKnownPosition) { alert("Espera a tener una señal de GPS estable."); return; }
            isRecording = true;
            currentPath = [[lastKnownPosition.coords.longitude, lastKnownPosition.coords.latitude]];
            recordingStartTime = Date.now();
            DOMElements.recordIcon.className = 'ph ph-stop text-4xl';
            DOMElements.recordBtn.classList.add('recording-pulse');
            DOMElements.statsDisplay.classList.remove('hidden');
            DOMElements.statsDisplay.classList.add('flex', 'fade-in');
            statsInterval = setInterval(ui.updateStats, 1000);
        },
        stopRecording: () => {
            isRecording = false;
            clearInterval(statsInterval);
            DOMElements.recordIcon.className = 'ph ph-play text-4xl';
            DOMElements.recordBtn.classList.remove('recording-pulse');
            if (currentPath.length < 2) { ui.resetRecordingState(); return; }
            DOMElements.saveModal.classList.add('active');
            DOMElements.routeNameInput.value = `Ruta - ${new Date().toLocaleString('es-ES')}`;
            DOMElements.routeNameInput.focus();
        },
        resetRecordingState: () => {
            currentPath = [];
            mapController.drawRoute('live-route-source', []);
            DOMElements.statsDisplay.classList.add('hidden');
            DOMElements.statsDisplay.classList.remove('flex', 'fade-in');
            DOMElements.statDistance.textContent = "0.00";
            DOMElements.statTime.textContent = "00:00";
        },
        updateStats: () => {
            const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
            const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
            DOMElements.statTime.textContent = `${minutes}:${seconds}`;
            DOMElements.statDistance.textContent = util.calculateDistance(currentPath).toFixed(2);
        },
        handleSaveRoute: () => {
            const name = DOMElements.routeNameInput.value.trim();
            if (!name) { alert("Por favor, introduce un nombre para la ruta."); return; }
            appDataManager.saveRoute(name, currentPath, recordingStartTime);
            DOMElements.saveModal.classList.remove('active');
            ui.resetRecordingState();
            ui.renderSavedRoutes();
        },
        renderSavedRoutes: () => {
            const routes = appDataManager.getRoutes();
            const listEl = DOMElements.savedRoutesList;
            listEl.innerHTML = '';
            if (routes.length === 0) {
                listEl.innerHTML = `<p class="text-center mt-8" style="color: var(--text-secondary);">No tienes rutas guardadas.</p>`;
                return;
            }
            routes.forEach(route => {
                const el = document.createElement('div');
                el.className = 'p-4 rounded-lg mb-3 fade-in';
                el.style.backgroundColor = 'var(--light-bg)';
                const date = new Date(route.date);
                el.innerHTML = `
                    <p class="font-bold truncate">${route.name}</p>
                    <p class="text-sm" style="color: var(--text-secondary);">${route.distance.toFixed(2)} km - ${date.toLocaleDateString('es-ES')}</p>
                    <div class="mt-3 flex gap-2">
                        <button data-id="${route.id}" class="view-route-btn flex-1 text-sm py-1 px-2 rounded" style="background-color: var(--bg-primary); color: var(--text-primary);">Ver</button>
                        <button data-id="${route.id}" class="delete-route-btn flex-1 text-sm py-1 px-2 rounded" style="background-color: var(--bg-primary); color: var(--text-primary);">Borrar</button>
                    </div>
                `;
                listEl.appendChild(el);
            });
        },
        viewRoute: (id) => {
            const route = appDataManager.getRoutes().find(r => r.id == id);
            if (!route) return;
            DOMElements.sidePanel.classList.add('hidden');
            DOMElements.backToTrackingBtn.classList.remove('hidden');
            DOMElements.statsPanelName.textContent = route.name;
            DOMElements.statsPanelDist.textContent = route.distance.toFixed(2);
            DOMElements.statsPanelTime.textContent = util.formatDuration(route.durationMs);
            DOMElements.statsPanelDate.textContent = new Date(route.date).toLocaleDateString('es-ES');
            DOMElements.routeStatsPanel.classList.remove('hidden');
            DOMElements.routeStatsPanel.classList.add('fade-in');
            mapController.drawRoute('saved-route-source', route.path);
            mapController.fitBounds(route.path);
        },
        handleDeleteRoute: (id) => {
            if (!confirm("¿Estás seguro de que quieres borrar esta ruta?")) return;
            appDataManager.deleteRoute(id);
            ui.renderSavedRoutes();
        },
        backToTrackingView: () => {
            DOMElements.backToTrackingBtn.classList.add('hidden');
            DOMElements.routeStatsPanel.classList.add('hidden');
            DOMElements.routeStatsPanel.classList.remove('fade-in');
            mapController.drawRoute('saved-route-source', []);
            mapController.recenter();
        },
        applyTheme: (theme) => {
            DOMElements.body.className = `theme-${theme} overflow-hidden h-screen flex flex-col`;
            appDataManager.saveMapTheme(theme);
            // Ya no se llama a mapController.updateTheme(theme) porque el mapa base es siempre el mismo
            DOMElements.themeSelector.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });
        },
        updateStatus: (text) => {
            DOMElements.statusText.textContent = text;
            DOMElements.statusOverlay.style.display = 'flex';
        }
    };

    // --- Módulo del Reloj ---
    const clock = {
        init: () => {
            clock.update();
            setInterval(clock.update, 1000);
        },
        update: () => {
            if (DOMElements.clockDisplay) {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const seconds = now.getSeconds().toString().padStart(2, '0');
                DOMElements.clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }
    };

    // --- Módulo de Funciones de Utilidad ---
    const util = {
        formatDuration: (ms) => {
            if (!ms || ms < 0) return "00:00:00";
            const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        },
        calculateDistance: (coords) => {
            let d = 0; for (let i = 0; i < coords.length - 1; i++) d += util.haversineDistance(coords[i], coords[i + 1]); return d;
        },
        haversineDistance: (c1, c2) => {
            const r = (x) => x * Math.PI / 180, R = 6371, dLat = r(c2[1] - c1[1]), dLon = r(c2[0] - c1[0]);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(c1[1])) * Math.cos(r(c2[1])) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
    };

    // --- Inicialización de la Aplicación ---
    ui.init();
    clock.init();
    mapController.init(appDataManager.getMapTheme());
});
