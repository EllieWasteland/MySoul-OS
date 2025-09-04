// Importa las funciones reales desde el gestor de datos.
import { getUnifiedData, saveUnifiedData, getDefaultUnifiedState } from '../data-manager.js';

// Envuelve toda la lógica en un listener que se asegura de que la página esté completamente cargada.
window.addEventListener('load', () => {
    // --- SELECTORES ---
    const mainView = document.getElementById('main-view');
    const memoriesContainer = document.getElementById('memories-container');
    const memoryItemsContainer = document.getElementById('memory-items-container');
    const currentViewTitle = document.getElementById('current-view-title');
    const chatFormContainer = document.getElementById('chat-form-container');
    const mainContainer = document.querySelector('.main-container');

    const floatingNav = document.getElementById('floating-nav');
    const addMemoryBtn = document.getElementById('add-memory-btn');
    const searchBtn = document.getElementById('search-btn');
    const backBtn = document.getElementById('back-btn');
    
    const searchBarContainer = document.getElementById('search-bar-container');
    const searchInput = document.getElementById('search-input');

    const memoryModal = document.getElementById('memory-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const memoryForm = document.getElementById('memory-form');
    const memoryModalTitle = document.getElementById('memory-modal-title');
    const memoryIdInput = document.getElementById('memory-id-input');
    const modalStep1 = document.getElementById('modal-step-1');
    const modalStep2 = document.getElementById('modal-step-2');
    const memoryTitleInputModal = document.getElementById('memory-title-input-modal');
    const continueBtnContainer = document.getElementById('continue-btn-container');
    const continueBtn = document.getElementById('continue-btn');
    const memoryDescriptionInput = document.getElementById('memory-description-input');
    const skipBtn = document.getElementById('skip-btn');
    const createBtn = document.getElementById('create-btn');
    
    const addItemForm = document.getElementById('add-item-form');
    const itemTitleInput = document.getElementById('item-title-input');
    
    const attachImageBtn = document.getElementById('attach-image-btn');
    const imageInput = document.getElementById('image-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    const nestedMemoryBtn = document.getElementById('nested-memory-btn');
    const nestedMemoryMenu = document.getElementById('nested-memory-menu');

    // --- CORRECCIÓN DEL BUG GRÁFICO ---
    if (chatFormContainer && mainContainer) {
        mainContainer.appendChild(chatFormContainer);
    }
    
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('visible'));
    });

    // --- ESTADO Y DATOS ---
    let unifiedData = {};
    let memories = [];
    let settings = {};
    let navigationStack = [null];
    let currentImage = null;
    let isSearchActive = false;

    const getCurrentMemoryId = () => navigationStack[navigationStack.length - 1];

    // --- FUNCIONES DE DATOS ---
    const saveData = () => {
        unifiedData.myMemory.memories = memories;
        unifiedData.myMemory.settings = settings;
        saveUnifiedData(unifiedData);
    };
    
    const loadData = () => {
        unifiedData = getUnifiedData();
        memories = unifiedData.myMemory.memories || [];
        settings = unifiedData.myMemory.settings || {};

        let needsSave = false;
        memories.forEach(mem => {
            if (typeof mem.parentId === 'undefined') {
                mem.parentId = null;
                needsSave = true;
            }
            if (!Array.isArray(mem.items)) {
                mem.items = [];
                needsSave = true;
            }
        });

        if (needsSave) {
            saveData();
        }
    };

    // --- FUNCIONES DE RENDERIZADO ---
    const createMemoryItem = (memory) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        cardEl.innerHTML = `
            <button class="card-options-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
            </button>
            <div class="card-options-dropdown">
                <button class="edit-btn">Editar</button>
                <button class="delete-btn delete">Eliminar</button>
            </div>
            <div class="memory-content">
                <h3 class="memory-title">${memory.title}</h3>
                <p class="memory-description">${memory.description || 'Sin descripción.'}</p>
            </div>
            <button class="access-btn">Acceder</button>`;
        
        const optionsBtn = cardEl.querySelector('.card-options-btn');
        const dropdown = cardEl.querySelector('.card-options-dropdown');

        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-options-dropdown.visible, #nested-memory-menu:not(.hidden)').forEach(d => {
                if (d !== dropdown) d.classList.remove('visible'); d.classList.add('hidden');
            });
            dropdown.classList.toggle('visible');
        });

        cardEl.querySelector('.access-btn').addEventListener('click', () => {
            navigationStack.push(memory.id);
            renderView();
        });
        cardEl.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showMemoryModal(memory);
            dropdown.classList.remove('visible');
        });
        cardEl.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.remove('visible');
            showConfirmationModal(`¿Seguro que quieres eliminar el módulo "${memory.title}" y todo su contenido?`, () => {
                let idsToDelete = [memory.id];
                let queue = [memory.id];
                while(queue.length > 0) {
                    const parentId = queue.shift();
                    const children = memories.filter(m => m.parentId === parentId);
                    children.forEach(child => {
                        idsToDelete.push(child.id);
                        queue.push(child.id);
                    });
                }
                memories = memories.filter(m => !idsToDelete.includes(m.id));
                saveData();
                renderView();
            });
        });

        return cardEl;
    };

    const renderView = () => {
        isSearchActive = false;
        searchBarContainer.classList.add('hidden');
        searchInput.value = '';
        mainView.style.paddingTop = '5rem';
        
        const currentId = getCurrentMemoryId();
        const currentMemory = currentId ? memories.find(m => m.id === currentId) : null;

        backBtn.classList.toggle('hidden', currentId === null);
        floatingNav.classList.toggle('hidden', currentId !== null);
        chatFormContainer.classList.toggle('hidden', currentId === null);
        
        currentViewTitle.textContent = currentMemory ? currentMemory.title : 'MyMemory';

        memoriesContainer.innerHTML = '';
        const childMemories = memories.filter(m => m.parentId === currentId);
        if (childMemories.length > 0) {
            childMemories.forEach(mem => memoriesContainer.appendChild(createMemoryItem(mem)));
        } else if (currentId === null) {
            memoriesContainer.innerHTML = `<p class="text-center text-secondary py-10 col-span-full">No hay módulos de memoria. Crea uno para empezar.</p>`;
        }

        memoryItemsContainer.innerHTML = '';
        if (currentMemory) {
            if (!currentMemory.items || currentMemory.items.length === 0) {
                memoryItemsContainer.innerHTML = `<p class="text-center text-secondary py-10">No hay recuerdos en este módulo.</p>`;
            } else {
                currentMemory.items.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'list-item';
                    itemEl.dataset.itemId = item.id;
                    const date = new Date(item.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    let contentHTML = `<div class="item-header"><span>${date}</span><button class="delete-item-btn" data-item-id="${item.id}">&times;</button></div>`;
                    if (item.image) contentHTML += `<img src="${item.image}" alt="Recuerdo" class="item-image">`;
                    if (item.title) contentHTML += `<p class="item-content-text">${item.title}</p>`;
                    itemEl.innerHTML = contentHTML;
                    memoryItemsContainer.appendChild(itemEl);
                });

                memoryItemsContainer.querySelectorAll('.delete-item-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const itemId = e.currentTarget.dataset.itemId;
                        if (currentMemory) {
                            currentMemory.items = currentMemory.items.filter(i => i.id !== itemId);
                            saveData();
                            renderView();
                        }
                    });
                });
            }
        }
        mainView.scrollTop = 0;
    };
    
    // --- LÓGICA DE BÚSQUEDA ---
    const performSearch = (query) => {
        if (!query) return [];
        const results = [];
        const normalizedQuery = query.toLowerCase();

        const addedItems = new Set();

        memories.forEach(memory => {
            if (memory.items) {
                memory.items.forEach(item => {
                    if (item.title && item.title.toLowerCase().includes(normalizedQuery) && !addedItems.has(item.id)) {
                        results.push({ type: 'item', data: item, parent: memory });
                        addedItems.add(item.id);
                    }
                });
            }
            if (memory.title.toLowerCase().includes(normalizedQuery) || (memory.description && memory.description.toLowerCase().includes(normalizedQuery))) {
                results.push({ type: 'memory', data: memory });
            }
        });
        return results;
    };

    const renderSearchResults = (query) => {
        memoriesContainer.innerHTML = '';
        memoryItemsContainer.innerHTML = '';
        backBtn.classList.add('hidden');
        chatFormContainer.classList.add('hidden');
        floatingNav.classList.remove('hidden');

        currentViewTitle.textContent = query ? `Resultados` : 'Búsqueda';
        mainView.style.paddingTop = '9rem';

        if (!query) {
            memoryItemsContainer.innerHTML = `<p class="text-center text-secondary py-10">Busca por título o contenido de tus recuerdos.</p>`;
            return;
        }

        const results = performSearch(query);

        if (results.length === 0) {
            memoryItemsContainer.innerHTML = `<p class="text-center text-secondary py-10">No se encontraron resultados para "${query}".</p>`;
            return;
        }

        results.forEach(result => {
            const resultEl = document.createElement('div');
            resultEl.className = 'list-item search-result';
            
            if (result.type === 'memory') {
                const mem = result.data;
                resultEl.innerHTML = `
                    <div class="item-header"><span class="font-bold text-sm" style="color: var(--online-color);">MÓDULO</span></div>
                    <h4 class="font-semibold text-lg">${mem.title}</h4>
                    <p class="text-secondary text-sm">${mem.description || 'Sin descripción.'}</p>`;
                resultEl.addEventListener('click', () => {
                    const path = [];
                    let current = mem;
                    while (current) {
                        path.unshift(current.id);
                        current = memories.find(m => m.id === current.parentId);
                    }
                    navigationStack = [null, ...path];
                    renderView();
                });
            } else if (result.type === 'item') {
                const item = result.data;
                const parent = result.parent;
                const date = new Date(item.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                resultEl.innerHTML = `
                    <div class="item-header">
                        <span class="text-xs">Nota en: <strong>${parent.title}</strong></span>
                        <span class="text-xs">${date}</span>
                    </div>
                    ${item.image ? `<img src="${item.image}" alt="Recuerdo" class="item-image" style="max-height: 100px; width: auto; border-radius: 0.5rem;">` : ''}
                    <p class="item-content-text mt-2">${item.title}</p>`;
                resultEl.addEventListener('click', () => {
                    const path = [];
                    let current = parent;
                    while (current) {
                        path.unshift(current.id);
                        current = memories.find(m => m.id === current.parentId);
                    }
                    navigationStack = [null, ...path];
                    renderView();
                    setTimeout(() => {
                        const targetItem = mainView.querySelector(`[data-item-id="${item.id}"]`);
                        if (targetItem) {
                            targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetItem.style.backgroundColor = 'var(--online-color)';
                            targetItem.style.transition = 'background-color 1s';
                            setTimeout(() => { targetItem.style.backgroundColor = ''; }, 1500);
                        }
                    }, 100);
                });
            }
            memoryItemsContainer.appendChild(resultEl);
        });
    };

    const renderNestedMemoryMenu = () => {
        nestedMemoryMenu.innerHTML = '';
        const currentId = getCurrentMemoryId();
        const childMemories = memories.filter(m => m.parentId === currentId);

        if (childMemories.length > 0) {
            childMemories.forEach(mem => {
                const itemEl = document.createElement('button');
                itemEl.className = 'nested-memory-menu-item';
                itemEl.textContent = mem.title;
                itemEl.addEventListener('click', () => {
                    navigationStack.push(mem.id);
                    renderView();
                    nestedMemoryMenu.classList.add('hidden');
                });
                nestedMemoryMenu.appendChild(itemEl);
            });
            nestedMemoryMenu.appendChild(document.createElement('hr'));
        }

        const addItemEl = document.createElement('button');
        addItemEl.className = 'nested-memory-menu-item add-new';
        addItemEl.textContent = '+ Crear Nuevo Módulo Aquí';
        addItemEl.addEventListener('click', () => {
            showMemoryModal();
            nestedMemoryMenu.classList.add('hidden');
        });
        nestedMemoryMenu.appendChild(addItemEl);
    };

    // --- FUNCIONES DE MODALES ---
    const showModal = (modalEl) => modalEl.classList.add('visible');
    const hideModal = (modalEl) => modalEl.classList.remove('visible');

    const showMemoryModal = (memory = null) => {
        memoryForm.reset();
        if (memory) {
            memoryIdInput.value = memory.id;
            memoryTitleInputModal.value = memory.title;
            memoryDescriptionInput.value = memory.description || '';
            memoryModalTitle.textContent = 'Editar Módulo';
        } else {
            memoryIdInput.value = '';
            memoryModalTitle.textContent = 'Nuevo Módulo';
        }
        modalStep1.classList.add('active');
        modalStep2.classList.remove('active');
        continueBtnContainer.classList.toggle('hidden', !memoryTitleInputModal.value.trim());
        createBtn.textContent = memory ? 'Guardar Cambios' : 'Guardar Módulo';
        showModal(memoryModal);
    };
    
    const saveMemory = () => {
        const id = memoryIdInput.value;
        const title = memoryTitleInputModal.value.trim();
        const description = memoryDescriptionInput.value.trim();
        if (!title) return;

        if (id) {
            const memory = memories.find(m => m.id === id);
            if (memory) { memory.title = title; memory.description = description; }
        } else {
            memories.push({ 
                id: `memory-${Date.now()}`, title, description, 
                parentId: getCurrentMemoryId(), items: [] 
            });
        }
        saveData();
        renderView();
        hideModal(memoryModal);
    };

    const showConfirmationModal = (message, onConfirm) => {
        const confirmMsg = confirmationModal.querySelector('#confirmation-message');
        const confirmBtn = confirmationModal.querySelector('#confirm-action-btn');
        const cancelBtn = confirmationModal.querySelector('#confirm-cancel-btn');
        confirmMsg.textContent = message;
        
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => { onConfirm(); hideModal(confirmationModal); });
        newCancelBtn.addEventListener('click', () => hideModal(confirmationModal));
        showModal(confirmationModal);
    };

    // --- OTRAS FUNCIONES ---
    const applyTheme = () => {
        document.documentElement.classList.toggle('light-mode', settings.theme === 'light');
    };

    const applyWallpaper = () => {
        const wallpaper = unifiedData.myTime?.wallpaper;
        if (wallpaper) {
            document.body.style.backgroundImage = `url('${wallpaper}')`;
        } else {
            document.body.style.backgroundImage = 'none';
        }
    };
    
    const handleImageSelection = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImage = e.target.result;
                imagePreview.src = currentImage;
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    // --- EVENT LISTENERS ---
    addMemoryBtn.addEventListener('click', () => showMemoryModal());
    
    searchBtn.addEventListener('click', () => {
        isSearchActive = !searchBarContainer.classList.contains('hidden');
        searchBarContainer.classList.toggle('hidden');
        
        if (!searchBarContainer.classList.contains('hidden')) {
            searchInput.focus();
            renderSearchResults(searchInput.value);
        } else {
            renderView();
        }
    });

    searchInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
    });
    
    backBtn.addEventListener('click', () => {
        if (navigationStack.length > 1) {
            navigationStack.pop();
            renderView();
        }
    });

    nestedMemoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = nestedMemoryMenu.classList.contains('hidden');
        document.querySelectorAll('.card-options-dropdown.visible').forEach(d => d.classList.remove('visible'));
        if (isHidden) {
            renderNestedMemoryMenu();
        }
        nestedMemoryMenu.classList.toggle('hidden');
    });

    memoryTitleInputModal.addEventListener('input', () => { continueBtnContainer.classList.toggle('hidden', memoryTitleInputModal.value.trim() === ''); });
    continueBtn.addEventListener('click', () => { modalStep1.classList.remove('active'); modalStep2.classList.add('active'); });
    skipBtn.addEventListener('click', saveMemory);
    createBtn.addEventListener('click', saveMemory);
    
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = itemTitleInput.value.trim();
        const currentId = getCurrentMemoryId();
        if ((!title && !currentImage) || !currentId) return;

        const memory = memories.find(m => m.id === currentId);
        if (memory) {
            const newItem = { id: `item-${Date.now()}`, title: title, image: currentImage, timestamp: new Date().toISOString() };
            memory.items.push(newItem);
            saveData();
            
            renderView();
            const newItemEl = memoryItemsContainer.querySelector(`[data-item-id="${newItem.id}"]`);
            if (newItemEl) {
                newItemEl.classList.add('slide-up');
                mainView.scrollTop = mainView.scrollHeight;
            }
            
            itemTitleInput.value = '';
            itemTitleInput.style.height = 'auto';
            currentImage = null;
            imageInput.value = '';
            imagePreviewContainer.classList.add('hidden');
        }
    });

    attachImageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => handleImageSelection(e.target.files[0]));
    removeImageBtn.addEventListener('click', () => {
        currentImage = null;
        imageInput.value = '';
        imagePreviewContainer.classList.add('hidden');
    });

    itemTitleInput.addEventListener('input', () => {
        itemTitleInput.style.height = 'auto';
        itemTitleInput.style.height = `${itemTitleInput.scrollHeight}px`;
    });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.card-options-btn')) {
            document.querySelectorAll('.card-options-dropdown.visible').forEach(d => d.classList.remove('visible'));
        }
        if (!e.target.closest('#nested-memory-btn') && !e.target.closest('#nested-memory-menu')) {
            nestedMemoryMenu.classList.add('hidden');
        }
    });

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadData();
        applyTheme();
        applyWallpaper();
        mainView.classList.add('active');
        renderView();
    };

    init();
});
