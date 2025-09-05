// Importa las funciones del gestor de datos
import { getUnifiedData, saveUnifiedData } from '../data-manager.js';

let appState;
let currentSection = 'summary';
let currentProjectIndex = null;
let currentShoppingIndex = null;
let countdownInterval = null;
let currentlyEditing = { taskIndex: null, sectionKey: null, projectIndex: null, task: null };

let newSubtasks = [];
let newImageBase64Strings = [];
let newSelectedColor = null;

// --- DOM ELEMENTS ---
const sections = { summary: document.getElementById('summary-section'), tasks: document.getElementById('tasks-section'), projects: document.getElementById('projects-section'), shopping: document.getElementById('shopping-section') };
const lists = { tasks: document.getElementById('tasks-list'), projects: document.getElementById('projects-list'), shopping: document.getElementById('shopping-list') };
const dockButtons = document.querySelectorAll('.taskbar-button');
const addTaskContainer = document.getElementById('add-task-container');
const appContent = document.getElementById('app-content');
const taskDetailPanel = document.getElementById('task-detail-panel');
const projectDetailPanel = document.getElementById('project-detail-panel');
const shoppingDetailPanel = document.getElementById('shopping-detail-panel');
const backToListBtn = document.getElementById('back-to-list-btn');
const backToProjectsBtn = document.getElementById('back-to-projects-btn');
const backToShoppingBtn = document.getElementById('back-to-shopping-btn');
const wallpaperBg = document.getElementById('wallpaper-bg');


// --- UTILITY & HELPER FUNCTIONS ---
function saveData() {
    saveUnifiedData(appState);
}

function formatTimeRemaining(deadline) {
    const total = Date.parse(deadline) - Date.now();
    if (total < 0) return '<span class="text-red-400 font-bold">Vencido</span>';
    const s = Math.floor((total / 1000) % 60), m = Math.floor((total / 1000 / 60) % 60), h = Math.floor((total / (1000 * 60 * 60)) % 24), d = Math.floor(total / (1000 * 60 * 60 * 24));
    let p = []; if (d > 0) p.push(`${d}d`); if (h > 0) p.push(`${h}h`); if (m > 0) p.push(`${m}m`); if (d === 0 && h === 0 && m < 15) p.push(`${s}s`);
    return p.length > 0 ? p.join(' ') : '<span class="text-yellow-400">Vence pronto</span>';
}

function startCountdownUpdates() {
    if (countdownInterval) clearInterval(countdownInterval);
    const update = () => document.querySelectorAll('.countdown-timer').forEach(el => { if(el.dataset.dueDate) el.innerHTML = formatTimeRemaining(el.dataset.dueDate); });
    update();
    countdownInterval = setInterval(update, 1000);
}

function updateNavUI() { 
    dockButtons.forEach(b => b.classList.toggle('active', b.dataset.section === currentSection)); 
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    if(currentSection === 'summary') renderSummary();
    Object.keys(lists).forEach(renderList);
    updateNavUI();
    updateTaskInputVisibility();
    startCountdownUpdates();
}

function renderSummary() {
    const summaryCardsContainer = document.getElementById('summary-cards');
    summaryCardsContainer.innerHTML = '';
    const sectionsToSummarize = [{ key: 'tasks', title: 'Tareas', icon: 'task_alt' }, { key: 'projects', title: 'Proyectos', icon: 'folder_special' }, { key: 'shopping', title: 'Compras', icon: 'shopping_cart' }];
    sectionsToSummarize.forEach(sec => {
        const items = appState.myTime[sec.key] || [];
        const pendingCount = items.filter(item => !item.completed).length;
        const count = items.length;
        const isShopping = sec.key === 'shopping';

        const card = document.createElement('div');
        card.className = 'card p-4 cursor-pointer transition-transform transform hover:scale-105';
        card.dataset.section = sec.key;
        card.innerHTML = `<div class="flex items-center text-gray-300 mb-2"><span class="material-symbols-outlined mr-2">${sec.icon}</span><h3 class="font-semibold">${sec.title}</h3></div><p class="text-3xl font-bold text-white">${isShopping ? count : pendingCount}</p><p class="text-sm text-gray-500">${isShopping ? 'Listas' : 'Pendientes'}</p>`;
        card.addEventListener('click', () => showSection(sec.key));
        summaryCardsContainer.appendChild(card);
    });
}

