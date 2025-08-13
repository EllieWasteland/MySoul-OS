import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Realiza una copia de seguridad de los datos de todas las aplicaciones del usuario en Firestore.
 * Recopila datos de 'mytime', 'mymood', 'mymemory' y 'myroute' desde el localStorage,
 * los agrupa en un solo objeto y los sube a la nube.
 */
export async function backupData() {
    const user = auth.currentUser;
    if (user) {
        try {
            const userId = user.uid;
            // Recopilar datos de todas las aplicaciones desde localStorage
            const mytimeData = localStorage.getItem('records');
            const mymoodData = localStorage.getItem('moods');
            const mymemoryData = localStorage.getItem('entries');
            const myrouteData = localStorage.getItem('routes');

            // Crear un objeto de copia de seguridad con todos los datos
            const backup = {
                mytime: mytimeData ? JSON.parse(mytimeData) : null,
                mymood: mymoodData ? JSON.parse(mymoodData) : null,
                mymemory: mymemoryData ? JSON.parse(mymemoryData) : null,
                myroute: myrouteData ? JSON.parse(myrouteData) : null,
                lastBackup: new Date().toISOString()
            };

            // Guardar el objeto de copia de seguridad en Firestore
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
 * Restaura los datos del usuario desde Firestore al localStorage.
 * Advierte al usuario que los datos locales actuales se sobrescribirán.
 * Utiliza un mapa de claves para garantizar que los datos se restauren con las claves correctas.
 */
export async function restoreData() {
    const user = auth.currentUser;
    if (user) {
        if (confirm('¿Estás seguro de que quieres restaurar los datos? Esto sobrescribirá los datos locales actuales.')) {
            try {
                const userId = user.uid;
                const backupRef = doc(db, "users", userId, "backup", "alldata");
                const backup = await getDoc(backupRef);

                if (backup.exists()) {
                    const data = backup.data();
                    
                    // --- INICIO DE LA CORRECCIÓN ---
                    // Este mapa traduce las claves usadas en la copia de seguridad (ej. 'mymood')
                    // a las claves que cada aplicación espera en el localStorage (ej. 'moods').
                    const keyMap = {
                        mytime: 'records',
                        mymood: 'moods',
                        mymemory: 'entries',
                        myroute: 'routes'
                    };

                    // Itera sobre las claves del objeto de copia de seguridad (mytime, mymood, etc.).
                    for (const backupKey in data) {
                        if (data.hasOwnProperty(backupKey)) {
                            // Busca la clave de localStorage correcta usando el mapa.
                            const localStorageKey = keyMap[backupKey];
                            // Si se encuentra una clave correspondiente y los datos no son nulos, se guardan.
                            if (localStorageKey && data[backupKey] !== null) {
                                localStorage.setItem(localStorageKey, JSON.stringify(data[backupKey]));
                            }
                        }
                    }
                    // --- FIN DE LA CORRECCIÓN ---

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
