// Main Client Script - Curvys Store by Moni

// Variables de estado
let products = [];
let storeConfig = {};
let cart = [];
let activeCategory = "Todos";
let searchQuery = "";
let selectedSize = "";

// Referencias a elementos del DOM
const DOM = {
    productsGrid: document.getElementById("products-grid"),
    categoriesScroll: document.getElementById("categories-scroll"),
    productCount: document.getElementById("product-count"),
    searchInput: document.getElementById("search-input"),
    
    // Carrito
    cartOverlay: document.getElementById("cart-overlay"),
    cartTrigger: document.getElementById("cart-trigger"),
    cartClose: document.getElementById("cart-close"),
    cartItems: document.getElementById("cart-items"),
    cartCount: document.getElementById("cart-count"),
    cartTotal: document.getElementById("cart-total"),
    
    // Formulario de Compra
    checkoutForm: document.getElementById("checkout-form"),
    whatsappBtn: document.getElementById("whatsapp-btn"),
    
    // Modal de Detalle
    modalOverlay: document.getElementById("modal-overlay"),
    modalClose: document.getElementById("modal-close"),
    modalImg: document.getElementById("modal-img"),
    modalCat: document.getElementById("modal-cat"),
    modalTitle: document.getElementById("modal-title"),
    modalPrice: document.getElementById("modal-price"),
    modalDesc: document.getElementById("modal-desc"),
    modalSizes: document.getElementById("modal-sizes"),
    modalAddToCart: document.getElementById("modal-add-to-cart"),
    
    // Banner e Información General
    bannerText: document.getElementById("banner-text"),
    heroTitle: document.getElementById("hero-title"),
    heroDesc: document.getElementById("hero-desc"),
    footerAbout: document.getElementById("footer-about"),
    footerInsta: document.getElementById("footer-insta"),
    footerWhatsapp: document.getElementById("footer-whatsapp"),
    instagramLink: document.getElementById("instagram-link"),
    contactLink: document.getElementById("contact-link")
};

// Inicialización de la aplicación
async function initApp() {
    try {
        console.log("🚀 [App] Inicializando tienda...");
        
        // Cargar Carrito desde LocalStorage
        loadCart();

        // Obtener datos del servicio de base de datos
        products = await FirebaseService.getProducts();
        storeConfig = await FirebaseService.getConfig();

        // Caídas de seguridad en caso de base de datos vacía o carga demorada
        if (!products || products.length === 0) {
            products = window.initialProducts || [];
        }
        if (!storeConfig || Object.keys(storeConfig).length === 0) {
            storeConfig = window.initialConfig || {};
        }

        // Configurar UI con datos del negocio
        applyStoreConfig();

        // Renderizar Categorías y Productos
        renderCategories();
        renderProducts();
        updateCartUI();

        // Registrar Event Listeners
        registerEventListeners();

    } catch (error) {
        console.error("❌ [App] Error al inicializar la tienda:", error);
        showToast("Error al cargar la tienda. Usando datos de respaldo.");
        
        // Cargamos de respaldo inmediato
        products = window.initialProducts || [];
        storeConfig = window.initialConfig || {};
        applyStoreConfig();
        renderCategories();
        renderProducts();
        updateCartUI();
        registerEventListeners();
    }
}

// Configurar elementos informativos de la marca
function applyStoreConfig() {
    if (DOM.bannerText) DOM.bannerText.textContent = storeConfig.bannerText || "";
    if (DOM.heroTitle) DOM.heroTitle.textContent = storeConfig.storeName || "Curvys.Store by Moni";
    if (DOM.heroDesc) DOM.heroDesc.textContent = storeConfig.shippingText ? `👗 Edición limitada | 📦 ${storeConfig.shippingText}` : "👗 Edición limitada | Envíos a todo el país";
    if (DOM.footerAbout) DOM.footerAbout.textContent = `Indumentaria de diseño y edición limitada. Confección artesanal pensada para realzar tus curvas y hacerte lucir fantástica. ${storeConfig.shippingText || "Envíos a todo el país."}`;
    
    // Configurar enlaces sociales
    if (DOM.instagramLink) DOM.instagramLink.href = storeConfig.instagram || "#";
    if (DOM.contactLink) DOM.contactLink.href = `https://wa.me/${storeConfig.whatsapp}`;
    if (DOM.footerInsta) DOM.footerInsta.href = storeConfig.instagram || "#";
    if (DOM.footerWhatsapp) DOM.footerWhatsapp.href = `https://wa.me/${storeConfig.whatsapp}`;
}