function renderList(sectionKey) {
    const listElement = lists[sectionKey];
    if (!listElement) return;
    const items = appState.myTime[sectionKey] || [];
    listElement.innerHTML = ''; 

    if (items.length === 0) {
        listElement.innerHTML = `<div class="text-center text-gray-500 mt-16"><span class="material-symbols-outlined text-6xl mb-2">inbox</span><p>Todo despejado por aquí.</p></div>`;
        return;
    }
    
    if (sectionKey === 'projects') { renderProjectsList(items); return; }
    if (sectionKey === 'shopping') { renderShoppingLists(items); return; }
    
    items.forEach((item, index) => {
        const itemElement = createTaskCard(item, index, sectionKey);
        listElement.appendChild(itemElement);
    });

    startCountdownUpdates();
}

function renderProjectsList(projects) {
    const listElement = lists.projects;
    listElement.innerHTML = '';
    projects.forEach((project, index) => {
        const totalTasks = project.tasks?.length || 0;
        const completedTasks = project.tasks?.filter(t => t.completed).length || 0;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const projectCard = document.createElement('div');
        projectCard.className = 'card p-4 transition duration-300 fade-in';
        projectCard.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="flex-grow min-w-0 cursor-pointer" data-index="${index}" data-action="view-project">
                    <p class="font-semibold text-gray-200">${project.name}</p>
                    <p class="text-sm text-gray-400 mt-1 truncate">${project.description || 'Sin descripción'}</p>
                    <div class="mt-4">
                        <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
                            <span>Progreso</span>
                            <span>${completedTasks} / ${totalTasks} Tareas</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="project-progress-bar h-2 rounded-full" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
                <button data-index="${index}" data-section-key="projects" data-action="delete" class="text-gray-500 hover:text-red-500 flex-shrink-0 z-10 relative">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        listElement.appendChild(projectCard);
    });
}

