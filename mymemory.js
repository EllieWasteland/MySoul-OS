// Importa las funciones desde el gestor de datos.
// Asegúrate de que 'data-manager.js' esté en el mismo directorio.
import { getUnifiedData, saveUnifiedData } from './data-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- SELECTORES ---
    const memoriesListView = document.getElementById('memories-list-view');
    const memoryDetailsView = document.getElementById('memory-details-view');
    const memoriesContainer = document.getElementById('memories-container');
    const mainNavButtons = document.getElementById('main-nav-buttons');
    const detailsNavButtons = document.getElementById('details-nav-buttons');
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
    
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('visible'));
    });

    // --- ESTADO Y DATOS ---
    let unifiedData = getUnifiedData();
    let memories = unifiedData.myMemory.memories;
    let settings = unifiedData.myMemory.settings;
    let selectedMemoryId = null;

    // --- FUNCIONES DE DATOS ---
    const saveData = () => {
        unifiedData.myMemory.memories = memories;
        saveUnifiedData(unifiedData);
    };
    const saveSettings = () => {
        unifiedData.myMemory.settings = settings;
        saveUnifiedData(unifiedData);
    };

    // --- FUNCIONES DE NAVEGACIÓN Y VISTAS ---
    const showListView = () => {
        selectedMemoryId = null;
        memoryDetailsView.classList.remove('active');
        memoriesListView.classList.add('active');
        detailsNavButtons.classList.add('hidden');
        mainNavButtons.classList.remove('hidden');
        renderMemories();
    };
    
    const showDetailsView = (memoryId) => {
        selectedMemoryId = memoryId;
        memoriesListView.classList.remove('active');
        memoryDetailsView.classList.add('active');
        mainNavButtons.classList.add('hidden');
        detailsNavButtons.classList.remove('hidden');
        renderMemoryDetails();
    };

    // --- FUNCIONES DE RENDERIZADO ---
    const createMemoryItem = (memory) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'memory-item';
        itemEl.innerHTML = `
            <div class="memory-content">
                <h3 class="memory-title">${memory.title}</h3>
                <p class="memory-description">${memory.description || 'Sin descripción.'}</p>
            </div>
            <div class="flex items-center gap-4 flex-wrap justify-end">
                <div class="hud-item"><button class="hud-button edit-btn">Editar</button></div>
                <div class="hud-item"><button class="hud-button access-btn">Acceder</button></div>
            </div>`;
        itemEl.querySelector('.access-btn').addEventListener('click', () => showDetailsView(memory.id));
        itemEl.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); showMemoryModal(memory); });
        itemEl.addEventListener('dblclick', () => {
             showConfirmationModal(`¿Seguro que quieres eliminar "${memory.title}"?`, () => {
                memories = memories.filter(m => m.id !== memory.id);
                saveData();
                renderMemories();
            });
        });
        return itemEl;
    };

    const renderMemories = () => {
        memoriesContainer.innerHTML = '';
        if (memories.length === 0) {
            memoriesContainer.innerHTML = `<p class="text-center text-secondary py-10">No hay módulos de memoria. Crea uno para empezar.</p>`;
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
            memoryItemsContainer.innerHTML = `<p class="text-center text-secondary py-10">No hay recuerdos en esta memoria.</p>`;
        } else {
            memory.items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'list-item';
                itemEl.dataset.itemId = item.id;
                itemEl.draggable = true;
                itemEl.innerHTML = `<span class="drag-handle text-2xl">::</span><span class="flex-grow item-text">${item.title}</span><button class="text-red-500 font-bold delete-item-btn text-xl">&times;</button>`;
                memoryItemsContainer.appendChild(itemEl);
                itemEl.querySelector('.delete-item-btn').addEventListener('click', () => {
                    memory.items = memory.items.filter(i => i.id !== item.id);
                    saveData();
                    renderMemoryDetails();
                });
                itemEl.querySelector('.item-text').addEventListener('click', () => {
                    const newTitle = prompt('Editar recuerdo:', item.title);
                    if (newTitle !== null && newTitle.trim() !== '') {
                        item.title = newTitle.trim();
                        saveData();
                        renderMemoryDetails();
                    }
                });
            });
        }
        setupDragAndDrop();
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
            memoryModalTitle.textContent = 'Editar Memoria';
        } else {
            memoryIdInput.value = '';
            memoryModalTitle.textContent = 'Nueva Memoria';
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

    const setupDragAndDrop = () => {
        let draggedItem = null;
        memoryItemsContainer.addEventListener('dragstart', e => { if (e.target.classList.contains('list-item')) { draggedItem = e.target; setTimeout(() => draggedItem.classList.add('dragging'), 0); } });
        memoryItemsContainer.addEventListener('dragend', () => { draggedItem?.classList.remove('dragging'); draggedItem = null; });
        memoryItemsContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = [...memoryItemsContainer.querySelectorAll('.list-item:not(.dragging)')].reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = e.clientY - box.top - box.height / 2;
                return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
            if (draggedItem) {
                if (afterElement == null) { memoryItemsContainer.appendChild(draggedItem); } 
                else { memoryItemsContainer.insertBefore(draggedItem, afterElement); }
            }
        });
        memoryItemsContainer.addEventListener('drop', e => {
            e.preventDefault();
            const memory = memories.find(m => m.id === selectedMemoryId);
            if (memory) {
                const newOrderIds = [...memoryItemsContainer.querySelectorAll('.list-item')].map(el => el.dataset.itemId);
                memory.items.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                saveData();
            }
        });
    };

    // --- EVENT LISTENERS ---
    addMemoryBtn.addEventListener('click', () => showMemoryModal());
    settingsBtn.addEventListener('click', () => showModal(settingsModal));
    if(toggleThemeBtn) toggleThemeBtn.addEventListener('click', () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme(); });
    if(deleteDataBtn) deleteDataBtn.addEventListener('click', () => {
        showConfirmationModal('¿Estás seguro de que quieres borrar TODA la información de MyMemory?', () => {
            memories = [];
            saveData();
            showListView();
            hideModal(settingsModal);
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
        if (!title) return;
        const memory = memories.find(m => m.id === selectedMemoryId);
        if (memory) {
            if (!memory.items) memory.items = [];
            memory.items.push({ id: `item-${Date.now()}`, title });
            saveData();
            renderMemoryDetails();
            itemTitleInput.value = '';
        }
    });

    // --- INICIALIZACIÓN ---
    applyTheme();
    showListView();
});
