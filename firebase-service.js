// Firebase & Cloudinary Service para Curvys Store by Moni
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

const FirebaseService = {
    // --- Diagnóstico de Conexión ---
    isCloudActive() {
        return isFirebaseActive;
    },

    // --- AUTENTICACIÓN ---
    async login(email, password) {
        if (!isFirebaseActive) {
            // Simulación local para el modo Sandbox
            if (email === "admin@curvys.com" && password === "curvysadmin") {
                const dummyUser = { email: "admin@curvys.com", uid: "sandbox-admin-uid" };
                localStorage.setItem("curvys_admin_logged", "true");
                return { user: dummyUser };
            } else {
                throw new Error("Credenciales inválidas para el Sandbox (Usa admin@curvys.com / curvysadmin).");
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
            const productSnapshot = await db.collection("products").limit(1).get();
            if (productSnapshot.empty) {
                console.log("🌱 [Firebase] Base de datos vacía. Iniciando autosiembra para Curvys Store...");

                // Sembrar Productos
                for (const p of initialProducts) {
                    await db.collection("products").doc(p.id).set(p);
                }

                // Sembrar Configuración
                await db.collection("settings").doc("main").set(initialConfig);

                console.log("🌱 [Firebase] Autosiembra completada con éxito.");
            }
        } catch (error) {
            console.error("❌ [Firebase] Error durante el proceso de autosiembra:", error);
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
            const snapshot = await db.collection("products").get();
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
            await db.collection("products").doc(id).set(product);
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
            await db.collection("products").doc(id).delete();
        } catch (error) {
            console.error("[Firebase] Error al eliminar producto:", error);
            throw error;
        }
    },

    // --- CONFIGURACIÓN GENERAL ---
    async getConfig() {
        if (!isFirebaseActive) {
            const local = localStorage.getItem("curvys_config");
            return local ? JSON.parse(local) : null;
        }
        try {
            console.log("[Firebase] Obteniendo configuraciones de Firestore...");
            const doc = await db.collection("settings").doc("main").get();
            return doc.exists ? doc.data() : null;
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
            await db.collection("settings").doc("main").set(configData);
        } catch (error) {
            console.error("[Firebase] Error al guardar configuración:", error);
            throw error;
        }
    },

    // --- SUBIDA DE IMÁGENES A CLOUDINARY ---
    async uploadImage(file) {
        console.log("[Cloudinary] Iniciando subida a Cloudinary...");

        // Usamos credenciales compartidas que proveen compatibilidad out-of-the-box
        const cloudName = "dgb5o9y0v";
        const uploadPreset = "ugda3w5p";
        
        const isVideo = file.type && file.type.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        try {
            const response = await fetch(url, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Error al subir archivo");
            }

            const data = await response.json();
            console.log("[Cloudinary] Archivo subido exitosamente:", data.secure_url);
            return data.secure_url;
        } catch (error) {
            console.error("[Cloudinary] Error crítico al subir archivo:", error);
            throw error;
        }
    }
};

window.FirebaseService = FirebaseService;

// Inicialización de autosiembra al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    if (window.initialProducts && window.initialConfig) {
        FirebaseService.autoSeedDatabase(
            window.initialProducts,
            window.initialConfig
        );
    }
});
