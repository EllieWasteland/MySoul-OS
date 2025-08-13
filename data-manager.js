import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from './firebase-config.js';

// Inicialización de Firebase
const db = getFirestore(app);
const auth = getAuth(app);

// --- LÓGICA DE ALMACENAMIENTO LOCAL UNIFICADO ---

const UNIFIED_STORAGE_KEY = 'mySoul-data-v1';

// Define la estructura por defecto para todos los datos de la aplicación.
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
                mapStyle: 'dark'
            }
        },
        myMood: { // Sección para MyMood
            entries: []
        },
        globalSettings: { onboardingComplete: false }
    };
}

// Obtiene el objeto de datos completo desde localStorage.
export function getUnifiedData() {
    const data = localStorage.getItem(UNIFIED_STORAGE_KEY);
    if (data) {
        try {
            const parsedData = JSON.parse(data);
            const defaultState = getDefaultUnifiedState();
            // Fusiona los datos guardados con el estado por defecto para asegurar que todas las claves existan
            return {
                ...defaultState,
                ...parsedData,
                myTime: { ...defaultState.myTime, ...(parsedData.myTime || {}) },
                myMemory: { ...defaultState.myMemory, ...(parsedData.myMemory || {}) },
                myRoute: { ...defaultState.myRoute, ...(parsedData.myRoute || {}) },
                myMood: { ...defaultState.myMood, ...(parsedData.myMood || {}) }, // Asegura que myMood se fusione correctamente
                globalSettings: { ...defaultState.globalSettings, ...(parsedData.globalSettings || {}) },
            };
        } catch (error) {
            console.error("Error al parsear datos unificados, se retorna al estado por defecto:", error);
            return getDefaultUnifiedState();
        }
    }
    return getDefaultUnifiedState();
}

// Guarda el objeto de datos completo en localStorage.
export function saveUnifiedData(data) {
    try {
        localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Error al guardar los datos unificados:", error);
    }
}


// --- LÓGICA DE COPIA DE SEGURIDAD Y RESTAURACIÓN (FIREBASE) ---

/**
 * Realiza una copia de seguridad del objeto de datos unificado en Firestore.
 */
export async function backupData() {
    const user = auth.currentUser;
    if (user) {
        try {
            const userId = user.uid;
            // Obtiene todos los datos actuales de la aplicación
            const unifiedData = getUnifiedData();
            
            // Crea el objeto de copia de seguridad
            const backup = {
                ...unifiedData,
                lastBackup: new Date().toISOString()
            };

            // Guarda el objeto completo en Firestore
            await setDoc(doc(db, "users", userId, "backup", "alldata"), backup);
            alert('Copia de seguridad realizada con éxito.');
        } catch (error) {
            console.error("Error al hacer la copia de seguridad:", error);
            alert('Error al hacer la copia de seguridad.');
        }
    } else {
        alert('Debes iniciar sesión para hacer una copia de seguridad.');
    }
}

/**
 * Restaura la copia de seguridad completa desde Firestore y la guarda en el almacenamiento local.
 */
export async function restoreData() {
    const user = auth.currentUser;
    if (user) {
        if (confirm('¿Estás seguro de que quieres restaurar los datos? Esto sobrescribirá los datos locales actuales.')) {
            try {
                const userId = user.uid;
                const backupRef = doc(db, "users", userId, "backup", "alldata");
                const backupDoc = await getDoc(backupRef);

                if (backupDoc.exists()) {
                    const backupData = backupDoc.data();
                    
                    // Guarda el objeto de datos restaurado en el almacenamiento local
                    saveUnifiedData(backupData);

                    alert('Datos restaurados con éxito. La página se recargará.');
                    window.location.reload();
                } else {
                    alert('No se encontró ninguna copia de seguridad.');
                }
            } catch (error) {
                console.error("Error al restaurar los datos:", error);
                alert('Error al restaurar los datos.');
            }
        }
    } else {
        alert('Debes iniciar sesión para restaurar los datos.');
    }
}
