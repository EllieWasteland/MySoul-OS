// Importa las funciones del gestor de datos unificado.
import { getUnifiedData, saveUnifiedData } from './data-manager.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Selectores de Elementos DOM ---
    const getEl = (id) => document.getElementById(id);
    const DOMElements = {
        body: document.body,
        map: getEl('map'),
        statusOverlay: getEl('status-overlay'),
        statusText: getEl('status-text'),
        initialControls: getEl('initial-controls'),
        startRecordBtn: getEl('start-record-btn'),
        recordingStatsPanel: getEl('recording-stats-panel'),
        statTime: getEl('stat-time'),
        statDistance: getEl('stat-distance'),
        altimetryCanvas: getEl('altimetry-canvas'),
        statCurrentSpeed: getEl('stat-current-speed'),
        statAvgSpeed: getEl('stat-avg-speed'),
        statMaxSpeed: getEl('stat-max-speed'),
        stopRecordBtn: getEl('stop-record-btn'),
        recenterBtn: getEl('recenter-btn'),
        menuBtn: getEl('menu-btn'),
        sidePanel: getEl('side-panel'),
        closePanelBtn: getEl('close-panel-btn'),
        savedRoutesList: getEl('saved-routes-list'),
        themeSelector: getEl('theme-selector'),
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
        clockDisplay: getEl('clock-display'),
        exportRoutesBtn: getEl('export-routes-btn'),
        importRoutesBtn: getEl('import-routes-btn'),
        toggleOfflineModeBtn: getEl('toggle-offline-mode-btn'),
        importFileInput: getEl('import-file-input'),
        offlineModeIndicator: getEl('offline-mode-indicator'),
    };

    // --- Estado de la Aplicación ---
    let map;
    let userMarker;
    let watchId;
    let lastKnownPosition = null;
    let previousPosition = null;
    let isRecording = false;
    let isDynamicCameraActive = false;
    let lastBearing = 0;
    let currentPath = [];
    let altitudeData = [];
    let recordingStartTime;
    let statsInterval;
    let wakeLock = null;
    let maxSpeed = 0;
    let totalDistanceForAvg = 0;

    // --- Estilos de Mapa ---
    const lightStyle = { version: 8, sources: { "stadia-alidade-smooth": { type: "raster", tiles: ["https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"], tileSize: 256, attribution: '&copy; Stadia Maps' } }, layers: [{ id: "stadia-alidade-smooth", type: "raster", source: "stadia-alidade-smooth" }] };
    const darkStyle = { version: 8, sources: { "stadia-alidade-smooth-dark": { type: "raster", tiles: ["https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png"], tileSize: 256, attribution: '&copy; Stadia Maps' } }, layers: [{ id: "stadia-alidade-smooth-dark", type: "raster", source: "stadia-alidade-smooth-dark" }] };
    const mapStyles = { dark: darkStyle, light: lightStyle };
    
    // --- Módulo de Gestión de Datos ---
    const appDataManager = {
        getRoutes: () => getUnifiedData().myRoute.routes || [],
        getSettings: () => getUnifiedData().myRoute.settings || { mapStyle: 'dark', isOfflineMode: false },
        saveAllRoutes: (routes) => {
            const unifiedData = getUnifiedData();
            if (!unifiedData.myRoute) unifiedData.myRoute = {};
            unifiedData.myRoute.routes = routes;
            saveUnifiedData(unifiedData);
        },
        saveRoute: (name, path, startTime, altitudes) => {
            const unifiedData = getUnifiedData();
            if (!unifiedData.myRoute) unifiedData.myRoute = { routes: [], settings: { mapStyle: 'dark', isOfflineMode: false }};
            const routeData = { id: Date.now(), name, date: new Date().toISOString(), path, distance: util.calculateDistance(path), durationMs: Date.now() - startTime, altitudeData: altitudes };
            if (!unifiedData.myRoute.routes) unifiedData.myRoute.routes = [];
            unifiedData.myRoute.routes.unshift(routeData);
            saveUnifiedData(unifiedData);
        },
        deleteRoute: (id) => {
            const unifiedData = getUnifiedData();
            if (!unifiedData.myRoute || !unifiedData.myRoute.routes) return;
            unifiedData.myRoute.routes = unifiedData.myRoute.routes.filter(r => r.id != id);
            saveUnifiedData(unifiedData);
        },
        saveSettings: (settings) => {
            const unifiedData = getUnifiedData();
            if (!unifiedData.myRoute) unifiedData.myRoute = { routes: [], settings: {} };
            unifiedData.myRoute.settings = settings;
            saveUnifiedData(unifiedData);
        }
    };
    
    // --- Lógica para mantener la pantalla despierta (Wake Lock) ---
    const screenWakeLock = {
        request: async () => { if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => {}); } catch (err) {} } },
        handleVisibilityChange: () => { if (wakeLock !== null && document.visibilityState === 'visible') { screenWakeLock.request(); } }
    };

    // --- Módulo Controlador del Mapa ---
    const mapController = {
        init: (theme) => {
            if (map) return;
            const settings = appDataManager.getSettings();
            
            const mapConfig = {
                container: 'map',
                style: mapStyles[theme],
                center: [-79.0045, -2.9001],
                zoom: 13,
                pitch: 30,
                transformRequest: (url, resourceType) => {
                    if (resourceType === 'Tile' && settings.isOfflineMode) {
                        const cachedTile = localStorage.getItem(url);
                        if (cachedTile) {
                            return { url: cachedTile };
                        }
                        return { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' };
                    }
                    return { url };
                }
            };
            
            map = new maplibregl.Map(mapConfig);

            map.on('load', () => { 
                mapController.createArrowImage(); 
                mapController.setupLayers(theme); 
                geolocation.start(); 
            });

            map.on('dragstart', () => { if (isRecording) isDynamicCameraActive = false; });
            map.on('rotatestart', () => { if (isRecording) isDynamicCameraActive = false; });
            map.on('pitchstart', () => { if(isRecording) isDynamicCameraActive = false; });

            map.on('error', (e) => console.error("Error del mapa:", e));
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
            if (map && !map.hasImage('arrow')) { map.addImage('arrow', context.getImageData(0, 0, width, height), { sdf: true }); }
        },
        setupLayers: (theme) => {
            const liveRouteColor = theme === 'light' ? 'black' : 'white';
            const brandColor = getComputedStyle(document.body).getPropertyValue('--brand-color').trim();
            const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim();
            const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim();
            
            ['live-route-layer', 'saved-route-arrows', 'saved-route-line', 'saved-route-casing'].forEach(l => map.getLayer(l) && map.removeLayer(l));
            ['live-route-source', 'saved-route-source'].forEach(s => map.getSource(s) && map.removeSource(s));

            map.addSource('live-route-source', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
            map.addLayer({ id: 'live-route-layer', type: 'line', source: 'live-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': liveRouteColor, 'line-width': 4 } });
            map.addSource('saved-route-source', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
            map.addLayer({ id: 'saved-route-casing', type: 'line', source: 'saved-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': bgColor, 'line-width': 7 } });
            map.addLayer({ id: 'saved-route-line', type: 'line', source: 'saved-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': secondaryColor, 'line-width': 4 } });
            map.addLayer({ id: 'saved-route-arrows', type: 'symbol', source: 'saved-route-source', layout: { 'symbol-placement': 'line', 'symbol-spacing': 100, 'icon-image': 'arrow', 'icon-size': 0.5, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-rotate': 90, 'icon-rotation-alignment': 'map' }, paint: { 'icon-color': brandColor } });
        },
        drawRoute: (sourceId, path) => { if (map && map.getSource(sourceId)) { map.getSource(sourceId).setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: path } }); } },
        fitBounds: (path) => {
            if (!path || path.length < 2) return;
            const bounds = path.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(path[0], path[0]));
            map.fitBounds(bounds, { padding: { top: 80, bottom: 300, left: 40, right: 40 }, duration: 1000 });
        },
        recenter: () => {
            if (lastKnownPosition) {
                if (isRecording) {
                    isDynamicCameraActive = true;
                } else {
                    map.easeTo({ 
                        center: [lastKnownPosition.coords.longitude, lastKnownPosition.coords.latitude], 
                        zoom: 16,
                        pitch: 30,
                        bearing: 0
                    });
                }
            }
        },
        updateDynamicCamera: (center, bearing, zoom) => {
            if (!map) return;
            map.easeTo({
                center: center,
                zoom: zoom,
                bearing: bearing,
                padding: { bottom: window.innerHeight / 3 },
                duration: 1000,
                easing: (t) => t
            });
        }
    };

    // --- Módulo de Geolocalización ---
    const geolocation = {
        start: () => {
            if (!navigator.geolocation) { ui.updateStatus("Geolocalización no soportada."); return; }
            if (userMarker) userMarker.remove();

            const markerEl = document.createElement('div');
            markerEl.className = 'user-location-marker';
            markerEl.innerHTML = `
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 3.5L3.5 28.5L16 21.5L28.5 28.5L16 3.5Z" fill="var(--brand-color)" stroke="var(--bg-primary)" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            `;

            userMarker = new maplibregl.Marker({
                element: markerEl,
                anchor: 'center'
            }).setLngLat([-79.0045, -2.9001]).addTo(map);

            if (watchId) navigator.geolocation.clearWatch(watchId);
            watchId = navigator.geolocation.watchPosition(geolocation.onSuccess, geolocation.onError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        },
        onSuccess: (position) => {
            const newCoords = [position.coords.longitude, position.coords.latitude];
            
            if (isRecording && previousPosition && position.coords.speed > 0.5) {
                const bearing = util.calculateBearing(
                    [previousPosition.coords.longitude, previousPosition.coords.latitude],
                    newCoords
                );
                lastBearing = util.lerpAngle(lastBearing, bearing, 0.1);
            }

            if(userMarker) {
                userMarker.setLngLat(newCoords);
                const rotation = isRecording ? lastBearing : 0;
                userMarker.getElement().style.transform = `rotate(${rotation}deg)`;
            }

            if (isRecording && isDynamicCameraActive) {
                const fixedRecordingZoom = 17;
                mapController.updateDynamicCamera(newCoords, lastBearing, fixedRecordingZoom);
            } else if (isRecording && !isDynamicCameraActive) {
                map.panTo(newCoords);
            }

            lastKnownPosition = position;
            previousPosition = position;
            
            if (DOMElements.statusOverlay.style.display !== 'none') {
                DOMElements.statusOverlay.style.display = 'none';
                 if (!isRecording) {
                    mapController.recenter();
                }
            }
            if (isRecording) {
                currentPath.push(newCoords);
                if (position.coords.altitude) { altitudeData.push(position.coords.altitude); }
                mapController.drawRoute('live-route-source', currentPath);
                ui.updateLiveStats(position);
            }
        },
        onError: (error) => { ui.updateStatus(`Error de GPS: ${error.message}`); }
    };

    // --- Módulo Controlador de UI ---
    const ui = {
        init: () => {
            const settings = appDataManager.getSettings();
            ui.applyTheme(settings.mapStyle, true);
            ui.updateOfflineModeUI(settings.isOfflineMode);
            ui.renderSavedRoutes();
            ui.addEventListeners();
        },
        addEventListeners: () => {
            DOMElements.startRecordBtn.addEventListener('click', ui.startRecording);
            DOMElements.stopRecordBtn.addEventListener('click', ui.stopRecording);
            DOMElements.recenterBtn.addEventListener('click', mapController.recenter);
            DOMElements.menuBtn.addEventListener('click', () => DOMElements.sidePanel.classList.remove('hidden'));
            DOMElements.closePanelBtn.addEventListener('click', () => DOMElements.sidePanel.classList.add('hidden'));
            DOMElements.themeSelector.addEventListener('click', (e) => {
                const btn = e.target.closest('button.theme-btn');
                if (btn) ui.applyTheme(btn.dataset.theme);
            });
            DOMElements.saveRouteBtn.addEventListener('click', ui.handleSaveRoute);
            DOMElements.discardBtn.addEventListener('click', () => { DOMElements.saveModal.classList.remove('active'); ui.resetRecordingState(); });
            DOMElements.backToTrackingBtn.addEventListener('click', ui.backToTrackingView);
            DOMElements.savedRoutesList.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.classList.contains('view-route-btn')) ui.viewRoute(id);
                if (btn.classList.contains('delete-route-btn')) ui.handleDeleteRoute(id);
            });
            DOMElements.exportRoutesBtn.addEventListener('click', dataManagement.exportRoutes);
            DOMElements.importRoutesBtn.addEventListener('click', () => DOMElements.importFileInput.click());
            DOMElements.toggleOfflineModeBtn.addEventListener('click', dataManagement.handleOfflineButtonClick);
            DOMElements.importFileInput.addEventListener('change', dataManagement.importHandler);
        },
        applyTheme: (theme, isInitial = false) => {
            const settings = appDataManager.getSettings();
            settings.mapStyle = theme;
            appDataManager.saveSettings(settings);

            DOMElements.body.className = `theme-${theme} overflow-hidden h-screen flex flex-col`;
            DOMElements.themeSelector.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });

            if (map && !isInitial && !settings.isOfflineMode) {
                map.setStyle(mapStyles[theme]);
                map.once('load', () => {
                    mapController.createArrowImage();
                    mapController.setupLayers(theme);
                    if (userMarker) { userMarker.addTo(map); }
                    mapController.drawRoute('live-route-source', currentPath);
                    const activeRoute = appDataManager.getRoutes().find(r => r.name === DOMElements.statsPanelName.textContent && !DOMElements.routeStatsPanel.classList.contains('hidden'));
                    if (activeRoute) { mapController.drawRoute('saved-route-source', activeRoute.path); }
                });
            }
        },
        updateOfflineModeUI: (isOffline) => {
            const tileCount = Object.keys(localStorage).filter(k => k.includes('tiles.stadiamaps.com')).length;
            const estimatedTotal = 4000;
            const percentage = Math.min(100, (tileCount / estimatedTotal * 100));

            if (isOffline) {
                DOMElements.offlineModeIndicator.classList.remove('hidden');
                DOMElements.toggleOfflineModeBtn.textContent = 'Desactivar Modo Offline';
                DOMElements.toggleOfflineModeBtn.classList.add('active');
            } else {
                DOMElements.offlineModeIndicator.classList.add('hidden');
                DOMElements.toggleOfflineModeBtn.textContent = `Preparar Mapa Offline (${percentage.toFixed(0)}% listo)`;
                DOMElements.toggleOfflineModeBtn.classList.remove('active');
            }
        },
        startRecording: () => {
            if (!lastKnownPosition) { alert("Espera a tener una señal de GPS estable."); return; }
            isRecording = true;
            isDynamicCameraActive = true;
            previousPosition = lastKnownPosition;
            currentPath = [[lastKnownPosition.coords.longitude, lastKnownPosition.coords.latitude]];
            altitudeData = lastKnownPosition.coords.altitude ? [lastKnownPosition.coords.altitude] : [];
            recordingStartTime = Date.now();
            maxSpeed = 0;
            
            map.scrollZoom.disable();
            map.doubleClickZoom.disable();
            
            DOMElements.initialControls.classList.add('hidden');
            DOMElements.recordingStatsPanel.classList.remove('hidden');

            map.easeTo({ pitch: 60, bearing: lastBearing, duration: 1500 });

            statsInterval = setInterval(ui.updateTimer, 1000);
            ui.updateTimer();
        },
        stopRecording: () => {
            isRecording = false;
            isDynamicCameraActive = false;
            clearInterval(statsInterval);

            map.scrollZoom.enable();
            map.doubleClickZoom.enable();

            if (currentPath.length < 2) { ui.resetRecordingState(); return; }
            DOMElements.saveModal.classList.add('active');
            DOMElements.routeNameInput.value = `Ruta - ${new Date().toLocaleString('es-ES')}`;
            DOMElements.routeNameInput.focus();
        },
        resetRecordingState: () => {
            isDynamicCameraActive = false;
            
            if (map) {
                map.scrollZoom.enable();
                map.doubleClickZoom.enable();
                map.easeTo({ pitch: 30, bearing: 0, duration: 1000 });
            }
            if (userMarker) {
                userMarker.getElement().style.transform = 'rotate(0deg)';
            }

            currentPath = [];
            altitudeData = [];
            maxSpeed = 0;
            mapController.drawRoute('live-route-source', []);
            DOMElements.recordingStatsPanel.classList.add('hidden');
            DOMElements.initialControls.classList.remove('hidden');
            DOMElements.statDistance.textContent = "0.00";
            DOMElements.statTime.textContent = "00:00:00";
            DOMElements.statCurrentSpeed.textContent = "0.0";
            DOMElements.statAvgSpeed.textContent = "0.0";
            DOMElements.statMaxSpeed.textContent = "0.0";
            ui.drawAltimetryChart();
        },
        updateTimer: () => {
             if (!isRecording) return;
             DOMElements.statTime.textContent = util.formatDuration(Date.now() - recordingStartTime);
        },
        updateLiveStats: (position) => {
            if (!isRecording) return;
            
            totalDistanceForAvg = util.calculateDistance(currentPath);
            DOMElements.statDistance.textContent = totalDistanceForAvg.toFixed(2);

            const speedKmh = position.coords.speed ? (position.coords.speed * 3.6) : 0;
            DOMElements.statCurrentSpeed.textContent = speedKmh.toFixed(1);

            if (speedKmh > maxSpeed) {
                maxSpeed = speedKmh;
                DOMElements.statMaxSpeed.textContent = maxSpeed.toFixed(1);
            }

            const elapsedSeconds = (Date.now() - recordingStartTime) / 1000;
            if (totalDistanceForAvg > 0 && elapsedSeconds > 0) {
                const avgSpeed = (totalDistanceForAvg / (elapsedSeconds / 3600));
                DOMElements.statAvgSpeed.textContent = avgSpeed.toFixed(1);
            }
            
            ui.drawAltimetryChart();
        },
        drawAltimetryChart: () => {
            const canvas = DOMElements.altimetryCanvas;
            const ctx = canvas.getContext('2d');
            const w = canvas.width = canvas.clientWidth;
            const h = canvas.height = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            if (altitudeData.length < 2) return;
            
            const theme = DOMElements.body.classList.contains('theme-light') ? 'light' : 'dark';
            ctx.strokeStyle = theme === 'light' ? 'black' : 'white';

            const minAlt = Math.min(...altitudeData);
            const maxAlt = Math.max(...altitudeData);
            const altRange = maxAlt - minAlt === 0 ? 1 : maxAlt - minAlt;

            ctx.lineWidth = 2;
            ctx.beginPath();

            altitudeData.forEach((alt, i) => {
                const x = (i / (altitudeData.length - 1)) * w;
                const y = h - ((alt - minAlt) / altRange) * h;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        },
        handleSaveRoute: () => {
            const name = DOMElements.routeNameInput.value.trim();
            if (!name) { alert("Por favor, introduce un nombre para la ruta."); return; }
            appDataManager.saveRoute(name, currentPath, recordingStartTime, altitudeData);
            DOMElements.saveModal.classList.remove('active');
            ui.resetRecordingState();
            ui.renderSavedRoutes();
        },
        renderSavedRoutes: () => {
            const routes = appDataManager.getRoutes();
            const listEl = DOMElements.savedRoutesList;
            listEl.innerHTML = '';
            if (routes.length === 0) { listEl.innerHTML = `<p class="text-center mt-8" style="color: var(--text-secondary);">No tienes rutas guardadas.</p>`; return; }
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
        updateStatus: (text) => {
            DOMElements.statusText.textContent = text;
            DOMElements.statusOverlay.style.display = 'flex';
        }
    };
    
    // --- Módulo de Gestión de Datos (Simplificado) ---
    const dataManagement = {
        handleOfflineButtonClick: () => {
            const settings = appDataManager.getSettings();
            if (settings.isOfflineMode) {
                settings.isOfflineMode = false;
                appDataManager.saveSettings(settings);
                if (confirm("Modo offline desactivado. ¿Quieres borrar los datos del mapa guardados para liberar espacio?")) {
                    Object.keys(localStorage).filter(k => k.includes('tiles.stadiamaps.com')).forEach(k => localStorage.removeItem(k));
                }
                location.reload();
            } else {
                dataManagement.prepareOfflineMap();
            }
        },
        prepareOfflineMap: async () => {
            if (!lastKnownPosition) {
                alert("Se necesita tu ubicación actual para preparar el mapa.");
                return;
            }
            if (!confirm("Esto descargará los datos del mapa esenciales para un área de 50x50 km. El proceso puede tardar unos minutos. ¿Continuar?")) {
                return;
            }

            ui.updateStatus("Calculando área del mapa...");
            const { latitude, longitude } = lastKnownPosition.coords;
            const sizeKm = 50;
            // **SOLUCIÓN**: Rango de zoom optimizado para balancear detalle y tamaño
            const minZoom = 10;
            const maxZoom = 16; 
            const tilesToFetch = [];
            const tileUrlTemplate = appDataManager.getSettings().mapStyle === 'dark' 
                ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'
                : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png';

            const lat_rad = latitude * Math.PI / 180;
            const deg_per_km = 1 / 111.32;
            const lat_change = sizeKm * deg_per_km / 2;
            const lon_change = sizeKm * deg_per_km / Math.cos(lat_rad) / 2;

            const bounds = {
                north: latitude + lat_change, south: latitude - lat_change,
                east: longitude + lon_change, west: longitude - lon_change,
            };

            for (let z = minZoom; z <= maxZoom; z++) {
                const topLeft = util.deg2num(bounds.north, bounds.west, z);
                const bottomRight = util.deg2num(bounds.south, bounds.east, z);
                for (let x = topLeft.x; x <= bottomRight.x; x++) {
                    for (let y = topLeft.y; y <= bottomRight.y; y++) {
                        tilesToFetch.push(tileUrlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y));
                    }
                }
            }
            
            const batchSize = 50;
            let fetchedCount = 0;
            const totalTiles = tilesToFetch.length;

            for (let i = 0; i < totalTiles; i += batchSize) {
                const batch = tilesToFetch.slice(i, i + batchSize);
                await Promise.all(batch.map(async (url) => {
                    try {
                        if (!localStorage.getItem(url)) {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const base64data = await util.blobToBase64(blob);
                            localStorage.setItem(url, base64data);
                        }
                    } catch (e) {
                        console.warn(`No se pudo descargar el tile: ${url}`);
                    }
                }));
                fetchedCount += batch.length;
                ui.updateStatus(`Descargando área... ${Math.round((fetchedCount / totalTiles) * 100)}%`);
            }

            ui.updateStatus("¡Descarga completa!");
            
            const settings = appDataManager.getSettings();
            settings.isOfflineMode = true;
            appDataManager.saveSettings(settings);
            alert("Modo Offline preparado y activado. La aplicación se reiniciará.");
            setTimeout(() => location.reload(), 1500);
        },
        exportRoutes: () => {
            const routes = appDataManager.getRoutes();
            if (routes.length === 0) { alert("No hay rutas para exportar."); return; }
            const dataStr = JSON.stringify({ type: 'MyRouteRoutes', version: 1, data: routes }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `myroute_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },
        importHandler: (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = JSON.parse(e.target.result);
                    if (content.type === 'MyRouteRoutes') { 
                        dataManagement.importRoutes(content.data); 
                    } else { 
                        throw new Error("Tipo de archivo no reconocido. Solo se pueden importar archivos de rutas (.json)."); 
                    }
                } catch (error) { alert("Error al procesar el archivo: " + error.message); } 
                finally { event.target.value = ''; }
            };
            reader.readAsText(file);
        },
        importRoutes: (importedRoutes) => {
            if (!Array.isArray(importedRoutes)) throw new Error("El archivo de rutas no es válido.");
            const currentRoutes = appDataManager.getRoutes();
            const currentIds = new Set(currentRoutes.map(r => r.id));
            const newRoutes = importedRoutes.filter(r => r && r.id && !currentIds.has(r.id));
            if (newRoutes.length === 0) { alert("No se encontraron rutas nuevas para importar."); return; }
            appDataManager.saveAllRoutes([...currentRoutes, ...newRoutes]);
            ui.renderSavedRoutes();
            alert(`${newRoutes.length} ruta(s) importada(s) con éxito.`);
        }
    };

    // --- Módulo del Reloj ---
    const clock = {
        init: () => { clock.update(); setInterval(clock.update, 1000); },
        update: () => { if (DOMElements.clockDisplay) { DOMElements.clockDisplay.textContent = new Date().toTimeString().split(' ')[0]; } }
    };

    // --- Módulo de Funciones de Utilidad ---
    const util = {
        formatDuration: (ms) => {
            if (!ms || ms < 0) return "00:00:00";
            const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        },
        calculateDistance: (coords) => { let d = 0; for (let i = 0; i < coords.length - 1; i++) d += util.haversineDistance(coords[i], coords[i + 1]); return d; },
        haversineDistance: (c1, c2) => {
            const r = (x) => x * Math.PI / 180, R = 6371, dLat = r(c2[1] - c1[1]), dLon = r(c2[0] - c1[0]);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(c1[1])) * Math.cos(r(c2[1])) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        },
        blobToBase64: (blob) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },
        deg2num: (lat_deg, lon_deg, zoom) => {
            const lat_rad = lat_deg * (Math.PI / 180);
            const n = Math.pow(2, zoom);
            const xtile = Math.floor((lon_deg + 180) / 360 * n);
            const ytile = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n);
            return { x: xtile, y: ytile };
        },
        calculateBearing: (p1, p2) => {
            const [lon1, lat1] = p1;
            const [lon2, lat2] = p2;
            const toRad = (deg) => deg * Math.PI / 180;
            const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
            const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
                      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
            const brng = Math.atan2(y, x);
            return (brng * 180 / Math.PI + 360) % 360;
        },
        lerpAngle: (start, end, amt) => {
            const difference = Math.abs(end - start);
            if (difference > 180) {
                if (end > start) { start += 360; } else { end += 360; }
            }
            const value = (start + ((end - start) * amt));
            return value % 360;
        },
        mapRange: (value, in_min, in_max, out_min, out_max) => {
            const val = Math.max(in_min, Math.min(value, in_max));
            return (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        },
    };

    // --- Inicialización de la Aplicación ---
    async function initializeApp() {
        ui.init();
        clock.init();
        mapController.init(appDataManager.getSettings().mapStyle);
        screenWakeLock.request();
        document.addEventListener('visibilitychange', screenWakeLock.handleVisibilityChange);
    }

    initializeApp();
});
