// Firebase & Storage Service para Curvys Store by Moni
// Sincronización robusta en tiempo real con soporte de persistencia local (Sandbox)

let db = null;
let isFirebaseActive = false;

// Inicializar Firebase si las credenciales son válidas
try {
    const config = window.firebaseConfig;
    if (config && config.apiKey && config.apiKey !== "") {
        firebase.initializeApp(config);
        db = firebase.firestore();
        isFirebaseActive = true;
        console.log("🔥 [Firebase] Conexión establecida con éxito en la nube de Curvys Store.");
    } else {
        console.warn("⚠️ [Firebase] Corriendo en modo Local / Sandbox (LocalStorage). Configura las credenciales reales en firebase-config.js para conectar la base de datos en la nube.");
    }
} catch (error) {
    console.error("❌ [Firebase] Error al inicializar Firebase:", error);
}

// Función auxiliar para comprimir imágenes en el cliente (reduce el tamaño para guardarlo en Firestore si falla Storage)
function compressImageHelper(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Función auxiliar para forzar un límite de tiempo en las promesas de Firestore
function withTimeout(promise, timeoutMs = 5000) {
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
}

const FirebaseService = {
    // --- Diagnóstico de Conexión ---
    isCloudActive() {
        return isFirebaseActive;
    },

    // --- AUTENTICACIÓN ---
    async login(email, password) {
        if (!isFirebaseActive) {
            // Simulación local para el modo Sandbox
            const savedPassword = localStorage.getItem("curvys_admin_password_sandbox") || "curvysadmin";
            if (email === "admin@curvys.com" && password === savedPassword) {
                const dummyUser = { email: "admin@curvys.com", uid: "sandbox-admin-uid" };
                localStorage.setItem("curvys_admin_logged", "true");
                return { user: dummyUser };
            } else {
                const helperMsg = savedPassword === "curvysadmin" 
                    ? "(Usa admin@curvys.com / curvysadmin)" 
                    : "(Usa admin@curvys.com / tu nueva contraseña)";
                throw new Error(`Credenciales inválidas para el Sandbox ${helperMsg}.`);
            }
        }
        const auth = firebase.auth();
        return await auth.signInWithEmailAndPassword(email, password);
    },

    async changePassword(newPassword) {
        if (!isFirebaseActive) {
            localStorage.setItem("curvys_admin_password_sandbox", newPassword);
            return;
        }
        const user = firebase.auth().currentUser;
        if (user) {
            return await user.updatePassword(newPassword);
        } else {
            throw new Error("No hay un usuario autenticado activo.");
        }
    },

    async logout() {
        if (!isFirebaseActive) {
            localStorage.removeItem("curvys_admin_logged");
            return;
        }
        const auth = firebase.auth();
        return await auth.signOut();
    },

    onAuth(callback) {
        if (!isFirebaseActive) {
            // Evento simulado para local
            const logged = localStorage.getItem("curvys_admin_logged") === "true";
            if (logged) {
                callback({ email: "admin@curvys.com", uid: "sandbox-admin-uid" });
            } else {
                callback(null);
            }
            return;
        }
        const auth = firebase.auth();
        auth.onAuthStateChanged((user) => {
            callback(user);
        });
    },

    // --- Autosiembra (Seeding) ---
    async autoSeedDatabase(initialProducts, initialConfig) {
        if (!isFirebaseActive) {
            // Verificar si el almacenamiento local está vacío
            const localProducts = localStorage.getItem("curvys_products");
            const localConfig = localStorage.getItem("curvys_config");
            if (!localProducts) {
                localStorage.setItem("curvys_products", JSON.stringify(initialProducts));
            }
            if (!localConfig) {
                localStorage.setItem("curvys_config", JSON.stringify(initialConfig));
            }
            return;
        }
        try {
            // Para evitar volver a sembrar productos cuando el usuario decide eliminarlos todos,
            // verificamos si la configuración principal 'settings/main' ya fue creada (indicando que ya se inicializó la BD).
            const configDoc = await withTimeout(db.collection("settings").doc("main").get());
            if (!configDoc.exists) {
                console.log("🌱 [Firebase] Base de datos vacía. Iniciando autosiembra para Curvys Store...");

                // Sembrar Productos
                for (const p of initialProducts) {
                    await withTimeout(db.collection("products").doc(p.id).set(p));
                }

                // Sembrar Configuración
                await withTimeout(db.collection("settings").doc("main").set(initialConfig));

                console.log("🌱 [Firebase] Autosiembra completada con éxito.");
            }
        } catch (error) {
            // Ignorar silenciosamente si hay fallos de permisos (ej. no autenticado)
        }
    },

    // --- Restablecer y Sembrar Base de Datos Forzado ---
    async forceResetAndSeedDatabase(initialProducts, initialConfig) {
        if (!isFirebaseActive) {
            localStorage.setItem("curvys_products", JSON.stringify(initialProducts));
            localStorage.setItem("curvys_config", JSON.stringify(initialConfig));
            return;
        }
        try {
            console.log("⚠️ [Firebase] Iniciando limpieza total de productos...");
            const snapshot = await db.collection("products").get();
            for (const doc of snapshot.docs) {
                await db.collection("products").doc(doc.id).delete();
            }

            console.log("🌱 [Firebase] Escribiendo catálogo oficial limpio...");
            for (const p of initialProducts) {
                await db.collection("products").doc(p.id).set(p);
            }

            console.log("⚙️ [Firebase] Escribiendo configuraciones comerciales por defecto...");
            await db.collection("settings").doc("main").set(initialConfig);

            console.log("✨ [Firebase] Base de datos restablecida con éxito.");
        } catch (error) {
            console.error("❌ [Firebase] Error en restablecimiento forzado:", error);
            throw error;
        }
    },

    // --- PRODUCTOS ---
    async getProducts() {
        if (!isFirebaseActive) {
            const local = localStorage.getItem("curvys_products");
            return local ? JSON.parse(local) : [];
        }
        try {
            console.log("[Firebase] Obteniendo productos de Firestore...");
            const snapshot = await withTimeout(db.collection("products").get());
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("[Firebase] Error al obtener productos:", error);
            throw error;
        }
    },

    async saveProduct(product) {
        if (!isFirebaseActive) {
            let localProducts = await this.getProducts() || [];
            const index = localProducts.findIndex(p => p.id === product.id);
            if (index > -1) {
                localProducts[index] = product;
            } else {
                localProducts.push(product);
            }
            localStorage.setItem("curvys_products", JSON.stringify(localProducts));
            return;
        }
        try {
            const id = product.id;
            console.log("[Firebase] Guardando producto:", id);
            await withTimeout(db.collection("products").doc(id).set(product));
        } catch (error) {
            console.error("[Firebase] Error al guardar producto:", error);
            throw error;
        }
    },

    async deleteProduct(id) {
        if (!isFirebaseActive) {
            let localProducts = await this.getProducts() || [];
            localProducts = localProducts.filter(p => p.id !== id);
            localStorage.setItem("curvys_products", JSON.stringify(localProducts));
            return;
        }
        try {
            console.log("[Firebase] Eliminando producto:", id);
            await withTimeout(db.collection("products").doc(id).delete());
        } catch (error) {
            console.error("[Firebase] Error al eliminar producto:", error);
            throw error;
        }
    },

    // --- PEDIDOS (ORDERS) ---
    async getOrders() {
        if (!isFirebaseActive) {
            const local = localStorage.getItem("curvys_orders");
            const orders = local ? JSON.parse(local) : [];
            return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        try {
            console.log("[Firebase] Obteniendo pedidos de Firestore...");
            const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("[Firebase] Error al obtener pedidos:", error);
            // Fallback en caso de que falte índice de ordenación
            try {
                const snapshot = await db.collection("orders").get();
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (innerError) {
                console.error("[Firebase] Falló el fallback de obtener pedidos:", innerError);
                throw error;
            }
        }
    },

    async saveOrder(order) {
        if (!isFirebaseActive) {
            let localOrders = await this.getOrders() || [];
            const index = localOrders.findIndex(o => o.id === order.id);
            if (index > -1) {
                localOrders[index] = order;
            } else {
                localOrders.push(order);
            }
            localStorage.setItem("curvys_orders", JSON.stringify(localOrders));
            return;
        }
        try {
            console.log("[Firebase] Guardando pedido:", order.id);
            await db.collection("orders").doc(order.id).set(order);
        } catch (error) {
            console.error("[Firebase] Error al guardar pedido:", error);
            throw error;
        }
    },

    async updateOrderStatus(id, status) {
        if (!isFirebaseActive) {
            let localOrders = await this.getOrders() || [];
            const index = localOrders.findIndex(o => o.id === id);
            if (index > -1) {
                localOrders[index].status = status;
                localStorage.setItem("curvys_orders", JSON.stringify(localOrders));
            }
            return;
        }
        try {
            console.log("[Firebase] Actualizando estado de pedido:", id, status);
            await db.collection("orders").doc(id).update({ status });
        } catch (error) {
            console.error("[Firebase] Error al actualizar estado de pedido:", error);
            throw error;
        }
    },

    async deleteOrder(id) {
        if (!isFirebaseActive) {
            let localOrders = await this.getOrders() || [];
            localOrders = localOrders.filter(o => o.id !== id);
            localStorage.setItem("curvys_orders", JSON.stringify(localOrders));
            return;
        }
        try {
            console.log("[Firebase] Eliminando pedido:", id);
            await db.collection("orders").doc(id).delete();
        } catch (error) {
            console.error("[Firebase] Error al eliminar pedido:", error);
            throw error;
        }
    },

    // --- CONFIGURACIÓN GENERAL ---
    async getConfig() {
        if (!isFirebaseActive) {
            const local = localStorage.getItem("curvys_config");
            const config = local ? JSON.parse(local) : null;
            if (config && config.categories && !config.categories.includes("Camisas")) {
                config.categories.push("Camisas");
                localStorage.setItem("curvys_config", JSON.stringify(config));
            }
            return config;
        }
        try {
            console.log("[Firebase] Obteniendo configuraciones de Firestore...");
            const doc = await withTimeout(db.collection("settings").doc("main").get());
            if (doc.exists) {
                const config = doc.data();
                if (config && config.categories && !config.categories.includes("Camisas")) {
                    config.categories.push("Camisas");
                    await withTimeout(db.collection("settings").doc("main").set(config));
                    console.log("🌱 [Firebase] Categoría 'Camisas' añadida automáticamente a las configuraciones.");
                }
                return config;
            }
            return null;
        } catch (error) {
            console.error("[Firebase] Error al obtener configuración:", error);
            throw error;
        }
    },

    async saveConfig(configData) {
        if (!isFirebaseActive) {
            localStorage.setItem("curvys_config", JSON.stringify(configData));
            return;
        }
        try {
            console.log("[Firebase] Guardando configuración general...");
            await withTimeout(db.collection("settings").doc("main").set(configData));
        } catch (error) {
            console.error("[Firebase] Error al guardar configuración:", error);
            throw error;
        }
    },

    // --- SUBIDA DE IMÁGENES A FIREBASE STORAGE / SANDBOX ---
    async uploadImage(file) {
        if (!isFirebaseActive) {
            console.log("[Sandbox] Subiendo archivo localmente a base64...");
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });
        }
        
        const isImage = file.type.startsWith("image/");
        
        try {
            console.log("[Firebase Storage] Intentando subir archivo a Firebase Storage...");
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`products/${Date.now()}_${file.name}`);
            
            // Creamos una promesa de subida con un timeout de 4 segundos
            const uploadPromise = (async () => {
                const snapshot = await fileRef.put(file);
                const downloadUrl = await snapshot.ref.getDownloadURL();
                console.log("[Firebase Storage] Archivo subido exitosamente:", downloadUrl);
                return downloadUrl;
            })();
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("timeout")), 4000)
            );
            
            // Competimos el upload contra el timeout
            return await Promise.race([uploadPromise, timeoutPromise]);
            
        } catch (error) {
            // Si el almacenamiento da error de permisos, cuota o excede el tiempo de espera (ej. Storage no habilitado)
            if (isImage && (error.message === "timeout" || error.code === 'storage/unauthorized' || error.code === 'storage/retry-limit-exceeded' || error.code === 'storage/canceled')) {
                console.warn("⚠️ [Firebase Storage] La subida a Storage falló o tardó demasiado. Usando compresión Base64 local como fallback...");
                try {
                    const base64Data = await compressImageHelper(file);
                    return base64Data;
                } catch (compressErr) {
                    console.error("Error al comprimir imagen de respaldo:", compressErr);
                }
            }
            
            console.error("[Firebase Storage] Error al subir archivo:", error);
            let friendlyMessage = "Error en el servidor de Firebase Storage.";
            if (error.code === 'storage/unauthorized') {
                friendlyMessage = "No autorizado. Verifica las Reglas de Seguridad en tu consola de Firebase Storage.";
            } else if (error.code === 'storage/quota-exceeded') {
                friendlyMessage = "Límite de cuota excedido. Puede que necesites actualizar al plan Blaze de Firebase.";
            } else if (error.message && (error.message.includes('Blaze') || error.message.includes('plan'))) {
                friendlyMessage = "Subida fallida: Firebase requiere el plan Blaze para habilitar Cloud Storage.";
            } else if (error.message === "timeout") {
                friendlyMessage = "El servidor de Storage no responde. Si el problema persiste, revisa si habilitaste Cloud Storage en tu consola de Firebase.";
            }
            throw new Error(friendlyMessage);
        }
    }
};

window.FirebaseService = FirebaseService;

// Inicialización de autosiembra al cargar la página (solo en modo Local / Sandbox)
document.addEventListener("DOMContentLoaded", () => {
    if (!FirebaseService.isCloudActive() && window.initialProducts && window.initialConfig) {
        FirebaseService.autoSeedDatabase(
            window.initialProducts,
            window.initialConfig
        );
    }
});
