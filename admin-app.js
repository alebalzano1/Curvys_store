// Admin Panel Application Script - Curvys Store by Moni

let allProducts = [];
let settings = {};
let currentEditingProductId = null;
let currentUploadedImageUrl = "";

// Elementos del DOM del Panel Administrador
const DOM = {
    // Vistas principales
    loginSection: document.getElementById("login-section"),
    adminDashboard: document.getElementById("admin-dashboard"),
    
    // Formularios de Auth
    loginForm: document.getElementById("login-form"),
    btnLogout: document.getElementById("btn-logout"),
    
    // Navegación de Pestañas
    tabBtns: document.querySelectorAll(".admin-tab-btn"),
    panels: document.querySelectorAll(".admin-panel"),
    
    // Tabla de Productos
    productsTableBody: document.getElementById("products-table-body"),
    btnNewProduct: document.getElementById("btn-new-product"),
    
    // Modal ABM de Producto
    productModal: document.getElementById("admin-product-modal"),
    modalClose: document.getElementById("admin-modal-close"),
    productForm: document.getElementById("product-form"),
    modalTitle: document.getElementById("admin-modal-title"),
    btnCancelProduct: document.getElementById("btn-cancel-product"),
    
    // Cloudinary Drag & Drop
    dropZone: document.getElementById("drop-zone"),
    fileInput: document.getElementById("file-input"),
    imagePreview: document.getElementById("image-preview"),
    imageUrlInput: document.getElementById("prod-image-url"),
    
    // Categorías
    adminCategoriesList: document.getElementById("admin-categories-list"),
    formAddCategory: document.getElementById("form-add-category"),
    newCategoryInput: document.getElementById("new-category-name"),
    
    // Configuración General
    settingsForm: document.getElementById("settings-form"),
    btnResetDb: document.getElementById("btn-reset-db")
};

// Inicialización del Panel Administrador
function initAdmin() {
    // 1. Escuchar el estado de autenticación
    FirebaseService.onAuth((user) => {
        if (user) {
            // Usuario autenticado
            DOM.loginSection.style.display = "none";
            DOM.adminDashboard.style.display = "block";
            loadDashboardData();
        } else {
            // No autenticado
            DOM.loginSection.style.display = "flex";
            DOM.adminDashboard.style.display = "none";
        }
    });

    // 2. Registrar Listeners de Interfaz
    registerEventListeners();
}

// Cargar información en el dashboard
async function loadDashboardData() {
    try {
        console.log("📥 [Admin] Cargando datos del panel...");
        allProducts = await FirebaseService.getProducts() || [];
        settings = await FirebaseService.getConfig() || {};
        
        // Caídas de seguridad en local / sandbox
        if (allProducts.length === 0 && window.initialProducts) {
            allProducts = window.initialProducts;
        }
        if (Object.keys(settings).length === 0 && window.initialConfig) {
            settings = window.initialConfig;
        }

        renderProductsTable();
        renderCategoriesManager();
        populateSettingsForm();
        populateCategoryDropdown(); // Para el modal de productos
    } catch (error) {
        console.error("❌ [Admin] Error al cargar datos:", error);
        showToast("Error al cargar datos de la base de datos.");
    }
}

