import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Este código es universal. Buscará las variables VITE_*
// donde sea que se esté ejecutando (en .env.local localmente,
// o en las variables de entorno del servidor en producción).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

// Verificación para asegurar que las variables se cargaron
if (!firebaseConfig.apiKey) {
  throw new Error("No se encontraron las credenciales de Firebase. Asegúrate de que tu archivo .env.local (local) o las variables de entorno (producción) estén configuradas.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);