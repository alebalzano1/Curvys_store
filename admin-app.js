// Admin Panel Application Script - Curvys Store by Moni

let allProducts = [];
let allOrders = [];
let settings = {};
let currentEditingProductId = null;
let currentUploadedImageUrl = "";
let currentAdditionalImages = [];
let currentUploadedVideoUrl = "";

// Variables de estado adicionales para filtros y talles
let selectedAdminSizes = [];
let searchOrdersQuery = "";
let filterOrdersStatusValue = "Todos";
const predefinedSizes = ["S", "M", "L", "XL", "XXL", "XXXL", "38", "40", "42", "44", "46", "48", "50", "52", "Único"];
let customSizes = []; // talles personalizados agregados en la sesión

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
    ordersTableBody: document.getElementById("orders-table-body"),
    btnNewProduct: document.getElementById("btn-new-product"),
    
    // Modal ABM de Producto
    productModal: document.getElementById("admin-product-modal"),
    modalClose: document.getElementById("admin-modal-close"),
    productForm: document.getElementById("product-form"),
    modalTitle: document.getElementById("admin-modal-title"),
    btnCancelProduct: document.getElementById("btn-cancel-product"),
    
    // Firebase Storage Drag & Drop
    dropZone: document.getElementById("drop-zone"),
    fileInput: document.getElementById("file-input"),
    imagePreview: document.getElementById("image-preview"),
    additionalDropZone: document.getElementById("additional-drop-zone"),
    additionalFileInput: document.getElementById("additional-file-input"),
    additionalPreviewsContainer: document.getElementById("additional-previews-container"),
    videoDropZone: document.getElementById("video-drop-zone"),
    videoFileInput: document.getElementById("video-file-input"),
    videoPreviewContainer: document.getElementById("video-preview-container"),
    
    // Chips de Talles
    adminTallesChips: document.getElementById("admin-talles-chips"),
    customTalleInput: document.getElementById("custom-talle-input"),
    btnAddCustomTalle: document.getElementById("btn-add-custom-talle"),
    
    // Estadísticas
    statTotalSales: document.getElementById("stat-total-sales"),
    statPendingOrders: document.getElementById("stat-pending-orders"),
    statOutofstockProducts: document.getElementById("stat-outofstock-products"),
    
    // Filtros de Pedidos
    searchOrders: document.getElementById("search-orders"),
    filterOrdersStatus: document.getElementById("filter-orders-status"),
    btnExportOrdersCsv: document.getElementById("btn-export-orders-csv"),
    
    // Categorías
    adminCategoriesList: document.getElementById("admin-categories-list"),
    formAddCategory: document.getElementById("form-add-category"),
    newCategoryInput: document.getElementById("new-category-name"),
    
    // Configuración General
    settingsForm: document.getElementById("settings-form"),
    passwordChangeForm: document.getElementById("password-change-form"),
    btnResetDb: document.getElementById("btn-reset-db"),

    // Configuración Comercial (Envíos y Cupones)
    shippingRatesForm: document.getElementById("shipping-rates-form"),
    shipRetiroInput: document.getElementById("ship-retiro"),
    shipMotoInput: document.getElementById("ship-moto"),
    shipCorreoInput: document.getElementById("ship-correo"),
    addCouponForm: document.getElementById("add-coupon-form"),
    newCouponCodeInput: document.getElementById("new-coupon-code"),
    newCouponPctInput: document.getElementById("new-coupon-pct"),
    couponsListBody: document.getElementById("coupons-list-body")
};

// Control de alerta sonora
let previousOrdersCount = 0;
let isFirstLoad = true;

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
            // Reiniciar control de sonido al desloguearse
            isFirstLoad = true;
            previousOrdersCount = 0;
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
        allOrders = await FirebaseService.getOrders() || [];
        settings = await FirebaseService.getConfig() || {};
        
        // Caídas de seguridad en local / sandbox
        if (allProducts.length === 0 && window.initialProducts) {
            allProducts = window.initialProducts;
        }
        if (Object.keys(settings).length === 0 && window.initialConfig) {
            settings = window.initialConfig;
        }

        // Alerta Sonora para Nuevos Pedidos
        if (!isFirstLoad && allOrders.length > previousOrdersCount) {
            console.log("🔔 [Admin] ¡Nuevo pedido detectado! Reproduciendo sonido.");
            playNewOrderSound();
            showToast("🔔 ¡Ha ingresado un nuevo pedido!");
        }
        previousOrdersCount = allOrders.length;
        isFirstLoad = false;

        renderDashboardStats();
        renderProductsTable();
        renderOrdersTable();
        renderCategoriesManager();
        populateSettingsForm();
        populateCategoryDropdown(); // Para el modal de productos
        populateCommercialSettings(); // Costos de envíos y cupones
        
    } catch (error) {
        console.error("❌ [Admin] Error al cargar datos:", error);
        showToast("Error al cargar datos de la base de datos.");
    }
}

