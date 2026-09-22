import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvZnYnTt3bPomKyTCkmO5ofaMuqmYKloM",
    authDomain: "pasaporte-multicampus.firebaseapp.com",
    projectId: "pasaporte-multicampus",
    storageBucket: "pasaporte-multicampus.firebasestorage.app",
    messagingSenderId: "983073027756",
    appId: "1:983073027756:web:1188de6539a3f74c449109",
    measurementId: "G-PWW6HDP11B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de estado globales
let progress = 0;
let completedChallenges = 0;
const mockCities = ["Campus Monterrey", "Campus Guadalajara", "Campus Puebla", "Campus Querétaro"];

// Referencias de la interfaz
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const campusSelect = document.getElementById('campus-select');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const errorMsg = document.getElementById('auth-error');
const btnLogout = document.getElementById('btn-logout');
const uploadPic = document.getElementById('upload-pic');
const profilePic = document.getElementById('profile-pic');
const profileEmail = document.getElementById('profile-email');
const profileCampus = document.getElementById('profile-campus');

// 1. Navegación entre pestañas
window.openTab = function(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
        tabContents[i].style.display = "none";
    }
    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
    }
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add("active");
        targetTab.style.display = "block";
    }
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    }
};

// 2. Autenticación (Registro)
btnRegister.addEventListener('click', async () => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;
        await setDoc(doc(db, "usuarios", user.uid), {
            correo: emailInput.value,
            campus: campusSelect.value,
            fecha_registro: new Date().toISOString(),
            progreso_porcentaje: 0,
            retos_completados: {}
        });
    } catch (error) {
        errorMsg.textContent = "Error de Firebase: " + error.code;
        errorMsg.style.display = "block";
    }
});

// 3. Autenticación (Iniciar Sesión)
btnLogin.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        errorMsg.textContent = "Error al iniciar sesión: " + error.code;
        errorMsg.style.display = "block";
    }
});

// 4. Cerrar Sesión
btnLogout.addEventListener('click', async () => {
    await signOut(auth);
    emailInput.value = '';
    passwordInput.value = '';
});

// 5. Observador de Estado (Carga de datos del usuario)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        appContent.style.display = 'block'; 

        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const datosUsuario = docSnap.data();
            
            // Inyectar datos en perfil sin errores
            if (profileEmail) profileEmail.textContent = datosUsuario.correo || user.email;
            if (profileCampus) profileCampus.textContent = "Campus: " + (datosUsuario.campus || "No definido");
            
            if (datosUsuario.foto_perfil && datosUsuario.foto_perfil.startsWith("data:image")) {
                profilePic.src = datosUsuario.foto_perfil;
            } else {
                profilePic.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='100%' height='100%' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-family='sans-serif' font-size='14'>Sin Foto</text></svg>";
            }

            if (datosUsuario.progreso_porcentaje) {
                progress = datosUsuario.progreso_porcentaje;
                const progressBar = document.getElementById("progress-fill");
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                    progressBar.innerText = `${progress}%`;
                }
            }

            if (datosUsuario.retos_completados) {
                const connectionsList = document.getElementById("connections-list");
                const emptyState = document.querySelector(".empty-state");
                
                // Si hay retos completados, quitamos el mensaje de "Aún no hay conexiones"
                if (emptyState && Object.keys(datosUsuario.retos_completados).length > 0) {
                    emptyState.remove();
                }

                // Diccionario para saber qué insignia le toca a cada reto
                const insigniasMapa = {
                    1: "México conectado",
                    2: "Conexión real",
                    3: "Explorador gastronómico",
                    4: "Equipo Sin Fronteras",
                    5: "Sin fronteras"
                };

                // Reiniciamos el contador global por si se recarga la página
                completedChallenges = 0; 

                for (const [retoId, completado] of Object.entries(datosUsuario.retos_completados)) {
                    if (completado) {
                        // 1. Bloquear el botón y ponerlo verde
                        const btn = document.querySelector(`#reto-${retoId} button`);
                        if (btn) {
                            btn.innerText = "Reto Completado ✅";
                            btn.disabled = true;
                            btn.style.backgroundColor = "#28a745";
                            btn.style.color = "white";
                        }

                        // 2. Desbloquear la insignia correspondiente
                        const badgeName = insigniasMapa[retoId];
                        if (badgeName) {
                            const badge = document.getElementById(`badge-${badgeName}`);
                            if (badge) {
                                badge.classList.remove("locked");
                                badge.classList.add("unlocked");
                            }
                        }

                        // 3. Restaurar la conexión en el mapa
                        const newConnection = document.createElement("li");
                        const randomCampus = mockCities[(retoId - 1) % mockCities.length];
                        newConnection.innerText = `Conexión registrada con estudiante de ${randomCampus} (Reto ${retoId})`;
                        if (connectionsList) {
                            connectionsList.appendChild(newConnection);
                        }

                        completedChallenges++;
                    }
                }

                // 4. Restaurar la insignia final si ya tiene los 5 retos
                if (completedChallenges >= 5) {
                    const badgeNacional = document.getElementById("badge-Explorador Nacional");
                    if (badgeNacional) {
                        badgeNacional.classList.remove("locked");
                        badgeNacional.classList.add("unlocked");
                    }
                }
            }
        }
    } else {
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

// 6. Cambiar foto de perfil
uploadPic.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file && auth.currentUser) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            profilePic.src = base64String;
            const userRef = doc(db, "usuarios", auth.currentUser.uid);
            await updateDoc(userRef, { foto_perfil: base64String });
        };
        reader.readAsDataURL(file);
    }
});

// 7. Lógica de Retos y Guardado
window.completeChallenge = async function(challengeId, badgeName, progressIncrease) {
    if (!auth.currentUser) {
        alert("Debes iniciar sesión para registrar el reto.");
        return;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "usuarios", userId);

    try {
        let nuevoProgreso = progress + progressIncrease;
        if (nuevoProgreso > 100) nuevoProgreso = 100;

        await updateDoc(userRef, {
            [`retos_completados.${challengeId}`]: true,
            progreso_porcentaje: nuevoProgreso
        });

        const btn = document.querySelector(`#reto-${challengeId} button`);
        if (btn) {
            btn.innerText = "Reto Completado ✅";
            btn.disabled = true;
            btn.style.backgroundColor = "#28a745";
            btn.style.color = "white";
        }

        const badge = document.getElementById(`badge-${badgeName}`);
        if (badge) {
            badge.classList.remove("locked");
            badge.classList.add("unlocked");
        }

        progress = nuevoProgreso;
        const progressBar = document.getElementById("progress-fill");
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.innerText = `${progress}%`;
        }

        const connectionsList = document.getElementById("connections-list");
        const emptyState = document.querySelector(".empty-state");
        if (emptyState) {
            emptyState.remove();
        }

        const newConnection = document.createElement("li");
        const randomCampus = mockCities[completedChallenges % mockCities.length];
        newConnection.innerText = `Conexión registrada con estudiante de ${randomCampus} (Reto ${challengeId})`;
        if (connectionsList) {
            connectionsList.appendChild(newConnection);
        }

        completedChallenges++;
        alert("¡Reto completado y guardado con éxito!");

    } catch (error) {
        console.error("Error al guardar el reto:", error);
        alert("Hubo un error al guardar tu progreso.");
    }
};
