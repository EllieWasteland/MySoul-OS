import { getUnifiedData, saveUnifiedData, getDefaultUnifiedState } from './data-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- SELECTORES ---
    const getEl = (id) => document.getElementById(id);
    const mainAppUI = getEl('main-app-ui');
    const wallpaperContainer = getEl('wallpaper-container');
    const appContainer = getEl('app-container');
    const views = { 
        dashboard: getEl('dashboard-view'), 
        tasks: getEl('tasks-view'),
        schedule: getEl('schedule-view'), 
        calendar: getEl('calendar-view'), 
        settings: getEl('settings-view'),
        details: getEl('details-view'),
        multiStepForm: getEl('multi-step-form-view'),
        grades: getEl('grades-view'),
        zen: getEl('zen-view'),
        zenSetup: getEl('zen-setup-view'),
    };
    const buttons = {
        backToDashboard: getEl('back-to-dashboard-btn'), editTask: getEl('edit-task-btn'),
        deleteTask: getEl('delete-task-btn'), // Botón nuevo
        resetApp: getEl('reset-app-btn'),
        saveWallpaperUrl: getEl('save-wallpaper-url-btn'), resetWallpaper: getEl('reset-wallpaper-btn'),
        startZenSession: getEl('start-zen-session-btn'), exitZen: getEl('exit-zen-btn'),
        dashboardZen: getEl('dashboard-zen-btn'),
        deleteCompleted: getEl('delete-completed-btn'),
        addSubject: getEl('add-subject-btn'), cancelSubjectForm: getEl('cancel-subject-form-btn'), saveSubject: getEl('save-subject-btn'),
        calendarPrevMonth: getEl('calendar-prev-month-btn'), calendarNextMonth: getEl('calendar-next-month-btn'),
        backToSchedule: getEl('back-to-schedule-btn'), editSubjectGrades: getEl('edit-subject-grades-btn'), addGrade: getEl('add-grade-btn'),
        cancelAddGrade: getEl('cancel-add-grade-btn'),
        fabAddTask: getEl('fab-add-task'),
        // Multi-Step Form
        formBack: getEl('form-back-btn'),
        formNext: getEl('form-next-btn'),
        formSkip: getEl('form-skip-btn'),
        formCancel: getEl('form-cancel-btn'), 
        // Zen Setup
        zenModeTimer: getEl('zen-mode-timer-btn'),
        zenModeStopwatch: getEl('zen-mode-stopwatch-btn'),
        startZen: getEl('start-zen-btn'),
        cancelZenSetup: getEl('cancel-zen-setup-btn'),
        zenControlMain: getEl('zen-control-main-btn'),
        // Dock
        dock: getEl('floating-dock'),
    };
    const inputs = { importFile: getEl('import-file-input'), wallpaperUrl: getEl('wallpaper-url-input'), wallpaperFile: getEl('wallpaper-file-input'), colorPicker: getEl('color-picker') };
    const containers = {
        pendingTasks: getEl('pending-tasks-container'), completedTasks: getEl('completed-tasks-container'), taskDetails: getEl('task-details-content'),
        greetingText: getEl('greeting-text'), dashboardSummary: getEl('dashboard-summary'), motivationalQuote: getEl('motivational-quote'),
        focusCard: getEl('focus-card-container'), taskFilters: getEl('task-filters'), streak: getEl('streak-text'),
        scheduleList: getEl('schedule-list-container'), calendarGrid: getEl('calendar-grid'), calendarTitle: getEl('calendar-title'), calendarTasks: getEl('calendar-tasks-container'),
        scheduleDisplay: getEl('schedule-display'), subjectFormContainer: getEl('subject-form-container'),
        gradesSubjectTitle: getEl('grades-subject-title'), gradesAverage: getEl('grades-average'), gradesList: getEl('grades-list-container'),
        todaysSchedule: getEl('todays-schedule-container'),
    };
    const formElements = {
        title: getEl('form-title'),
        progressBar: getEl('form-progress-bar'),
        steps: [ getEl('form-step-1'), getEl('form-step-2'), getEl('form-step-3'), getEl('form-step-4') ],
        taskTitle: getEl('task-title'),
        taskDescription: getEl('task-description'),
        taskDueDate: getEl('task-due-date'),
        taskPriority: getEl('task-priority'),
        taskTags: getEl('task-tags'),
        subtasksFormList: getEl('subtasks-form-list'),
        subjectForm: getEl('subject-form'), subjectFormTitle: getEl('subject-form-title'), subjectIdInput: getEl('subject-id-input'),
        subjectName: getEl('subject-name'), subjectDay: getEl('subject-day'), subjectStartTime: getEl('subject-start-time'), subjectEndTime: getEl('subject-end-time'),
        addGradeForm: getEl('add-grade-form'), gradeNameInput: getEl('grade-name-input'), gradeValueInput: getEl('grade-value-input'),
        zenTimerForm: getEl('zen-timer-form'),
        zenStopwatchContent: getEl('zen-stopwatch-content'),
    };
    const modal = { 
        subtask: { element: getEl('subtask-modal'), input: getEl('subtask-input'), confirmBtn: getEl('confirm-add-subtask-btn'), cancelBtn: getEl('cancel-add-subtask-btn'), addBtnForm: getEl('add-subtask-form-btn') },
        grade: { element: getEl('add-grade-modal') }
    };
    const zen = {
        timerDisplay: getEl('zen-timer-display'), statusText: getEl('zen-status-text'), canvas: getEl('zen-canvas'),
        progressRing: getEl('zen-progress-ring'), progressBg: getEl('zen-progress-bg'),
        borderTop: getEl('border-top'), borderRight: getEl('border-right'), borderBottom: getEl('border-bottom'), borderLeft: getEl('border-left'),
        pomodoroDurationInput: getEl('zen-pomodoro-duration'), shortBreakDurationInput: getEl('zen-short-break-duration'), longBreakDurationInput: getEl('zen-long-break-duration'),
        confirmLogModal: getEl('confirm-zen-log-modal'), confirmLogContent: getEl('confirm-zen-log-content')
    };
    const achievementToast = { element: getEl('achievement-toast'), content: getEl('achievement-toast-content') };

    // --- ESTADO Y LÓGICA DE DATOS ---
    let unifiedData = getUnifiedData();
    let state = unifiedData.myTime;

    if (!state.settings) {
        state.settings = { color: '#FF4500' };
    }
    if (!state.zenSettings) {
        state.zenSettings = { pomodoro: 25, shortBreak: 5, longBreak: 15 };
    }

    let formState = {};
    let countdownInterval = null;
    let zenState = {};

    const dataService = {
        async saveData(appState) {
            unifiedData.myTime = appState;
            saveUnifiedData(unifiedData);
        }
    };

    // --- LÓGICA DEL SCRIPT ---
    const motivationalQuotes = [ "El secreto para salir adelante es empezar.", "La disciplina es el puente entre las metas y los logros.", "No mires el reloj; haz lo que él hace. Sigue moviéndote." ];
    
    // --- FUNCIONES PRINCIPALES ---
    const achievementDefs = { 'focusMaster': { name: 'Maestro del Enfoque', description: 'Completa 10 sesiones Pomodoro.', icon: '🏆', condition: (s) => s.gamification.pomodoroCount >= 10 }, 'firstStep': { name: 'Primer Paso', description: 'Completa tu primera tarea.', icon: '🎉', condition: (s) => s.tasks.some(t => t.completed) }, 'weekStreak': { name: 'Imparable', description: 'Mantén una racha de 7 días.', icon: '🚀', condition: (s) => s.gamification.streak >= 7 } };
    async function checkAchievements() { let unlocked = false; for (const id in achievementDefs) { if (!state.gamification.achievements.includes(id) && achievementDefs[id].condition(state)) { state.gamification.achievements.push(id); showAchievementToast(achievementDefs[id]); unlocked = true; } } if (unlocked) await dataService.saveData(state); }
    function showAchievementToast(achievement) { achievementToast.content.innerHTML = `<span class="text-3xl">${achievement.icon}</span><div><h3 class="font-bold text-lg">${achievement.name}</h3><p class="text-sm">${achievement.description}</p></div>`; achievementToast.element.style.setProperty('--accent-primary', state.settings.color); achievementToast.element.classList.add('show'); setTimeout(() => achievementToast.element.classList.remove('show'), 5000); }
    async function updateStreak() { const today = new Date().toISOString().split('T')[0]; if (state.gamification.lastCompletionDate !== today) { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); state.gamification.streak = state.gamification.lastCompletionDate === yesterday.toISOString().split('T')[0] ? state.gamification.streak + 1 : 1; state.gamification.lastCompletionDate = today; await dataService.saveData(state); await checkAchievements(); } }
    
    async function resetApp() { if(confirm("¡ADVERTENCIA! Se borrarán todos los datos de MyTime.")) { const defaultState = getDefaultUnifiedState(); state = defaultState.myTime; await dataService.saveData(state); location.reload(); } }
    function applyAppearance() { wallpaperContainer.style.backgroundImage = `url('${state.wallpaper || ""}')`; document.documentElement.style.setProperty('--accent-primary', state.settings.color); if(inputs.colorPicker) inputs.colorPicker.value = state.settings.color; }
    async function handleWallpaperUrl() { const url = inputs.wallpaperUrl.value.trim(); if (url) { state.wallpaper = url; await dataService.saveData(state); applyAppearance(); } }
    function handleWallpaperFile(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async e => { state.wallpaper = e.target.result; await dataService.saveData(state); applyAppearance(); }; reader.readAsDataURL(file); }
    async function resetWallpaper() { state.wallpaper = null; await dataService.saveData(state); applyAppearance(); inputs.wallpaperUrl.value = ''; inputs.wallpaperFile.value = ''; }

    function enterFullscreen(element) { if (element.requestFullscreen) element.requestFullscreen(); else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen(); }
    function exitFullscreen() { if (document.exitFullscreen) document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); }
    function handleFullscreenChange() { if (!document.fullscreenElement && views.zen.classList.contains('active')) stopZenMode(); }
    function showHiddenView(viewId) { if (views[viewId]) views[viewId].classList.add('active'); }
    function hideHiddenView(viewId) { if (views[viewId]) views[viewId].classList.remove('active'); }
    
    // --- LÓGICA DE NAVEGACIÓN ---
    function switchView(viewId) {
        Object.values(views).forEach(view => {
            if(view && !view.classList.contains('hidden-view') && view.id !== 'zen-view') {
                view.classList.remove('active');
            }
        });
        
        const viewToShow = getEl(viewId);
        if(viewToShow) {
            viewToShow.classList.add('active');
        }

        buttons.dock.querySelectorAll('.dock-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        switch(viewId) {
            case 'dashboard-view': renderDashboard(); break;
            case 'tasks-view': renderTasksView(); break;
            case 'schedule-view': renderSchedule(); break;
            case 'calendar-view': renderCalendar(); break;
            case 'settings-view': renderSettings(); break;
        }
    }

    function setupNavigation() {
        buttons.dock.addEventListener('click', (e) => {
            const button = e.target.closest('.dock-btn');
            if (button && button.dataset.view) {
                switchView(button.dataset.view);
            }
        });
    }
    
    // --- LÓGICA DE RENDERIZADO ---
    function updateCountdownTimers() { document.querySelectorAll('.task-countdown').forEach(timer => { if (!timer.dataset.dueDate) return; const diff = new Date(timer.dataset.dueDate) - new Date(); if (diff <= 0) { timer.innerHTML = `<span style="color: var(--danger-color);" class="font-bold">Vencido</span>`; return; } const d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4), s = Math.floor((diff % 6e4) / 1e3); timer.textContent = `Faltan: ${d > 0 ? d + 'd ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }); document.querySelectorAll('.schedule-countdown').forEach(timer => { const now = new Date(); const todayStr = now.toISOString().split('T')[0]; const startTime = new Date(`${todayStr}T${timer.dataset.startTime}`); const endTime = new Date(`${todayStr}T${timer.dataset.endTime}`); let diff, prefix; if (now < startTime) { diff = startTime - now; prefix = 'Empieza en'; timer.style.color = 'var(--text-secondary)'; } else if (now >= startTime && now <= endTime) { diff = endTime - now; prefix = 'Finaliza en'; timer.style.color = 'var(--accent-primary)'; } else { timer.textContent = 'Finalizada'; timer.style.color = 'var(--danger-color)'; return; } const h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4), s = Math.floor((diff % 6e4) / 1e3); timer.textContent = `${prefix} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }); }
    function startCountdownTimers() { if (!countdownInterval) { updateCountdownTimers(); countdownInterval = setInterval(updateCountdownTimers, 1000); } }
    function createProgressCircle(percentage, size = 40) { const sW = size / 12, r = (size / 2) - (sW / 2), c = 2 * Math.PI * r, o = c - (percentage / 100) * c; return `<svg class="font-mono" style="width:${size}px; height:${size}px;" viewBox="0 0 ${size} ${size}"><circle stroke-width="${sW}" stroke="var(--border-color)" fill="transparent" r="${r}" cx="${size/2}" cy="${size/2}"/><circle stroke-width="${sW}" stroke-dasharray="${c}" stroke-dashoffset="${o}" stroke-linecap="round" stroke="var(--accent-primary)" fill="transparent" r="${r}" cx="${size/2}" cy="${size/2}" style="transition: stroke-dashoffset 0.5s ease; transform: rotate(-90deg); transform-origin: center;"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" class="font-bold" style="fill: var(--text-primary); font-size: ${size / 4.5}px;">${Math.round(percentage)}%</text></svg>`; }
    function createTaskCard(task) { let progress = 0, statusText = ''; if (task.subtasks.length > 0) { const completed = task.subtasks.filter(st => st.completed).length; progress = (completed / task.subtasks.length) * 100; statusText = `${completed}/${task.subtasks.length}`; } else { progress = task.completed ? 100 : 0; statusText = task.completed ? 'Hecho!' : 'Simple'; } const card = document.createElement('div'); card.className = `task-card priority-${task.priority}`; card.dataset.taskId = task.id; let timeInfoHTML = ''; if(task.dueDate && !task.completed) { timeInfoHTML = `<p class="text-sm text-secondary">Entrega: ${new Date(task.dueDate).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p><p class="text-sm font-semibold task-countdown font-mono" data-due-date="${task.dueDate}"></p>`; } else { timeInfoHTML = `<p class="text-sm text-secondary">${task.completed ? 'Completado' : 'Sin fecha'}</p>`; } const tagsHTML = !task.completed ? task.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''; card.innerHTML = `<div class="flex justify-between items-center"><div class="flex-grow mr-4 min-w-0"><h3 class="font-bold text-lg break-words ${task.completed ? 'line-through text-secondary' : ''}">${task.title}</h3>${timeInfoHTML}<div class="flex gap-2 mt-2 flex-wrap">${tagsHTML}</div></div><div class="flex-shrink-0 flex flex-col items-center justify-center">${createProgressCircle(progress, 60)}<span class="text-xs font-semibold mt-1 font-mono">${statusText}</span></div></div>`; card.addEventListener('click', () => { state.selectedTaskId = task.id; renderTaskDetails(); showHiddenView('details'); }); return card; }
    
    function renderDashboard() {
        if(!containers.greetingText) return;
        containers.greetingText.textContent = `Hola, ${state.userName}!`;
        const pendingCount = state.tasks.filter(t => !t.completed).length;
        containers.dashboardSummary.textContent = pendingCount > 0 ? `Tienes ${pendingCount} tarea${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''}.` : '¡No tienes tareas pendientes!';
        containers.motivationalQuote.textContent = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        containers.streak.textContent = `${state.gamification.streak} día${state.gamification.streak !== 1 ? 's' : ''}`;
        renderTodaysSchedule();
        renderFocusCard();
        startCountdownTimers();
    }
    
    function renderTasksView() {
        renderTaskFilters();
        const activeTasks = state.tasks.filter(t => !t.completed).sort((a, b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate) - new Date(b.dueDate) : a.dueDate ? -1 : 1);
        const completedTasks = state.tasks.filter(t => t.completed).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        const filteredTasks = activeTasks.filter(t => (state.filters.priority === 'all' || t.priority === state.filters.priority) && (state.filters.tag === 'all' || t.tags.includes(state.filters.tag)));
        
        containers.pendingTasks.innerHTML = '';
        if (filteredTasks.length > 0) {
            filteredTasks.forEach(task => containers.pendingTasks.appendChild(createTaskCard(task)));
        } else {
            containers.pendingTasks.innerHTML = `<div class="text-center p-6"><h3 class="font-heading text-xl">Todo en orden</h3><p class="mt-1 text-sm text-secondary">No hay tareas que coincidan con tus filtros.</p></div>`;
        }
        
        containers.completedTasks.innerHTML = '';
        if (completedTasks.length > 0) {
            completedTasks.forEach(task => containers.completedTasks.appendChild(createTaskCard(task)));
        } else {
            containers.completedTasks.innerHTML = `<div class="text-center p-6"><h3 class="font-heading text-xl">Aún no hay nada aquí</h3><p class="mt-1 text-sm text-secondary">Completa algunas tareas para verlas aquí.</p></div>`;
        }
        startCountdownTimers();
    }

    function renderTodaysSchedule() { if(!containers.todaysSchedule) return; const today = new Date().getDay(); const todaysClasses = state.schedule.filter(s => s.day == today).sort((a, b) => a.startTime.localeCompare(b.startTime)); if (todaysClasses.length === 0) { containers.todaysSchedule.innerHTML = `<div class="text-center p-6"><h3 class="font-heading text-xl">Día Libre</h3><p class="mt-1 text-sm text-secondary">No tienes clases programadas para hoy. ¡Disfruta!</p></div>`; } else { containers.todaysSchedule.innerHTML = todaysClasses.map(subject => `<div class="task-card"><h3 class="font-bold text-lg">${subject.name}</h3><p class="text-sm text-secondary">${subject.startTime} - ${subject.endTime}</p><p class="text-sm font-semibold schedule-countdown mt-2 font-mono" data-start-time="${subject.startTime}" data-end-time="${subject.endTime}"></p></div>`).join(''); } }
    function renderFocusCard() { if(!containers.focusCard) return; containers.focusCard.innerHTML = ''; const focusTask = state.tasks.filter(t => !t.completed && t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]; if (focusTask) { const card = createTaskCard(focusTask); card.classList.add('focus-card'); containers.focusCard.appendChild(card); } else { containers.focusCard.innerHTML = `<div class="text-center p-6"><h3 class="font-heading text-xl">Todo tranquilo</h3><p class="mt-1 text-sm text-secondary">No hay tareas urgentes. ¡Disfruta o añade un proyecto!</p></div>`; } }
    function renderTaskFilters() { if(!containers.taskFilters) return; const allTags = [...new Set(state.tasks.flatMap(t => t.tags))]; containers.taskFilters.innerHTML = `<select id="priority-filter" class="input-field !py-1 !w-auto"><option value="all">Prioridad</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select><select id="tag-filter" class="input-field !py-1 !w-auto"><option value="all">Etiqueta</option>${allTags.map(tag => `<option value="${tag}">${tag}</option>`).join('')}</select>`; const priorityFilter = getEl('priority-filter'), tagFilter = getEl('tag-filter'); priorityFilter.value = state.filters.priority; tagFilter.value = state.filters.tag; priorityFilter.addEventListener('change', (e) => { state.filters.priority = e.target.value; renderTasksView(); }); tagFilter.addEventListener('change', (e) => { state.filters.tag = e.target.value; renderTasksView(); }); }
    async function renderTaskDetails() { if(!containers.taskDetails) return; const task = state.tasks.find(t => t.id === state.selectedTaskId); if (!task) return; let progress = 0; if (task.subtasks.length > 0) { const completed = task.subtasks.filter(st => st.completed).length; progress = (completed / task.subtasks.length) * 100; } else { progress = task.completed ? 100 : 0; } let detailsHTML = `<div class="flex flex-col items-center w-full"><div class="mb-6">${createProgressCircle(progress, 120)}</div><h2 class="font-heading text-3xl md:text-5xl mb-2 text-center break-words ${task.completed ? 'line-through text-secondary' : ''}">${task.title}</h2><div class="text-sm text-secondary mb-2 text-center">Prioridad: <span class="font-bold">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span></div>${task.tags.length > 0 && !task.completed ? `<div class="flex gap-2 justify-center flex-wrap mb-6">${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}<p class="mb-8 text-center w-full max-w-2xl">${task.description || '<em>Sin descripción.</em>'}</p><div class="w-full border-t border-border-color pt-6">`; if (task.subtasks.length > 0) { const comp = task.subtasks.filter(st => st.completed).length; const total = task.subtasks.length; const subsHTML = task.subtasks.map(st => `<div class="subtask-item flex items-center gap-4 p-3 border-b border-border-color" draggable="true" data-subtask-id="${st.id}"><span class="drag-handle text-secondary cursor-move">⠿</span><input type="checkbox" id="subtask-${st.id}" data-subtask-id="${st.id}" class="custom-checkbox" ${st.completed ? 'checked' : ''}><label for="subtask-${st.id}" class="flex-1 ${st.completed ? 'line-through text-secondary' : ''}">${st.text}</label></div>`).join(''); detailsHTML += `<h3 class="font-heading text-xl mb-4 title-line">Progreso (${comp}/${total})</h3><div id="subtasks-details-list">${subsHTML}</div><div class="flex justify-center mt-4"><button id="add-subtask-details-btn" class="btn text-sm">+ Añadir subtarea</button></div>`; } else { detailsHTML += `<div class="flex justify-center"><label for="complete-task-checkbox" class="flex items-center gap-4 cursor-pointer"><input type="checkbox" id="complete-task-checkbox" class="custom-checkbox w-8 h-8" ${task.completed ? 'checked' : ''}><span class="text-xl font-bold">Marcar como completada</span></label></div>`; } detailsHTML += `</div></div>`; containers.taskDetails.innerHTML = detailsHTML; if (task.subtasks.length > 0) { getEl('subtasks-details-list').querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.addEventListener('change', async e => { const subtask = task.subtasks.find(st => st.id === e.target.dataset.subtaskId); if(subtask) { subtask.completed = e.target.checked; task.completed = task.subtasks.every(st => st.completed); if (task.completed) { task.completedAt = new Date().toISOString(); await updateStreak(); } await dataService.saveData(state); await renderTaskDetails(); } }); }); getEl('add-subtask-details-btn').addEventListener('click', () => { openSubtaskModal(); }); } else { getEl('complete-task-checkbox').addEventListener('change', async e => { task.completed = e.target.checked; if (task.completed) { task.completedAt = new Date().toISOString(); await updateStreak(); } await dataService.saveData(state); await renderTaskDetails(); }); } }
    
    // --- Multi-Step Form Logic ---
    function resetFormState() { formState = { isEditing: false, taskId: null, currentStep: 1, taskData: { title: '', description: '', dueDate: '', priority: 'medium', tags: [], subtasks: [] } }; }
    function showFormStep(step) { formState.currentStep = step; formElements.steps.forEach((el, index) => { el.style.display = (index + 1 === step) ? 'flex' : 'none'; }); const progressSteps = formElements.progressBar.children; for (let i = 0; i < progressSteps.length; i++) { progressSteps[i].classList.toggle('active', i < step); } buttons.formBack.style.display = step > 1 ? 'inline-flex' : 'none'; buttons.formSkip.style.display = step > 1 && step < 4 ? 'inline-flex' : 'none'; buttons.formNext.textContent = step === 4 ? (formState.isEditing ? 'Guardar Cambios' : 'Crear Tarea') : 'Siguiente'; }
    function openMultiStepForm(taskToEdit = null) { resetFormState(); if (taskToEdit) { formState.isEditing = true; formState.taskId = taskToEdit.id; formState.taskData = JSON.parse(JSON.stringify(taskToEdit)); formElements.title.textContent = 'Editar Tarea'; } else { formElements.title.textContent = 'Nueva Tarea'; } formElements.taskTitle.value = formState.taskData.title; formElements.taskDescription.value = formState.taskData.description; if (formState.taskData.dueDate) { formElements.taskDueDate.value = new Date(new Date(formState.taskData.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); } else { formElements.taskDueDate.value = ''; } formElements.taskPriority.value = formState.taskData.priority; formElements.taskTags.value = formState.taskData.tags.join(', '); renderFormSubtasks(); showFormStep(1); showHiddenView('multiStepForm'); }
    function renderFormSubtasks() { formElements.subtasksFormList.innerHTML = formState.taskData.subtasks.map((st, i) => `<div class="subtask-item flex items-center justify-between p-2 bg-bg-primary rounded-md" data-index="${i}"><span class="flex-1 px-2 text-secondary">${st.text}</span><button type="button" class="font-bold text-red-500 px-2" data-index="${i}">×</button></div>`).join(''); formElements.subtasksFormList.querySelectorAll('button').forEach(btn => btn.addEventListener('click', e => { formState.taskData.subtasks.splice(e.target.dataset.index, 1); renderFormSubtasks(); })); }
    async function saveTask() { const { title, description, dueDate, priority, tags, subtasks } = formState.taskData; if (!title) { alert('El título es obligatorio.'); return; } const taskData = { title, description, dueDate: dueDate || null, priority, tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t) : tags, subtasks: subtasks.map((st, i) => ({ id: st.id || `sub-${Date.now()}-${i}`, text: st.text, completed: st.completed || false })) }; if (formState.isEditing) { const taskIndex = state.tasks.findIndex(t => t.id === formState.taskId); if (taskIndex > -1) { const originalTask = state.tasks[taskIndex]; state.tasks[taskIndex] = { ...originalTask, ...taskData, completed: taskData.subtasks.length > 0 ? taskData.subtasks.every(st => st.completed) : originalTask.completed }; } } else { state.tasks.push({ ...taskData, id: `task-${Date.now()}`, createdAt: new Date().toISOString(), completed: false, completedAt: null }); } await dataService.saveData(state); hideHiddenView('multiStepForm'); switchView('tasks-view'); }

    function renderSettings() { if(!inputs.colorPicker) return; inputs.colorPicker.value = state.settings.color; inputs.wallpaperUrl.value = (state.wallpaper && !state.wallpaper.startsWith('data:')) ? state.wallpaper : ''; }
    function openSubtaskModal() { modal.subtask.element.style.zIndex = '200'; modal.subtask.element.classList.add('active'); modal.subtask.input.value = ''; modal.subtask.input.focus(); }
    function closeSubtaskModal() { modal.subtask.element.classList.remove('active'); }
    async function handleAddSubtask() { const text = modal.subtask.input.value.trim(); if (!text) return; if (views.multiStepForm.classList.contains('active')) { formState.taskData.subtasks.push({ text, completed: false }); renderFormSubtasks(); } else { const task = state.tasks.find(t => t.id === state.selectedTaskId); if (task) { task.subtasks.push({ id: `sub-${Date.now()}`, text, completed: false }); await dataService.saveData(state); await renderTaskDetails(); } } closeSubtaskModal(); }
    
    function showSubjectForm(show) { if(!containers.subjectFormContainer) return; containers.subjectFormContainer.style.display = show ? 'block' : 'none'; containers.scheduleDisplay.style.display = show ? 'none' : 'block'; }
    function renderSchedule() { if(!containers.scheduleList) return; showSubjectForm(false); containers.scheduleList.innerHTML = ''; if (state.schedule.length === 0) { containers.scheduleList.innerHTML = `<div class="text-center p-4"><h3 class="font-heading text-xl">Horario Vacío</h3><p class="mt-1 text-sm text-secondary">Añade tu primera materia para empezar.</p></div>`; return; } const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']; const scheduleByDay = days.map((_, dayIndex) => state.schedule.filter(s => s.day == dayIndex).sort((a,b) => a.startTime.localeCompare(b.startTime))); days.forEach((dayName, dayIndex) => { if (scheduleByDay[dayIndex].length > 0) { const dayGroup = document.createElement('div'); dayGroup.className = 'schedule-day-group'; let dayHTML = `<h3 class="font-heading text-2xl pb-2 border-b border-border-color mb-4">${dayName}</h3><div class="space-y-3">`; scheduleByDay[dayIndex].forEach(s => { dayHTML += `<div class="task-card" data-subject-id="${s.id}"><span class="font-bold">${s.name}</span><span class="text-secondary font-semibold float-right">${s.startTime} - ${s.endTime}</span></div>`; }); dayHTML += `</div>`; dayGroup.innerHTML = dayHTML; containers.scheduleList.appendChild(dayGroup); } }); containers.scheduleList.querySelectorAll('[data-subject-id]').forEach(el => el.addEventListener('click', (e) => { state.selectedSubjectId = e.currentTarget.dataset.subjectId; renderGrades(); showHiddenView('grades'); })); }
    function openNewSubjectForm() { state.selectedSubjectId = null; formElements.subjectForm.reset(); formElements.subjectFormTitle.textContent = 'Nueva Materia'; buttons.saveSubject.textContent = 'Añadir Materia'; showSubjectForm(true); }
    function openEditSubjectForm() { const subject = state.schedule.find(s => s.id === state.selectedSubjectId); if (!subject) return; hideHiddenView('grades'); switchView('schedule-view'); setTimeout(() => { formElements.subjectForm.reset(); formElements.subjectFormTitle.textContent = 'Editar Materia'; buttons.saveSubject.textContent = 'Guardar Cambios'; formElements.subjectName.value = subject.name; formElements.subjectDay.value = subject.day; formElements.subjectStartTime.value = subject.startTime; formElements.subjectEndTime.value = subject.endTime; showSubjectForm(true); }, 50); }
    function renderGrades() { if(!containers.gradesSubjectTitle) return; const subject = state.schedule.find(s => s.id === state.selectedSubjectId); if (!subject) { hideHiddenView('grades'); return; } containers.gradesSubjectTitle.textContent = subject.name; if (!subject.grades || subject.grades.length === 0) { containers.gradesAverage.textContent = 'Sin calificaciones'; containers.gradesList.innerHTML = `<div class="text-center p-4"><p class="text-secondary">Aún no has añadido ninguna calificación.</p></div>`; } else { const total = subject.grades.reduce((sum, grade) => sum + grade.value, 0); const average = total / subject.grades.length; containers.gradesAverage.textContent = `Promedio: ${average.toFixed(2)} / Suma: ${total.toFixed(2)}`; containers.gradesList.innerHTML = subject.grades.map((grade, index) => `<div class="task-card flex justify-between items-center cursor-pointer grade-item" data-grade-index="${index}"><span class="font-bold">${grade.name}</span><span class="text-secondary font-semibold text-xl">${grade.value.toFixed(2)}</span></div>`).join(''); containers.gradesList.querySelectorAll('.grade-item').forEach(item => { item.addEventListener('click', async (e) => { const gradeIndex = parseInt(e.currentTarget.dataset.gradeIndex); const gradeName = subject.grades[gradeIndex].name; if (confirm(`¿Estás seguro de que quieres eliminar la calificación "${gradeName}"?`)) { subject.grades.splice(gradeIndex, 1); await dataService.saveData(state); renderGrades(); } }); }); } }
    function renderCalendar() { if(!containers.calendarGrid) return; const calDate = new Date(state.calendarDate); const y = calDate.getFullYear(), m = calDate.getMonth(); containers.calendarTitle.textContent = calDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); const firstDay = new Date(y, m, 1).getDay(); const daysInMonth = new Date(y, m + 1, 0).getDate(); containers.calendarGrid.innerHTML = ['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => `<div class="font-bold text-secondary font-mono">${d}</div>`).join(''); for (let i = 0; i < firstDay; i++) containers.calendarGrid.innerHTML += `<div></div>`; const tasksByDate = {}; state.tasks.forEach(task => { if(task.dueDate){ const date = task.dueDate.split('T')[0]; if(!tasksByDate[date]) tasksByDate[date] = []; tasksByDate[date].push(task); }}); const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; for (let day = 1; day <= daysInMonth; day++) { const el = document.createElement('div'); const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; el.textContent = day; el.dataset.date = fullDate; if (fullDate === todayStr) el.classList.add('today'); if (tasksByDate[fullDate]) el.classList.add('has-task'); el.addEventListener('click', () => { document.querySelectorAll('#calendar-grid > div').forEach(d => d.classList.remove('selected')); el.classList.add('selected'); renderTasksForDay(fullDate, tasksByDate[fullDate] || []); }); containers.calendarGrid.appendChild(el); } }
    function renderTasksForDay(dateStr, tasks) { if(!containers.calendarTasks) return; const date = new Date(dateStr + 'T00:00:00'); containers.calendarTasks.innerHTML = `<h3 class="font-heading text-xl mb-2">Tareas para el ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}</h3>`; if(tasks.length > 0) { containers.calendarTasks.innerHTML += tasks.map(task => `<div class="task-card" data-task-id="${task.id}">${task.title}</div>`).join(''); containers.calendarTasks.querySelectorAll('[data-task-id]').forEach(el => el.addEventListener('click', e => { state.selectedTaskId = e.currentTarget.dataset.taskId; renderTaskDetails(); showHiddenView('details'); })); } else { containers.calendarTasks.innerHTML += `<p class="text-secondary">No hay tareas programadas.</p>`; } }

    // --- ZEN MODE ---
    function openZenSetup() { hideHiddenView('details'); zen.pomodoroDurationInput.value = state.zenSettings.pomodoro; zen.shortBreakDurationInput.value = state.zenSettings.shortBreak; zen.longBreakDurationInput.value = state.zenSettings.longBreak; showHiddenView('zenSetup'); }
    function updateZenCircle(progress) { if (!zen.progressRing) return; const circumference = parseFloat(zen.progressRing.style.strokeDasharray); const offset = circumference - progress * circumference; zen.progressRing.style.strokeDashoffset = Math.max(0, offset); }
    function updateBorderProgress(progress) { const p = progress * 4; zen.borderTop.style.width = `${Math.min(p, 1) * 100}%`; zen.borderRight.style.height = `${Math.min(Math.max(p - 1, 0), 1) * 100}%`; zen.borderBottom.style.width = `${Math.min(Math.max(p - 2, 0), 1) * 100}%`; zen.borderLeft.style.height = `${Math.min(Math.max(p - 3, 0), 1) * 100}%`; }
    function formatTime(seconds) { const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
    function startTimer() { let duration, statusText; const settings = state.zenSettings; switch(zenState.currentCycle) { case 'shortBreak': duration = settings.shortBreak * 60; statusText = 'DESCANSO CORTO'; break; case 'longBreak': duration = settings.longBreak * 60; statusText = 'DESCANSO LARGO'; break; default: duration = settings.pomodoro * 60; statusText = 'ENFOQUE'; } zen.statusText.textContent = statusText; let timeLeft = duration; zen.timerDisplay.textContent = formatTime(timeLeft); updateZenCircle(0); updateBorderProgress(0); zenState.timerId = setInterval(async () => { if (zenState.isPaused || !zenState.isActive) return; timeLeft--; zen.timerDisplay.textContent = formatTime(timeLeft); const progress = (duration - timeLeft) / duration; updateZenCircle(progress); updateBorderProgress(progress); if (timeLeft <= 0) { clearInterval(zenState.timerId); zenState.cycleCount++; if (zenState.currentCycle === 'pomodoro') { state.gamification.pomodoroCount++; await updateStreak(); await dataService.saveData(state); if (state.currentZenTaskId) showZenLogConfirmation(); zenState.currentCycle = (zenState.cycleCount % 4 === 0) ? 'longBreak' : 'shortBreak'; } else { zenState.currentCycle = 'pomodoro'; } if (zenState.isActive) startTimer(); } }, 1000); }
    function startStopwatch() { zenState.startTime = Date.now() - zenState.elapsed; zenState.timerId = setInterval(() => { if (zenState.isPaused || !zenState.isActive) return; zenState.elapsed = Date.now() - zenState.startTime; zen.timerDisplay.textContent = formatTime(zenState.elapsed / 1000); const secondsInMinute = (zenState.elapsed / 1000) % 60; const progress = secondsInMinute / 60; updateZenCircle(progress); updateBorderProgress(progress); }, 1000); }
    function handleZenControlClick() { zenState.isPaused = !zenState.isPaused; if (zenState.mode === 'stopwatch') { if (zenState.isPaused) { clearInterval(zenState.timerId); buttons.zenControlMain.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; } else { startStopwatch(); buttons.zenControlMain.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; } } }
    function prepareZenUI() { views.zen.classList.add('active'); enterFullscreen(document.documentElement); const radius = 154; const svgSize = 320; zen.progressRing.r.baseVal.value = radius; zen.progressBg.r.baseVal.value = radius; zen.progressRing.setAttribute('cx', svgSize / 2); zen.progressRing.setAttribute('cy', svgSize / 2); zen.progressBg.setAttribute('cx', svgSize / 2); zen.progressBg.setAttribute('cy', svgSize / 2); const circumference = 2 * Math.PI * radius; zen.progressRing.style.strokeDasharray = `${circumference}`; zen.progressRing.style.stroke = state.settings.color; updateZenCircle(0); updateBorderProgress(0); startMinimalistAnimation(); }
    function startZenMode() { hideHiddenView('zenSetup'); prepareZenUI(); if (zenState.mode === 'timer') { zenState.currentCycle = 'pomodoro'; buttons.zenControlMain.style.display = 'none'; startTimer(); } else { zen.statusText.textContent = 'CRONÓMETRO'; zen.timerDisplay.textContent = '00:00'; buttons.zenControlMain.style.display = 'flex'; buttons.zenControlMain.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; startStopwatch(); } }
    function stopZenMode() { if (zenState.timerId) clearInterval(zenState.timerId); if (zenState.particleAnimationId) { zenState.isActive = false; cancelAnimationFrame(zenState.particleAnimationId); } views.zen.classList.remove('active'); exitFullscreen(); zenState = { timerId: null, particleAnimationId: null, mode: 'timer', currentCycle: 'pomodoro', cycleCount: 0, isActive: false, isPaused: false, startTime: 0, elapsed: 0, }; state.currentZenTaskId = null; updateZenCircle(0); updateBorderProgress(0); }
    function showZenLogConfirmation() { const task = state.tasks.find(t => t.id === state.currentZenTaskId); if (!task) return; zen.confirmLogContent.innerHTML = `<h2 class="font-heading text-2xl mb-4">Sesión Completada</h2><p class="mb-6 text-secondary">¿Registrar ${state.zenSettings.pomodoro} min en la tarea "${task.title}"?</p><div class="flex gap-4"><button id="confirm-log-yes" class="flex-1 btn btn-primary">Sí</button><button id="confirm-log-no" class="flex-1 btn">No</button></div>`; zen.confirmLogModal.classList.add('active'); getEl('confirm-log-yes').onclick = async () => { if (!task.zenSessions) task.zenSessions = []; task.zenSessions.push({ date: new Date().toISOString(), duration: state.zenSettings.pomodoro }); await dataService.saveData(state); zen.confirmLogModal.classList.remove('active'); state.currentZenTaskId = null; }; getEl('confirm-log-no').onclick = () => { zen.confirmLogModal.classList.remove('active'); state.currentZenTaskId = null; }; }
    function startMinimalistAnimation() { const ctx = zen.canvas.getContext('2d'); let lines = []; zen.canvas.width = window.innerWidth; zen.canvas.height = window.innerHeight; zenState.isActive = true; class Line { constructor() { this.x = Math.random() * zen.canvas.width; this.y = Math.random() * zen.canvas.height; this.len = Math.random() * 20 + 10; this.speed = Math.random() * 0.5 + 0.1; this.angle = Math.random() * Math.PI * 2; this.life = Math.random() * 200 + 100; this.originalLife = this.life; } update() { this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; this.life--; if (this.x < 0 || this.x > zen.canvas.width || this.y < 0 || this.y > zen.canvas.height) { this.life = 0; } } draw() { ctx.strokeStyle = state.settings.color; ctx.lineWidth = 2; ctx.globalAlpha = this.life / this.originalLife; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.angle) * this.len, this.y + Math.sin(this.angle) * this.len); ctx.stroke(); ctx.globalAlpha = 1; } } function animate() { if(!zenState.isActive) { cancelAnimationFrame(zenState.particleAnimationId); return; }; ctx.clearRect(0, 0, zen.canvas.width, zen.canvas.height); if (lines.length < 100) { lines.push(new Line()); } for (let i = lines.length - 1; i >= 0; i--) { lines[i].update(); lines[i].draw(); if (lines[i].life <= 0) { lines.splice(i, 1); } } zenState.particleAnimationId = requestAnimationFrame(animate); } animate(); }

    // --- LÓGICA PARA ELIMINAR TAREA ---
    async function deleteTaskHandler() {
        if (!state.selectedTaskId) return;

        const taskToDelete = state.tasks.find(t => t.id === state.selectedTaskId);
        if (!taskToDelete) return;

        if (confirm(`¿Estás seguro de que quieres eliminar la tarea "${taskToDelete.title}"? Esta acción no se puede deshacer.`)) {
            state.tasks = state.tasks.filter(t => t.id !== state.selectedTaskId);
            state.selectedTaskId = null;
            await dataService.saveData(state);

            hideHiddenView('details');
            // Actualizar la vista actual para reflejar la eliminación
            const activeView = document.querySelector('.view.active').id;
            switchView(activeView);
        }
    }


    // --- EVENT HANDLERS ---
    buttons.fabAddTask.addEventListener('click', () => openMultiStepForm());
    buttons.backToDashboard.addEventListener('click', () => hideHiddenView('details'));
    buttons.editTask.addEventListener('click', () => { if (state.selectedTaskId) { const task = state.tasks.find(t => t.id === state.selectedTaskId); hideHiddenView('details'); openMultiStepForm(task); } });
    buttons.deleteTask.addEventListener('click', deleteTaskHandler); // Event listener para el nuevo botón
    buttons.startZenSession.addEventListener('click', () => { state.currentZenTaskId = state.selectedTaskId; openZenSetup(); });
    buttons.dashboardZen.addEventListener('click', () => { state.currentZenTaskId = null; openZenSetup(); });
    buttons.exitZen.addEventListener('click', stopZenMode);
    buttons.zenControlMain.addEventListener('click', handleZenControlClick);
    buttons.deleteCompleted.addEventListener('click', async () => { if (confirm('¿Estás seguro de que quieres eliminar todas las tareas completadas? Esta acción no se puede deshacer.')) { state.tasks = state.tasks.filter(task => !task.completed); await dataService.saveData(state); renderTasksView(); } });
    if(buttons.formCancel) buttons.formCancel.addEventListener('click', () => hideHiddenView('multiStepForm'));
    buttons.formNext.addEventListener('click', () => { const currentStep = formState.currentStep; if (currentStep === 1 && !formElements.taskTitle.value.trim()) { alert('El título es obligatorio.'); return; } if (currentStep === 1) formState.taskData.title = formElements.taskTitle.value.trim(); if (currentStep === 2) formState.taskData.description = formElements.taskDescription.value.trim(); if (currentStep === 3) { formState.taskData.dueDate = formElements.taskDueDate.value; formState.taskData.priority = formElements.taskPriority.value; formState.taskData.tags = formElements.taskTags.value.split(',').map(t => t.trim()).filter(Boolean); } if (currentStep < 4) { showFormStep(currentStep + 1); } else { saveTask(); } });
    buttons.formBack.addEventListener('click', () => { if (formState.currentStep > 1) { showFormStep(formState.currentStep - 1); } });
    buttons.formSkip.addEventListener('click', () => { if (formState.currentStep < 4) { showFormStep(formState.currentStep + 1); } });
    buttons.zenModeTimer.addEventListener('click', () => { zenState.mode = 'timer'; buttons.zenModeTimer.classList.add('active'); buttons.zenModeStopwatch.classList.remove('active'); formElements.zenTimerForm.style.display = 'block'; formElements.zenStopwatchContent.style.display = 'none'; });
    buttons.zenModeStopwatch.addEventListener('click', () => { zenState.mode = 'stopwatch'; buttons.zenModeTimer.classList.remove('active'); buttons.zenModeStopwatch.classList.add('active'); formElements.zenTimerForm.style.display = 'none'; formElements.zenStopwatchContent.style.display = 'block'; });
    buttons.startZen.addEventListener('click', () => { if (zenState.mode === 'timer') { state.zenSettings.pomodoro = parseInt(zen.pomodoroDurationInput.value) || 25; state.zenSettings.shortBreak = parseInt(zen.shortBreakDurationInput.value) || 5; state.zenSettings.longBreak = parseInt(zen.longBreakDurationInput.value) || 15; dataService.saveData(state); } startZenMode(); });
    buttons.cancelZenSetup.addEventListener('click', () => hideHiddenView('zenSetup'));
    if(buttons.addSubject) buttons.addSubject.addEventListener('click', openNewSubjectForm);
    if(buttons.cancelSubjectForm) buttons.cancelSubjectForm.addEventListener('click', () => showSubjectForm(false));
    if(formElements.subjectForm) formElements.subjectForm.addEventListener('submit', async (e) => { e.preventDefault(); const name = formElements.subjectName.value.trim(); if (!name) return; const subjectData = { name, day: parseInt(formElements.subjectDay.value), startTime: formElements.subjectStartTime.value, endTime: formElements.subjectEndTime.value }; if (state.selectedSubjectId) { const index = state.schedule.findIndex(s => s.id === state.selectedSubjectId); if (index > -1) { const originalSubject = state.schedule[index]; state.schedule[index] = { ...originalSubject, ...subjectData }; } } else { state.schedule.push({ ...subjectData, id: `sub-${Date.now()}`, grades: [] }); } await dataService.saveData(state); showSubjectForm(false); renderSchedule(); });
    if(buttons.calendarPrevMonth) buttons.calendarPrevMonth.addEventListener('click', () => { const d = new Date(state.calendarDate); d.setMonth(d.getMonth() - 1); state.calendarDate = d.toISOString(); renderCalendar(); });
    if(buttons.calendarNextMonth) buttons.calendarNextMonth.addEventListener('click', () => { const d = new Date(state.calendarDate); d.setMonth(d.getMonth() + 1); state.calendarDate = d.toISOString(); renderCalendar(); });
    if(buttons.resetApp) buttons.resetApp.addEventListener('click', resetApp);
    if(modal.subtask.addBtnForm) modal.subtask.addBtnForm.addEventListener('click', openSubtaskModal); 
    if(modal.subtask.confirmBtn) modal.subtask.confirmBtn.addEventListener('click', handleAddSubtask); 
    if(modal.subtask.cancelBtn) modal.subtask.cancelBtn.addEventListener('click', closeSubtaskModal);
    if(modal.subtask.input) modal.subtask.input.addEventListener('keydown', e => { if (e.key === 'Enter') handleAddSubtask(); });
    if(buttons.saveWallpaperUrl) buttons.saveWallpaperUrl.addEventListener('click', handleWallpaperUrl);
    if(inputs.wallpaperFile) inputs.wallpaperFile.addEventListener('change', handleWallpaperFile);
    if(buttons.resetWallpaper) buttons.resetWallpaper.addEventListener('click', resetWallpaper);
    if(inputs.colorPicker) inputs.colorPicker.addEventListener('input', async (e) => { state.settings.color = e.target.value; applyAppearance(); await dataService.saveData(state); });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    if(buttons.backToSchedule) buttons.backToSchedule.addEventListener('click', () => hideHiddenView('grades'));
    if(buttons.editSubjectGrades) buttons.editSubjectGrades.addEventListener('click', openEditSubjectForm);
    if(buttons.addGrade) buttons.addGrade.addEventListener('click', () => modal.grade.element.classList.add('active'));
    if(buttons.cancelAddGrade) buttons.cancelAddGrade.addEventListener('click', () => modal.grade.element.classList.remove('active'));
    if(formElements.addGradeForm) formElements.addGradeForm.addEventListener('submit', async (e) => { e.preventDefault(); const subject = state.schedule.find(s => s.id === state.selectedSubjectId); if (subject) { if (!subject.grades) subject.grades = []; subject.grades.push({ name: formElements.gradeNameInput.value, value: parseFloat(formElements.gradeValueInput.value) }); await dataService.saveData(state); renderGrades(); modal.grade.element.classList.remove('active'); formElements.addGradeForm.reset(); } });

    // --- INICIALIZACIÓN ---
    async function initApp() {
        if (!state.userName) {
            state.userName = "Usuario";
        }
        applyAppearance();
        stopZenMode();
        setupNavigation();
        switchView('dashboard-view');
        await checkAchievements();
    }

    initApp();
});