// Calcular y renderizar estadísticas rápidas del dashboard
function renderDashboardStats() {
    // 1. Total ventas confirmadas (Confirmado, Enviado o Entregado/Completado)
    const totalSales = allOrders
        .filter(order => order.status === "Confirmado" || order.status === "Enviado" || order.status === "Entregado" || order.status === "Completado")
        .reduce((sum, order) => sum + (order.total || 0), 0);
        
    // 2. Pedidos pendientes
    const pendingOrdersCount = allOrders.filter(order => order.status === "Pendiente").length;
    
    // 3. Prendas sin stock
    const outOfStockCount = allProducts.filter(prod => !prod.inStock).length;
    
    // Asignar al DOM
    if (DOM.statTotalSales) DOM.statTotalSales.textContent = `$${totalSales.toLocaleString('es-AR')}`;
    if (DOM.statPendingOrders) DOM.statPendingOrders.textContent = pendingOrdersCount;
    if (DOM.statOutofstockProducts) DOM.statOutofstockProducts.textContent = outOfStockCount;
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

    // Firebase Storage Drag & Drop Eventos
    setupDragAndDrop();

    // Filtros e Historial de Pedidos
    if (DOM.searchOrders) {
        DOM.searchOrders.addEventListener("input", (e) => {
            searchOrdersQuery = e.target.value.toLowerCase().trim();
            renderOrdersTable();
        });
    }
    if (DOM.filterOrdersStatus) {
        DOM.filterOrdersStatus.addEventListener("change", (e) => {
            filterOrdersStatusValue = e.target.value;
            renderOrdersTable();
        });
    }

    // Botón Agregar Talle Personalizado en el modal
    if (DOM.btnAddCustomTalle) {
        DOM.btnAddCustomTalle.addEventListener("click", () => {
            if (!DOM.customTalleInput) return;
            const newTalle = DOM.customTalleInput.value.trim().toUpperCase();
            if (!newTalle) return;
            
            if (predefinedSizes.includes(newTalle) || customSizes.includes(newTalle)) {
                showToast("El talle ya existe.");
                return;
            }
            
            customSizes.push(newTalle);
            DOM.customTalleInput.value = "";
            renderAdminTallesChips();
            
            // Auto-seleccionar el talle agregado
            selectedAdminSizes.push(newTalle);
            renderAdminTallesChips(); // Re-renderizar para aplicar el estado de selección
        });
    }

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

    // Guardar Cambio de Contraseña
    if (DOM.passwordChangeForm) {
        DOM.passwordChangeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const newPwd = document.getElementById("pwd-new").value;
            const confirmPwd = document.getElementById("pwd-confirm").value;
            const submitBtn = DOM.passwordChangeForm.querySelector("button[type='submit']");
            
            if (newPwd !== confirmPwd) {
                showToast("❌ Las contraseñas no coinciden.");
                return;
            }
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Actualizando...";
                await FirebaseService.changePassword(newPwd);
                showToast("🔑 Contraseña actualizada. Cerrando sesión...");
                
                // Forzar logout seguro
                setTimeout(async () => {
                    await FirebaseService.logout();
                }, 1500);
            } catch (err) {
                console.error(err);
                showToast(err.message || "Error al actualizar contraseña.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Actualizar Contraseña";
                DOM.passwordChangeForm.reset();
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

    // Exportar Pedidos a CSV
    if (DOM.btnExportOrdersCsv) {
        DOM.btnExportOrdersCsv.addEventListener("click", () => {
            exportOrdersToCSV();
        });
    }

    // Guardar Tarifas de Envío
    if (DOM.shippingRatesForm) {
        DOM.shippingRatesForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const retiro = parseFloat(DOM.shipRetiroInput.value) || 0;
            const moto = parseFloat(DOM.shipMotoInput.value) || 0;
            const correo = parseFloat(DOM.shipCorreoInput.value) || 0;

            if (!settings.shippingRates) settings.shippingRates = {};
            settings.shippingRates.retiro = retiro;
            settings.shippingRates.moto = moto;
            settings.shippingRates.correo = correo;

            try {
                await FirebaseService.saveConfig(settings);
                showToast("📦 Costos de envío actualizados con éxito.");
            } catch (err) {
                console.error(err);
                showToast("Error al guardar tarifas de envío.");
            }
        });
    }

    // Agregar Cupón de Descuento
    if (DOM.addCouponForm) {
        DOM.addCouponForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const code = DOM.newCouponCodeInput.value.trim().toUpperCase();
            const pct = parseInt(DOM.newCouponPctInput.value) || 0;

            if (!code || pct <= 0) return;

            if (!settings.coupons) settings.coupons = {};
            if (settings.coupons[code] !== undefined) {
                showToast("El cupón ya existe.");
                return;
            }

            settings.coupons[code] = pct;

            try {
                await FirebaseService.saveConfig(settings);
                DOM.newCouponCodeInput.value = "";
                DOM.newCouponPctInput.value = "";
                renderCouponsList();
                showToast(`🎟️ Cupón ${code} creado correctamente.`);
            } catch (err) {
                console.error(err);
                showToast("Error al crear cupón.");
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
        
        const tallesStr = (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) ? product.sizes.join(", ") : "Único";
        const stockBadge = product.inStock 
            ? `<span style="color: #10b981; font-weight: 600;">✓ Con Stock</span>` 
            : `<span style="color: #ef4444; font-weight: 600;">✗ Sin Stock</span>`;
            
        tr.innerHTML = `
            <td>
                <img src="${product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=50'}" class="admin-table-img" style="width: 50px; height: 50px; object-fit: cover;" alt="${product.name}">
            </td>
            <td style="font-weight: 600; color: var(--white);">${product.name}</td>
            <td>${product.category}</td>
            <td style="font-weight: 600;">$${product.price.toLocaleString('es-AR')}</td>
            <td>${tallesStr}</td>
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
        tr.querySelector(".btn-edit").addEventListener("click", () => openProductModal(product.id));
        tr.querySelector(".btn-delete").addEventListener("click", async () => {
            if (confirm("⚠️ ¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.")) {
                try {
                    await FirebaseService.deleteProduct(product.id);
                    showToast("Producto eliminado.");
                    await loadDashboardData();
                } catch (err) {
                    console.error(err);
                    showToast("Error al eliminar el producto.");
                }
            }
        });

        DOM.productsTableBody.appendChild(tr);
    });

    lucide.createIcons();
}

// RENDERIZAR TABLA DE PEDIDOS
function renderOrdersTable() {
    if (!DOM.ordersTableBody) return;
    
    DOM.ordersTableBody.innerHTML = "";
    
    // Filtrar pedidos según búsqueda y estado
    const filteredOrders = allOrders.filter(order => {
        const nameMatch = order.clientName ? order.clientName.toLowerCase().includes(searchOrdersQuery) : false;
        const itemMatch = order.items ? order.items.some(item => item.name.toLowerCase().includes(searchOrdersQuery)) : false;
        const matchesSearch = nameMatch || itemMatch;
        
        const matchesStatus = filterOrdersStatusValue === "Todos" || order.status === filterOrdersStatusValue;
        return matchesSearch && matchesStatus;
    });
    
    if (filteredOrders.length === 0) {
        DOM.ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 30px;">
                    ${allOrders.length === 0 ? "No hay pedidos registrados todavía." : "No se encontraron pedidos que coincidan con la búsqueda."}
                </td>
            </tr>
        `;
        return;
    }

    filteredOrders.forEach(order => {
        const tr = document.createElement("tr");
        
        // Formatear fecha
        const dateObj = new Date(order.createdAt);
        const fechaStr = isNaN(dateObj.getTime()) ? "Fecha desconocida" : dateObj.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
 
        // Formatear items
        const itemsHtml = order.items.map(item => 
            `<div style="font-size: 0.8rem; margin-bottom: 2px;">
                <strong>${item.quantity}x</strong> ${item.name} <span style="color: var(--accent); font-size: 0.75rem;">(${item.size})</span>
             </div>`
        ).join("");
 
        // Dirección / Método de entrega
        let metodoStr = "🏢 Taller";
        if (order.shippingMethod === "moto") {
            metodoStr = `🛵 Moto<br><span style="font-size: 0.75rem; color: var(--text-secondary);">${order.address || ''}</span>`;
        } else if (order.shippingMethod === "correo") {
            metodoStr = `📦 Correo<br><span style="font-size: 0.75rem; color: var(--text-secondary);">${order.address || ''}</span>`;
        }
 
        // Notas de cliente
        const notasHtml = order.notes 
            ? `<div style="font-size: 0.75rem; color: #fbbf24; margin-top: 4px; font-style: italic;">
                Obs: "${order.notes}"
               </div>`
            : "";
 
        // Clases de color para los estados
        let statusStyle = "background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);";
        if (order.status === "Confirmado" || order.status === "Completado" || order.status === "Entregado") {
            statusStyle = "background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);";
        } else if (order.status === "Cancelado") {
            statusStyle = "background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);";
        } else if (order.status === "Enviado") {
            statusStyle = "background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);";
        }
 
        tr.innerHTML = `
            <td style="white-space: nowrap;">${fechaStr}</td>
            <td>
                <div style="font-weight: 600; color: var(--white);">${order.clientName}</div>
                <div style="margin-top: 6px; padding: 4px 0; border-top: 1px dashed rgba(255,255,255,0.05); border-bottom: 1px dashed rgba(255,255,255,0.05);">
                    ${itemsHtml}
                </div>
                ${notasHtml}
            </td>
            <td>${metodoStr}</td>
            <td style="font-weight: 600; color: var(--white);">$${order.total.toLocaleString('es-AR')}</td>
            <td>
                <select class="form-control select-status" data-id="${order.id}" style="${statusStyle} padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; width: auto; font-weight: 600;">
                    <option value="Pendiente" ${order.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="Confirmado" ${order.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
                    <option value="Enviado" ${order.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="Entregado" ${order.status === 'Entregado' || order.status === 'Completado' ? 'selected' : ''}>Entregado</option>
                    <option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-print" title="Imprimir orden" data-id="${order.id}">
                        <i data-lucide="printer" style="width: 15px; height: 15px;"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger btn-delete-order" title="Eliminar pedido" data-id="${order.id}">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                    </button>
                </div>
            </td>
        `;
 
        // Listener para cambiar el estado
        const select = tr.querySelector(".select-status");
        select.addEventListener("change", async (e) => {
            const newStatus = e.target.value;
            try {
                await FirebaseService.updateOrderStatus(order.id, newStatus);
                showToast("Estado de pedido actualizado.");
                await loadDashboardData();
            } catch (err) {
                console.error(err);
                showToast("Error al actualizar estado.");
            }
        });
 
        // Listener para imprimir pedido
        tr.querySelector(".btn-print").addEventListener("click", () => {
            printOrderInvoice(order.id);
        });

        // Listener para eliminar pedido
        tr.querySelector(".btn-delete-order").addEventListener("click", async () => {
            if (confirm("⚠️ ¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.")) {
                try {
                    await FirebaseService.deleteOrder(order.id);
                    showToast("Pedido eliminado.");
                    await loadDashboardData();
                } catch (err) {
                    console.error(err);
                    showToast("Error al eliminar pedido.");
                }
            }
        });
 
        DOM.ordersTableBody.appendChild(tr);
    });
 
    lucide.createIcons();
}

// Renderizar chips de talles en el modal del admin
function renderAdminTallesChips() {
    if (!DOM.adminTallesChips) return;
    DOM.adminTallesChips.innerHTML = "";
    
    // Unir predefinidos y personalizados
    const allSizes = [...predefinedSizes, ...customSizes];
    
    allSizes.forEach(size => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `talle-chip ${selectedAdminSizes.includes(size) ? 'selected' : ''}`;
        chip.textContent = size;
        chip.addEventListener("click", () => {
            if (selectedAdminSizes.includes(size)) {
                selectedAdminSizes = selectedAdminSizes.filter(s => s !== size);
                chip.classList.remove("selected");
            } else {
                selectedAdminSizes.push(size);
                chip.classList.add("selected");
            }
        });
        DOM.adminTallesChips.appendChild(chip);
    });
}