// Registrar Listeners
function registerEventListeners() {
    // Login Form Submit
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const pass = document.getElementById("login-password").value;
            const submitBtn = DOM.loginForm.querySelector("button[type='submit']");
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Iniciando sesión...";
                await FirebaseService.login(email, pass);
                showToast("¡Sesión iniciada con éxito! 🔑");
            } catch (error) {
                console.error(error);
                showToast(error.message || "Error al iniciar sesión.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Ingresar al Panel";
            }
        });
    }

    // Logout
    if (DOM.btnLogout) {
        DOM.btnLogout.addEventListener("click", async () => {
            await FirebaseService.logout();
            showToast("Sesión cerrada.");
        });
    }

    // Pestañas (Tabs)
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            
            DOM.tabBtns.forEach(b => b.classList.remove("active"));
            DOM.panels.forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`panel-${target}`).classList.add("active");
        });
    });

    // Abrir Modal Nuevo Producto
    if (DOM.btnNewProduct) {
        DOM.btnNewProduct.addEventListener("click", () => {
            openProductModal(null);
        });
    }

    // Cerrar Modal Producto
    if (DOM.modalClose) DOM.modalClose.addEventListener("click", () => toggleProductModal(false));
    if (DOM.btnCancelProduct) DOM.btnCancelProduct.addEventListener("click", () => toggleProductModal(false));

    // Guardar Producto
    if (DOM.productForm) {
        DOM.productForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await saveProductForm();
        });
    }

    // Cloudinary Drag & Drop Eventos
    setupDragAndDrop();

    // Agregar Categoría
    if (DOM.formAddCategory) {
        DOM.formAddCategory.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newCat = DOM.newCategoryInput.value.trim();
            if (!newCat) return;
            
            if (!settings.categories) settings.categories = [];
            
            if (settings.categories.includes(newCat)) {
                showToast("La categoría ya existe.");
                return;
            }

            settings.categories.push(newCat);
            try {
                await FirebaseService.saveConfig(settings);
                DOM.newCategoryInput.value = "";
                renderCategoriesManager();
                populateCategoryDropdown();
                showToast("Categoría agregada con éxito.");
            } catch (err) {
                console.error(err);
                showToast("Error al guardar categoría.");
            }
        });
    }

    // Guardar Configuraciones Comerciales
    if (DOM.settingsForm) {
        DOM.settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            settings.storeName = document.getElementById("cfg-store-name").value.trim();
            settings.whatsapp = document.getElementById("cfg-whatsapp").value.trim();
            settings.instagram = document.getElementById("cfg-instagram").value.trim();
            settings.shippingText = document.getElementById("cfg-shipping").value.trim();
            settings.bannerText = document.getElementById("cfg-banner").value.trim();
            
            try {
                await FirebaseService.saveConfig(settings);
                showToast("⚙️ Configuración guardada con éxito.");
            } catch (err) {
                console.error(err);
                showToast("Error al guardar configuraciones.");
            }
        });
    }

    // Resetear base de datos (Semilla forzada)
    if (DOM.btnResetDb) {
        DOM.btnResetDb.addEventListener("click", async () => {
            if (confirm("⚠️ ¿Estás seguro de restablecer toda la base de datos? Esto borrará tus cambios actuales y cargará los productos de semilla originales.")) {
                try {
                    DOM.btnResetDb.disabled = true;
                    DOM.btnResetDb.textContent = "Restableciendo...";
                    await FirebaseService.forceResetAndSeedDatabase(window.initialProducts, window.initialConfig);
                    showToast("✨ Base de datos restablecida correctamente.");
                    await loadDashboardData();
                } catch (err) {
                    console.error(err);
                    showToast("Error al resetear la base de datos.");
                } finally {
                    DOM.btnResetDb.disabled = false;
                    DOM.btnResetDb.textContent = "Restablecer Base de Datos";
                }
            }
        });
    }
}

