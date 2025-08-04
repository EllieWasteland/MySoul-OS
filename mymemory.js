// Importa las funciones desde el gestor de datos.
import { getUnifiedData, saveUnifiedData, getDefaultUnifiedState } from './data-manager.js';

// Envuelve toda la lógica en un listener que se asegura de que la página esté completamente cargada.
window.addEventListener('load', () => {
    // --- SELECTORES ---
    const memoriesListView = document.getElementById('memories-list-view');
    const memoryDetailsView = document.getElementById('memory-details-view');
    const memoriesContainer = document.getElementById('memories-container');
    const floatingNav = document.getElementById('floating-nav');
    const addMemoryBtn = document.getElementById('add-memory-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');

    const memoryModal = document.getElementById('memory-modal');
    const settingsModal = document.getElementById('settings-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    const deleteDataBtn = document.getElementById('delete-data-btn');
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
    const detailsMemoryTitle = document.getElementById('details-memory-title');
    const addItemForm = document.getElementById('add-item-form');
    const itemTitleInput = document.getElementById('item-title-input');
    const memoryItemsContainer = document.getElementById('memory-items-container');
    
    // Selectores del formulario de chat
    const attachImageBtn = document.getElementById('attach-image-btn');
    const imageInput = document.getElementById('image-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('visible'));
    });

    // --- ESTADO Y DATOS ---
    let unifiedData = {};
    let memories = [];
    let settings = {};
    let selectedMemoryId = null;
    let currentImage = null;

    // --- FUNCIONES DE DATOS ---
    const saveData = () => {
        unifiedData.myMemory.memories = memories;
        unifiedData.myMemory.settings = settings;
        saveUnifiedData(unifiedData);
    };
    
    const loadData = () => {
        unifiedData = getUnifiedData();
        memories = unifiedData.myMemory.memories;
        settings = unifiedData.myMemory.settings;
    };

    // --- FUNCIONES DE NAVEGACIÓN Y VISTAS ---
    const showListView = () => {
        selectedMemoryId = null;
        memoryDetailsView.classList.remove('active');
        memoriesListView.classList.add('active');
        floatingNav.classList.remove('hidden');
        backToListBtn.classList.add('hidden');
        renderMemories();
    };
    
    const showDetailsView = (memoryId) => {
        selectedMemoryId = memoryId;
        memoriesListView.classList.remove('active');
        memoryDetailsView.classList.add('active');
        floatingNav.classList.add('hidden');
        backToListBtn.classList.remove('hidden');
        renderMemoryDetails();
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
            <button class="access-btn">Acceder a las notas</button>`;
        
        const optionsBtn = cardEl.querySelector('.card-options-btn');
        const dropdown = cardEl.querySelector('.card-options-dropdown');

        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-options-dropdown.visible').forEach(d => {
                if (d !== dropdown) d.classList.remove('visible');
            });
            dropdown.classList.toggle('visible');
        });

        cardEl.querySelector('.access-btn').addEventListener('click', () => showDetailsView(memory.id));
        cardEl.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showMemoryModal(memory);
            dropdown.classList.remove('visible');
        });
        cardEl.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.remove('visible');
            showConfirmationModal(`¿Seguro que quieres eliminar el módulo "${memory.title}"?`, () => {
                memories = memories.filter(m => m.id !== memory.id);
                saveData();
                renderMemories();
            });
        });

        return cardEl;
    };

    const renderMemories = () => {
        memoriesContainer.innerHTML = '';
        if (memories.length === 0) {
            memoriesContainer.innerHTML = `<p class="text-center text-secondary py-10 col-span-full">No hay módulos de memoria. Crea uno para empezar.</p>`;
        } else {
            memories.forEach((memory) => memoriesContainer.appendChild(createMemoryItem(memory)));
        }
    };
    
    const renderMemoryDetails = () => {
        const memory = memories.find(m => m.id === selectedMemoryId);
        if (!memory) { showListView(); return; }
        detailsMemoryTitle.textContent = memory.title;
        memoryItemsContainer.innerHTML = '';
        if (!memory.items || memory.items.length === 0) {
            memoryItemsContainer.innerHTML = `<p class="text-center text-secondary py-10">No hay recuerdos en este módulo.</p>`;
        } else {
            memory.items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'list-item';
                itemEl.dataset.itemId = item.id;

                const date = new Date(item.timestamp).toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                let contentHTML = `
                    <div class="item-header">
                        <span>${date}</span>
                        <button class="delete-item-btn" data-item-id="${item.id}">&times;</button>
                    </div>
                `;

                if (item.image) {
                    contentHTML += `<img src="${item.image}" alt="Recuerdo" class="item-image">`;
                }
                if (item.title) {
                    contentHTML += `<p class="item-content-text">${item.title}</p>`;
                }
                
                itemEl.innerHTML = contentHTML;
                memoryItemsContainer.appendChild(itemEl);
            });

            memoryItemsContainer.querySelectorAll('.delete-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.currentTarget.dataset.itemId;
                    const memory = memories.find(m => m.id === selectedMemoryId);
                    if (memory) {
                        memory.items = memory.items.filter(i => i.id !== itemId);
                        saveData();
                        renderMemoryDetails();
                    }
                });
            });
        }
        memoryItemsContainer.scrollTop = memoryItemsContainer.scrollHeight;
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
            memories.push({ id: `memory-${Date.now()}`, title, description, items: [] });
        }
        saveData();
        renderMemories();
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
        if(toggleThemeBtn) toggleThemeBtn.textContent = settings.theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro';
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
    settingsBtn.addEventListener('click', () => {
        showConfirmationModal('¿Estás seguro de que quieres borrar TODA la información de MyMemory? Esta acción no se puede deshacer.', () => {
            unifiedData.myMemory = getDefaultUnifiedState().myMemory;
            loadData();
            saveData();
            renderMemories();
        });
    });
    
    if(toggleThemeBtn) toggleThemeBtn.addEventListener('click', () => { 
        settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; 
        saveData(); 
        applyTheme(); 
    });
    if(deleteDataBtn) deleteDataBtn.addEventListener('click', () => {
        hideModal(settingsModal);
        showConfirmationModal('¿Estás seguro de que quieres borrar TODA la información de MyMemory? Esta acción no se puede deshacer.', () => {
            unifiedData.myMemory = getDefaultUnifiedState().myMemory;
            loadData();
            saveData();
            renderMemories();
        });
    });
    
    backToListBtn.addEventListener('click', showListView);

    memoryTitleInputModal.addEventListener('input', () => { continueBtnContainer.classList.toggle('hidden', memoryTitleInputModal.value.trim() === ''); });
    continueBtn.addEventListener('click', () => { modalStep1.classList.remove('active'); modalStep2.classList.add('active'); });
    skipBtn.addEventListener('click', saveMemory);
    createBtn.addEventListener('click', saveMemory);
    
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = itemTitleInput.value.trim();
        if (!title && !currentImage) return;

        const memory = memories.find(m => m.id === selectedMemoryId);
        if (memory) {
            if (!memory.items) memory.items = [];
            
            const newItem = { 
                id: `item-${Date.now()}`, 
                title: title,
                image: currentImage,
                timestamp: new Date().toISOString()
            };
            memory.items.push(newItem);
            saveData();
            
            renderMemoryDetails();
            const newItemEl = memoryItemsContainer.querySelector(`[data-item-id="${newItem.id}"]`);
            if (newItemEl) {
                newItemEl.classList.add('slide-up');
                memoryItemsContainer.scrollTop = memoryItemsContainer.scrollHeight;
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

    // Cierra los menús desplegables si se hace clic fuera
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.card-options-btn')) {
            document.querySelectorAll('.card-options-dropdown.visible').forEach(d => {
                d.classList.remove('visible');
            });
        }
    });

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadData();
        applyTheme();
        applyWallpaper();
        showListView();
    };

    init();
});