// ABRIR MODAL DE PRODUCTO (CREAR / EDITAR)
function openProductModal(productId = null) {
    DOM.productForm.reset();
    currentUploadedImageUrl = "";
    DOM.imagePreview.innerHTML = "<span>Sin Imagen</span>";
    selectedAdminSizes = [];
    customSizes = [];
    
    if (productId) {
        // Modo Edición
        currentEditingProductId = productId;
        DOM.modalTitle.textContent = "Editar Prenda";
        
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            document.getElementById("prod-name").value = product.name || "";
            document.getElementById("prod-description").value = product.description || "";
            document.getElementById("prod-price").value = product.price || 0;
            document.getElementById("prod-category").value = product.category || "";
            
            // Cargar talles del producto
            if (product.sizes && Array.isArray(product.sizes)) {
                selectedAdminSizes = [...product.sizes];
                // Cargar talles que no estén predefinidos como personalizados
                product.sizes.forEach(s => {
                    if (!predefinedSizes.includes(s) && !customSizes.includes(s)) {
                        customSizes.push(s);
                    }
                });
            }
            
            document.getElementById("prod-stock").checked = !!product.inStock;
            document.getElementById("prod-limited").checked = !!product.isLimited;
            if (product.image) {
                DOM.imagePreview.innerHTML = `<img src="${product.image}" alt="Preview">`;
                currentUploadedImageUrl = product.image;
            } else {
                DOM.imagePreview.innerHTML = "<span>Sin Imagen</span>";
                currentUploadedImageUrl = "";
            }

            // Cargar imágenes adicionales
            if (product.images && Array.isArray(product.images) && product.images.length > 1) {
                const isFirstPrincipal = product.images[0] === product.image;
                currentAdditionalImages = isFirstPrincipal ? product.images.slice(1) : product.images.filter(img => img !== product.image);
            } else {
                currentAdditionalImages = [];
            }
            renderAdditionalPreviews();
            
            // Cargar video
            currentUploadedVideoUrl = product.video || "";
            renderVideoPreview();
        }
    } else {
        // Modo Crear Nuevo
        currentEditingProductId = null;
        DOM.modalTitle.textContent = "Agregar Nueva Prenda";
        document.getElementById("prod-stock").checked = true;
        document.getElementById("prod-limited").checked = true;
        currentUploadedImageUrl = "";
        currentAdditionalImages = [];
        currentUploadedVideoUrl = "";
        DOM.imagePreview.innerHTML = "<span>Sin Imagen</span>";
        renderAdditionalPreviews();
        renderVideoPreview();
    }
    
    renderAdminTallesChips();
    toggleProductModal(true);
}

