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
let progress = 0;
let completedChallenges = 0;
const mockCities = ["Campus Monterrey", "Campus Guadalajara", "Campus Puebla", "Campus Querétaro"];

// Manejo de pestañas de navegación
window.openTab = function(evt, tabName) {
    // ... tu código de pestañas ...
};

// Lógica para completar un reto (¡Aquí pegas tu función!)
window.completeChallenge = function(challengeId, badgeName, progressIncrease) {
    // 1. Actualizar botón del reto
    const btn = document.querySelector(`#reto-${challengeId} button`);
    if (btn) {
        btn.innerText = "Reto Completado ✅";
        btn.disabled = true;
    }

    // 2. Desbloquear Insignia correspondiente
    const badge = document.getElementById(`badge-${badgeName}`);
    if (badge) {
        badge.classList.remove("locked");
        badge.classList.add("unlocked");
    }

    // 3. Actualizar Barra de Progreso
    progress += progressIncrease;
    const progressBar = document.getElementById("progress-fill");
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.innerText = `${progress}%`;
    }

    // 4. Registrar conexión en el Mapa
    const connectionsList = document.getElementById("connections-list");
    const emptyState = document.querySelector(".empty-state");
    if (emptyState) {
        emptyState.remove(); // Quitar mensaje de estado vacío
    }

    const newConnection = document.createElement("li");
    const randomCampus = mockCities[completedChallenges % mockCities.length];
    newConnection.innerText = `Conexión registrada con estudiante de ${randomCampus} (Reto ${challengeId})`;
    if (connectionsList) {
        connectionsList.appendChild(newConnection);
    }

    completedChallenges++;

    // Desbloquear insignia final si se completaron todos (5 retos)
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
};