function renderShoppingLists(shoppingLists) {
    const listElement = lists.shopping;
    listElement.innerHTML = '';
    shoppingLists.forEach((list, index) => {
        const totalItems = list.items?.length || 0;
        const pendingPrice = list.items?.filter(i => !i.purchased).reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;

        const listCard = document.createElement('div');
        listCard.className = 'card p-4 transition duration-300 fade-in';
        listCard.innerHTML = `
            <div class="flex items-start gap-3">
                 <div class="flex-grow min-w-0 cursor-pointer" data-index="${index}" data-action="view-shopping-list">
                    <p class="font-semibold text-gray-200">${list.title}</p>
                    <div class="flex justify-between items-center text-sm text-gray-400 mt-2">
                        <span>${totalItems} productos</span>
                        <span class="font-bold text-primary">$${pendingPrice.toFixed(2)}</span>
                    </div>
                </div>
                <button data-index="${index}" data-section-key="shopping" data-action="delete" class="text-gray-500 hover:text-red-500 flex-shrink-0 z-10 relative">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        listElement.appendChild(listCard);
    });
}

function createTaskCard(item, index, sectionKey, projectIndex = null) {
    const itemElement = document.createElement('div');
    itemElement.className = `card p-4 transition duration-300 fade-in flex items-start gap-3 ${item.completed ? 'opacity-60' : ''}`;
    itemElement.style.backgroundColor = item.color || 'transparent';
    const dataAttrs = `data-index="${index}" data-section-key="${sectionKey}" ${projectIndex !== null ? `data-project-index="${projectIndex}"` : ''}`;
    itemElement.innerHTML = `
        <button ${dataAttrs} data-action="toggle" class="pt-1 flex-shrink-0 z-10 relative"><span class="material-symbols-outlined text-2xl ${item.completed ? 'text-green-400' : 'toggle-completed-btn'}">${item.completed ? 'check_circle' : 'radio_button_unchecked'}</span></button>
        <div class="flex-grow min-w-0 cursor-pointer" ${dataAttrs} data-action="view">
            <p class="${item.completed ? 'line-through text-gray-500' : 'text-gray-200'} font-semibold">${item.text}</p>
            <p class="text-sm text-gray-400 mt-1 truncate">${item.description || 'Sin descripción'}</p>
            <div class="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
                ${item.dueDate ? `<span class="flex items-center gap-1.5" title="Fecha límite"><span class="material-symbols-outlined !text-base">event</span><span class="countdown-timer" data-due-date="${item.dueDate}">...</span></span>` : ''}
                ${(item.subtasks && item.subtasks.length > 0) ? `<span class="flex items-center gap-1.5" title="Subtareas"><span class="material-symbols-outlined !text-base">checklist</span><span>${item.subtasks.filter(s => s.completed).length}/${item.subtasks.length}</span></span>` : ''}
                ${(item.images && item.images.length > 0) ? `<span class="flex items-center gap-1.5" title="Archivos adjuntos"><span class="material-symbols-outlined !text-base">attachment</span><span>${item.images.length}</span></span>` : ''}
            </div>
        </div>
        <button ${dataAttrs} data-action="delete" class="text-gray-500 hover:text-red-500 flex-shrink-0 z-10 relative"><span class="material-symbols-outlined">delete</span></button>
    `;
    return itemElement;
}

// --- PANEL MANAGEMENT & UI STATE ---
function showSection(sectionKey) {
    closeProjectDetailPanel();
    closeTaskDetailPanel();
    closeShoppingDetailPanel();
    collapseTaskForm();

    currentSection = sectionKey;
    const allSections = appContent.querySelectorAll(':scope > div');
    allSections.forEach(s => s.classList.add('hidden'));
    sections[sectionKey].classList.remove('hidden');
    renderAll();
}

function openTaskDetailPanel(task, taskIndex, sectionKey, projectIndex = null) {
    currentlyEditing = { taskIndex, sectionKey, projectIndex, task: JSON.parse(JSON.stringify(task)) };
    document.getElementById('edit-task-name').value = currentlyEditing.task.text;
    document.getElementById('edit-task-description').value = currentlyEditing.task.description || '';
    document.getElementById('edit-task-due-date').value = currentlyEditing.task.dueDate || '';
    const colorPickerContainer = document.getElementById('edit-color-picker');
    colorPickerContainer.innerHTML = document.getElementById('color-picker').innerHTML;
    colorPickerContainer.querySelectorAll('[data-color-value]').forEach(el => { el.classList.toggle('color-picker-selected', el.dataset.colorValue === currentlyEditing.task.color); });
    renderEditSubtasks();
    renderEditImages();
    taskDetailPanel.classList.remove('translate-x-full');
    if (projectIndex !== null) { projectDetailPanel.classList.add('opacity-0', 'pointer-events-none'); } 
    else { appContent.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none'); }
}

function closeTaskDetailPanel() {
    if (taskDetailPanel.classList.contains('translate-x-full')) return;
    taskDetailPanel.classList.add('translate-x-full');
    if (currentlyEditing.projectIndex !== null) { projectDetailPanel.classList.remove('opacity-0', 'pointer-events-none');} 
    else { appContent.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none'); }
    currentlyEditing = { taskIndex: null, sectionKey: null, projectIndex: null, task: null };
}

function saveTaskDetails() {
    if (currentlyEditing.taskIndex === null) return;
    currentlyEditing.task.text = document.getElementById('edit-task-name').value;
    currentlyEditing.task.description = document.getElementById('edit-task-description').value;
    currentlyEditing.task.dueDate = document.getElementById('edit-task-due-date').value;
    const selectedColor = document.getElementById('edit-color-picker').querySelector('.color-picker-selected');
    currentlyEditing.task.color = selectedColor ? selectedColor.dataset.colorValue : null;
    if (currentlyEditing.projectIndex !== null) {
        appState.myTime.projects[currentlyEditing.projectIndex].tasks[currentlyEditing.taskIndex] = currentlyEditing.task;
        renderProjectTasks();
        renderList('projects'); 
    } else {
        appState.myTime[currentlyEditing.sectionKey][currentlyEditing.taskIndex] = currentlyEditing.task;
        renderList(currentlyEditing.sectionKey);
    }
    saveData();
}

function openProjectDetailPanel(index) {
    currentProjectIndex = index;
    const project = appState.myTime.projects[index];
    document.getElementById('project-detail-title').textContent = project.name;
    document.getElementById('project-detail-description').textContent = project.description;
    renderProjectTasks();
    appContent.classList.add('-translate-x-full');
    projectDetailPanel.classList.remove('translate-x-full');
    updateTaskInputVisibility();
}

function closeProjectDetailPanel() {
    if (currentProjectIndex === null) return;
    currentProjectIndex = null;
    appContent.classList.remove('-translate-x-full');
    projectDetailPanel.classList.add('translate-x-full');
    updateTaskInputVisibility();
}

function renderProjectTasks() {
    const listElement = document.getElementById('project-tasks-list');
    const project = appState.myTime.projects[currentProjectIndex];
    listElement.innerHTML = '';
    if (!project.tasks || project.tasks.length === 0) {
        listElement.innerHTML = `<div class="text-center text-gray-500 mt-16"><span class="material-symbols-outlined text-6xl mb-2">playlist_add</span><p>Añade tu primera tarea a este proyecto.</p></div>`;
    } else {
        project.tasks.forEach((task, index) => {
            const taskCard = createTaskCard(task, index, 'projects', currentProjectIndex);
            listElement.appendChild(taskCard);
        });
    }
    startCountdownUpdates();
}

function openShoppingDetailPanel(index) {
    currentShoppingIndex = index;
    const list = appState.myTime.shopping[index];
    document.getElementById('shopping-detail-title').textContent = list.title;
    renderShoppingItems();
    appContent.classList.add('-translate-x-full');
    shoppingDetailPanel.classList.remove('translate-x-full');
    updateTaskInputVisibility();
}

function closeShoppingDetailPanel() {
    if (currentShoppingIndex === null) return;
    currentShoppingIndex = null;
    appContent.classList.remove('-translate-x-full');
    shoppingDetailPanel.classList.add('translate-x-full');
    updateTaskInputVisibility();
    renderList('shopping'); 
}

function renderShoppingItems() {
    if (currentShoppingIndex === null) return;
    const listElement = document.getElementById('shopping-items-list');
    const list = appState.myTime.shopping[currentShoppingIndex];
    listElement.innerHTML = '';
    
    if (!list.items || list.items.length === 0) {
         listElement.innerHTML = `<div class="text-center text-gray-500 mt-16"><span class="material-symbols-outlined text-6xl mb-2">production_quantity_limits</span><p>Añade tu primer producto.</p></div>`;
    } else {
        list.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = `flex items-center gap-3 bg-white/5 p-2 rounded-md transition-all duration-300 ${item.purchased ? 'opacity-50' : ''}`;
            itemElement.innerHTML = `
                <button data-item-index="${index}" data-action="toggle-purchase" class="p-1 text-2xl transition-colors ${item.purchased ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}">
                    <span class="material-symbols-outlined">${item.purchased ? 'check_circle' : 'radio_button_unchecked'}</span>
                </button>
                <div class="flex-grow">
                    <p class="${item.purchased ? 'line-through text-gray-500' : 'text-gray-200'}">${item.name}</p>
                    <p class="text-xs text-gray-400">$${item.price.toFixed(2)} c/u</p>
                </div>
                <div class="flex items-center justify-center bg-black/20 rounded-md">
                    <button data-item-index="${index}" data-action="decrease-qty" class="px-2 py-1 text-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" ${item.purchased ? 'disabled' : ''}>-</button>
                    <input type="number" value="${item.quantity}" data-item-index="${index}" data-action="set-qty" class="w-10 text-center bg-transparent font-semibold focus:outline-none disabled:opacity-50" ${item.purchased ? 'disabled' : ''}>
                    <button data-item-index="${index}" data-action="increase-qty" class="px-2 py-1 text-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" ${item.purchased ? 'disabled' : ''}>+</button>
                </div>
                <span class="text-right font-semibold text-white w-20">$${(item.quantity * item.price).toFixed(2)}</span>
                <button data-item-index="${index}" data-action="delete-item" class="text-red-500/70 hover:text-red-500"><span class="material-symbols-outlined">close</span></button>
            `;
            listElement.appendChild(itemElement);
        });
    }
    updateShoppingTotal();
}

function updateShoppingTotal() {
    if (currentShoppingIndex === null) return;
    const list = appState.myTime.shopping[currentShoppingIndex];
    const total = list.items?.filter(item => !item.purchased).reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    document.getElementById('shopping-list-total').textContent = `$${total.toFixed(2)}`;
}

// --- EVENT LISTENERS & SETUP ---
function handleListClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const index = parseInt(target.dataset.index);
    const sectionKey = target.dataset.sectionKey;
    const projectIndex = target.dataset.projectIndex ? parseInt(target.dataset.projectIndex) : null;
    
    let itemSource = (projectIndex !== null) 
        ? appState.myTime.projects[projectIndex].tasks 
        : appState.myTime[sectionKey];

    if (action === 'view') { openTaskDetailPanel(itemSource[index], index, sectionKey, projectIndex); } 
    else if (action === 'toggle') { itemSource[index].completed = !itemSource[index].completed; } 
    else if (action === 'delete') { itemSource.splice(index, 1); } 
    else if (action === 'view-project') { openProjectDetailPanel(index); return; } 
    else if (action === 'view-shopping-list') { openShoppingDetailPanel(index); return; }
    else { return; }

    saveData();
    if (projectIndex !== null) { renderProjectTasks(); renderList('projects'); } 
    else { renderList(sectionKey); }
    renderSummary();
}

function setupEventListeners() {
    dockButtons.forEach(button => button.addEventListener('click', () => showSection(button.dataset.section)));
    Object.values(lists).forEach(list => list.addEventListener('click', handleListClick));
    document.getElementById('project-tasks-list').addEventListener('click', handleListClick);
    setupAddTaskForm();
    backToListBtn.addEventListener('click', () => { saveTaskDetails(); closeTaskDetailPanel(); });
    backToProjectsBtn.addEventListener('click', closeProjectDetailPanel);
    backToShoppingBtn.addEventListener('click', closeShoppingDetailPanel);
    setupEditPanelInteractivity();
    setupShoppingPanelInteractivity();
}

function setupAddTaskForm() {
    const taskNameInput = document.getElementById('task-name-input');
    const addTaskForm = document.getElementById('add-task-form');
    const cancelBtn = document.getElementById('cancel-add-task');
    
    taskNameInput.addEventListener('focus', () => addTaskContainer.classList.add('expanded'));
    cancelBtn.addEventListener('click', collapseTaskForm);

    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskNameInput.value.trim();
        if (!text) return;
        
        if (currentSection === 'shopping') {
            const newList = { title: text, items: [], id: Date.now() };
            appState.myTime.shopping.push(newList);
        } else if (currentSection === 'projects') {
            if (currentProjectIndex !== null) {
                const task = { text, description: document.getElementById('task-description-input').value.trim(), dueDate: document.getElementById('task-due-date').value, color: newSelectedColor, images: newImageBase64Strings, subtasks: newSubtasks, completed: false, id: Date.now() };
                if (!appState.myTime.projects[currentProjectIndex].tasks) appState.myTime.projects[currentProjectIndex].tasks = [];
                appState.myTime.projects[currentProjectIndex].tasks.push(task);
                renderProjectTasks();
            } else {
                const project = { name: text, description: document.getElementById('task-description-input').value.trim(), tasks: [], id: Date.now() };
                appState.myTime.projects.push(project);
            }
        } else { // Tasks section
            const task = { text, description: document.getElementById('task-description-input').value.trim(), dueDate: document.getElementById('task-due-date').value, color: newSelectedColor, images: newImageBase64Strings, subtasks: newSubtasks, completed: false, id: Date.now() };
            appState.myTime.tasks.push(task);
        }
        saveData();
        if (currentProjectIndex === null) renderList(currentSection);
        renderSummary();
        collapseTaskForm();
    });

    // Event listeners for color picker, date, etc. in the add form
    document.getElementById('color-picker').addEventListener('click', (e) => {
        const colorDiv = e.target.closest('[data-color-value]');
        if(colorDiv) {
            document.getElementById('color-picker').querySelectorAll('.color-picker-selected').forEach(el => el.classList.remove('color-picker-selected'));
            colorDiv.classList.add('color-picker-selected');
            newSelectedColor = colorDiv.dataset.colorValue;
        }
    });
    document.getElementById('add-date-btn').addEventListener('click', () => document.getElementById('task-due-date').showPicker());
    document.getElementById('task-due-date').addEventListener('change', (e) => {
        document.getElementById('date-preview').textContent = new Date(e.target.value).toLocaleDateString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
    });
    document.getElementById('add-photo-btn').addEventListener('click', () => document.getElementById('image-file-input').click());
    document.getElementById('image-file-input').addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                newImageBase64Strings.push(event.target.result);
                renderImagePreviews('image-previews', newImageBase64Strings);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    });
    const subtaskInput = document.getElementById('subtask-input');
    document.getElementById('add-subtask-btn').addEventListener('click', () => {
        if (subtaskInput.value.trim()) {
            newSubtasks.push({ text: subtaskInput.value.trim(), completed: false });
            renderSubtasksPreview('subtasks-container', newSubtasks);
            subtaskInput.value = '';
        }
    });
    subtaskInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('add-subtask-btn').click(); } });
}

function collapseTaskForm() {
    document.getElementById('add-task-form').reset();
    addTaskContainer.classList.remove('expanded');
    newSelectedColor = null; newImageBase64Strings = []; newSubtasks = [];
    renderImagePreviews('image-previews', []);
    renderSubtasksPreview('subtasks-container', []);
    document.getElementById('date-preview').textContent = '';
    document.querySelectorAll('#color-picker .color-picker-selected').forEach(el => el.classList.remove('color-picker-selected'));
}

function setupShoppingPanelInteractivity() {
    document.getElementById('add-shopping-item-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (currentShoppingIndex === null) return;

        const nameInput = document.getElementById('shopping-item-name');
        const priceInput = document.getElementById('shopping-item-price');
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);

        if(name && !isNaN(price) && price >= 0) {
            if(!appState.myTime.shopping[currentShoppingIndex].items) appState.myTime.shopping[currentShoppingIndex].items = [];
            appState.myTime.shopping[currentShoppingIndex].items.push({ name, price, quantity: 1, purchased: false });
            saveData();
            renderShoppingItems();
            renderList('shopping');
            nameInput.value = '';
            priceInput.value = '';
            nameInput.focus();
        }
    });

    document.getElementById('shopping-items-list').addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if(!button) return;
        const index = parseInt(button.dataset.itemIndex);
        const action = button.dataset.action;
        const items = appState.myTime.shopping[currentShoppingIndex].items;

        if (action === 'increase-qty') { items[index].quantity++; }
        else if (action === 'decrease-qty') { if(items[index].quantity > 1) items[index].quantity--; }
        else if (action === 'delete-item') { items.splice(index, 1); }
        else if (action === 'toggle-purchase') { items[index].purchased = !items[index].purchased; }
        else { return; }
        
        saveData();
        renderShoppingItems();
        renderList('shopping');
    });
    
     document.getElementById('shopping-items-list').addEventListener('change', (e) => {
        const input = e.target.closest('input[data-action="set-qty"]');
        if(!input) return;
        const index = parseInt(input.dataset.itemIndex);
        let newQty = parseInt(input.value);
        if(isNaN(newQty) || newQty < 1) newQty = 1;
        appState.myTime.shopping[currentShoppingIndex].items[index].quantity = newQty;
        saveData();
        renderShoppingItems();
        renderList('shopping');
     });
}

function updateTaskInputVisibility() {
    const isProjectDetailView = currentProjectIndex !== null;
    const isShoppingDetailView = currentShoppingIndex !== null;
    const isMainListView = ['tasks', 'projects', 'shopping'].includes(currentSection) && !isShoppingDetailView;
    
    const shouldBeVisible = isMainListView || isProjectDetailView;
    addTaskContainer.classList.toggle('hidden', !shouldBeVisible);
    if (!shouldBeVisible) return;

    const taskNameInput = document.getElementById('task-name-input');
    const addItemBtnText = document.getElementById('add-item-btn').querySelector('span');
    
    const descriptionWrapper = document.querySelector('.wrapper-description');
    const subtasksWrapper = document.querySelector('.wrapper-subtasks');
    const mediaWrapper = document.querySelector('.wrapper-media');
    const optionsWrapper = document.querySelector('.wrapper-options');
    
    const showAllFields = (show) => {
        [descriptionWrapper, subtasksWrapper, mediaWrapper, optionsWrapper].forEach(el => el.classList.toggle('hidden', !show));
    };

    if (currentSection === 'shopping') {
         taskNameInput.placeholder = "Crear nueva lista de compras...";
         addItemBtnText.textContent = 'playlist_add';
         showAllFields(false);
    } else if (currentSection === 'projects') {
        if (isProjectDetailView) {
            const projectName = appState.myTime.projects[currentProjectIndex].name;
            taskNameInput.placeholder = `Nueva tarea para "${projectName}"...`;
            addItemBtnText.textContent = 'arrow_upward';
            showAllFields(true);
        } else {
            taskNameInput.placeholder = "Crear un nuevo proyecto...";
            addItemBtnText.textContent = 'create_new_folder';
            showAllFields(false);
            descriptionWrapper.classList.remove('hidden');
        }
    } else { // 'tasks' section
        taskNameInput.placeholder = "Escribe una nueva tarea...";
        addItemBtnText.textContent = 'arrow_upward';
        showAllFields(true);
    }
}

function renderEditSubtasks() {
    const container = document.getElementById('edit-subtasks-container');
    if(!currentlyEditing.task.subtasks) currentlyEditing.task.subtasks = [];
    container.innerHTML = currentlyEditing.task.subtasks.map((sub, index) => `<div class="flex items-center gap-3 text-sm relative bg-white/5 p-2 rounded-md"><button data-sub-index="${index}" data-action="toggle-edit-subtask" class="subtask-checkbox ${sub.completed ? 'completed' : ''}">${sub.completed ? '<span class="material-symbols-outlined text-sm text-white">check</span>' : ''}</button><p class="flex-grow ${sub.completed ? 'line-through text-gray-500' : 'text-gray-300'}">${sub.text}</p><button data-sub-index="${index}" data-action="delete-edit-subtask" class="text-red-500/70 hover:text-red-500"><span class="material-symbols-outlined">close</span></button></div>`).join('');
}

function renderEditImages() {
     const container = document.getElementById('edit-image-previews');
     if(!currentlyEditing.task.images) currentlyEditing.task.images = [];
     container.innerHTML = currentlyEditing.task.images.map((img, index) => `<div class="relative"><img src="${img}" class="w-20 h-20 object-cover rounded-lg"><button data-img-index="${index}" data-action="delete-edit-image" class="absolute top-0 right-0 bg-red-600/80 rounded-full text-white p-0.5 transform translate-x-1/2 -translate-y-1/2"><span class="material-symbols-outlined !text-sm">close</span></button></div>`).join('');
}

 function setupEditPanelInteractivity() {
    const addSubtaskInput = document.getElementById('edit-subtask-input');
    document.getElementById('edit-add-subtask-btn').addEventListener('click', () => { if (addSubtaskInput.value.trim()) { if (!currentlyEditing.task.subtasks) currentlyEditing.task.subtasks = []; currentlyEditing.task.subtasks.push({ text: addSubtaskInput.value.trim(), completed: false }); addSubtaskInput.value = ''; renderEditSubtasks(); } });
    addSubtaskInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); document.getElementById('edit-add-subtask-btn').click(); } });
    document.getElementById('edit-subtasks-container').addEventListener('click', (e) => { const button = e.target.closest('button[data-action]'); if (!button) return; const index = button.dataset.subIndex; if (button.dataset.action === 'toggle-edit-subtask') { currentlyEditing.task.subtasks[index].completed = !currentlyEditing.task.subtasks[index].completed; } else if (button.dataset.action === 'delete-edit-subtask') { currentlyEditing.task.subtasks.splice(index, 1); } renderEditSubtasks(); });
    document.getElementById('edit-add-photo-btn').addEventListener('click', () => document.getElementById('edit-image-file-input').click());
    document.getElementById('edit-image-file-input').addEventListener('change', (e) => { Array.from(e.target.files).forEach(file => { const reader = new FileReader(); reader.onload = (event) => { if (!currentlyEditing.task.images) currentlyEditing.task.images = []; currentlyEditing.task.images.push(event.target.result); renderEditImages(); }; reader.readAsDataURL(file); }); e.target.value = ''; });
    document.getElementById('edit-image-previews').addEventListener('click', (e) => { const button = e.target.closest('button[data-action="delete-edit-image"]'); if (button) { currentlyEditing.task.images.splice(button.dataset.imgIndex, 1); renderEditImages(); } });
    document.getElementById('edit-color-picker').addEventListener('click', (e) => { const colorDiv = e.target.closest('[data-color-value]'); if (colorDiv) { document.getElementById('edit-color-picker').querySelectorAll('.color-picker-selected').forEach(el => el.classList.remove('color-picker-selected')); colorDiv.classList.add('color-picker-selected'); } });
}

function renderImagePreviews(containerId, images) { 
    document.getElementById(containerId).innerHTML = images.map(img => `<img src="${img}" class="w-20 h-20 object-cover rounded-lg">`).join(''); 
}

function renderSubtasksPreview(containerId, subtasks) {
    const container = document.getElementById(containerId);
    container.innerHTML = subtasks.map((sub, index) => `<div class="flex items-center text-sm bg-gray-700/50 p-2 rounded-md"><p class="flex-grow text-gray-300">${sub.text}</p><button type="button" data-sub-index-preview="${index}" class="text-red-500/70 hover:text-red-500"><span class="material-symbols-outlined">close</span></button></div>`).join('');
    container.querySelectorAll('button').forEach(btn => { btn.addEventListener('click', () => { newSubtasks.splice(btn.dataset.subIndexPreview, 1); renderSubtasksPreview(containerId, newSubtasks); }); });
}

// --- THEME & WALLPAPER FUNCTIONS ---
function applyWallpaper(imageBase64) {
    if (imageBase64) {
        wallpaperBg.style.backgroundImage = `url(${imageBase64})`;
        wallpaperBg.classList.remove('opacity-0');
    } else {
        wallpaperBg.style.backgroundImage = 'none';
        wallpaperBg.classList.add('opacity-0');
    }
}

// --- INITIALIZATION ---
function initializeApp() {
    appState = getUnifiedData();
    
    // Apply saved wallpaper on startup
    if (appState.myTime.wallpaper) {
        applyWallpaper(appState.myTime.wallpaper);
    }

    // Since the color is static, we don't need to apply it from JS.
    // The theme color is now defined and controlled only by styles.css

    setupEventListeners();
    showSection('summary');
}

initializeApp();


