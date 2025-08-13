// Este archivo centraliza toda la lógica de almacenamiento local.

const UNIFIED_STORAGE_KEY = 'mySoul-data-v1';

/**
 * Proporciona el estado inicial por defecto para toda la aplicación.
 * @returns {object} El objeto de estado por defecto.
 */
export function getDefaultUnifiedState() {
    return {
        myTime: {
            userName: null,
            tasks: [],
            schedule: [],
            currentView: 'dashboard',
            selectedTaskId: null,
            selectedSubjectId: null,
            tempSubtasks: [],
            calendarDate: new Date().toISOString(),
            wallpaper: null,
            filters: { priority: 'all', tag: 'all' },
            zenSettings: { pomodoro: 25, shortBreak: 5, longBreak: 15, color: '#00F0FF' },
            gamification: { streak: 0, lastCompletionDate: null, achievements: [], pomodoroCount: 0 },
            currentZenTaskId: null
        },
        myMemory: {
            memories: [],
            settings: { theme: 'dark' }
        },
        myRoute: {
            routes: [],
            settings: {
                mapStyle: 'dark' // Clave consistente para el estilo del mapa
            }
        },
        myMood: {
            entries: []
        },
        globalSettings: {
            onboardingComplete: false,
            externalApps: [],
            shortcuts: []
        }
    };
}

/**
 * Realiza una fusión profunda de dos objetos.
 * @param {object} target - El objeto de destino.
 * @param {object} source - El objeto fuente.
 * @returns {object} El objeto fusionado.
 */
function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = deepMerge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

/**
 * Comprueba si un item es un objeto.
 * @param {*} item - El item a comprobar.
 * @returns {boolean}
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Obtiene los datos unificados desde localStorage.
 * Fusiona los datos guardados con el estado por defecto para asegurar que todas las propiedades existan.
 * @returns {object} El estado completo de la aplicación.
 */
export function getUnifiedData() {
    const data = localStorage.getItem(UNIFIED_STORAGE_KEY);
    const defaultState = getDefaultUnifiedState();
    if (data) {
        try {
            const parsedData = JSON.parse(data);
            // La fusión profunda asegura que datos guardados antiguos se actualicen con nuevas propiedades del estado por defecto.
            return deepMerge(defaultState, parsedData);
        } catch (error) {
            console.error("Error al parsear datos unificados, se retorna al estado por defecto:", error);
            return defaultState;
        }
    }
    return defaultState;
}

/**
 * Guarda el objeto de estado unificado en localStorage.
 * @param {object} data - El objeto de estado completo para guardar.
 */
export function saveUnifiedData(data) {
    try {
        localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Error al guardar los datos unificados:", error);
    }
}
