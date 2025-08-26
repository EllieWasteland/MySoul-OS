// Importar las funciones del gestor de datos centralizado
import { getUnifiedData, saveUnifiedData } from '../data-manager.js';

// --- Ejecución Principal al Cargar el DOM ---
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
        statCurrentSpeed: getEl('stat-current-speed'),
        pauseResumeBtn: getEl('pause-resume-btn'),
        stopBtn: getEl('stop-btn'),
        saveModal: getEl('save-modal'),
        routeNameInput: getEl('route-name-input'),
        discardBtn: getEl('discard-btn'),
        saveRouteBtn: getEl('save-route-btn'),
        settingsBtn: getEl('settings-btn'),
        settingsPanel: getEl('settings-panel'),
        closeSettingsBtn: getEl('close-settings-btn'),
        mapStyleSelect: getEl('map-style-select'),
        routesBtn: getEl('routes-btn'),
        routesPanel: getEl('routes-panel'),
        closeRoutesBtn: getEl('close-routes-btn'),
        routesList: getEl('routes-list'),
        routeDetailsPanel: getEl('route-details-panel'),
        detailsRouteName: getEl('details-route-name'),
        detailsRouteDate: getEl('details-route-date'),
        detailsRouteDistance: getEl('details-route-distance'),
        detailsRouteDuration: getEl('details-route-duration'),
        closeDetailsBtn: getEl('close-details-btn'),
        recenterBtn: getEl('recenter-btn'),
        // --- INICIO DE LA MODIFICACIÓN ---
        preloadMapBtn: getEl('preload-map-btn'), // Nuevo botón en Ajustes
        preloadOverlay: getEl('preload-overlay'), // Nuevo overlay de carga
        // --- FIN DE LA MODIFICACIÓN ---
    };

    // --- Estado Global de la Aplicación ---
    const appState = {
        isRecording: false,
        isPaused: false,
        isDynamicCameraActive: false,
        isPreloading: false, // Nuevo estado para saber si se está pre-cargando
        map: null,
        userMarker: null,
        lastKnownPosition: null,
        route: { coords: [] },
        watchId: null,
        timerId: null,
        recenterIntervalId: null,
        startTime: 0,
        pausedTime: 0,
        totalPausedTime: 0,
        lastBearing: 0,
        currentSpeed: 0,
    };

    // --- Módulo de UI (Interfaz de Usuario) ---
    const ui = {
        initialize: () => {
            const data = getUnifiedData();
            const mapStyle = data.myRoute.settings.mapStyle || 'dark';
            ui.applyTheme(mapStyle);
            DOMElements.mapStyleSelect.value = mapStyle;
            ui.showPanel(DOMElements.initialControls, true);
        },
        applyTheme: (theme) => {
            DOMElements.body.className = `theme-${theme} overflow-hidden h-screen flex flex-col`;
            if (appState.map && appState.map.isStyleLoaded()) {
                mapLogic.updateMapColors();
            }
        },
        showStatus: (text, duration = 2000) => {
            DOMElements.statusText.textContent = text;
            DOMElements.statusOverlay.classList.remove('opacity-0');
            if (duration > 0) {
                setTimeout(() => DOMElements.statusOverlay.classList.add('opacity-0'), duration);
            }
        },
        showPanel: (panel, show) => {
            [DOMElements.initialControls, DOMElements.recordingStatsPanel, DOMElements.routeDetailsPanel].forEach(p => p.classList.remove('active'));
            if (show && panel) {
                panel.classList.add('active');
            }
        },
        toggleSidePanel: (panel, show) => panel.classList.toggle('translate-x-full', !show),
        toggleModal: (modal, show) => {
            modal.classList.toggle('hidden', !show);
            modal.classList.toggle('flex', show);
        },
        // --- INICIO DE LA MODIFICACIÓN ---
        togglePreloadOverlay: (show) => {
            if (DOMElements.preloadOverlay) {
                DOMElements.preloadOverlay.classList.toggle('hidden', !show);
            }
        },
        // --- FIN DE LA MODIFICACIÓN ---
        updateRecordingStats: () => {
            const now = appState.isPaused ? appState.pausedTime : Date.now();
            const elapsedTime = now - appState.startTime - appState.totalPausedTime;
            DOMElements.statTime.textContent = util.formatTime(elapsedTime);
            DOMElements.statDistance.textContent = util.calculateTotalDistance(appState.route.coords).toFixed(2);
            DOMElements.statCurrentSpeed.textContent = (appState.currentSpeed * 3.6).toFixed(1);
        },
        renderRoutesList: () => {
            const routes = getUnifiedData().myRoute.routes || [];
            DOMElements.routesList.innerHTML = routes.length ? '' : '<li class="text-center p-4 text-secondary">No tienes rutas guardadas.</li>';
            routes.slice().reverse().forEach(route => {
                const li = document.createElement('li');
                li.className = 'route-item flex items-center justify-between p-4 rounded-lg bg-light';
                li.dataset.routeId = route.id;
                li.innerHTML = `
                    <div class="flex-grow cursor-pointer view-route-btn min-w-0">
                        <p class="font-bold truncate">${route.name}</p>
                        <p class="text-sm text-secondary">${route.distance.toFixed(2)} km - ${new Date(route.date).toLocaleDateString()}</p>
                    </div>
                    <button data-id="${route.id}" class="delete-route-btn text-red-500 p-2 rounded-full hover:bg-red-500/10"><i class="ph ph-trash text-xl"></i></button>`;
                DOMElements.routesList.appendChild(li);
            });
        },
        showRouteDetails: (routeId) => {
            const route = getUnifiedData().myRoute.routes.find(r => r.id == routeId);
            if (!route) return;
            DOMElements.detailsRouteName.textContent = route.name;
            DOMElements.detailsRouteDate.textContent = new Date(route.date).toLocaleDateString();
            DOMElements.detailsRouteDistance.textContent = `${route.distance.toFixed(2)} km`;
            DOMElements.detailsRouteDuration.textContent = util.formatTime(route.durationMs);
            ui.showPanel(DOMElements.routeDetailsPanel, true);
            const coords = JSON.parse(route.path);
            mapLogic.viewRouteOnMap(coords);
        },
        hideRouteDetails: () => {
            ui.showPanel(DOMElements.initialControls, true);
            mapLogic.clearRouteLine('viewing');
        }
    };

    // --- Módulo de Lógica del Mapa ---
    const mapLogic = {
        initialize: async () => {
            try {
                const response = await fetch('/.netlify/functions/get-map-key');
                if (!response.ok) throw new Error(`Error al contactar el servidor de claves: ${response.statusText}`);
                
                const config = await response.json();
                if (!config.apiKey) throw new Error("La clave de API no fue recibida del servidor.");

                const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${config.apiKey}`;
                
                appState.map = new maplibregl.Map({
                    container: 'map',
                    style: styleUrl,
                    center: [-79.004, -2.900],
                    zoom: 13,
                    pitch: 0,
                    attributionControl: false
                });
                
                appState.map.on('load', () => {
                    mapLogic.setupMapLayers();
                    mapLogic.setupUserMarker();
                    mapLogic.startGeolocation();
                    ui.applyTheme(getUnifiedData().myRoute.settings.mapStyle);
                });

                appState.map.on('dragstart', () => { if(appState.isDynamicCameraActive && !appState.isPreloading) ui.showStatus('Control manual activado', 1500); appState.isDynamicCameraActive = false; });
                appState.map.on('zoomstart', () => { if(appState.isDynamicCameraActive && !appState.isPreloading) ui.showStatus('Control manual activado', 1500); appState.isDynamicCameraActive = false; });

            } catch (error) {
                console.error("Error crítico al inicializar el mapa:", error);
                DOMElements.map.innerHTML = `<div class="p-4 text-red-500 text-center">${error.message}</div>`;
            }
        },
        setupMapLayers: () => {
            appState.map.addSource('recording-source', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
            appState.map.addLayer({ id: 'recording-layer', type: 'line', source: 'recording-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-width': 5, 'line-opacity': 0.85 } });
            appState.map.addSource('viewing-source', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
            appState.map.addLayer({ id: 'viewing-layer', type: 'line', source: 'viewing-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-width': 5, 'line-opacity': 0.65 } });
        },
        updateMapColors: () => {
            if (!appState.map.isStyleLoaded()) return;
            const recordingColor = getComputedStyle(DOMElements.body).getPropertyValue('--text-primary').trim();
            const viewingColor = getComputedStyle(DOMElements.body).getPropertyValue('--text-secondary').trim();
            appState.map.setPaintProperty('recording-layer', 'line-color', recordingColor);
            appState.map.setPaintProperty('viewing-layer', 'line-color', viewingColor);
        },
        setupUserMarker: () => {
            const markerEl = document.createElement('div');
            markerEl.innerHTML = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><path d="M16 3.5L3.5 28.5L16 21.5L28.5 28.5L16 3.5Z" fill="var(--brand-color)" stroke="var(--bg-primary)" stroke-width="2" stroke-linejoin="round"/></svg>`;
            appState.userMarker = new maplibregl.Marker({ element: markerEl, anchor: 'center' }).setLngLat([-79.004, -2.900]).addTo(appState.map);
        },
        startGeolocation: () => {
            if (!navigator.geolocation) return ui.showStatus('Geolocalización no soportada.');
            ui.showStatus('Obteniendo ubicación...');
            appState.watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    if (DOMElements.statusText.textContent === 'Obteniendo ubicación...') ui.showStatus('Ubicación encontrada', 1500);
                    
                    appState.lastKnownPosition = pos;
                    const { latitude, longitude, speed, heading } = pos.coords;
                    appState.currentSpeed = speed || 0;
                    const lngLat = [longitude, latitude];
                    
                    appState.userMarker.setLngLat(lngLat);
                    const currentBearing = heading ?? appState.lastBearing;
                    appState.userMarker.setRotation(currentBearing);

                    if (appState.isRecording && !appState.isPaused) {
                        const lastCoord = appState.route.coords.at(-1);
                        if (!lastCoord || util.haversineDistance(lastCoord, lngLat) > 0.002) {
                            appState.route.coords.push(lngLat);
                            mapLogic.updateRouteLine(appState.route.coords, 'recording');
                            if (lastCoord) {
                                appState.lastBearing = util.calculateBearing(lastCoord, lngLat);
                            }
                        }
                    }
                    
                    if (appState.isDynamicCameraActive) {
                        mapLogic.updateDynamicCamera();
                    }
                },
                (err) => ui.showStatus(`Error de ubicación: ${err.message}`),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        },
        updateDynamicCamera: () => {
            if (!appState.lastKnownPosition) return;
            const speedKmh = appState.currentSpeed * 3.6;
            const zoom = util.mapValue(speedKmh, 0, 50, 18, 15);
            
            appState.map.easeTo({
                center: [appState.lastKnownPosition.coords.longitude, appState.lastKnownPosition.coords.latitude],
                zoom: util.clamp(zoom, 14, 18.5),
                bearing: appState.lastKnownPosition.coords.heading ?? appState.lastBearing,
                pitch: 65,
                duration: 800
            });
        },
        recenterMap: () => {
            if (appState.lastKnownPosition) {
                appState.isDynamicCameraActive = true;
                mapLogic.updateDynamicCamera();
                ui.showStatus('Cámara centrada', 1500);
            } else {
                ui.showStatus('Aún no se ha encontrado la ubicación', 2000);
            }
        },
        silentRecenter: () => {
            if (appState.lastKnownPosition) {
                appState.isDynamicCameraActive = true;
                mapLogic.updateDynamicCamera();
            }
        },
        // --- INICIO DE LA MODIFICACIÓN: Nueva función de pre-cargado ---
        preloadMapArea: async () => {
            if (!appState.lastKnownPosition) {
                return ui.showStatus('Espera a tener una señal de GPS estable.', 2000);
            }
            if (appState.isPreloading) return;

            appState.isPreloading = true;
            ui.togglePreloadOverlay(true);
            ui.showStatus('Pre-cargando mapa...', 0);

            const center = appState.lastKnownPosition.coords;
            const zoom = 14; // Nivel de zoom fijo para el pre-cargado
            const areaSizeKm = 30; // 30km x 30km
            const steps = 6; // Cuadrícula de 6x6 para el barrido

            const kmPerDegree = 111.32;
            const latOffset = (areaSizeKm / 2) / kmPerDegree;
            const lonOffset = (areaSizeKm / 2) / (kmPerDegree * Math.cos(center.latitude * Math.PI / 180));

            const minLat = center.latitude - latOffset;
            const maxLat = center.latitude + latOffset;
            const minLon = center.longitude - lonOffset;
            const maxLon = center.longitude + lonOffset;

            const latStep = (maxLat - minLat) / (steps - 1);
            const lonStep = (maxLon - minLon) / (steps - 1);

            await appState.map.flyTo({ center: [center.longitude, center.latitude], zoom: zoom, duration: 1000 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            for (let i = 0; i < steps; i++) {
                for (let j = 0; j < steps; j++) {
                    const lat = minLat + i * latStep;
                    const lon = minLon + j * lonStep;
                    appState.map.panTo([lon, lat], { duration: 250 });
                    await new Promise(resolve => setTimeout(resolve, 250));
                }
            }
            
            await appState.map.flyTo({ center: [center.longitude, center.latitude], zoom: zoom, duration: 1000 });

            ui.togglePreloadOverlay(false);
            ui.showStatus('Mapa pre-cargado para la zona.', 3000);
            appState.isPreloading = false;
        },
        // --- FIN DE LA MODIFICACIÓN ---
        updateRouteLine: (coords, type) => {
            const source = appState.map.getSource(`${type}-source`);
            if (source) source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
        },
        clearRouteLine: (type) => mapLogic.updateRouteLine([], type),
        viewRouteOnMap: (coords) => {
            appState.isDynamicCameraActive = false;
            mapLogic.clearRouteLine('recording');
            mapLogic.updateRouteLine(coords, 'viewing');
            const bounds = coords.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
            appState.map.fitBounds(bounds, { padding: 80, duration: 1000, pitch: 0, bearing: 0 });
        }
    };

    // --- Módulo de Lógica de Grabación ---
    const recording = {
        start: () => {
            if (!appState.lastKnownPosition) return ui.showStatus('Espera a tener una señal de GPS estable.', 2000);
            appState.isRecording = true;
            appState.isPaused = false;
            appState.startTime = Date.now();
            appState.totalPausedTime = 0;
            const { longitude, latitude } = appState.lastKnownPosition.coords;
            appState.route = { id: Date.now(), coords: [[longitude, latitude]] };
            ui.showPanel(DOMElements.recordingStatsPanel, true);
            mapLogic.clearRouteLine('viewing');
            appState.timerId = setInterval(ui.updateRecordingStats, 1000);
            
            mapLogic.recenterMap();

            if (appState.recenterIntervalId) clearInterval(appState.recenterIntervalId);
            appState.recenterIntervalId = setInterval(() => {
                if (!appState.isPaused) {
                    mapLogic.silentRecenter();
                }
            }, 2000);
        },
        pause: () => {
            appState.isPaused = true;
            appState.pausedTime = Date.now();
            DOMElements.pauseResumeBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
        },
        resume: () => {
            appState.isPaused = false;
            appState.totalPausedTime += Date.now() - appState.pausedTime;
            DOMElements.pauseResumeBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
        },
        stop: () => {
            if (appState.recenterIntervalId) {
                clearInterval(appState.recenterIntervalId);
                appState.recenterIntervalId = null;
            }
            clearInterval(appState.timerId);
            appState.isDynamicCameraActive = false;
            appState.map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
            if (appState.route.coords.length < 2) {
                recording.discard();
                return ui.showStatus('Ruta muy corta, no guardada.', 2000);
            }
            DOMElements.routeNameInput.value = `Ruta - ${new Date().toLocaleString('es-EC', {timeZone: 'America/Guayaquil'})}`;
            ui.toggleModal(DOMElements.saveModal, true);
        },
        save: (name) => {
            const data = getUnifiedData();
            
            const routeData = {
                id: appState.route.id,
                name: name,
                date: new Date(appState.startTime).toISOString(),
                durationMs: Date.now() - appState.startTime - appState.totalPausedTime,
                distance: util.calculateTotalDistance(appState.route.coords),
                path: JSON.stringify(appState.route.coords)
            };

            data.myRoute.routes.push(routeData);
            saveUnifiedData(data);
            ui.showStatus('Ruta guardada con éxito', 2000);
            recording.reset();
        },
        discard: () => recording.reset(),
        reset: () => {
            if (appState.recenterIntervalId) {
                clearInterval(appState.recenterIntervalId);
                appState.recenterIntervalId = null;
            }
            appState.isRecording = false;
            appState.isPaused = false;
            appState.isDynamicCameraActive = false;
            appState.route = { coords: [] };
            DOMElements.pauseResumeBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
            ui.toggleModal(DOMElements.saveModal, false);
            ui.showPanel(DOMElements.initialControls, true);
            mapLogic.clearRouteLine('recording');
        },
        delete: (routeId) => {
            let data = getUnifiedData();
            data.myRoute.routes = data.myRoute.routes.filter(r => r.id != routeId);
            saveUnifiedData(data);
            ui.renderRoutesList();
            ui.showStatus('Ruta eliminada.');
            if(DOMElements.routeDetailsPanel.classList.contains('active')) {
                ui.hideRouteDetails();
            }
        }
    };

    // --- Utilidades ---
    const util = {
        formatTime: (ms) => new Date(ms).toISOString().slice(11, 19),
        haversineDistance: (p1, p2) => {
            const R = 6371, toRad = (d) => d * Math.PI / 180;
            const dLat = toRad(p2[1] - p1[1]), dLon = toRad(p2[0] - p1[0]);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        },
        calculateTotalDistance: (coords) => coords.reduce((d, _, i, a) => i > 0 ? d + util.haversineDistance(a[i - 1], a[i]) : 0, 0),
        calculateBearing: (p1, p2) => {
            const [lon1, lat1] = p1; const [lon2, lat2] = p2;
            const toRad = (deg) => deg * Math.PI / 180;
            const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
            const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
            return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        },
        mapValue: (value, in_min, in_max, out_min, out_max) => (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min,
        clamp: (value, min, max) => Math.max(min, Math.min(value, max)),
    };
    
    const applyResponsiveStyles = () => {
        const styleId = 'myroute-responsive-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            @media (orientation: landscape) and (max-height: 500px) {
                #recording-stats-panel.bottom-panel {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    background: var(--bg-primary); 
                }
                #recording-stats-panel .stat-pill { flex-grow: 1; }
                #recording-stats-panel .flex.justify-center { margin-top: 0; flex-shrink: 0; }
                #pause-resume-btn { width: 3rem; height: 3rem; font-size: 1.25rem; }
                #stop-btn { width: 3.5rem; height: 3.5rem; font-size: 1.25rem; }
                #recording-stats-panel .flex.justify-center > .w-16 { display: none; }
            }
        `;
        document.head.appendChild(style);
    };

    // --- Vinculación de Eventos ---
    const bindEvents = () => {
        DOMElements.startRecordBtn.onclick = recording.start;
        DOMElements.pauseResumeBtn.onclick = () => (appState.isPaused ? recording.resume() : recording.pause());
        DOMElements.stopBtn.onclick = recording.stop;
        DOMElements.discardBtn.onclick = recording.discard;
        DOMElements.saveRouteBtn.onclick = () => {
            const name = DOMElements.routeNameInput.value.trim();
            if (name) recording.save(name); else ui.showStatus('Por favor, introduce un nombre.');
        };
        DOMElements.settingsBtn.onclick = () => ui.toggleSidePanel(DOMElements.settingsPanel, true);
        DOMElements.closeSettingsBtn.onclick = () => ui.toggleSidePanel(DOMElements.settingsPanel, false);
        DOMElements.routesBtn.onclick = () => { ui.renderRoutesList(); ui.toggleSidePanel(DOMElements.routesPanel, true); };
        DOMElements.closeRoutesBtn.onclick = () => ui.toggleSidePanel(DOMElements.routesPanel, false);
        DOMElements.mapStyleSelect.onchange = (e) => {
            const newStyle = e.target.value;
            ui.applyTheme(newStyle);
            const data = getUnifiedData();
            data.myRoute.settings.mapStyle = newStyle;
            saveUnifiedData(data);
        };
        DOMElements.routesList.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-route-btn');
            const deleteBtn = e.target.closest('.delete-route-btn');
            if (viewBtn) {
                ui.showRouteDetails(viewBtn.closest('.route-item').dataset.routeId);
                ui.toggleSidePanel(DOMElements.routesPanel, false);
            }
            if (deleteBtn) {
                recording.delete(deleteBtn.dataset.id);
            }
        });
        DOMElements.closeDetailsBtn.onclick = ui.hideRouteDetails;
        DOMElements.recenterBtn.onclick = mapLogic.recenterMap;
        // --- INICIO DE LA MODIFICACIÓN ---
        if (DOMElements.preloadMapBtn) {
            DOMElements.preloadMapBtn.onclick = mapLogic.preloadMapArea;
        }
        // --- FIN DE LA MODIFICACIÓN ---
    };

    // --- Inicialización ---
    const init = async () => {
        applyResponsiveStyles();
        ui.initialize();
        await mapLogic.initialize();
        bindEvents();
    };

    init();
});
