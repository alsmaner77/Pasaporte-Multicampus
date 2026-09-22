// Manejo de pestañas de navegación
window.openTab=function(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }

    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) {
        tabBtns[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Variables globales necesarias para el funcionamiento
// 1. VARIABLES GLOBALES (Deben ir arriba del todo para que todas las funciones las lean)
let progress = 0;
let completedChallenges = 0;
const mockCities = ["Campus Monterrey", "Campus Guadalajara", "Campus Puebla", "Campus Querétaro"];

// 2. NAVEGACIÓN ENTRE PESTAÑAS (Expuesta globalmente)
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

// 3. LÓGICA DE LOS RETOS Y GUARDADO EN FIRESTORE
window.completeChallenge = async function(challengeId, badgeName, progressIncrease) {
    if (!auth.currentUser) {
        alert("Debes iniciar sesión para registrar el reto.");
        return;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "usuarios", userId);

    try {
        // Actualizar base de datos
        await updateDoc(userRef, {
            [`retos_completados.${challengeId}`]: true,
            progreso_porcentaje: progress + progressIncrease
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

        // Actualizar Barra de Progreso
        progress += progressIncrease;
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

        if (completedChallenges === 5) {
            setTimeout(() => {
                alert("¡Felicidades! Has completado las experiencias principales y desbloqueado la insignia de Explorador Nacional.");
                const badgeNacional = document.getElementById("badge-Explorador Nacional");
                if (badgeNacional) {
                    badgeNacional.classList.remove("locked");
                    badgeNacional.classList.add("unlocked");
                }
            }, 500);
        }

    } catch (error) {
        console.error("Error al guardar el reto:", error);
        alert("Hubo un error al guardar tu progreso en la base de datos.");
    }
};