// Registrar Eventos de la Interfaz
function registerEventListeners() {
    // Buscador
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderProducts();
        });
    }

    // Carrito Trigger
    if (DOM.cartTrigger) {
        DOM.cartTrigger.addEventListener("click", () => toggleCartDrawer(true));
    }
    if (DOM.cartClose) {
        DOM.cartClose.addEventListener("click", () => toggleCartDrawer(false));
    }
    if (DOM.cartOverlay) {
        DOM.cartOverlay.addEventListener("click", (e) => {
            if (e.target === DOM.cartOverlay) {
                toggleCartDrawer(false);
            }
        });
    }

    // Modal de Detalle
    if (DOM.modalClose) {
        DOM.modalClose.addEventListener("click", () => toggleDetailModal(false));
    }
    if (DOM.modalOverlay) {
        DOM.modalOverlay.addEventListener("click", (e) => {
            if (e.target === DOM.modalOverlay) {
                toggleDetailModal(false);
            }
        });
    }

    // Finalizar compra (WhatsApp Checkout)
    if (DOM.checkoutForm) {
        DOM.checkoutForm.addEventListener("submit", (e) => {
            e.preventDefault();
            sendWhatsAppOrder();
        });
    }
}

// Renderizar barra de categorías
function renderCategories() {
    if (!DOM.categoriesScroll) return;
    
    const categories = ["Todos", ...(storeConfig.categories || [])];
    DOM.categoriesScroll.innerHTML = "";
    
    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `category-btn ${cat === activeCategory ? 'active' : ''}`;
        btn.textContent = cat;
        btn.addEventListener("click", () => {
            // Cambiar categoría activa
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = cat;
            renderProducts();
        });
        DOM.categoriesScroll.appendChild(btn);
    });
}

// Renderizar tarjetas de producto
function renderProducts() {
    if (!DOM.productsGrid) return;
    
    DOM.productsGrid.innerHTML = "";
    
    // Filtrar productos
    const filteredProducts = products.filter(p => {
        const matchesCategory = activeCategory === "Todos" || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                              p.description.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });
    
    // Actualizar conteo
    if (DOM.productCount) {
        DOM.productCount.textContent = `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}`;
    }

    if (filteredProducts.length === 0) {
        DOM.productsGrid.innerHTML = `
            <div class="cart-empty" style="grid-column: 1/-1; padding: 60px 0;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <h3>No se encontraron productos</h3>
                <p>Prueba buscando con otros términos o seleccionando otra categoría.</p>
            </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        
        // Generar badges
        let badgesHtml = "";
        if (product.isLimited) {
            badgesHtml += `<span class="badge badge-limited">Edición Limitada</span>`;
        }
        if (!product.inStock) {
            badgesHtml += `<span class="badge badge-outofstock">Sin Stock</span>`;
        }

        card.innerHTML = `
            <div class="product-card-media" style="cursor: pointer;">
                <div class="card-badges">${badgesHtml}</div>
                <img src="${product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600'}" class="product-card-img" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-card-body">
                <span class="product-card-cat">${product.category}</span>
                <h3 class="product-card-title">${product.name}</h3>
                <p class="product-card-desc">${product.description}</p>
                <div class="product-card-bottom">
                    <span class="product-card-price">$${product.price.toLocaleString('es-AR')}</span>
                    <button class="btn-card-add" ${!product.inStock ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} title="Ver talles y agregar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Click en la tarjeta o botón agregar abre el modal de detalles
        const media = card.querySelector(".product-card-media");
        const addBtn = card.querySelector(".btn-card-add");
        
        media.addEventListener("click", () => openProductModal(product));
        if (addBtn && product.inStock) {
            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openProductModal(product);
            });
        }

        DOM.productsGrid.appendChild(card);
    });
}

