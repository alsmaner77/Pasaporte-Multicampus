import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, onSnapshot, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Referencias nuevas para imágenes y cámara
const chatImgInput = document.getElementById('chat-img-input');
const chatCameraInput = document.getElementById('chat-camera-input');
const btnAttachImg = document.getElementById('btn-attach-img');
const btnTakePhoto = document.getElementById('btn-take-photo');

// Variable para el modelo de IA
let aiModel = null;

// Cargar la IA en segundo plano al iniciar la página
mobilenet.load().then(model => {
    aiModel = model;
    console.log("IA de reconocimiento de imágenes cargada y lista.");
});

// Variables de estado globales
let progress = 0;
let completedChallenges = 0;
let miCampus = "";
let currentChatId = null;
let unsubscribeChat = null;
const mockCities = ["Campus Monterrey", "Campus Guadalajara", "Campus Puebla", "Campus Querétaro"];

// Referencias de la interfaz
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const campusSelect = document.getElementById('campus-select');
const btnLoginAction = document.getElementById('btn-login-action');
const btnRegisterAction = document.getElementById('btn-register-action');
const carreraSelect = document.getElementById('carrera-select');
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
// --- Lógica para alternar vistas (Login / Registro) ---
const textToggle = document.getElementById('text-toggle');
const linkToggle = document.getElementById('link-toggle');
const authTitle = document.getElementById('auth-title');
const registerFields = document.getElementById('register-fields');

let isLoginView = true;

linkToggle.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginView = !isLoginView;
    errorMsg.style.display = "none"; // Limpiar errores al cambiar de vista
    
    if (isLoginView) {
        authTitle.textContent = "Ingreso al Pasaporte";
        registerFields.style.display = "none";
        btnLoginAction.style.display = "block";
        btnRegisterAction.style.display = "none";
        textToggle.textContent = "¿No tienes cuenta?";
        linkToggle.textContent = "Regístrate aquí";
    } else {
        authTitle.textContent = "Crea tu Pasaporte";
        registerFields.style.display = "block";
        btnLoginAction.style.display = "none";
        btnRegisterAction.style.display = "block";
        textToggle.textContent = "¿Ya tienes cuenta?";
        linkToggle.textContent = "Inicia sesión";
    }
});

// --- Autenticación (Registro) ---
btnRegisterAction.addEventListener('click', async () => {
    if (!campusSelect.value || !carreraSelect.value) {
        errorMsg.textContent = "Por favor, selecciona tu campus y carrera.";
        errorMsg.style.display = "block";
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;
        
        // Guardamos el nuevo usuario con todos sus datos en Firestore
        await setDoc(doc(db, "usuarios", user.uid), {
            correo: emailInput.value,
            campus: campusSelect.value,
            carrera: carreraSelect.value, // Nueva información agregada a la base de datos
            fecha_registro: new Date().toISOString(),
            progreso_porcentaje: 0,
            retos_completados: {}
        });
    } catch (error) {
        errorMsg.textContent = "Error de registro: " + error.message;
        errorMsg.style.display = "block";
    }
});

