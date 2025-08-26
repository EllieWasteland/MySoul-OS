// Importamos las funciones del data-manager centralizado
import { getUnifiedData, saveUnifiedData } from '../data-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS AND CONFIGURATION ---
    const MOODS = [
        { id: 'happy',      label: 'Feliz',      icon: '😄', value: 5, color: '#ffc700' },
        { id: 'calm',       label: 'Calmado',    icon: '😌', value: 4, color: '#5de2ff' },
        { id: 'productive', label: 'Productivo', icon: '🚀', value: 4, color: '#32cd32' },
        { id: 'inspired',   label: 'Inspirado',  icon: '💡', value: 4, color: '#ff69b4' },
        { id: 'sad',        label: 'Triste',     icon: '😢', value: 2, color: '#4682b4' },
        { id: 'anxious',    label: 'Ansioso',    icon: '😟', value: 2, color: '#8a2be2' },
        { id: 'angry',      label: 'Enojado',    icon: '😠', value: 1, color: '#ff4500' },
        { id: 'tired',      label: 'Cansado',    icon: '😴', value: 1, color: '#708090' },
    ];
    const QUOTES = [
        "El autoconocimiento es el primer paso hacia el cambio.",
        "Tus sentimientos son válidos. Escúchalos.",
        "Cada día es una nueva oportunidad para sentirte mejor.",
        "La felicidad no es algo ya hecho. Viene de tus propias acciones.",
        "Permítete sentir. Permítete sanar. Permítete crecer."
    ];

    // --- DOM SELECTORS ---
    const getEl = id => document.getElementById(id);
    const appBackground = getEl('app-background');
    const loadingScreen = getEl('loading-screen');
    const motivationalQuote = getEl('motivational-quote');
    const dockButtons = document.querySelectorAll('.dock-button[data-view]');
    const moodSelector = getEl('mood-selector');
    const moodDetails = getEl('mood-details');
    const moodNotes = getEl('mood-notes');
    const saveMoodButton = getEl('save-mood-button');
    const moodHistoryList = getEl('mood-history-list');
    const calendarGrid = getEl('calendar-grid');
    const monthYearLabel = getEl('month-year-label');
    const prevMonthBtn = getEl('prev-month-btn');
    const nextMonthBtn = getEl('next-month-btn');
    const detailsModal = getEl('details-modal');
    const closeModalBtn = getEl('close-modal-btn');
    const modalBody = getEl('modal-body');
    const chartCanvas = getEl('mood-chart');
    const frequentMoodContainer = getEl('frequent-mood-container');
    const recentEntriesList = getEl('recent-entries-list');

    // --- APPLICATION STATE ---
    let moodEntries = [];
    let selectedMoodId = null;
    let currentView = 'dashboard-view';
    let calendarDate = new Date();
    let moodChart;

    // --- DATA MANAGEMENT FUNCTIONS (INTEGRATED AND CORRECTED) ---
    const loadMoodData = () => {
        const unifiedData = getUnifiedData();
        // CORRECCIÓN: Leemos directamente del array myMood
        moodEntries = unifiedData.myMood || [];
    };

    const saveMoodData = () => {
        const unifiedData = getUnifiedData();
        // CORRECCIÓN: Guardamos el array completo en myMood
        unifiedData.myMood = moodEntries;
        saveUnifiedData(unifiedData);
    };

    // --- UI AND RENDERING FUNCTIONS ---
    const applyWallpaper = () => {
        try {
            const osData = getUnifiedData();
            const wallpaper = osData?.myTime?.wallpaper;
            if (wallpaper) {
                appBackground.style.backgroundImage = `url(${wallpaper})`;
            }
        } catch (error) {
            console.error("Error loading MySoul OS wallpaper:", error);
        }
    };

    const switchView = (targetViewId) => {
        if (targetViewId === currentView) return;

        const currentViewEl = getEl(currentView);
        const targetViewEl = getEl(targetViewId);

        dockButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === targetViewId);
        });
        
        currentViewEl.classList.add('exit-left');
        
        setTimeout(() => {
            currentViewEl.classList.remove('active', 'exit-left');
            targetViewEl.classList.add('active');
            currentView = targetViewId;

            if (targetViewId === 'dashboard-view') renderDashboard();
            if (targetViewId === 'calendar-view') renderCalendar();
            if (targetViewId === 'history-view') renderHistory();
        }, 200);
    };

    const renderMoodSelector = () => {
        moodSelector.innerHTML = '';
        MOODS.forEach(mood => {
            const optionEl = document.createElement('button');
            optionEl.className = 'mood-option';
            optionEl.dataset.moodId = mood.id;
            optionEl.innerHTML = `<span class="mood-icon">${mood.icon}</span><span class="mood-label">${mood.label}</span>`;
            optionEl.addEventListener('click', () => handleMoodSelection(mood.id));
            moodSelector.appendChild(optionEl);
        });
    };

    const renderDashboard = () => {
        renderMoodChart();
        renderFrequentMood();
        renderRecentEntries();
    };

    const renderMoodChart = () => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(day => {
            const entriesOnDay = moodEntries.filter(e => e.timestamp.startsWith(day));
            if (entriesOnDay.length === 0) return null;
            const totalValue = entriesOnDay.reduce((sum, entry) => {
                const mood = MOODS.find(m => m.id === entry.moodId);
                return sum + (mood ? mood.value : 0);
            }, 0);
            return totalValue / entriesOnDay.length;
        });

        const chartLabels = last7Days.map(day => new Date(day).toLocaleDateString('es-ES', { weekday: 'short' }));

        if (moodChart) {
            moodChart.destroy();
        }
        
        moodChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Promedio de Ánimo',
                    data: chartData,
                    borderColor: 'rgba(0, 163, 255, 1)',
                    backgroundColor: 'rgba(0, 163, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    spanGaps: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 5, display: false },
                    x: { grid: { display: false }, ticks: { color: '#888' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    };
    
    const renderFrequentMood = () => {
        if (moodEntries.length === 0) {
            frequentMoodContainer.innerHTML = `<p class="text-gray-500">Sin datos suficientes.</p>`;
            return;
        }
        const moodCounts = moodEntries.reduce((acc, entry) => {
            acc[entry.moodId] = (acc[entry.moodId] || 0) + 1;
            return acc;
        }, {});
        const frequentMoodId = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
        const mood = MOODS.find(m => m.id === frequentMoodId);
        if(mood) {
            frequentMoodContainer.innerHTML = `
                <div class="mood-icon">${mood.icon}</div>
                <div class="mood-details">
                    <p>${mood.label}</p>
                    <span>Ha sido tu ánimo más común.</span>
                </div>
            `;
        }
    };

    const renderRecentEntries = () => {
        recentEntriesList.innerHTML = '';
        const recent = [...moodEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);
        if (recent.length === 0) {
            recentEntriesList.innerHTML = `<p class="text-gray-500">No hay registros recientes.</p>`;
            return;
        }
        recent.forEach(entry => {
            const mood = MOODS.find(m => m.id === entry.moodId);
            if (!mood) return;
            const entryEl = document.createElement('div');
            entryEl.className = 'recent-entry';
            entryEl.innerHTML = `
                <div class="mood-icon">${mood.icon}</div>
                <div class="flex-grow">${mood.label}</div>
                <div class="text-xs text-gray-400">${new Date(entry.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            `;
            recentEntriesList.appendChild(entryEl);
        });
    };


    const renderCalendar = () => {
        const dayNamesContainer = document.createDocumentFragment();
        ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach(day => {
            const dayNameEl = document.createElement('div');
            dayNameEl.className = 'day-name';
            dayNameEl.textContent = day;
            dayNamesContainer.appendChild(dayNameEl);
        });
        calendarGrid.innerHTML = '';
        calendarGrid.appendChild(dayNamesContainer);

        const date = calendarDate;
        monthYearLabel.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.insertAdjacentHTML('beforeend', `<div class="day-cell empty"></div>`);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day-cell';
            const dayDate = new Date(date.getFullYear(), date.getMonth(), i);
            const dayString = dayDate.toISOString().split('T')[0];

            dayEl.innerHTML = `<span class="day-number">${i}</span><div class="mood-dots"></div>`;
            
            if (dayString === new Date().toISOString().split('T')[0]) {
                dayEl.classList.add('today');
            }

            const entriesOnDay = moodEntries.filter(e => e.timestamp.startsWith(dayString));
            if (entriesOnDay.length > 0) {
                const dotsContainer = dayEl.querySelector('.mood-dots');
                const uniqueMoods = [...new Set(entriesOnDay.map(e => e.moodId))];
                uniqueMoods.slice(0, 4).forEach(moodId => {
                    const mood = MOODS.find(m => m.id === moodId);
                    if (mood) {
                        dotsContainer.innerHTML += `<div class="mood-dot" style="background-color: ${mood.color};"></div>`;
                    }
                });
                dayEl.addEventListener('click', () => showModalForDate(dayString));
            }
            calendarGrid.appendChild(dayEl);
        }
    };
    
    const renderHistory = () => {
        moodHistoryList.innerHTML = '';
        if (moodEntries.length === 0) {
            moodHistoryList.innerHTML = `<p class="text-center text-gray-500 py-10">No hay registros.</p>`;
            return;
        }
        const sorted = [...moodEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        sorted.forEach(entry => {
            moodHistoryList.appendChild(createHistoryEntryElement(entry, true));
        });
    };

    const createHistoryEntryElement = (entry, isClickable = false) => {
        const mood = MOODS.find(m => m.id === entry.moodId);
        if (!mood) return document.createElement('div');

        const entryEl = document.createElement('div');
        entryEl.className = 'history-entry';
        entryEl.style.borderLeftColor = mood.color;
        const date = new Date(entry.timestamp);
        entryEl.innerHTML = `
            <div class="history-icon">${mood.icon}</div>
            <div class="history-content">
                <div class="history-mood-label">${mood.label}</div>
                ${entry.notes ? `<p class="history-notes">"${entry.notes}"</p>` : ''}
            </div>
            <div class="history-timestamp">${date.toLocaleDateString('es-ES', { day:'2-digit', month:'short' })}<br>${date.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        if (isClickable) {
            entryEl.addEventListener('click', () => showModalForEntry(entry.id));
        }
        return entryEl;
    };
    
    const showModalForDate = (dateString) => {
        modalBody.innerHTML = '';
        const entries = moodEntries.filter(e => e.timestamp.startsWith(dateString));
        const date = new Date(dateString);
        modalBody.innerHTML += `<h2 class="font-bold text-lg mb-4">${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>`;
        entries.forEach(entry => {
            modalBody.appendChild(createHistoryEntryElement(entry));
        });
        detailsModal.classList.remove('hidden');
    };

    const showModalForEntry = (entryId) => {
        modalBody.innerHTML = '';
        const entry = moodEntries.find(e => e.id === entryId);
        if (entry) {
            modalBody.appendChild(createHistoryEntryElement(entry));
            detailsModal.classList.remove('hidden');
        }
    };

    // --- EVENT HANDLERS ---
    const handleMoodSelection = (moodId) => {
        selectedMoodId = moodId;
        document.querySelectorAll('.mood-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.moodId === moodId);
        });
        moodDetails.classList.remove('hidden');
    };

    const handleSaveMood = () => {
        if (!selectedMoodId) return;
        const newEntry = {
            id: `mood_${Date.now()}`,
            moodId: selectedMoodId,
            notes: moodNotes.value.trim(),
            timestamp: new Date().toISOString(),
        };
        moodEntries.push(newEntry);
        saveMoodData();
        
        selectedMoodId = null;
        moodNotes.value = '';
        document.querySelectorAll('.mood-option.selected').forEach(opt => opt.classList.remove('selected'));
        moodDetails.classList.add('hidden');

        switchView('dashboard-view');
    };

    // --- INITIALIZATION ---
    const init = () => {
        loadMoodData();
        applyWallpaper();
        motivationalQuote.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        renderMoodSelector();
        
        dockButtons.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
        saveMoodButton.addEventListener('click', handleSaveMood);
        
        prevMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar();
        });
        nextMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar();
        });
        closeModalBtn.addEventListener('click', () => detailsModal.classList.add('hidden'));
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) detailsModal.classList.add('hidden');
        });

        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            getEl(currentView).classList.add('active');
            renderDashboard();
        }, 1500);
    };

    init();
});