// CONTROL DEL MODAL DE DETALLE / CRUD
function toggleProductModal(open) {
    if (!DOM.productModal) return;
    if (open) {
        DOM.productModal.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        DOM.productModal.classList.remove("open");
        document.body.style.overflow = "";
    }
}

// GUARDAR FORMULARIO DE PRODUCTO
async function saveProductForm() {
    const name = document.getElementById("prod-name").value.trim();
    const desc = document.getElementById("prod-description").value.trim();
    const price = parseFloat(document.getElementById("prod-price").value);
    const category = document.getElementById("prod-category").value;
    const inStock = document.getElementById("prod-stock").checked;
    const isLimited = document.getElementById("prod-limited").checked;
    if (!name || isNaN(price)) {
        showToast("Por favor completa los campos obligatorios.");
        return;
    }

    // Los talles se obtienen del estado del administrador (chips)
    const sizes = [...selectedAdminSizes];

    // Imagen principal
    const existingProduct = currentEditingProductId ? allProducts.find(p => p.id === currentEditingProductId) : null;
    const finalImageUrl = currentUploadedImageUrl || (existingProduct ? existingProduct.image : "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600");

    // Construir el array completo de imágenes (Principal + Adicionales)
    let images = [finalImageUrl, ...currentAdditionalImages];
    const videoUrl = currentUploadedVideoUrl || "";

    const productData = {
        id: currentEditingProductId || `prod-${Date.now()}`,
        name,
        description: desc,
        price,
        category,
        sizes,
        image: finalImageUrl,
        images: images,
        video: videoUrl,
        inStock,
        isLimited,
        createdAt: existingProduct ? existingProduct.createdAt : new Date().toISOString()
    };

    try {
        const saveBtn = DOM.productForm.querySelector("button[type='submit']");
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Guardando...";
        }

        await FirebaseService.saveProduct(productData);
        
        showToast("👗 Prenda guardada con éxito.");
        toggleProductModal(false);
        await loadDashboardData();
    } catch (err) {
        console.error(err);
        showToast("Error al guardar el producto.");
    }
}

