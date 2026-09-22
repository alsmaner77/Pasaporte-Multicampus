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

let progress = 0;
let completedChallenges = 0;

// Ciudades simuladas para el ejemplo de conexiones
const mockCities = ["Campus Monterrey", "Campus Guadalajara", "Campus Puebla", "Campus Querétaro", "Campus Reynosa"];

// Lógica para completar un reto
window.completeChallenge=function(challengeId, badgeName, progressIncrease) {
    // 1. Actualizar botón del reto
    const btn = document.querySelector(`#reto-${challengeId} button`);
    btn.innerText = "Reto Completado ✅";
    btn.disabled = true;

    // 2. Desbloquear Insignia correspondiente
    const badge = document.getElementById(`badge-${badgeName}`);
    if (badge) {
        badge.classList.remove("locked");
        badge.classList.add("unlocked");
    }

    // 3. Actualizar Barra de Progreso
    progress += progressIncrease;
    const progressBar = document.getElementById("progress-fill");
    progressBar.style.width = `${progress}%`;
    progressBar.innerText = `${progress}%`;

    // 4. Registrar conexión en el Mapa
    const connectionsList = document.getElementById("connections-list");
    const emptyState = document.querySelector(".empty-state");
    if (emptyState) {
        emptyState.remove(); // Quitar mensaje de estado vacío
    }

    const newConnection = document.createElement("li");
    // Simular que conoció a alguien de un campus aleatorio de la lista
    const randomCampus = mockCities[completedChallenges % mockCities.length];
    newConnection.innerText = `Conexión registrada con estudiante de ${randomCampus} (Reto ${challengeId})`;
    connectionsList.appendChild(newConnection);

    completedChallenges++;

    // Desbloquear insignia final si se completaron todos (simplificado a 5 para el demo)
    if (completedChallenges === 5) {
        setTimeout(() => {
            alert("¡Felicidades! Has completado las experiencias principales y desbloqueado la insignia de Explorador Nacional.");
            document.getElementById("badge-Explorador Nacional").classList.remove("locked");
            document.getElementById("badge-Explorador Nacional").classList.add("unlocked");
        }, 500);
    }
}