// --- Autenticación (Iniciar Sesión) ---
btnLoginAction.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        errorMsg.textContent = "Correo o contraseña incorrectos.";
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
        // Activar la bandeja de entrada en tiempo real
        cargarBandejaEntrada();
        // Actualizar las luces del mapa de conexiones
        actualizarMapaConexiones();

        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const datosUsuario = docSnap.data();
            miCampus = datosUsuario.campus;
            
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
                        // --- CLONAR INSIGNIA AL PASAPORTE ---
                        const passportBadgesGrid = document.getElementById("passport-badges-grid");
                        const noBadgesMsg = document.getElementById("no-badges-msg");
                        if (passportBadgesGrid) {
                            if (noBadgesMsg) noBadgesMsg.style.display = 'none';
                            if (!document.getElementById(`clon-${badgeName}`)) {
                                const badgeOriginal = document.getElementById(`badge-${badgeName}`);
                                if (badgeOriginal) {
                                    const clon = badgeOriginal.cloneNode(true);
                                    clon.id = `clon-${badgeName}`;
                                    passportBadgesGrid.appendChild(clon);
                                }
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
        // Calculamos el incremento normal
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

        // --- CLONAR INSIGNIA AL PASAPORTE ---
        const passportBadgesGrid = document.getElementById("passport-badges-grid");
        const noBadgesMsg = document.getElementById("no-badges-msg");
        if (passportBadgesGrid) {
            if (noBadgesMsg) noBadgesMsg.style.display = 'none';
            if (!document.getElementById(`clon-${badgeName}`)) {
                const badgeOriginal = document.getElementById(`badge-${badgeName}`);
                if (badgeOriginal) {
                    const clon = badgeOriginal.cloneNode(true);
                    clon.id = `clon-${badgeName}`;
                    passportBadgesGrid.appendChild(clon);
                }
            }
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

// Referencias de la vista Descubrir
const btnFindPartner = document.getElementById('btn-find-partner');
const searchStatus = document.getElementById('search-status');

btnFindPartner.addEventListener('click', async () => {
    if (!auth || !auth.currentUser) return;

    // Cambiar estado visual a "buscando"
    searchStatus.style.display = 'block';
    searchStatus.textContent = "Buscando a alguien nuevo en la base de datos...";
    btnFindPartner.disabled = true;

    try {
        const myUid = auth.currentUser.uid;

        // 1. REVISAR CON QUIÉN YA HABLASTE
        // Buscamos todos los chats donde tú participes para no repetir compañeros
        const chatsRef = collection(db, "chats");
        const misChatsQ = query(chatsRef, where("participantes", "array-contains", myUid));
        const misChatsSnap = await getDocs(misChatsQ);
        
        // Creamos una lista de IDs excluidos (empezando por ti mismo)
        let usuariosYaConectados = [myUid];
        misChatsSnap.forEach(docSnap => {
            const participantes = docSnap.data().participantes;
            const partnerUid = participantes.find(uid => uid !== myUid);
            if (partnerUid) usuariosYaConectados.push(partnerUid);
        });

        // 2. CONSULTAR ESTUDIANTES DE OTROS CAMPUS
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("campus", "!=", miCampus));
        const querySnapshot = await getDocs(q);

        let posiblesCompaneros = [];
        querySnapshot.forEach((docSnap) => {
            // 3. EL FILTRO MÁGICO: Solo lo agregamos a la ruleta si NO está en la lista de excluidos
            if (!usuariosYaConectados.includes(docSnap.id)) {
                posiblesCompaneros.push({ id: docSnap.id, ...docSnap.data() });
            }
        });

        // 4. VALIDAR SI QUEDAN ESTUDIANTES NUEVOS
        if (posiblesCompaneros.length === 0) {
            searchStatus.textContent = "Ya conectaste con todos los estudiantes disponibles de otros campus. ¡Invita a más amigos a unirse!";
            btnFindPartner.disabled = false;
            return;
        }

        // 5. SELECCIÓN ALEATORIA ESTRICTA
        const randomUser = posiblesCompaneros[Math.floor(Math.random() * posiblesCompaneros.length)];
        const partnerUid = randomUser.id;

        // Generar ID único para la sala de chat
        const chatId = myUid < partnerUid ? `${myUid}_${partnerUid}` : `${partnerUid}_${myUid}`;

        // Crear el documento del chat en Firestore
        const chatRef = doc(db, "chats", chatId);
        await setDoc(chatRef, {
            participantes: [myUid, partnerUid],
            ultimo_mensaje: "¡Nueva conexión establecida!", // Un mensaje de inicio automático
            fecha_actualizacion: serverTimestamp()
        }, { merge: true });

        const myUserRef = doc(db, "usuarios", myUid);
        const myUserSnap = await getDoc(myUserRef);
        
        if (myUserSnap.exists()) {
            const userData = myUserSnap.data();
            // Si no existe el registro de retos, o el reto 1 es falso/indefinido:
            if (!userData.retos_completados || !userData.retos_completados[1]) {
                // Llamamos a tu función global pasándole el ID del reto, la insignia y el % de avance
                await window.completeChallenge(1, "México conectado", 12.5);
            }
        }
        // -----------------------------------------------

        // Éxito: Limpiar estado y redirigir al chat (ESTO YA LO TIENES)
        searchStatus.style.display = 'none';
        btnFindPartner.disabled = false;
        
        // Cambiar a la pestaña de mensajes automáticamente
        document.querySelector("button[onclick*='mensajes']").click();
        abrirSalaDeChat(chatId, randomUser);

    } catch (error) {
        console.error("Error en el emparejamiento:", error);
        searchStatus.textContent = "Hubo un error de conexión. Intenta de nuevo.";
        btnFindPartner.disabled = false;
    }
});
// Referencias de los controles del chat
const btnSendMessage = document.getElementById('btn-send-message');
const chatInput = document.getElementById('chat-input');
const chatMessagesContainer = document.getElementById('chat-messages');

let unsubscribeInbox = null;

function cargarBandejaEntrada() {
    if (!auth.currentUser) return;
    const myUid = auth.currentUser.uid;

    const chatsRef = collection(db, "chats");
    const qInbox = query(chatsRef, where("participantes", "array-contains", myUid));

    if (unsubscribeInbox) unsubscribeInbox();

    unsubscribeInbox = onSnapshot(qInbox, async (snapshot) => {
        const chatsList = document.getElementById('chats-list');
        const emptyMsg = document.getElementById('empty-chats-msg');

        if (!chatsList) return;

        if (snapshot.empty) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            Array.from(chatsList.children).forEach(child => {
                if (child.id !== 'empty-chats-msg') child.remove();
            });
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';

        // 1. Ordenamos los documentos (del más reciente al más antiguo)
        const docsOrdenados = snapshot.docs.sort((a, b) => {
            const tiempoA = a.data().fecha_actualizacion?.toMillis() || 0;
            const tiempoB = b.data().fecha_actualizacion?.toMillis() || 0;
            return tiempoB - tiempoA;
        });

        
       // 2. BUSCAMOS LOS DATOS PRIMERO: Recopilamos todas las fotos y perfiles
        const chatsListos = await Promise.all(docsOrdenados.map(async (docSnap) => {
            const chatData = docSnap.data();
            const chatId = docSnap.id;
            
            // Si es un grupo, fabricamos un perfil virtual para la interfaz
            if (chatData.isGroup) {
                return {
                    chatId,
                    chatData,
                    partnerData: { 
                        correo: `👥 ${chatData.groupName}`, 
                        campus: `${chatData.participantes.length} miembros`,
                        foto_perfil: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><rect width='50' height='50' fill='%23FF007F'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='20'>👥</text></svg>"
                    }
                };
            } else {
                // Lógica normal para chats individuales
                const partnerUid = chatData.participantes.find(uid => uid !== myUid);
                const partnerRef = doc(db, "usuarios", partnerUid);
                const partnerSnap = await getDoc(partnerRef);
                return {
                    chatId,
                    chatData,
                    partnerData: partnerSnap.exists() ? partnerSnap.data() : null
                };
            }
        }));

        // 3. LIMPIEZA TOTAL: Ahora que tenemos los datos, limpiamos la bandeja justo antes de dibujar
        Array.from(chatsList.children).forEach(child => {
            if (child.id !== 'empty-chats-msg') child.remove();
        });

        // 4. DIBUJAR: Inyectamos todas las tarjetas de contacto sincronizadamente
        chatsListos.forEach(({ chatId, chatData, partnerData }) => {
            if (partnerData) {
                const li = document.createElement('li');
                li.style.padding = "15px";
                li.style.backgroundColor = "white";
                li.style.border = "1px solid #ddd";
                li.style.borderRadius = "8px";
                li.style.cursor = "pointer";
                li.style.display = "flex";
                li.style.alignItems = "center";
                li.style.gap = "15px";
                li.style.marginBottom = "10px";
                li.style.transition = "background-color 0.2s";

                li.onmouseover = () => li.style.backgroundColor = "#f4f7f6";
                li.onmouseout = () => li.style.backgroundColor = "white";

                const partnerPic = partnerData.foto_perfil && partnerData.foto_perfil.startsWith("data:image") 
                    ? partnerData.foto_perfil 
                    : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><rect width='50' height='50' fill='%23cccccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666666' font-size='12'>Foto</text></svg>";

                li.innerHTML = `
                    <img src="${partnerPic}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #003366;">
                    <div style="flex: 1; overflow: hidden;">
                        <h4 style="margin: 0; font-size: 16px; color: #003366; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${partnerData.correo}</h4>
                        <p style="margin: 0; font-size: 13px; color: #666; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${chatData.ultimo_mensaje || "Nuevo chat"}</p>
                    </div>
                `;

                li.addEventListener('click', () => {
                    abrirSalaDeChat(chatId, partnerData);
                });

                chatsList.appendChild(li);
            }
        });
    });
}
// Función que abre la sala y activa los mensajes en tiempo real
window.abrirSalaDeChat = function(chatId, partnerData) {
    currentChatId = chatId;
    
    // Cambiar de vista
    document.getElementById('inbox-view').style.display = 'none';
    document.getElementById('chat-room-view').style.display = 'flex';
    
    // Llenar datos de la cabecera
    document.getElementById('chat-partner-email').textContent = partnerData.correo;
    document.getElementById('chat-partner-campus').textContent = partnerData.campus;
    
    const partnerPic = partnerData.foto_perfil && partnerData.foto_perfil.startsWith("data:image") 
        ? partnerData.foto_perfil 
        : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23cccccc'/></svg>";
    document.getElementById('chat-partner-pic').src = partnerPic;

    // Limpiar mensajes anteriores de la pantalla
    chatMessagesContainer.innerHTML = ''; 

    // Apagar cualquier conexión a un chat anterior para evitar duplicados
    if (unsubscribeChat) {
        unsubscribeChat();
    }

    // Encender el túnel en tiempo real (onSnapshot) para esta sala
    const mensajesRef = collection(db, "chats", chatId, "mensajes");
    const qMensajes = query(mensajesRef, orderBy("timestamp", "asc"));

    unsubscribeChat = onSnapshot(qMensajes, (snapshot) => {
        chatMessagesContainer.innerHTML = ''; // Limpiar para re-dibujar la lista actualizada
        
        snapshot.forEach((docSnap) => {
            const msgData = docSnap.data();
            const esMio = msgData.senderId === auth.currentUser.uid;

            // Crear el globo de texto
            const msgDiv = document.createElement('div');
            msgDiv.style.maxWidth = "70%";
            msgDiv.style.padding = "10px 15px";
            msgDiv.style.borderRadius = "15px";
            msgDiv.style.wordWrap = "break-word";

            // Diferenciar visualmente mis mensajes de los del compañero
            if (esMio) {
                msgDiv.style.alignSelf = "flex-end";
                msgDiv.style.backgroundColor = "#00CC99"; // Tu color secundario
                msgDiv.style.color = "white";
            } else {
                msgDiv.style.alignSelf = "flex-start";
                msgDiv.style.backgroundColor = "#ffffff";
                msgDiv.style.border = "1px solid #ddd";
                msgDiv.style.color = "#333333";
            }

            // CORRECCIÓN: Usar msgData y msgDiv correctamente
            let contenidoMensaje = msgData.texto;
            
            // Si el mensaje tiene una imagen, la mostramos
            if (msgData.imagenUrl) {
                contenidoMensaje = `<img src="${msgData.imagenUrl}" style="max-width: 200px; border-radius: 8px; margin-top: 5px; display: block;">`;
            }
            
            // Inyectamos el contenido en el globo
            msgDiv.innerHTML = contenidoMensaje;
            chatMessagesContainer.appendChild(msgDiv);
        });
        
        // Hacer scroll automático hacia abajo
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
};

// Lógica para ENVIAR mensajes
btnSendMessage.addEventListener('click', async () => {
    const texto = chatInput.value.trim();
    if (!texto || !currentChatId) return;

    const textoGuardado = texto;
    chatInput.value = ''; // Limpiar la caja de texto al instante para mejor fluidez

    try {
        // 1. Guardar el mensaje en la subcolección
        const mensajesRef = collection(db, "chats", currentChatId, "mensajes");
        await addDoc(mensajesRef, {
            texto: textoGuardado,
            senderId: auth.currentUser.uid,
            senderEmail: auth.currentUser.email,
            timestamp: serverTimestamp()
        });

        // 2. Actualizar el "último mensaje" en el documento principal del chat (útil para la bandeja de entrada)
        const chatRef = doc(db, "chats", currentChatId);
        await updateDoc(chatRef, {
            ultimo_mensaje: textoGuardado,
            fecha_actualizacion: serverTimestamp()
        });

    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        alert("No se pudo enviar el mensaje. Revisa tu conexión.");
    }
});

// Permitir enviar el mensaje también presionando la tecla "Enter"
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnSendMessage.click();
    }
});

// Lógica para volver a la bandeja de entrada (Cerrar chat)
document.getElementById('btn-back-to-inbox').addEventListener('click', () => {
    // Apagar la conexión en tiempo real para ahorrar datos y memoria
    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
    document.getElementById('chat-room-view').style.display = 'none';
    document.getElementById('inbox-view').style.display = 'block';
});

// Referencia al botón de videollamada
const btnVideoCall = document.getElementById('btn-video-call');

btnVideoCall.addEventListener('click', async () => {
    if (!currentChatId) return;

    // 1. Crear un nombre de sala único y seguro basado en el ID del chat
    // Eliminamos los guiones bajos para que Jitsi lo acepte sin problemas
    const roomName = "Pasaporte" + currentChatId.replace(/_/g, "");
    const jitsiUrl = `https://meet.ffmuc.net/${roomName}`;

    // 2. Abrir la videollamada en una nueva pestaña
    window.open(jitsiUrl, '_blank');

    // 3. Enviar un mensaje automático al chat para avisar al compañero
    try {
        const mensajesRef = collection(db, "chats", currentChatId, "mensajes");
        await addDoc(mensajesRef, {
            texto: `📹 ¡He iniciado una videollamada! Presiona el botón verde de "Llamar" arriba para unirte.`,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });

        const chatRef = doc(db, "chats", currentChatId);
        await updateDoc(chatRef, {
            ultimo_mensaje: "📹 Invitación a videollamada",
            fecha_actualizacion: serverTimestamp()
        });
    } catch (error) {
        console.error("Error al enviar la invitación de video:", error);
    }
});


async function actualizarMapaConexiones() {
    if (!auth.currentUser) return;
    const myUid = auth.currentUser.uid;

    try {
        const chatsRef = collection(db, "chats");
        const misChatsQ = query(chatsRef, where("participantes", "array-contains", myUid));
        const misChatsSnap = await getDocs(misChatsQ);

        let partnerUids = [];
        misChatsSnap.forEach(docSnap => {
            const participantes = docSnap.data().participantes;
            const partnerUid = participantes.find(uid => uid !== myUid);
            if (partnerUid) partnerUids.push(partnerUid);
        });

        let conteoCampus = {}; 
        
        for (const uid of partnerUids) {
            const partnerRef = doc(db, "usuarios", uid);
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
                const campus = partnerSnap.data().campus;
                if (campus) conteoCampus[campus] = (conteoCampus[campus] || 0) + 1;
            }
        }

        // 1. Iluminar pines del mapa
        const pines = document.querySelectorAll('.campus-pin');
        pines.forEach(pin => {
            const nombreCampus = pin.getAttribute('data-campus');
            const spanConteo = pin.querySelector('.count');
            if (conteoCampus[nombreCampus]) {
                pin.classList.add('active'); 
                spanConteo.textContent = conteoCampus[nombreCampus]; 
            } else {
                pin.classList.remove('active'); 
                spanConteo.textContent = "0";
            }
        });

        // 2. CREAR SELLOS EN EL PASAPORTE (Perfil)
        const stampsGrid = document.getElementById("passport-stamps-grid");
        const noStampsMsg = document.getElementById("no-stamps-msg");
        
        if (stampsGrid) {
            // Limpiar los mensajes y sellos anteriores para evitar duplicados
            if (noStampsMsg) stampsGrid.appendChild(noStampsMsg);
            Array.from(stampsGrid.children).forEach(child => {
                if (child.id !== 'no-stamps-msg') child.remove();
            });

            const campuses = Object.keys(conteoCampus);
            
            if (campuses.length > 0) {
                if (noStampsMsg) noStampsMsg.style.display = 'none';
                
                const coloresSello = ['red', 'blue', 'green']; // Diferentes tintas
                const fecha = new Date();
                const fechaStr = `${fecha.getDate()}/${fecha.getMonth()+1}/${fecha.getFullYear()}`;
                
                campuses.forEach((campus, index) => {
                    const stampDiv = document.createElement("div");
                    const colorClase = coloresSello[index % coloresSello.length];
                    
                    // Rotación aleatoria entre -25 y 25 grados para dar aspecto de sello de mano
                    const rotacion = Math.floor(Math.random() * 50) - 25; 
                    
                    stampDiv.className = `sello-campus ${colorClase}`;
                    stampDiv.style.transform = `rotate(${rotacion}deg)`;
                    
                    stampDiv.innerHTML = `
                        <span class="sello-nombre">${campus}</span>
                        <span class="sello-fecha">${fechaStr}</span>
                    `;
                    stampsGrid.appendChild(stampDiv);
                });
            } else {
                if (noStampsMsg) noStampsMsg.style.display = 'block';
            }
        }

    } catch (error) {
        console.error("Error al actualizar el mapa y sellos:", error);
    }
}