// CONFIGURACIÓN DE DRAG & DROP E IMÁGENES A FIREBASE STORAGE
function setupDragAndDrop() {
    // 1. Cargador de Foto Principal
    if (DOM.dropZone && DOM.fileInput) {
        DOM.dropZone.addEventListener("click", () => DOM.fileInput.click());
        DOM.fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) handleUploadedFile(e.target.files[0], 'main');
        });
        DOM.dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            DOM.dropZone.style.borderColor = "var(--accent)";
            DOM.dropZone.style.background = "rgba(212, 175, 55, 0.05)";
        });
        DOM.dropZone.addEventListener("dragleave", () => {
            DOM.dropZone.style.borderColor = "var(--border-color)";
            DOM.dropZone.style.background = "rgba(255, 255, 255, 0.01)";
        });
        DOM.dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            DOM.dropZone.style.borderColor = "var(--border-color)";
            DOM.dropZone.style.background = "rgba(255, 255, 255, 0.01)";
            if (e.dataTransfer.files.length > 0) handleUploadedFile(e.dataTransfer.files[0], 'main');
        });
    }

    // 2. Cargador de Fotos Adicionales
    if (DOM.additionalDropZone && DOM.additionalFileInput) {
        DOM.additionalDropZone.addEventListener("click", () => DOM.additionalFileInput.click());
        DOM.additionalFileInput.addEventListener("change", async (e) => {
            if (e.target.files.length > 0) {
                for (const file of e.target.files) {
                    await handleUploadedFile(file, 'additional');
                }
            }
        });
        DOM.additionalDropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            DOM.additionalDropZone.style.borderColor = "var(--accent)";
            DOM.additionalDropZone.style.background = "rgba(212, 175, 55, 0.05)";
        });
        DOM.additionalDropZone.addEventListener("dragleave", () => {
            DOM.additionalDropZone.style.borderColor = "var(--border-color)";
            DOM.additionalDropZone.style.background = "rgba(255, 255, 255, 0.01)";
        });
        DOM.additionalDropZone.addEventListener("drop", async (e) => {
            e.preventDefault();
            DOM.additionalDropZone.style.borderColor = "var(--border-color)";
            DOM.additionalDropZone.style.background = "rgba(255, 255, 255, 0.01)";
            if (e.dataTransfer.files.length > 0) {
                for (const file of e.dataTransfer.files) {
                    await handleUploadedFile(file, 'additional');
                }
            }
        });
    }

    // 3. Cargador de Video
    if (DOM.videoDropZone && DOM.videoFileInput) {
        DOM.videoDropZone.addEventListener("click", () => DOM.videoFileInput.click());
        DOM.videoFileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) handleUploadedFile(e.target.files[0], 'video');
        });
        DOM.videoDropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            DOM.videoDropZone.style.borderColor = "var(--accent)";
            DOM.videoDropZone.style.background = "rgba(212, 175, 55, 0.05)";
        });
        DOM.videoDropZone.addEventListener("dragleave", () => {
            DOM.videoDropZone.style.borderColor = "var(--border-color)";
            DOM.videoDropZone.style.background = "rgba(255, 255, 255, 0.01)";
        });
        DOM.videoDropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            DOM.videoDropZone.style.borderColor = "var(--border-color)";
            DOM.videoDropZone.style.background = "rgba(255, 255, 255, 0.01)";
            if (e.dataTransfer.files.length > 0) handleUploadedFile(e.dataTransfer.files[0], 'video');
        });
    }
}