// RENDERIZAR TABLA DE PRODUCTOS
function renderProductsTable() {
    if (!DOM.productsTableBody) return;
    
    DOM.productsTableBody.innerHTML = "";
    
    if (allProducts.length === 0) {
        DOM.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 30px;">
                    No hay productos cargados en el catálogo. ¡Haz click en "Nuevo Producto" para empezar!
                </td>
            </tr>
        `;
        return;
    }

    allProducts.forEach(product => {
        const tr = document.createElement("tr");
        
        const tallesStr = product.sizes && product.sizes.length > 0 ? product.sizes.join(", ") : "Único";
        const stockBadge = product.inStock 
            ? `<span style="color: #10b981; font-weight: 600;">✓ Con Stock</span>` 
            : `<span style="color: #ef4444; font-weight: 600;">✗ Sin Stock</span>`;
            
        tr.innerHTML = `
            <td>
                <img src="${product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=60'}" class="admin-table-img" alt="${product.name}">
            </td>
            <td style="font-weight: 600; color: var(--white);">${product.name}</td>
            <td>${product.category}</td>
            <td>${tallesStr}</td>
            <td style="font-weight: 600;">$${product.price.toLocaleString('es-AR')}</td>
            <td>${stockBadge}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" title="Editar prenda" data-id="${product.id}">
                        <i data-lucide="edit" style="width: 15px; height: 15px;"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger btn-delete" title="Eliminar prenda" data-id="${product.id}">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                    </button>
                </div>
            </td>
        `;

        // Click listeners
        tr.querySelector(".btn-edit").addEventListener("click", () => openProductModal(product));
        tr.querySelector(".btn-delete").addEventListener("click", () => deleteProduct(product.id));

        DOM.productsTableBody.appendChild(tr);
    });

    lucide.createIcons();
}

// CONTROL DEL MODAL DE DETALLE / CRUD
function toggleProductModal(open) {
    if (open) {
        DOM.productModal.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        DOM.productModal.classList.remove("open");
        document.body.style.overflow = "";
    }
}

function openProductModal(product = null) {
    DOM.productForm.reset();
    currentUploadedImageUrl = "";
    DOM.imagePreview.innerHTML = "<span>Sin Imagen</span>";
    
    if (product) {
        // Modo Edición
        currentEditingProductId = product.id;
        DOM.modalTitle.textContent = "Editar Prenda";
        
        document.getElementById("prod-name").value = product.name;
        document.getElementById("prod-desc").value = product.description;
        document.getElementById("prod-price").value = product.price;
        document.getElementById("prod-category").value = product.category;
        document.getElementById("prod-sizes").value = product.sizes ? product.sizes.join(", ") : "";
        document.getElementById("prod-stock").checked = product.inStock;
        document.getElementById("prod-limited").checked = product.isLimited;
        DOM.imageUrlInput.value = product.image || "";
        
        if (product.image) {
            DOM.imagePreview.innerHTML = `<img src="${product.image}" alt="Preview">`;
            currentUploadedImageUrl = product.image;
        }
    } else {
        // Modo Crear Nuevo
        currentEditingProductId = null;
        DOM.modalTitle.textContent = "Agregar Nueva Prenda";
        document.getElementById("prod-stock").checked = true;
        document.getElementById("prod-limited").checked = true;
    }
    
    toggleProductModal(true);
}

// GUARDAR FORMULARIO DE PRODUCTO
async function saveProductForm() {
    const name = document.getElementById("prod-name").value.trim();
    const desc = document.getElementById("prod-desc").value.trim();
    const price = parseFloat(document.getElementById("prod-price").value);
    const category = document.getElementById("prod-category").value;
    const sizesRaw = document.getElementById("prod-sizes").value;
    const inStock = document.getElementById("prod-stock").checked;
    const isLimited = document.getElementById("prod-limited").checked;
    const customUrl = DOM.imageUrlInput.value.trim();
    
    if (!name || isNaN(price)) {
        showToast("Por favor completa los campos obligatorios.");
        return;
    }

    // Procesar los talles (separados por comas)
    const sizes = sizesRaw 
        ? sizesRaw.split(",").map(s => s.trim().toUpperCase()).filter(s => s !== "")
        : [];

    const finalImageUrl = customUrl || currentUploadedImageUrl || "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600";

    const productData = {
        id: currentEditingProductId || `prod-${Date.now()}`,
        name,
        description: desc,
        price,
        category,
        sizes,
        image: finalImageUrl,
        video: "",
        inStock,
        isLimited,
        createdAt: new Date().toISOString()
    };

    try {
        const saveBtn = DOM.productForm.querySelector("button[type='submit']");
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";

        await FirebaseService.saveProduct(productData);
        
        showToast("👗 Prenda guardada con éxito.");
        toggleProductModal(false);
        await loadDashboardData();
    } catch (err) {
        console.error(err);
        showToast("Error al guardar el producto.");
    }
}

// ELIMINAR PRODUCTO
async function deleteProduct(id) {
    if (confirm("⚠️ ¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.")) {
        try {
            await FirebaseService.deleteProduct(id);
            showToast("Producto eliminado.");
            await loadDashboardData();
        } catch (err) {
            console.error(err);
            showToast("Error al eliminar el producto.");
        }
    }
}

// RENDERIZAR GESTOR DE CATEGORÍAS
function renderCategoriesManager() {
    if (!DOM.adminCategoriesList) return;
    
    DOM.adminCategoriesList.innerHTML = "";
    
    const categories = settings.categories || [];
    
    if (categories.length === 0) {
        DOM.adminCategoriesList.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No hay categorías creadas. Agrega una arriba.</p>`;
        return;
    }

    categories.forEach(cat => {
        const chip = document.createElement("div");
        chip.className = "admin-category-tag";
        chip.innerHTML = `
            <span>${cat}</span>
            <button title="Borrar categoría" class="btn-delete-cat" data-name="${cat}">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        
        chip.querySelector(".btn-delete-cat").addEventListener("click", () => deleteCategory(cat));
        DOM.adminCategoriesList.appendChild(chip);
    });

    lucide.createIcons();
}

// ELIMINAR CATEGORÍA
async function deleteCategory(categoryName) {
    if (confirm(`¿Borrar la categoría "${categoryName}"? Los productos que la usan no se borrarán, pero ya no aparecerá como filtro.`)) {
        settings.categories = settings.categories.filter(c => c !== categoryName);
        try {
            await FirebaseService.saveConfig(settings);
            renderCategoriesManager();
            populateCategoryDropdown();
            showToast("Categoría eliminada.");
        } catch (err) {
            console.error(err);
            showToast("Error al borrar categoría.");
        }
    }
}

// Rellenar select del modal de productos
function populateCategoryDropdown() {
    const select = document.getElementById("prod-category");
    if (!select) return;
    
    select.innerHTML = "";
    const categories = settings.categories || [];
    
    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Rellenar formulario de configuración general
function populateSettingsForm() {
    if (!DOM.settingsForm) return;
    
    document.getElementById("cfg-store-name").value = settings.storeName || "";
    document.getElementById("cfg-whatsapp").value = settings.whatsapp || "";
    document.getElementById("cfg-instagram").value = settings.instagram || "";
    document.getElementById("cfg-shipping").value = settings.shippingText || "";
    document.getElementById("cfg-banner").value = settings.bannerText || "";
}

// CONFIGURACIÓN DE DRAG & DROP E IMÁGENES A CLOUDINARY
function setupDragAndDrop() {
    if (!DOM.dropZone || !DOM.fileInput) return;
    
    // Abrir selector de archivos al clickear
    DOM.dropZone.addEventListener("click", () => {
        DOM.fileInput.click();
    });

    // Cambios en input de archivo
    DOM.fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleUploadedFile(e.target.files[0]);
        }
    });

    // Drag-over
    DOM.dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        DOM.dropZone.style.borderColor = "var(--accent)";
        DOM.dropZone.style.background = "rgba(212, 175, 55, 0.05)";
    });

    // Drag-leave
    DOM.dropZone.addEventListener("dragleave", () => {
        DOM.dropZone.style.borderColor = "var(--border-color)";
        DOM.dropZone.style.background = "rgba(255, 255, 255, 0.01)";
    });

    // Drop
    DOM.dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        DOM.dropZone.style.borderColor = "var(--border-color)";
        DOM.dropZone.style.background = "rgba(255, 255, 255, 0.01)";
        
        if (e.dataTransfer.files.length > 0) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });
}

// Procesar el archivo cargado y enviarlo a Cloudinary
async function handleUploadedFile(file) {
    if (!file) return;
    
    // Validar tipo (imagen / video)
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        showToast("Solo se permiten imágenes o videos.");
        return;
    }

    try {
        DOM.imagePreview.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div class="loader-pulse" style="width: 20px; height: 20px; border: 2.5px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span style="font-size: 0.65rem; color: var(--text-secondary);">Subiendo...</span>
            </div>
        `;
        
        const url = await FirebaseService.uploadImage(file);
        
        DOM.imagePreview.innerHTML = `<img src="${url}" alt="Preview">`;
        DOM.imageUrlInput.value = url;
        currentUploadedImageUrl = url;
        showToast("¡Archivo subido exitosamente a Cloudinary! ☁️");
    } catch (error) {
        console.error(error);
        DOM.imagePreview.innerHTML = "<span>Error</span>";
        showToast("Error crítico al subir archivo a la nube.");
    }
}

// Inyección de animación CSS rápida para el loader en el preview
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Sistema de Notificaciones Flotantes (Toasts)
function showToast(message) {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add("show"), 50);
    
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Iniciar aplicación al cargar el DOM
document.addEventListener("DOMContentLoaded", initAdmin);
