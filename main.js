import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
// Importar el gestor de datos centralizado
import { getUnifiedData, saveUnifiedData } from './data-manager.js';

const firebaseConfig = {
    apiKey: "AIzaSyB1mdncFubF9Nj7s64rslYtwUQmfQUhm3U",
    authDomain: "mysoul-backupagent.firebaseapp.com",
    projectId: "mysoul-backupagent",
    storageBucket: "mysoul-backupagent.appspot.com",
    messagingSenderId: "1030721607623",
    appId: "1:1030721607623:web:7890633230f1315a232be2",
    measurementId: "G-Q1BYXFV41W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    const onboardingContainer = document.getElementById('onboarding-container');
    const mainOsContainer = document.getElementById('main-os-container');
    const genericModal = document.getElementById('generic-modal');
    const modalTitle = document.getElementById('generic-modal-title');
    const modalText = document.getElementById('generic-modal-text');
    const modalButtons = document.getElementById('generic-modal-buttons');

    function showModalAlert(message, title = 'Notificación') { modalTitle.textContent = title; modalText.innerHTML = `<p class="onboarding-text my-4">${message}</p>`; modalButtons.innerHTML = `<div class="hud-item rounded-full"><button id="modal-ok-btn" class="hud-button">Aceptar</button></div>`; genericModal.style.display = 'flex'; genericModal.classList.add('active'); document.getElementById('modal-ok-btn').addEventListener('click', () => { genericModal.classList.remove('active'); setTimeout(() => genericModal.style.display = 'none', 300); }, { once: true }); };
    function showModalConfirm(message, onConfirm, title = 'Confirmación') { modalTitle.textContent = title; modalText.innerHTML = `<p class="onboarding-text my-4">${message}</p>`; modalButtons.innerHTML = `<div class="flex gap-4"><div class="hud-item rounded-full flex-1"><button id="modal-cancel-btn" class="hud-button">Cancelar</button></div><div class="hud-item rounded-full flex-1 bg-white text-black"><button id="modal-confirm-btn" class="hud-button">Confirmar</button></div></div>`; genericModal.style.display = 'flex'; genericModal.classList.add('active'); const confirmBtn = document.getElementById('modal-confirm-btn'); const cancelBtn = document.getElementById('modal-cancel-btn'); const close = () => { genericModal.classList.remove('active'); setTimeout(() => genericModal.style.display = 'none', 300); }; confirmBtn.addEventListener('click', () => { close(); onConfirm?.(); }, { once: true }); cancelBtn.addEventListener('click', close, { once: true }); };

    function signInWithGoogle() { signInWithPopup(auth, provider).catch((error) => { console.error("Error durante el inicio de sesión con Google:", error); showModalAlert("Hubo un problema al intentar iniciar sesión con Google.", "Error de Autenticación"); }); }
    function handleSignOut() { signOut(auth).then(() => { window.location.reload(); }).catch((error) => { console.error("Error al cerrar sesión:", error); }); }
    
    async function saveDataToCloud() {
        const user = auth.currentUser;
        if (!user) {
            showModalAlert("Debes iniciar sesión para guardar datos en la nube.", "Error");
            return;
        }
        try {
            const dataToSave = getUnifiedData();
            const sanitizedData = JSON.parse(JSON.stringify(dataToSave));
            if (sanitizedData.myRoute && Array.isArray(sanitizedData.myRoute.routes)) {
                sanitizedData.myRoute.routes.forEach(route => {
                    if (Array.isArray(route.coords)) {
                        route.coords = JSON.stringify(route.coords);
                    }
                });
            }
            const userDocRef = doc(db, `users/${user.uid}/data`, 'mainBackup');
            await setDoc(userDocRef, sanitizedData);
            showModalAlert("Tus datos se han guardado en la nube con éxito.", "Guardado Completo");
        } catch (error) {
            console.error("Error saving data to Firestore:", error);
            showModalAlert(`Hubo un error al guardar tus datos: ${error.message}`, "Error");
        }
    }

    async function loadDataFromCloud() {
        const user = auth.currentUser;
        if (!user) {
            showModalAlert("Debes iniciar sesión para cargar datos desde la nube.", "Error");
            return;
        }
        try {
            const userDocRef = doc(db, `users/${user.uid}/data`, 'mainBackup');
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (cloudData.myRoute && Array.isArray(cloudData.myRoute.routes)) {
                    cloudData.myRoute.routes.forEach(route => {
                        if (typeof route.coords === 'string') {
                            try {
                                route.coords = JSON.parse(route.coords);
                            } catch(e) {
                                console.error("Failed to parse route coords:", e);
                                route.coords = [];
                            }
                        }
                    });
                }
                showModalConfirm("¿Restaurar la copia de la nube? Se sobreescribirán tus datos locales.", () => {
                    saveUnifiedData(cloudData);
                    showModalAlert("Datos restaurados. La aplicación se recargará.", "Éxito");
                    setTimeout(() => window.location.reload(), 1500);
                });
            } else {
                showModalAlert("No se encontraron datos en la nube para esta cuenta.", "Sin Datos");
            }
        } catch (error) {
            console.error("Error loading data from Firestore:", error);
            showModalAlert(`Hubo un error al cargar tus datos: ${error.message}`, "Error");
        }
    }
    
    function exportData() { 
        const dataStr = JSON.stringify(getUnifiedData(), null, 2); 
        const blob = new Blob([dataStr], { type: 'application/json' }); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; a.download = 'mysoul_backup.json'; 
        document.body.appendChild(a); a.click(); 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
        showModalAlert('Datos locales exportados con éxito.'); 
    }
    
    function importData() { 
        const importFileInput = document.getElementById('import-file-input'); 
        importFileInput.click(); 
        importFileInput.onchange = (event) => { 
            const file = event.target.files[0]; 
            if (!file) return; 
            const reader = new FileReader(); 
            reader.onload = (e) => { 
                try { 
                    const importedData = JSON.parse(e.target.result); 
                    showModalConfirm('¿Estás seguro de que quieres sobreescribir tus datos locales?', () => { 
                        saveUnifiedData(importedData); 
                        showModalAlert('Datos importados con éxito. La página se recargará.'); 
                        setTimeout(() => window.location.reload(), 2000); 
                    }); 
                } catch (error) { 
                    showModalAlert('Error al importar el archivo.'); 
                } 
            }; 
            reader.readAsText(file); 
            event.target.value = ''; 
        }; 
    }
    
    const wallpaperInput = document.getElementById('wallpaper-input');
    const wallpaperDiv = document.getElementById('background-wallpaper');

    function applyWallpaper(base64String) { if (base64String) { wallpaperDiv.style.backgroundImage = `url(${base64String})`; } }
    
    function compressAndEncodeImage(file) { 
        const maxDim = 1920; 
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            const img = new Image(); 
            img.onload = () => { 
                const canvas = document.createElement('canvas'); 
                let { width, height } = img; 
                if (width > height) { 
                    if (width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; } 
                } else { 
                    if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; } 
                } 
                canvas.width = width; canvas.height = height; 
                const ctx = canvas.getContext('2d'); 
                ctx.drawImage(img, 0, 0, width, height); 
                const base64String = canvas.toDataURL('image/jpeg', 0.7); 
                const unifiedData = getUnifiedData(); 
                unifiedData.myTime.wallpaper = base64String; 
                saveUnifiedData(unifiedData); 
                applyWallpaper(base64String); 
                showModalAlert('Fondo de pantalla actualizado.'); 
            }; 
            img.src = e.target.result; 
        }; 
        reader.readAsDataURL(file); 
    }
    
    wallpaperInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file && file.type.startsWith('image/')) { compressAndEncodeImage(file); } });

    function showSettingsModal() {
        const user = auth.currentUser;
        modalTitle.textContent = "Ajustes";

        const personalizationHTML = `
            <p class="onboarding-text mb-4">Cambia la apariencia de tu sistema.</p>
            <div class="hud-item rounded-full"><button id="change-wallpaper-btn" class="hud-button">Cambiar fondo</button></div>`;

        let dataManagementHTML = '';
        if (user) {
            dataManagementHTML = `
                <div class="space-y-4">
                    <div class="hud-item rounded-full"><button id="settings-save-cloud" class="hud-button">Guardar en la Nube</button></div>
                    <div class="hud-item rounded-full"><button id="settings-load-cloud" class="hud-button">Cargar desde la Nube</button></div>
                    <div class="hud-item rounded-full"><button id="settings-export" class="hud-button">Exportar Datos Locales</button></div>
                    <div class="hud-item rounded-full"><button id="settings-import" class="hud-button">Importar Datos Locales</button></div>
                    <div class="hud-item rounded-full mt-6 border-red-500/50 hover:border-red-500"><button id="settings-logout" class="hud-button text-red-500">Cerrar Sesión</button></div>
                </div>`;
        } else {
            dataManagementHTML = `
                <p class="onboarding-text mb-4 text-center">Inicia sesión para sincronizar tus datos en la nube.</p>
                <div class="hud-item rounded-full bg-white mb-6"><button id="settings-login-google" class="hud-button font-semibold text-black">Iniciar Sesión con Google</button></div>
                <hr class="border-t-2 border-dashed border-gray-700 my-6">
                <p class="onboarding-text mb-4 text-center">O gestiona tus datos locales.</p>
                <div class="space-y-4">
                    <div class="hud-item rounded-full"><button id="settings-export" class="hud-button">Exportar Datos Locales</button></div>
                    <div class="hud-item rounded-full"><button id="settings-import" class="hud-button">Importar Datos Locales</button></div>
                </div>`;
        }

        modalText.innerHTML = `
            <div id="settings-tabs">
                <button class="settings-tab active" data-tab="personalization">Personalización</button>
                <button class="settings-tab" data-tab="data">Gestión de Datos</button>
            </div>
            <div id="personalization-content" class="settings-tab-content active">${personalizationHTML}</div>
            <div id="data-content" class="settings-tab-content">${dataManagementHTML}</div>`;
        
        modalButtons.innerHTML = `<div class="hud-item rounded-full mt-6"><button id="settings-cancel" class="hud-button">Cerrar</button></div>`;
        genericModal.style.display = 'flex';
        genericModal.classList.add('active');

        const close = () => { genericModal.classList.remove('active'); setTimeout(() => genericModal.style.display = 'none', 300); };
        
        const tabs = genericModal.querySelectorAll('.settings-tab');
        const contents = genericModal.querySelectorAll('.settings-tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-content`).classList.add('active');
            });
        });

        document.getElementById('change-wallpaper-btn').onclick = () => document.getElementById('wallpaper-input').click();
        document.getElementById('settings-cancel').onclick = close;

        if (user) {
            document.getElementById('settings-save-cloud').onclick = () => { close(); saveDataToCloud(); };
            document.getElementById('settings-load-cloud').onclick = () => { close(); loadDataFromCloud(); };
            document.getElementById('settings-logout').onclick = () => { close(); handleSignOut(); };
            document.getElementById('settings-export').onclick = () => { close(); exportData(); };
            document.getElementById('settings-import').onclick = () => { close(); importData(); };
        } else {
            document.getElementById('settings-login-google').onclick = () => { close(); signInWithGoogle(); };
            document.getElementById('settings-export').onclick = () => { close(); exportData(); };
            document.getElementById('settings-import').onclick = () => { close(); importData(); };
        }
    }

    function showAppModal(appIndex = null) {
        const isEditing = appIndex !== null;
        const unifiedData = getUnifiedData();
        const app = isEditing ? unifiedData.globalSettings.externalApps[appIndex] : null;

        modalTitle.textContent = isEditing ? "Editar App" : "Añadir Nueva App";
        modalText.innerHTML = `
            <p class="onboarding-text mb-4">Introduce los detalles de la tarjeta.</p>
            <input type="text" id="app-title-input" class="input-field" placeholder="Título de la tarjeta" value="${app ? app.title : ''}">
            <input type="text" id="app-desc-input" class="input-field" placeholder="Descripción corta" value="${app ? app.description : ''}">
            <input type="url" id="app-link-input" class="input-field" placeholder="https://ejemplo.com" value="${app ? app.href : ''}">
        `;
        modalButtons.innerHTML = `<div class="flex gap-4"><div class="hud-item rounded-full flex-1"><button id="modal-cancel-btn" class="hud-button">Cancelar</button></div><div class="hud-item rounded-full flex-1 bg-white text-black"><button id="modal-save-app-btn" class="hud-button">Guardar</button></div></div>`;
        genericModal.style.display = 'flex';
        genericModal.classList.add('active');

        const close = () => { genericModal.classList.remove('active'); setTimeout(() => genericModal.style.display = 'none', 300); };

        document.getElementById('modal-cancel-btn').addEventListener('click', close, { once: true });
        document.getElementById('modal-save-app-btn').addEventListener('click', () => {
            const title = document.getElementById('app-title-input').value.trim();
            const description = document.getElementById('app-desc-input').value.trim();
            const link = document.getElementById('app-link-input').value.trim();

            if (title && description && link) {
                try {
                    new URL(link);
                    const currentData = getUnifiedData();
                    const newApp = { title, description, href: link };
                    if (isEditing) {
                        currentData.globalSettings.externalApps[appIndex] = newApp;
                    } else {
                        currentData.globalSettings.externalApps.push(newApp);
                    }
                    saveUnifiedData(currentData);
                    initializeCarousel();
                    close();
                    showModalAlert(`¡App ${isEditing ? 'actualizada' : 'añadida'} con éxito!`);
                } catch (_) {
                    showModalAlert("Por favor, introduce un enlace válido (URL).");
                }
            } else {
                showModalAlert("Por favor, completa todos los campos.");
            }
        }, { once: true });
    }
    
    function showShortcutModal(shortcutIndex = null) {
        const isEditing = shortcutIndex !== null;
        const unifiedData = getUnifiedData();
        const shortcut = isEditing ? unifiedData.globalSettings.shortcuts[shortcutIndex] : null;

        modalTitle.textContent = isEditing ? "Editar Acceso Directo" : "Nuevo Acceso Directo";
        modalText.innerHTML = `
            <p class="onboarding-text mb-4">Selecciona el tipo de acceso directo.</p>
            <div id="shortcut-type-selector" class="flex gap-4 mb-6">
                <button id="type-call-btn" class="hud-button flex-1 hud-item rounded-full">Llamar</button>
                <button id="type-app-btn" class="hud-button flex-1 hud-item rounded-full">Abrir App</button>
            </div>
            <div id="shortcut-form-container"></div>
        `;
        modalButtons.innerHTML = `<div class="flex gap-4"><div class="hud-item rounded-full flex-1"><button id="modal-cancel-btn" class="hud-button">Cancelar</button></div><div class="hud-item rounded-full flex-1 bg-white text-black"><button id="modal-save-shortcut-btn" class="hud-button text-black font-semibold">Guardar</button></div></div>`;
        
        genericModal.style.display = 'flex';
        genericModal.classList.add('active');

        const formContainer = document.getElementById('shortcut-form-container');
        const typeCallBtn = document.getElementById('type-call-btn');
        const typeAppBtn = document.getElementById('type-app-btn');
        let selectedType = shortcut ? shortcut.type : 'call';

        function renderForm(type) {
            const nameValue = shortcut ? shortcut.name : '';
            let targetValue = '';
            if (shortcut) {
                targetValue = type === 'call' ? shortcut.target.replace('tel:', '') : shortcut.target;
            }
            
            const callForm = `
                <input type="text" id="shortcut-name" class="input-field" placeholder="Nombre (Ej: Casa)" value="${nameValue}">
                <input type="tel" id="shortcut-phone" class="input-field" placeholder="Número de teléfono" value="${type === 'call' ? targetValue : ''}">
            `;
            const appForm = `
                <input type="text" id="shortcut-name" class="input-field" placeholder="Nombre de la App (Ej: WhatsApp)" value="${nameValue}">
                <input type="text" id="shortcut-link" class="input-field" placeholder="Enlace de la App (Ej: whatsapp://)" value="${type === 'app' ? targetValue : ''}">
            `;
            formContainer.innerHTML = type === 'call' ? callForm : appForm;
        }

        function selectType(type) {
            selectedType = type;
            typeCallBtn.classList.toggle('bg-white', type === 'call');
            typeCallBtn.classList.toggle('text-black', type === 'call');
            typeAppBtn.classList.toggle('bg-white', type === 'app');
            typeAppBtn.classList.toggle('text-black', type === 'app');
            renderForm(type);
        }

        typeCallBtn.addEventListener('click', () => selectType('call'));
        typeAppBtn.addEventListener('click', () => selectType('app'));

        const close = () => { genericModal.classList.remove('active'); setTimeout(() => genericModal.style.display = 'none', 300); };
        document.getElementById('modal-cancel-btn').addEventListener('click', close, { once: true });

        document.getElementById('modal-save-shortcut-btn').addEventListener('click', () => {
            const name = document.getElementById('shortcut-name').value.trim();
            let newShortcut;

            if (selectedType === 'call') {
                const phone = document.getElementById('shortcut-phone').value.trim();
                if (name && phone) newShortcut = { type: 'call', name, target: `tel:${phone}` };
            } else {
                const link = document.getElementById('shortcut-link').value.trim();
                if (name && link) newShortcut = { type: 'app', name, target: link };
            }

            if (newShortcut) {
                const currentData = getUnifiedData();
                if (!currentData.globalSettings.shortcuts) currentData.globalSettings.shortcuts = [];
                
                if (isEditing) {
                    currentData.globalSettings.shortcuts[shortcutIndex] = newShortcut;
                } else {
                    currentData.globalSettings.shortcuts.push(newShortcut);
                }
                saveUnifiedData(currentData);
                renderShortcuts();
                close();
                showModalAlert(`¡Acceso directo ${isEditing ? 'actualizado' : 'añadido'}!`);
            } else {
                showModalAlert("Por favor, completa todos los campos.");
            }
        }, { once: true });
        
        selectType(selectedType);
    }

    function initializeApp() {
        const unifiedData = getUnifiedData();
        if (unifiedData.myTime?.wallpaper) { applyWallpaper(unifiedData.myTime.wallpaper); }
        if (unifiedData.globalSettings.onboardingComplete) {
            onboardingContainer.style.display = 'none';
            mainOsContainer.style.display = 'block';
            mainOsContainer.classList.add('active');
            initializeCarousel();
            initializeNavigation();
            renderNotes();
            renderTodos();
            renderShortcuts();
        } else {
            onboardingContainer.style.display = 'block';
            onboardingContainer.classList.add('active');
            mainOsContainer.style.display = 'none';
            showStep(1);
        }
        const timeEl = document.getElementById('system-time');
        function updateSystemTime() { if (timeEl) { const now = new Date(); timeEl.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); } }
        updateSystemTime();
        setInterval(updateSystemTime, 30000);
    }

    onAuthStateChanged(auth, (user) => {
        let unifiedData = getUnifiedData();
        const userPhoto = document.getElementById('user-photo');
        const headerUsername = document.getElementById('header-username');
        if (user) {
            // Guarda el nombre de Google en los datos unificados para que otras apps puedan usarlo.
            if (user.displayName && unifiedData.myTime.userName !== user.displayName) {
                unifiedData.myTime.userName = user.displayName;
                saveUnifiedData(unifiedData);
            }

            userPhoto.src = user.photoURL || `https://placehold.co/40x40/FFFFFF/000000?text=${user.displayName?.charAt(0) || 'U'}`;
            headerUsername.textContent = user.displayName || 'Usuario';
            if (!unifiedData.globalSettings.onboardingComplete) { finishOnboarding(); }
        } else {
            const localUsername = unifiedData.myTime?.userName;
            headerUsername.textContent = localUsername || 'Invitado';
            userPhoto.src = `https://placehold.co/40x40/FFFFFF/000000?text=${localUsername?.charAt(0) || 'G'}`;
        }
        userPhoto.onclick = showSettingsModal;
    });

    function showStep(stepNumber) { document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active')); const step = document.getElementById(`onboarding-step-${stepNumber}`); if(step) { step.classList.add('active'); } }
    function finishOnboarding() { const transitionOverlay = document.getElementById('transition-overlay'); transitionOverlay.classList.add('expand'); setTimeout(() => { onboardingContainer.style.display = 'none'; mainOsContainer.style.display = 'block'; mainOsContainer.classList.add('active'); const unifiedData = getUnifiedData(); unifiedData.globalSettings.onboardingComplete = true; saveUnifiedData(unifiedData); initializeApp(); }, 400); setTimeout(() => { transitionOverlay.style.display = 'none'; }, 1200); }
    
    document.getElementById('google-onboarding-btn')?.addEventListener('click', signInWithGoogle);
    document.getElementById('local-continue-btn')?.addEventListener('click', () => showStep(2));
    document.getElementById('confirm-name-btn')?.addEventListener('click', () => { const usernameInput = document.getElementById('username-input'); const username = usernameInput.value.trim(); if (username) { const unifiedData = getUnifiedData(); if (!unifiedData.myTime) unifiedData.myTime = {}; unifiedData.myTime.userName = username; saveUnifiedData(unifiedData); document.getElementById('commitment-username').textContent = username; document.getElementById('header-username').textContent = username; showStep(3); } else { showModalAlert('Por favor, introduce un nombre.'); } });
    const fingerprintButton = document.getElementById('fingerprint-button');
    if(fingerprintButton) { let holdTimeout; const startHold = (e) => { e.preventDefault(); fingerprintButton.classList.add('holding'); holdTimeout = setTimeout(finishOnboarding, 2000); }; const endHold = () => { fingerprintButton.classList.remove('holding'); clearTimeout(holdTimeout); }; fingerprintButton.addEventListener('mousedown', startHold); fingerprintButton.addEventListener('mouseup', endHold); fingerprintButton.addEventListener('mouseleave', endHold); fingerprintButton.addEventListener('touchstart', startHold, { passive: true }); fingerprintButton.addEventListener('touchend', endHold); }
    
    function initializeCarousel() {
        const track = document.getElementById('app-carousel-track');
        if (!track) return;
        
        const unifiedData = getUnifiedData();
        const internalApps = [
            { title: 'MyTasks', description: 'Gestión de tareas y enfoque para maximizar tu productividad.', href: 'mytime.html', status: '[ SYSTEM ONLINE ]' },
            { title: 'MyRoute', description: 'Tu compañero de rutas. Rastrea, guarda y revive tus aventuras.', href: 'myroute.html', status: '[ SYSTEM ONLINE ]' },
            { title: 'MyMemory', description: 'Tu memoria extendida para organizar aficiones, ideas y listas.', href: 'mymemory.html', status: '[ SYSTEM ONLINE ]' },
            { title: 'MyMood', description: 'Registra y analiza tu estado de ánimo a lo largo del tiempo.', href: 'mymood.html', status: '[ SYSTEM ONLINE ]' }
        ];
        const externalApps = (unifiedData.globalSettings.externalApps || []).map((app, index) => ({ ...app, status: '<span class="external-app-tag">APP EXTERNA</span>', isExternal: true, index }));
        const addAppCard = { title: 'Añadir App', description: 'Crea un acceso directo a tus aplicaciones y sitios web favoritos.', action: 'add_app', status: '[ + ]' };

        const allApps = [...internalApps, ...externalApps, addAppCard];
        track.innerHTML = allApps.map(app => `
            <article class="app-card" data-href="${app.href || ''}" data-action="${app.action || ''}" ${app.isExternal ? `data-index="${app.index}"` : ''}>
                ${app.isExternal ? `
                <button class="card-options-btn" data-type="app" data-index="${app.index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                </button>
                <div class="card-options-menu" id="app-options-${app.index}">
                    <button class="edit-btn" data-type="app" data-index="${app.index}">Editar</button>
                    <button class="delete-btn delete" data-type="app" data-index="${app.index}">Eliminar</button>
                </div>
                ` : ''}
                <div class="card-content">
                    <div class="card-header">
                        <h2 class="card-title">${app.title || 'Sin Título'}</h2>
                        <p class="card-description">${app.description || ''}</p>
                    </div>
                    <div class="card-footer"><span class="card-status">${app.status || ''}</span></div>
                </div>
                <div class="card-bg-decoration"></div>
            </article>
        `).join('');

        const cards = Array.from(track.querySelectorAll('.app-card'));
        if (cards.length === 0) return;

        let currentIndex = 0;
        let isDragging = false;
        let startPos = 0;
        let dragOffset = 0;
        const clickThreshold = 10;

        function updateCardPositions(instant = false) {
            cards.forEach((card, index) => {
                card.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease, z-index 0.5s';
                const offset = index - currentIndex;
                const absOffset = Math.abs(offset);
                let translateX = offset * 50;
                if (isDragging && index === currentIndex) { translateX += dragOffset / card.clientWidth * 50; }
                const scale = 1 - absOffset * 0.1;
                const zIndex = 10 - absOffset;
                const opacity = 1 - absOffset * 0.3;
                card.style.transform = `translateX(${translateX}%) scale(${scale})`;
                card.style.opacity = `${Math.max(0, opacity)}`;
                card.style.pointerEvents = (offset === 0) ? 'auto' : 'none';
                card.style.zIndex = zIndex;
            });
        }
        
        const getPositionX = (e) => e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        const dragStart = (e) => { isDragging = true; startPos = getPositionX(e); dragOffset = 0; track.style.cursor = 'grabbing'; cards.forEach(card => card.style.transition = 'none'); };
        const dragMove = (e) => { if (isDragging) { dragOffset = getPositionX(e) - startPos; updateCardPositions(true); } };
        const dragEnd = () => { if (!isDragging) return; isDragging = false; track.style.cursor = 'grab'; if (dragOffset < -50 && currentIndex < cards.length - 1) { currentIndex++; } if (dragOffset > 50 && currentIndex > 0) { currentIndex--; } dragOffset = 0; updateCardPositions(); };
        
        cards.forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-options-btn, .card-options-menu')) return;
                if (Math.abs(dragOffset) > clickThreshold) { e.preventDefault(); return; }
                if (index !== currentIndex) return;

                if (card.dataset.action === 'add_app') {
                    showAppModal();
                } else if (card.dataset.href) {
                    card.classList.add('exiting'); 
                    setTimeout(() => { window.location.href = card.dataset.href; }, 400); 
                }
            });
        });

        track.querySelectorAll('.card-options-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = e.currentTarget.dataset.index;
                document.getElementById(`app-options-${index}`).classList.toggle('visible');
            });
        });
        track.querySelectorAll('.edit-btn[data-type="app"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showAppModal(parseInt(e.currentTarget.dataset.index));
            });
        });
        track.querySelectorAll('.delete-btn[data-type="app"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.currentTarget.dataset.index);
                showModalConfirm("¿Seguro que quieres eliminar esta app?", () => {
                    const currentData = getUnifiedData();
                    currentData.globalSettings.externalApps.splice(index, 1);
                    saveUnifiedData(currentData);
                    initializeCarousel();
                });
            });
        });


        const wrapper = document.getElementById('hub-content');
        wrapper.addEventListener('mousedown', dragStart);
        wrapper.addEventListener('touchstart', dragStart, { passive: true });
        wrapper.addEventListener('mousemove', dragMove);
        wrapper.addEventListener('touchmove', dragMove, { passive: true });
        wrapper.addEventListener('mouseup', dragEnd);
        wrapper.addEventListener('mouseleave', dragEnd);
        wrapper.addEventListener('touchend', dragEnd);

        setTimeout(() => { updateCardPositions(true); track.style.visibility = 'visible'; }, 100);
        window.addEventListener('resize', () => updateCardPositions(true));
    }

    function initializeNavigation() {
        const contentCarousel = document.getElementById('main-content-carousel');
        const dock = document.getElementById('bottom-dock');
        const textContainer = document.getElementById('dock-text-container');
        const sections = Array.from(contentCarousel.querySelectorAll('.dock-content'));
        
        let currentIndex = 0;
        let isDragging = false;
        let startX = 0;
        let deltaX = 0;
        let currentTextEl, prevTextEl, nextTextEl;

        function setupTextElements() {
            textContainer.innerHTML = '';
            currentTextEl = document.createElement('span');
            currentTextEl.className = 'dock-category-text';
            currentTextEl.textContent = sections[currentIndex]?.dataset.name || '';
            prevTextEl = document.createElement('span');
            prevTextEl.className = 'dock-category-text';
            prevTextEl.textContent = sections[currentIndex - 1]?.dataset.name || '';
            nextTextEl = document.createElement('span');
            nextTextEl.className = 'dock-category-text';
            nextTextEl.textContent = sections[currentIndex + 1]?.dataset.name || '';
            textContainer.append(prevTextEl, currentTextEl, nextTextEl);
            resetTextPositions(false);
        }

        function resetTextPositions(animated = true) {
            const duration = animated ? '0.4s' : '0s';
            [currentTextEl, prevTextEl, nextTextEl].forEach(el => { if(el) el.style.transitionDuration = duration; });
            if(currentTextEl) { currentTextEl.style.transform = 'translateX(0px)'; currentTextEl.style.opacity = '1'; }
            if(prevTextEl){ prevTextEl.style.transform = 'translateX(-150%)'; prevTextEl.style.opacity = '0'; }
            if(nextTextEl){ nextTextEl.style.transform = 'translateX(150%)'; nextTextEl.style.opacity = '0'; }
        }

        function updateOnDrag() {
            if (!isDragging) return;
            const dragFraction = Math.min(1, Math.abs(deltaX) / (dock.clientWidth * 1.5));
            currentTextEl.style.transform = `translateX(${deltaX}px)`;
            currentTextEl.style.opacity = `${1 - dragFraction}`;
            if (deltaX > 0) { prevTextEl.style.transform = `translateX(calc(-150% + ${deltaX}px))`; prevTextEl.style.opacity = `${dragFraction}`; } 
            else { nextTextEl.style.transform = `translateX(calc(150% + ${deltaX}px))`; nextTextEl.style.opacity = `${dragFraction}`; }
        }

        function dragStart(e) { isDragging = true; startX = e.pageX || e.touches[0].pageX; [currentTextEl, prevTextEl, nextTextEl].forEach(el => { if(el) el.style.transitionDuration = '0s'; }); }
        function dragMove(e) { if (!isDragging) return; e.preventDefault(); const currentX = e.pageX || e.touches[0].pageX; deltaX = currentX - startX; if ((currentIndex === 0 && deltaX > 0) || (currentIndex === sections.length - 1 && deltaX < 0)) { deltaX /= 2; } requestAnimationFrame(updateOnDrag); }
        function dragEnd() {
            if (!isDragging) return;
            isDragging = false;
            const swipeThreshold = dock.clientWidth / 4;
            let newIndex = currentIndex;
            if (deltaX < -swipeThreshold && currentIndex < sections.length - 1) { newIndex++; } 
            else if (deltaX > swipeThreshold && currentIndex > 0) { newIndex--; }
            if (newIndex !== currentIndex) { contentCarousel.scrollTo({ left: newIndex * window.innerWidth, behavior: 'smooth' }); } 
            else { resetTextPositions(true); }
            deltaX = 0;
        }

        let scrollTimeout;
        contentCarousel.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const panelWidth = window.innerWidth;
                const newIndex = Math.round(contentCarousel.scrollLeft / panelWidth);
                sections.forEach((section, index) => section.classList.toggle('active', index === newIndex));
                if (newIndex !== currentIndex || !currentTextEl) { currentIndex = newIndex; setupTextElements(); }
            }, 50);
        });

        dock.addEventListener('mousedown', dragStart);
        dock.addEventListener('touchstart', dragStart, { passive: true });
        window.addEventListener('mousemove', dragMove);
        window.addEventListener('touchmove', dragMove, { passive: true });
        window.addEventListener('mouseup', dragEnd);
        window.addEventListener('touchend', dragEnd);

        sections[0].classList.add('active');
        setupTextElements();
    }

    function renderNotes() {
        const notesGrid = document.getElementById('notes-grid');
        if (!notesGrid) return;
        const data = getUnifiedData();

        const allNotes = (data.myMemory?.memories || [])
            .flatMap(memory => memory.items || [])
            .filter(note => note && note.title && note.timestamp);

        const recentNotes = allNotes
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 2);

        let contentHTML = '';
        if (recentNotes.length > 0) {
            contentHTML = recentNotes.map(note => `
                <div class="small-card">
                    <h3 class="small-card-title">${note.title.substring(0, 30)}${note.title.length > 30 ? '...' : ''}</h3>
                    <p class="small-card-content">${new Date(note.timestamp).toLocaleDateString()}</p>
                </div>`).join('');
             notesGrid.innerHTML = `${contentHTML} <a href="mymemory.html" class="action-button col-span-full">Ver todas las notas</a>`;
        } else {
            notesGrid.innerHTML = `<div class="small-card items-center justify-center text-center col-span-full cursor-pointer" onclick="window.location.href='mymemory.html'"><h3 class="small-card-title">Añadir Nota</h3><p class="small-card-content text-4xl mt-2">+</p></div>`;
        }
    }
    
    function renderTodos() {
        const todosGrid = document.getElementById('todos-grid');
        if (!todosGrid) return;
        const data = getUnifiedData();
        const pendingTodos = (data.myTime?.tasks || []).filter(task => task && !task.completed).sort((a,b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate) - new Date(b.dueDate) : a.dueDate ? -1 : 1).slice(0, 4);
        let contentHTML = '';
        if (pendingTodos.length > 0) {
            contentHTML = pendingTodos.map(todo => `
                <div class="small-card col-span-full">
                    <h3 class="small-card-title">${todo.text || todo.title || 'Tarea sin descripción'}</h3>
                    ${todo.dueDate ? `<p class="text-xs text-secondary mt-1">Vence: ${new Date(todo.dueDate).toLocaleDateString()}</p>` : ''}
                </div>`).join('');
            todosGrid.innerHTML = `${contentHTML}<a href="mytime.html" class="action-button col-span-full">Gestionar Tareas</a>`;
        } else {
            todosGrid.innerHTML = `<div class="small-card items-center justify-center text-center col-span-full cursor-pointer" onclick="window.location.href='mytime.html'"><h3 class="small-card-title">Añadir Tarea</h3><p class="small-card-content text-4xl mt-2">+</p></div>`;
        }
    }

    function renderShortcuts() {
        const shortcutsGrid = document.getElementById('shortcuts-grid');
        if (!shortcutsGrid) return;

        const data = getUnifiedData();
        const shortcuts = data.globalSettings?.shortcuts || [];

        const shortcutsHTML = shortcuts.map((shortcut, index) => {
            const icon = shortcut.type === 'call' ? '📞' : '🚀';
            return `
                <div class="small-card text-center items-center justify-center cursor-pointer" data-target="${shortcut.target || ''}" data-index="${index}">
                    <button class="card-options-btn" data-type="shortcut" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                    </button>
                    <div class="card-options-menu" id="shortcut-options-${index}">
                        <button class="edit-btn" data-type="shortcut" data-index="${index}">Editar</button>
                        <button class="delete-btn delete" data-type="shortcut" data-index="${index}">Eliminar</button>
                    </div>
                    <h3 class="small-card-title">${shortcut.name || 'Acceso sin nombre'}</h3>
                    <p class="small-card-content text-4xl mt-2">${icon}</p>
                </div>
            `;
        }).join('');

        const addCardHTML = `
            <div id="add-shortcut-btn" class="small-card text-center items-center justify-center cursor-pointer border-dashed border-2 hover:border-solid">
                <h3 class="small-card-title">Añadir Acceso</h3>
                <p class="small-card-content text-4xl mt-2">+</p>
            </div>
        `;

        shortcutsGrid.innerHTML = shortcutsHTML + addCardHTML;

        shortcutsGrid.querySelectorAll('.small-card[data-target]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-options-btn, .card-options-menu')) return;
                const target = card.dataset.target;
                if (target) window.location.href = target;
            });
        });
        
        shortcutsGrid.querySelectorAll('.card-options-btn[data-type="shortcut"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = e.currentTarget.dataset.index;
                document.getElementById(`shortcut-options-${index}`).classList.toggle('visible');
            });
        });
        shortcutsGrid.querySelectorAll('.edit-btn[data-type="shortcut"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showShortcutModal(parseInt(e.currentTarget.dataset.index));
            });
        });
        shortcutsGrid.querySelectorAll('.delete-btn[data-type="shortcut"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.currentTarget.dataset.index);
                showModalConfirm("¿Seguro que quieres eliminar este acceso directo?", () => {
                    const currentData = getUnifiedData();
                    currentData.globalSettings.shortcuts.splice(index, 1);
                    saveUnifiedData(currentData);
                    renderShortcuts();
                });
            });
        });

        document.getElementById('add-shortcut-btn').addEventListener('click', () => showShortcutModal());
    }

    initializeApp();
    
    window.addEventListener('pageshow', (event) => {
        const exitingCards = document.querySelectorAll('.app-card.exiting');
        exitingCards.forEach(card => {
            card.classList.remove('exiting');
        });
    });
});