// --- SISTEMA DE IMÁGENES, IA Y CÁMARA ---

// 1. Función para comprimir imágenes antes de enviarlas (Evita el límite de 1MB de Firebase)
function comprimirImagen(base64Str, maxWidth = 800) {
    return new Promise((resolve) => {
        let img = new Image();
        img.src = base64Str;
        img.onload = () => {
            let canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Mantener proporción si la imagen es muy grande
            if (width > maxWidth) {
                height = Math.round((height *= maxWidth / width));
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Exportar como JPEG al 70% de calidad (Súper ligero)
            resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
    });
}

// 2. Función maestra: Recibe la imagen, la comprime, evalúa con IA y sube a Firebase
async function analizarYEnviarImagen(base64Original) {
    if (!currentChatId) return;

    // Bloquear botones durante el proceso
    btnAttachImg.disabled = true;
    btnTakePhoto.disabled = true;
    btnAttachImg.style.opacity = "0.5";
    btnTakePhoto.style.opacity = "0.5";

    try {
        // ¡Magia! Comprimimos la imagen antes de hacer cualquier cosa
        const base64Comprimida = await comprimirImagen(base64Original, 600);

        // A. EVALUAR CON IA SILENCIOSAMENTE
        const imgElement = document.createElement('img');
        imgElement.src = base64Comprimida;
        
        imgElement.onload = async () => {
            if (aiModel) {
                const predictions = await aiModel.classify(imgElement);
                const foodKeywords = ['food', 'dish', 'plate', 'meal', 'restaurant', 'fruit', 'vegetable', 'meat', 'bread', 'pizza', 'taco', 'guacamole', 'soup'];
                
                const esComida = predictions.some(pred => 
                    foodKeywords.some(keyword => pred.className.toLowerCase().includes(keyword))
                );

                if (esComida) {
                    const myUserRef = doc(db, "usuarios", auth.currentUser.uid);
                    const myUserSnap = await getDoc(myUserRef);
                    if (myUserSnap.exists() && (!myUserSnap.data().retos_completados || !myUserSnap.data().retos_completados[3])) {
                        await window.completeChallenge(3, "Explorador gastronómico", 12.5);
                    }
                }
            }

            // B. ENVIAR LA IMAGEN COMPRIMIDA A FIREBASE
            const mensajesRef = collection(db, "chats", currentChatId, "mensajes");
            await addDoc(mensajesRef, {
                texto: "📷 Imagen", 
                imagenUrl: base64Comprimida, // Guardamos la versión ligera
                senderId: auth.currentUser.uid,
                timestamp: serverTimestamp()
            });

            const chatRef = doc(db, "chats", currentChatId);
            await updateDoc(chatRef, {
                ultimo_mensaje: "📷 Imagen enviada",
                fecha_actualizacion: serverTimestamp()
            });

            // C. RESTAURAR INTERFAZ
            btnAttachImg.disabled = false;
            btnTakePhoto.disabled = false;
            btnAttachImg.style.opacity = "1";
            btnTakePhoto.style.opacity = "1";
        };
    } catch (error) {
        console.error("Error al procesar la imagen:", error);
        alert("Hubo un problema procesando la imagen. Intenta con una más pequeña.");
        btnAttachImg.disabled = false;
        btnTakePhoto.disabled = false;
        btnAttachImg.style.opacity = "1";
        btnTakePhoto.style.opacity = "1";
    }
}

// 3. Escuchar la selección de archivos (Galería o input de celular)
const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => analizarYEnviarImagen(event.target.result);
    e.target.value = ""; // Limpiar input
};

chatImgInput.addEventListener('change', handleFileInput);
chatCameraInput.addEventListener('change', handleFileInput);

// Botón de Galería (Usamos onclick para borrar eventos viejos duplicados)
btnAttachImg.onclick = (e) => {
    e.preventDefault();
    chatImgInput.click();
};

// 4. LÓGICA DE LA CÁMARA WEB (PC) Y CÁMARA NATIVA (MÓVIL)
const webcamModal = document.getElementById('webcam-modal');
const webcamVideo = document.getElementById('webcam-video');
let stream = null;

// Botón de Cámara fotográfica
btnTakePhoto.onclick = async (e) => {
    e.preventDefault();

    // Detección estricta para celulares y tablets
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // EN CELULARES: Abre directamente la cámara nativa del teléfono.
        // El sistema operativo móvil gestiona sus propios permisos automáticamente.
        chatCameraInput.click();
        return; // IMPORTANTE: El 'return' hace que el código se detenga aquí y NO abra el marco negro de PC.
    }

    // EN COMPUTADORAS: Si no es móvil, pide permiso y abre el marco web.
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = stream;
        webcamModal.style.display = 'flex';
    } catch (err) {
        alert("Para tomar fotos, asegúrate de permitir el acceso a la cámara en tu navegador.");
    }
};

// Cerrar ventana de Webcam (Computadoras)
document.getElementById('btn-close-webcam').onclick = (e) => {
    e.preventDefault();
    webcamModal.style.display = 'none';
    if (stream) stream.getTracks().forEach(track => track.stop());
};

// Tomar la foto con la Webcam (Computadoras)
document.getElementById('btn-capture-webcam').onclick = (e) => {
    e.preventDefault();
    
    // Dibujar el fotograma actual en un Canvas
    const canvas = document.createElement('canvas');
    canvas.width = webcamVideo.videoWidth;
    canvas.height = webcamVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
    
    // Obtener la imagen y apagar cámara
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.9);
    webcamModal.style.display = 'none';
    if (stream) stream.getTracks().forEach(track => track.stop());
    
    // Enviar a procesar
    analizarYEnviarImagen(fotoBase64);
};
