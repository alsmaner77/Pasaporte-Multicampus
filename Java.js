// 1. IMPORTACIONES DE FIREBASE (¡Siempre van estrictamente arriba del todo!)
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 2. VARIABLES GLOBALES
let dbInstance = null;
let authInstance = null;
let progress = 0;
let completedChallenges = 0;
const mockCities = ["Campus Monterrey", "Campus Guadalajara", "Campus Puebla", "Campus Querétaro"];

// 3. NAVEGACIÓN ENTRE PESTAÑAS (Expuesta globalmente)
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

// 4. OBSERVADOR DE AUTENTICACIÓN PRINCIPAL
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authInstance = auth;
        dbInstance = getFirestore();

        loginScreen.style.display = 'none';
        appContent.style.display = 'block'; 

        const docRef = doc(dbInstance, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const datosUsuario = docSnap.data();
            
            // Inyectar datos reales en la pantalla de Perfil
            profileEmail.textContent = datosUsuario.correo || user.email;
            profileCampus.textContent = "Campus: " + (datosUsuario.campus || "No definido");
            
            // Cargar la foto de perfil de manera segura
            if (datosUsuario.foto_perfil && datosUsuario.foto_perfil.startsWith("data:image")) {
                profilePic.src = datosUsuario.foto_perfil;
            } else {
                profilePic.src = "https://via.placeholder.com/150";
            }

            // Restaurar progreso guardado
            if (datosUsuario.progreso_porcentaje) {
                progress = datosUsuario.progreso_porcentaje;
                const progressBar = document.getElementById("progress-fill");
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                    progressBar.innerText = `${progress}%`;
                }
            }

            // Opcional: Si quieres restaurar los retos completados visualmente al recargar la página
            if (datosUsuario.retos_completados) {
                for (const [retoId, completado] of Object.entries(datosUsuario.retos_completados)) {
                    if (completado) {
                        const btn = document.querySelector(`#reto-${retoId} button`);
                        if (btn) {
                            btn.innerText = "Reto Completado ✅";
                            btn.disabled = true;
                            btn.style.backgroundColor = "#28a745";
                            btn.style.color = "white";
                        }
                    }
                }
            }
        }
    } else {
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
    }
});

// 5. LÓGICA DE LOS RETOS Y GUARDADO EN FIRESTORE
window.completeChallenge = async function(challengeId, badgeName, progressIncrease) {
    const currentAuth = getAuth();
    const currentDb = getFirestore();

    if (!currentAuth.currentUser) {
        alert("Debes iniciar sesión para registrar el reto.");
        return;
    }

    const userId = currentAuth.currentUser.uid;
    const userRef = doc(currentDb, "usuarios", userId);

    try {
        // Evitar que el progreso supere el 100%
        let nuevoProgreso = progress + progressIncrease;
        if (nuevoProgreso > 100) nuevoProgreso = 100;

        // Guardar cambios en Firestore
        await updateDoc(userRef, {
            [`retos_completados.${challengeId}`]: true,
            progreso_porcentaje: nuevoProgreso
        });

        // Actualizar botón del reto
        const btn = document.querySelector(`#reto-${challengeId} button`);
        if (btn) {
            btn.innerText = "Reto Completado ✅";
            btn.disabled = true;
            btn.style.backgroundColor = "#28a745";
            btn.style.color = "white";
        }

        // Desbloquear Insignia correspondiente
        const badge = document.getElementById(`badge-${badgeName}`);
        if (badge) {
            badge.classList.remove("locked");
            badge.classList.add("unlocked");
        }

        // Actualizar Barra de Progreso global
        progress = nuevoProgreso;
        const progressBar = document.getElementById("progress-fill");
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.innerText = `${progress}%`;
        }

        // Registrar conexión en el Mapa
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
        console.error("Error al guardar el reto en Firestore:", error);
        alert("Hubo un error al guardar tu progreso. Revisa la consola.");
    }
};