// Abrir detalle del producto
function openProductModal(product) {
    if (!product) return;
    
    selectedSize = ""; // Resetear selección de talle
    DOM.modalImg.src = product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600';
    DOM.modalCat.textContent = product.category;
    DOM.modalTitle.textContent = product.name;
    DOM.modalPrice.textContent = `$${product.price.toLocaleString('es-AR')}`;
    DOM.modalDesc.textContent = product.description;
    
    // Crear chips de talles
    DOM.modalSizes.innerHTML = "";
    if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach(size => {
            const chip = document.createElement("button");
            chip.className = "size-chip";
            chip.textContent = size;
            chip.addEventListener("click", () => {
                document.querySelectorAll(".size-chip").forEach(c => c.classList.remove("selected"));
                chip.classList.add("selected");
                selectedSize = size;
            });
            DOM.modalSizes.appendChild(chip);
        });
        
        // Seleccionar automáticamente el primero
        if (DOM.modalSizes.firstChild) {
            DOM.modalSizes.firstChild.click();
        }
    } else {
        DOM.modalSizes.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Talle único</p>`;
        selectedSize = "Único";
    }

    // Configurar acción de botón agregar
    DOM.modalAddToCart.disabled = !product.inStock;
    if (!product.inStock) {
        DOM.modalAddToCart.textContent = "Sin Stock";
    } else {
        DOM.modalAddToCart.textContent = "Agregar al Carrito";
        // Eliminar listeners previos clonando el nodo
        const newBtn = DOM.modalAddToCart.cloneNode(true);
        DOM.modalAddToCart.parentNode.replaceChild(newBtn, DOM.modalAddToCart);
        DOM.modalAddToCart = newBtn;
        
        DOM.modalAddToCart.addEventListener("click", () => {
            if (!selectedSize) {
                showToast("Por favor selecciona un talle.");
                return;
            }
            addToCart(product, selectedSize);
            toggleDetailModal(false);
        });
    }

    toggleDetailModal(true);
}

// Control de ventanas/cajones deslizables
function toggleCartDrawer(open) {
    if (open) {
        DOM.cartOverlay.classList.add("open");
        document.body.style.overflow = "hidden"; // Desactivar scroll del fondo
    } else {
        DOM.cartOverlay.classList.remove("open");
        document.body.style.overflow = "";
    }
}

function toggleDetailModal(open) {
    if (open) {
        DOM.modalOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        DOM.modalOverlay.classList.remove("open");
        document.body.style.overflow = "";
    }
}

// LÓGICA DEL CARRITO

function addToCart(product, size) {
    const existingIndex = cart.findIndex(item => item.id === product.id && item.size === size);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: size,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartUI();
    toggleCartDrawer(true);
    showToast(`🛍️ Agregado: ${product.name} (Talle ${size})`);
}

function updateCartQuantity(id, size, change) {
    const index = cart.findIndex(item => item.id === id && item.size === size);
    if (index === -1) return;

    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    
    saveCart();
    updateCartUI();
}

function removeFromCart(id, size) {
    cart = cart.filter(item => !(item.id === id && item.size === size));
    saveCart();
    updateCartUI();
    showToast("Producto eliminado del carrito");
}

function loadCart() {
    const localCart = localStorage.getItem("curvys_cart");
    cart = localCart ? JSON.parse(localCart) : [];
}

function saveCart() {
    localStorage.setItem("curvys_cart", JSON.stringify(cart));
}

// Dibujar Carrito y calcular totales
function updateCartUI() {
    if (!DOM.cartItems) return;
    
    DOM.cartItems.innerHTML = "";
    let totalItems = 0;
    let totalPrice = 0;
    
    if (cart.length === 0) {
        DOM.cartItems.innerHTML = `
            <div class="cart-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <h3>Tu carrito está vacío</h3>
                <p>Explora nuestro catálogo exclusivo y agrega las prendas que te encanten.</p>
            </div>
        `;
        // Ocultar formulario de compra
        if (DOM.checkoutForm) DOM.checkoutForm.style.display = "none";
    } else {
        if (DOM.checkoutForm) DOM.checkoutForm.style.display = "flex";
        
        cart.forEach(item => {
            totalItems += item.quantity;
            totalPrice += item.price * item.quantity;
            
            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <img src="${item.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600'}" class="cart-item-img" alt="${item.name}">
                <div class="cart-item-info">
                    <div>
                        <h4 class="cart-item-name">${item.name}</h4>
                        <p class="cart-item-meta">Talle: <span>${item.size}</span></p>
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-selector">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', '${item.size}', -1)">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', '${item.size}', 1)">+</button>
                        </div>
                        <span class="cart-item-price">$${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}', '${item.size}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;
            DOM.cartItems.appendChild(div);
        });
    }
    
    // Actualizar contadores globales
    if (DOM.cartCount) DOM.cartCount.textContent = totalItems;
    if (DOM.cartTotal) DOM.cartTotal.textContent = `$${totalPrice.toLocaleString('es-AR')}`;
    
    // Exponer funciones auxiliares para que sean clickeables desde el HTML inline temporalmente
    window.updateCartQuantity = updateCartQuantity;
    window.removeFromCart = removeFromCart;
}

// CHECKOUT POR WHATSAPP
function sendWhatsAppOrder() {
    if (cart.length === 0) return;
    
    // Obtener campos de contacto
    const nombre = document.getElementById("client-name").value.trim();
    const envio = document.getElementById("client-shipping").value;
    const direccion = document.getElementById("client-address").value.trim();
    const notas = document.getElementById("client-notes").value.trim();
    
    if (!nombre) {
        showToast("Por favor ingresa tu nombre.");
        return;
    }
    
    if (envio === "correo" && !direccion) {
        showToast("Por favor ingresa una dirección para el envío.");
        return;
    }

    // Calcular el total
    let total = 0;
    
    // Construir mensaje amigable
    let mensaje = `🌸 *Pedido - Curvys Store by Moni* 🌸\n\n`;
    mensaje += `Hola Moni! Me interesa realizar este pedido:\n`;
    mensaje += `-----------------------------------------\n`;
    
    cart.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        total += itemSubtotal;
        mensaje += `• *${item.quantity}x* ${item.name}\n  Talle: ${item.size} | Subtotal: $${itemSubtotal.toLocaleString('es-AR')}\n\n`;
    });
    
    mensaje += `-----------------------------------------\n`;
    mensaje += `💰 *Total del Pedido: $${total.toLocaleString('es-AR')}*\n\n`;
    
    mensaje += `👤 *Datos del Cliente:*\n`;
    mensaje += `- *Nombre:* ${nombre}\n`;
    mensaje += `- *Entrega:* ${envio === 'correo' ? '📦 Envíos a todo el país' : '🏢 Retiro en tienda'}\n`;
    if (envio === 'correo') {
        mensaje += `- *Dirección:* ${direccion}\n`;
    }
    if (notas) {
        mensaje += `- *Notas:* ${notas}\n`;
    }
    
    mensaje += `\n🛒 _Pedido generado desde la web tienda._`;

    // Obtener teléfono de destino (eliminar caracteres raros)
    const phone = (storeConfig.whatsapp || "5491133224455").replace(/[^0-9]/g, "");
    
    // Generar url de WhatsApp
    const encodedText = encodeURIComponent(mensaje);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
    
    // Abrir enlace en nueva pestaña
    window.open(whatsappUrl, "_blank");
    
    // Vaciar Carrito (opcional, recomendado post-redirección exitosa)
    cart = [];
    saveCart();
    updateCartUI();
    toggleCartDrawer(false);
    
    // Limpiar formulario
    DOM.checkoutForm.reset();
    showToast("¡Redirigiendo a WhatsApp para finalizar tu compra! 🎉");
}

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
    
    // Disparar animación
    setTimeout(() => toast.classList.add("show"), 50);
    
    // Remover después de 3.5 segundos
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Escuchar cambios en la categoría de entrega
document.addEventListener("DOMContentLoaded", () => {
    initApp();

    const shippingSelect = document.getElementById("client-shipping");
    const addressGroup = document.getElementById("address-group");
    
    if (shippingSelect && addressGroup) {
        shippingSelect.addEventListener("change", (e) => {
            if (e.target.value === "correo") {
                addressGroup.style.display = "flex";
                document.getElementById("client-address").required = true;
            } else {
                addressGroup.style.display = "none";
                document.getElementById("client-address").required = false;
                document.getElementById("client-address").value = "";
            }
        });
    }
});