// Procesar el archivo cargado y enviarlo a Firebase Storage
async function handleUploadedFile(file, target) {
    if (!file) return;
    
    // Validar tipo (imagen / video)
    if (target === 'video' && !file.type.startsWith("video/")) {
        showToast("Por favor, selecciona un archivo de video válido.");
        return;
    }
    if (target !== 'video' && !file.type.startsWith("image/")) {
        showToast("Por favor, selecciona una imagen válida.");
        return;
    }

    // Actualizar UI del preview correspondiente
    if (target === 'main') {
        DOM.imagePreview.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div class="loader-pulse" style="width: 20px; height: 20px; border: 2.5px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span style="font-size: 0.65rem; color: var(--text-secondary);">Subiendo...</span>
            </div>
        `;
    } else if (target === 'additional') {
        const loadingThumb = document.createElement("div");
        loadingThumb.className = "preview-thumbnail";
        loadingThumb.id = "additional-loading-thumb";
        loadingThumb.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02);">
                <div class="loader-pulse" style="width: 14px; height: 14px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;
        const noMsg = document.getElementById("no-additional-msg");
        if (noMsg) noMsg.remove();
        DOM.additionalPreviewsContainer.appendChild(loadingThumb);
    } else if (target === 'video') {
        DOM.videoPreviewContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div class="loader-pulse" style="width: 20px; height: 20px; border: 2.5px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span style="font-size: 0.65rem; color: var(--text-secondary);">Subiendo...</span>
            </div>
        `;
    }

    try {
        const url = await FirebaseService.uploadImage(file);
        
        if (target === 'main') {
            DOM.imagePreview.innerHTML = `<img src="${url}" alt="Preview">`;
            currentUploadedImageUrl = url;
            showToast("¡Foto principal subida con éxito! 📷");
        } else if (target === 'additional') {
            const loadingThumb = document.getElementById("additional-loading-thumb");
            if (loadingThumb) loadingThumb.remove();
            
            currentAdditionalImages.push(url);
            renderAdditionalPreviews();
            showToast("¡Foto carrusel agregada con éxito! 🖼️");
        } else if (target === 'video') {
            currentUploadedVideoUrl = url;
            renderVideoPreview();
            showToast("¡Video de la prenda subido con éxito! 🎥");
        }
    } catch (error) {
        console.error(error);
        
        // Restaurar previews
        if (target === 'main') {
            DOM.imagePreview.innerHTML = currentUploadedImageUrl ? `<img src="${currentUploadedImageUrl}" alt="Preview">` : "<span>Sin Imagen</span>";
        } else if (target === 'additional') {
            const loadingThumb = document.getElementById("additional-loading-thumb");
            if (loadingThumb) loadingThumb.remove();
            renderAdditionalPreviews();
        } else if (target === 'video') {
            renderVideoPreview();
        }
        
        showToast(`Error al subir archivo: ${error.message || "Error crítico."}`);
    }
}

// Renderizar miniaturas de fotos adicionales en el modal
function renderAdditionalPreviews() {
    if (!DOM.additionalPreviewsContainer) return;
    
    DOM.additionalPreviewsContainer.innerHTML = "";
    
    if (currentAdditionalImages.length === 0) {
        DOM.additionalPreviewsContainer.innerHTML = `<span id="no-additional-msg" style="font-size: 0.75rem; color: var(--text-muted); width: 100%; text-align: center; display: block;">No hay fotos adicionales</span>`;
        return;
    }
    
    currentAdditionalImages.forEach((imgUrl, idx) => {
        const thumb = document.createElement("div");
        thumb.className = "preview-thumbnail";
        thumb.innerHTML = `
            <img src="${imgUrl}" alt="Miniatura ${idx + 1}">
            <button type="button" class="preview-thumbnail-remove" onclick="removeAdditionalImage(${idx})" title="Eliminar foto">×</button>
        `;
        DOM.additionalPreviewsContainer.appendChild(thumb);
    });
}

// Eliminar foto adicional
window.removeAdditionalImage = function(index) {
    currentAdditionalImages.splice(index, 1);
    renderAdditionalPreviews();
};

// Renderizar preview de video en el modal
function renderVideoPreview() {
    if (!DOM.videoPreviewContainer) return;
    
    DOM.videoPreviewContainer.innerHTML = "";
    
    if (!currentUploadedVideoUrl) {
        DOM.videoPreviewContainer.innerHTML = "<span>Sin Video</span>";
        return;
    }
    
    const wrapper = document.createElement("div");
    wrapper.className = "video-preview-box";
    wrapper.innerHTML = `
        <video src="${currentUploadedVideoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" muted playsinline></video>
        <button type="button" class="video-preview-remove" onclick="removeUploadedVideo()" title="Eliminar video">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:2px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Eliminar
        </button>
    `;
    DOM.videoPreviewContainer.appendChild(wrapper);
}

// Eliminar video
window.removeUploadedVideo = function() {
    currentUploadedVideoUrl = "";
    renderVideoPreview();
};

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
        
        chip.querySelector(".btn-delete-cat").addEventListener("click", async () => {
            if (confirm(`¿Borrar la categoría "${cat}"? Los productos que la usan no se borrarán, pero ya no aparecerá como filtro.`)) {
                settings.categories = settings.categories.filter(c => c !== cat);
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
        });
        DOM.adminCategoriesList.appendChild(chip);
    });

    lucide.createIcons();
}

// Rellenar formulario de configuración general
function populateSettingsForm() {
    if (!DOM.settingsForm) return;
    
    const storeNameEl = document.getElementById("cfg-store-name");
    const whatsappEl = document.getElementById("cfg-whatsapp");
    const instagramEl = document.getElementById("cfg-instagram");
    const shippingEl = document.getElementById("cfg-shipping");
    const bannerEl = document.getElementById("cfg-banner");
    
    if (storeNameEl) storeNameEl.value = settings.storeName || "";
    if (whatsappEl) whatsappEl.value = settings.whatsapp || "";
    if (instagramEl) instagramEl.value = settings.instagram || "";
    if (shippingEl) shippingEl.value = settings.shippingText || "";
    if (bannerEl) bannerEl.value = settings.bannerText || "";
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

// ==========================================================================
// NUEVAS FUNCIONALIDADES COMERCIALES Y DE ALERTAS (ADMINISTRADOR)
// ==========================================================================

// 1. POBLAR CONFIGURACIÓN COMERCIAL (Envíos y Cupones)
function populateCommercialSettings() {
    // Rellenar costos de envío
    const rates = settings.shippingRates || { retiro: 0, moto: 1500, correo: 3500 };
    if (DOM.shipRetiroInput) DOM.shipRetiroInput.value = rates.retiro !== undefined ? rates.retiro : 0;
    if (DOM.shipMotoInput) DOM.shipMotoInput.value = rates.moto !== undefined ? rates.moto : 1500;
    if (DOM.shipCorreoInput) DOM.shipCorreoInput.value = rates.correo !== undefined ? rates.correo : 3500;

    // Renderizar cupones
    renderCouponsList();
}

// Renderizar tabla de cupones
function renderCouponsList() {
    if (!DOM.couponsListBody) return;
    DOM.couponsListBody.innerHTML = "";

    const coupons = settings.coupons || {};
    const codes = Object.keys(coupons);

    if (codes.length === 0) {
        DOM.couponsListBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 15px;">
                    No hay cupones creados todavía.
                </td>
            </tr>
        `;
        return;
    }

    codes.forEach(code => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border-color)";
        tr.innerHTML = `
            <td style="padding: 10px; font-weight: 700; color: var(--white);">${code}</td>
            <td style="padding: 10px; color: var(--accent); font-weight: 600;">${coupons[code]}% OFF</td>
            <td style="padding: 10px; text-align: right;">
                <button class="btn-icon btn-icon-danger btn-delete-coupon" title="Eliminar cupón" data-code="${code}">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                </button>
            </td>
        `;

        tr.querySelector(".btn-delete-coupon").addEventListener("click", async () => {
            if (confirm(`¿Estás seguro de eliminar el cupón "${code}"?`)) {
                await deleteCoupon(code);
            }
        });

        DOM.couponsListBody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
}

// Eliminar un cupón
async function deleteCoupon(code) {
    if (settings.coupons && settings.coupons[code] !== undefined) {
        delete settings.coupons[code];
        try {
            await FirebaseService.saveConfig(settings);
            renderCouponsList();
            showToast(`Cupón ${code} eliminado con éxito.`);
        } catch (err) {
            console.error(err);
            showToast("Error al eliminar cupón.");
        }
    }
}

// 2. EXPORTAR PEDIDOS A CSV
function exportOrdersToCSV() {
    if (allOrders.length === 0) {
        showToast("No hay pedidos para exportar.");
        return;
    }
    
    // Filtrar pedidos según búsqueda y estado actuales
    const filteredOrders = allOrders.filter(order => {
        const nameMatch = order.clientName ? order.clientName.toLowerCase().includes(searchOrdersQuery) : false;
        const itemMatch = order.items ? order.items.some(item => item.name.toLowerCase().includes(searchOrdersQuery)) : false;
        const matchesSearch = nameMatch || itemMatch;
        
        const matchesStatus = filterOrdersStatusValue === "Todos" || order.status === filterOrdersStatusValue;
        return matchesSearch && matchesStatus;
    });

    if (filteredOrders.length === 0) {
        showToast("No hay pedidos que coincidan con los filtros activos.");
        return;
    }
    
    let csv = "ID Pedido,Fecha,Cliente,Productos,Metodo Entrega,Subtotal,Descuento,Costo Envio,Total,Estado,Notas\n";
    
    filteredOrders.forEach(o => {
        const cleanName = (o.clientName || "").replace(/,/g, " ").replace(/"/g, '""');
        const cleanDate = new Date(o.createdAt).toLocaleString('es-AR').replace(/,/g, " ");
        
        const productsText = o.items.map(item => `${item.quantity}x ${item.name} (${item.size})`).join(" | ").replace(/,/g, " ");
        
        const cleanShipping = (o.shippingMethod || "").toUpperCase();
        const cleanAddress = (o.address || "").replace(/,/g, " ").replace(/"/g, '""');
        
        const subtotalPrendas = o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = o.discount || 0;
        const shippingCost = o.shippingCost || 0;
        
        const cleanNotes = (o.notes || "").replace(/,/g, " ").replace(/\n/g, " ").replace(/"/g, '""');
        
        const shippingColVal = cleanShipping === "CORREO" || cleanShipping === "MOTO"
            ? `${cleanShipping} (${cleanAddress})`
            : cleanShipping;

        csv += `"${o.id}","${cleanDate}","${cleanName}","${productsText}","${shippingColVal}",${subtotalPrendas},${discount},${shippingCost},${o.total},"${o.status}","${cleanNotes}"\n`;
    });
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" }); // UTF-8 BOM
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_curvys_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 3. IMPRIMIR ORDEN DE EMPAQUE (VISTA DE FACTURA EN VENTANA LIMPIA)
function printOrderInvoice(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        showToast("Por favor habilita las ventanas emergentes en tu navegador.");
        return;
    }

    const itemsHtml = order.items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 10px; color: #111; font-weight: 500;">${item.name}</td>
            <td style="padding: 12px 10px; text-align: center; font-weight: bold; color: #555;">${item.size}</td>
            <td style="padding: 12px 10px; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px 10px; text-align: right; color: #555;">$${item.price.toLocaleString('es-AR')}</td>
            <td style="padding: 12px 10px; text-align: right; font-weight: 600; color: #111;">$${(item.price * item.quantity).toLocaleString('es-AR')}</td>
        </tr>
    `).join("");
    
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountHtml = order.discount && order.discount > 0 
        ? `<p style="margin: 5px 0; color: #ef4444;"><strong>Descuento (${order.coupon || ''}):</strong> -$${order.discount.toLocaleString('es-AR')}</p>`
        : "";
    const shippingHtml = order.shippingCost && order.shippingCost > 0
        ? `<p style="margin: 5px 0;"><strong>Envío:</strong> $${order.shippingCost.toLocaleString('es-AR')}</p>`
        : `<p style="margin: 5px 0; color: #10b981;"><strong>Envío:</strong> Gratis</p>`;
        
    const dateObj = new Date(order.createdAt);
    const cleanDate = isNaN(dateObj.getTime()) ? "Fecha desconocida" : dateObj.toLocaleString('es-AR');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orden de Empaque - ${order.id}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                body { 
                    font-family: 'Inter', sans-serif; 
                    color: #1f2937; 
                    margin: 40px; 
                    line-height: 1.5; 
                    background: #fff;
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    border-bottom: 2px solid #b8952b; 
                    padding-bottom: 20px; 
                }
                .logo { 
                    font-size: 26px; 
                    font-weight: 700; 
                    color: #b8952b; 
                    letter-spacing: -0.02em;
                }
                .info-section { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 25px; 
                    margin: 30px 0; 
                }
                .card { 
                    background: #fdfbf7; 
                    padding: 18px; 
                    border-radius: 8px; 
                    border: 1px solid #f6f3eb; 
                }
                h3 { 
                    margin-top: 0; 
                    color: #b8952b; 
                    font-size: 0.95rem; 
                    border-bottom: 1px dashed #e5e7eb; 
                    padding-bottom: 8px; 
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 25px; 
                }
                th { 
                    background: #f9fafb; 
                    padding: 12px 10px; 
                    text-align: left; 
                    font-size: 0.85rem; 
                    text-transform: uppercase;
                    color: #6b7280;
                    font-weight: 600;
                    border-bottom: 2px solid #e5e7eb;
                }
                .totals { 
                    display: flex; 
                    flex-direction: column; 
                    align-items: flex-end; 
                    margin-top: 30px; 
                    font-size: 0.9rem; 
                    color: #4b5563;
                }
                .total-price { 
                    font-size: 1.5rem; 
                    font-weight: 700; 
                    color: #b8952b; 
                    margin-top: 10px; 
                    border-top: 2px solid #b8952b;
                    padding-top: 8px;
                    width: 250px;
                    text-align: right;
                }
                .btn-print-action {
                    background: #b8952b; 
                    color: white; 
                    border: none; 
                    padding: 12px 30px; 
                    font-size: 0.9rem; 
                    font-weight: 600; 
                    border-radius: 6px; 
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(184, 149, 43, 0.2);
                    transition: 0.2s;
                }
                .btn-print-action:hover {
                    background: #9c7d1e;
                }
                @media print {
                    body { margin: 20px; color: #000; }
                    .no-print { display: none !important; }
                    .card { background: #fff; border-color: #ddd; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo">Curvys.Store by Moni</div>
                    <div style="font-size: 0.85rem; color: #4b5563; margin-top: 3px;">Indumentaria de Edición Limitada</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 1.25rem; color: #111; letter-spacing: -0.01em;">ORDEN DE EMPAQUE</div>
                    <div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px;">ID: ${order.id}</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">Fecha: ${cleanDate}</div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="card">
                    <h3>Datos de Entrega</h3>
                    <p style="margin: 6px 0;"><strong>Cliente:</strong> ${order.clientName}</p>
                    <p style="margin: 6px 0;"><strong>Método:</strong> ${order.shippingMethod.toUpperCase()}</p>
                    ${order.address ? `<p style="margin: 6px 0;"><strong>Dirección:</strong> ${order.address}</p>` : ""}
                </div>
                <div class="card">
                    <h3>Detalles y Notas</h3>
                    <p style="margin: 6px 0;"><strong>Estado del Pedido:</strong> <span style="font-weight: 600;">${order.status}</span></p>
                    <p style="margin: 6px 0;"><strong>Notas:</strong> <em>${order.notes || "Sin especificaciones del cliente"}</em></p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th style="text-align: center;">Talle</th>
                        <th style="text-align: center;">Cantidad</th>
                        <th style="text-align: right;">Precio Unitario</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div class="totals">
                <p style="margin: 5px 0;">Subtotal prendas: $${subtotal.toLocaleString('es-AR')}</p>
                ${discountHtml}
                ${shippingHtml}
                <div class="total-price">Total a Cobrar: $${order.total.toLocaleString('es-AR')}</div>
            </div>
            
            <div style="margin-top: 50px; text-align: center;" class="no-print">
                <button onclick="window.print()" class="btn-print-action">Imprimir Orden de Empaque</button>
            </div>
            
            <script>
                // Auto trigger de impresión al cargar la ventana
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// 4. SINTETIZADOR WEB AUDIO API PARA NUEVO PEDIDO
function playNewOrderSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Melodía corta: Nota 1 (C5 - 523.25Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.18);
        
        // Nota 2 (E5 - 659.25Hz) con ligero retardo
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain2.gain.setValueAtTime(0.08, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.4);
        }, 120);
    } catch (e) {
        console.error("Audio Synthesis Error: ", e);
    }
}

// Iniciar aplicación al cargar el DOM
document.addEventListener("DOMContentLoaded", initAdmin);
