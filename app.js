// Main Client Script - Curvys Store by Moni

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Variables de estado
let products = [];
let storeConfig = {};
let cart = [];
let activeCategory = "Todos";
let searchQuery = "";
let selectedSize = "";
let currentProductImages = [];
let currentImageIndex = 0;

// Variables de las nuevas características
let currentTheme = "light";
let activeFavoritesFilter = false;
let activeCoupon = null; // Almacenará { code: "CURVYS10", percent: 10 }
let sizeGuideVisible = false;
let selectedShippingMethod = "retiro";
let favoritesList = [];
let currentSort = "default";

// Referencias a elementos del DOM
const DOM = {
    productsGrid: document.getElementById("products-grid"),
    categoriesScroll: document.getElementById("categories-scroll"),
    productCount: document.getElementById("product-count"),
    searchInput: document.getElementById("search-input"),
    sortSelect: document.getElementById("sort-select"),
    
    // Carrito
    cartOverlay: document.getElementById("cart-overlay"),
    cartTrigger: document.getElementById("cart-trigger"),
    cartClose: document.getElementById("cart-close"),
    cartItems: document.getElementById("cart-items"),
    cartCount: document.getElementById("cart-count"),
    cartTotal: document.getElementById("cart-total"),
    
    // Desglose del Carrito
    cartSubtotal: document.getElementById("cart-subtotal"),
    cartDiscountRow: document.getElementById("cart-discount-row"),
    cartDiscountPercent: document.getElementById("cart-discount-percent"),
    cartDiscountVal: document.getElementById("cart-discount-val"),
    cartShippingVal: document.getElementById("cart-shipping-val"),
    shippingCostLabel: document.getElementById("shipping-cost-label"),
    
    // Cupones en el Carrito
    couponInput: document.getElementById("coupon-input"),
    btnApplyCoupon: document.getElementById("btn-apply-coupon"),
    couponMessage: document.getElementById("coupon-message"),
    
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

    // Guía de Talles
    btnSizeGuide: document.getElementById("btn-size-guide"),
    sizeGuideContainer: document.getElementById("size-guide-container"),
    sizeGuideRows: document.getElementById("size-guide-rows"),

    // Carrusel
    carouselContainer: document.getElementById("modal-carousel-container"),
    carouselTrack: document.getElementById("modal-carousel-track"),
    carouselPrev: document.getElementById("carousel-prev"),
    carouselNext: document.getElementById("carousel-next"),
    carouselIndicators: document.getElementById("carousel-indicators"),
    
    // Nuevos Elementos Tienda
    themeToggle: document.getElementById("theme-toggle"),
    heroSlidesContainer: document.getElementById("hero-slides-container"),
    favFilterBtn: document.getElementById("fav-filter-btn"),
    
    // Banner e Información General
    bannerText: document.getElementById("banner-text"),
    heroTitle: document.getElementById("hero-title"),
    heroDesc: document.getElementById("hero-desc"),
    footerAbout: document.getElementById("footer-about"),
    footerInsta: document.getElementById("footer-insta"),
    footerWhatsapp: document.getElementById("footer-whatsapp"),
    instagramLink: document.getElementById("instagram-link"),
    whatsappFloatBtn: document.getElementById("whatsapp-float-btn")
};

// Inicialización de la aplicación
async function initApp() {
    try {
        console.log("🚀 [App] Inicializando tienda...");
        
        // Cargar Carrito y Favoritos
        loadCart();
        loadFavorites();

        // Registrar Event Listeners de inmediato para que la UI responda rápido
        registerEventListeners();

        // Obtener datos del servicio de base de datos
        products = await FirebaseService.getProducts();
        storeConfig = await FirebaseService.getConfig();

        // Caídas de seguridad en caso de carga fallida (null o undefined)
        if (products === null || products === undefined) {
            products = window.initialProducts || [];
        }
        if (!storeConfig || Object.keys(storeConfig).length === 0) {
            storeConfig = window.initialConfig || {};
        }

        // Configurar UI con datos del negocio
        applyStoreConfig();
        initTheme();

        // Iniciar Slider
        startHeroSlider();

        // Renderizar Categorías y Productos
        renderCategories();
        renderProducts();
        updateCartUI();

    } catch (error) {
        console.error("❌ [App] Error al inicializar la tienda:", error);
        showToast("Error al cargar la tienda. Usando datos de respaldo.");
        
        // Cargamos de respaldo inmediato
        products = window.initialProducts || [];
        storeConfig = window.initialConfig || {};
        applyStoreConfig();
        initTheme();
        startHeroSlider();
        renderCategories();
        renderProducts();
        updateCartUI();
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
    if (DOM.footerInsta) DOM.footerInsta.href = storeConfig.instagram || "#";
    if (DOM.footerWhatsapp) DOM.footerWhatsapp.href = `https://wa.me/${storeConfig.whatsapp}`;
    if (DOM.whatsappFloatBtn) DOM.whatsappFloatBtn.href = `https://wa.me/${storeConfig.whatsapp || "5491150158665"}`;
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

    // Ordenador
    if (DOM.sortSelect) {
        DOM.sortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value;
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

    // Carrusel Prev/Next
    if (DOM.carouselPrev) {
        DOM.carouselPrev.addEventListener("click", () => {
            if (currentProductImages.length > 1) {
                currentImageIndex = (currentImageIndex - 1 + currentProductImages.length) % currentProductImages.length;
                updateCarousel();
            }
        });
    }
    if (DOM.carouselNext) {
        DOM.carouselNext.addEventListener("click", () => {
            if (currentProductImages.length > 1) {
                currentImageIndex = (currentImageIndex + 1) % currentProductImages.length;
                updateCarousel();
            }
        });
    }


    // Tema Claro/Oscuro Toggle
    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener("click", () => {
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            setTheme(nextTheme);
            showToast(`Tema cambiado a ${nextTheme === 'light' ? 'Claro (Luxe Sand)' : 'Oscuro'}`);
        });
    }

    // Filtro de Favoritos
    if (DOM.favFilterBtn) {
        DOM.favFilterBtn.addEventListener("click", () => {
            activeFavoritesFilter = !activeFavoritesFilter;
            if (activeFavoritesFilter) {
                DOM.favFilterBtn.classList.add("active");
                // Desactivar clase activa en botones de categorías comunes
                document.querySelectorAll(".category-btn:not(.fav-filter-btn)").forEach(b => b.classList.remove("active"));
            } else {
                DOM.favFilterBtn.classList.remove("active");
                // Volver a activar categoría seleccionada
                const catBtns = document.querySelectorAll(".category-btn:not(.fav-filter-btn)");
                catBtns.forEach(btn => {
                    if (btn.textContent === activeCategory) btn.classList.add("active");
                });
            }
            renderProducts();
        });
    }

    // Guía de Talles Toggle
    if (DOM.btnSizeGuide) {
        DOM.btnSizeGuide.addEventListener("click", () => {
            sizeGuideVisible = !sizeGuideVisible;
            if (sizeGuideVisible) {
                DOM.sizeGuideContainer.style.display = "block";
                DOM.btnSizeGuide.textContent = "Ocultar Tabla";
                renderSizeGuide();
            } else {
                DOM.sizeGuideContainer.style.display = "none";
                DOM.btnSizeGuide.textContent = "Guía de Talles";
            }
        });
    }

    // Aplicar Cupón
    if (DOM.btnApplyCoupon) {
        DOM.btnApplyCoupon.addEventListener("click", () => {
            const code = DOM.couponInput.value.trim().toUpperCase();
            if (!code) {
                activeCoupon = null;
                DOM.couponMessage.textContent = "";
                updateCartUI();
                return;
            }
            
            const coupons = storeConfig.coupons || {};
            if (coupons[code] !== undefined) {
                activeCoupon = { code: code, percent: coupons[code] };
                DOM.couponMessage.textContent = `✓ ¡Cupón ${code} aplicado! (${coupons[code]}% OFF)`;
                DOM.couponMessage.style.color = "#10b981";
                showToast(`🎟️ Cupón aplicado: ${coupons[code]}% de descuento`);
            } else {
                activeCoupon = null;
                DOM.couponMessage.textContent = "✗ Código de cupón inválido";
                DOM.couponMessage.style.color = "#ef4444";
            }
            updateCartUI();
        });
    }

    // Cambios en Método de Entrega
    const shippingSelect = document.getElementById("client-shipping");
    const addressGroup = document.getElementById("address-group");
    if (shippingSelect) {
        shippingSelect.addEventListener("change", (e) => {
            selectedShippingMethod = e.target.value;
            
            // Mostrar u ocultar campo de dirección
            if (selectedShippingMethod === "correo") {
                if (addressGroup) addressGroup.style.display = "flex";
                document.getElementById("client-address").required = true;
            } else {
                if (addressGroup) addressGroup.style.display = "none";
                document.getElementById("client-address").required = false;
                document.getElementById("client-address").value = "";
            }
            
            // Actualizar etiqueta del costo de envío
            const rates = storeConfig.shippingRates || { retiro: 0, moto: 1500, correo: 3500 };
            const cost = rates[selectedShippingMethod] || 0;
            if (DOM.shippingCostLabel) {
                DOM.shippingCostLabel.textContent = cost > 0 
                    ? `Envío: $${cost.toLocaleString('es-AR')}`
                    : `Envío: Gratis`;
            }
            
            updateCartUI();
        });
    }

    // Finalizar compra (WhatsApp Checkout)
    if (DOM.checkoutForm) {
        DOM.checkoutForm.addEventListener("submit", (e) => {
            e.preventDefault();
            sendWhatsAppOrder();
        });
    }

    // Eventos del Menú Móvil
    const mobileMenuTrigger = document.getElementById("mobile-menu-trigger");
    const mobileMenuClose = document.getElementById("mobile-menu-close");
    const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");

    if (mobileMenuTrigger) {
        mobileMenuTrigger.addEventListener("click", () => toggleMobileMenu(true));
    }
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener("click", () => toggleMobileMenu(false));
    }
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener("click", (e) => {
            if (e.target === mobileMenuOverlay) {
                toggleMobileMenu(false);
            }
        });
    }

    // Cerrar menú móvil al hacer clic en cualquier enlace
    document.querySelectorAll(".mobile-nav-link").forEach(link => {
        link.addEventListener("click", () => toggleMobileMenu(false));
    });
}

// Renderizar barra de categorías
function renderCategories() {
    if (!DOM.categoriesScroll) return;
    
    const categories = ["Todos", ...(storeConfig.categories || [])];
    DOM.categoriesScroll.innerHTML = "";
    
    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `category-btn ${cat === activeCategory && !activeFavoritesFilter ? 'active' : ''}`;
        btn.textContent = cat;
        btn.addEventListener("click", () => {
            // Cambiar categoría activa
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = cat;
            
            // Desactivar filtro de favoritos al pulsar categoría
            activeFavoritesFilter = false;
            if (DOM.favFilterBtn) DOM.favFilterBtn.classList.remove("active");
            
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
        const matchesFavorites = !activeFavoritesFilter || favoritesList.includes(p.id);
        
        return (activeFavoritesFilter ? matchesFavorites : matchesCategory) && matchesSearch;
    });

    // Ordenar productos según el criterio seleccionado
    if (currentSort === "price-asc") {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (currentSort === "price-desc") {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (currentSort === "name-asc") {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    
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
                <p>${activeFavoritesFilter ? 'No has agregado ningún producto a tus favoritos todavía.' : 'Prueba buscando con otros términos o seleccionando otra categoría.'}</p>
            </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        
        // Generar badges
        let badgesHtml = "";
        if (product.isLimited && product.inStock) {
            badgesHtml += `<span class="badge badge-urgency">🔥 Últimas unidades</span>`;
        } else if (product.isLimited) {
            badgesHtml += `<span class="badge badge-limited">Edición Limitada</span>`;
        }
        if (!product.inStock) {
            badgesHtml += `<span class="badge badge-outofstock">Sin Stock</span>`;
        }

        const isFav = favoritesList.includes(product.id);

        card.innerHTML = `
            <div class="product-card-media" style="cursor: pointer; position: relative;">
                <div class="card-badges">${badgesHtml}</div>
                
                <!-- Botón de Favorito -->
                <button class="btn-favorite ${isFav ? 'active' : ''}" data-id="${product.id}" title="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                
                <img src="${product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600'}" class="product-card-img" alt="${escapeHTML(product.name)}" loading="lazy">
            </div>
            <div class="product-card-body">
                <span class="product-card-cat">${escapeHTML(product.category)}</span>
                <h3 class="product-card-title">${escapeHTML(product.name)}</h3>
                <p class="product-card-desc">${escapeHTML(product.description)}</p>
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
        const favBtn = card.querySelector(".btn-favorite");
        
        media.addEventListener("click", () => openProductModal(product));
        
        if (addBtn && product.inStock) {
            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openProductModal(product);
            });
        }
        
        if (favBtn) {
            favBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleFavorite(product.id, favBtn);
            });
        }


        DOM.productsGrid.appendChild(card);
    });
}

// Abrir detalle del producto
function openProductModal(product) {
    if (!product) return;
    
    DOM.modalCat.textContent = product.category;
    DOM.modalTitle.textContent = product.name;
    DOM.modalPrice.textContent = `$${product.price.toLocaleString('es-AR')}`;
    DOM.modalDesc.textContent = product.description;
    
    // Alerta de urgencia por edición limitada / stock crítico
    const modalInfo = DOM.modalOverlay ? DOM.modalOverlay.querySelector(".modal-info") : null;
    if (modalInfo) {
        const existingUrgency = modalInfo.querySelector(".detail-urgency-msg");
        if (existingUrgency) {
            existingUrgency.remove();
        }
        
        if (product.isLimited && product.inStock) {
            const urgencyDiv = document.createElement("div");
            urgencyDiv.className = "detail-urgency-msg";
            urgencyDiv.innerHTML = `
                <i data-lucide="flame" style="width: 16px; height: 16px;"></i>
                <span>¡Edición Exclusiva! Últimas unidades disponibles en stock.</span>
            `;
            const sizeSelector = modalInfo.querySelector(".size-selector-wrap");
            if (sizeSelector) {
                modalInfo.insertBefore(urgencyDiv, sizeSelector);
            } else {
                modalInfo.appendChild(urgencyDiv);
            }
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }
    // Resetear estado de la guía de talles
    sizeGuideVisible = false;
    if (DOM.sizeGuideContainer) DOM.sizeGuideContainer.style.display = "none";
    if (DOM.btnSizeGuide) DOM.btnSizeGuide.textContent = "Guía de Talles";
    
    // Guardar referencia del producto actual para la guía de talles
    DOM.currentModalProduct = product;
    
    // Configurar Carrusel de Imágenes
    currentImageIndex = 0;
    currentProductImages = (product.images && Array.isArray(product.images) && product.images.length > 0)
        ? product.images
        : [product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600'];
        
    // Llenar el track del carrusel con contenedores para zoom de lupa
    if (DOM.carouselTrack) {
        DOM.carouselTrack.innerHTML = "";
        currentProductImages.forEach((imgUrl, idx) => {
            const imgContainer = document.createElement("div");
            imgContainer.className = "carousel-img-container";
            
            const img = document.createElement("img");
            img.src = imgUrl;
            img.alt = `${product.name} - Imagen ${idx + 1}`;
            img.className = "carousel-img";
            
            // Efecto lupa dinámico
            imgContainer.addEventListener("mousemove", (e) => {
                const rect = imgContainer.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                img.style.transformOrigin = `${x}% ${y}%`;
                img.style.transform = "scale(1.8)";
            });
            
            imgContainer.addEventListener("mouseleave", () => {
                img.style.transform = "scale(1)";
                img.style.transformOrigin = "center center";
            });
            
            imgContainer.appendChild(img);
            DOM.carouselTrack.appendChild(imgContainer);
        });
        DOM.carouselTrack.style.transform = "translateX(0%)";
    }
    
    // Renderizar Puntos Indicadores
    if (DOM.carouselIndicators) {
        DOM.carouselIndicators.innerHTML = "";
        if (currentProductImages.length > 1) {
            currentProductImages.forEach((_, idx) => {
                const dot = document.createElement("span");
                dot.className = `indicator-dot ${idx === 0 ? 'active' : ''}`;
                dot.addEventListener("click", () => {
                    currentImageIndex = idx;
                    updateCarousel();
                });
                DOM.carouselIndicators.appendChild(dot);
            });
        }
    }
    
    // Mostrar u ocultar controles de navegación
    if (DOM.carouselPrev && DOM.carouselNext) {
        if (currentProductImages.length > 1) {
            DOM.carouselPrev.style.display = "flex";
            DOM.carouselNext.style.display = "flex";
        } else {
            DOM.carouselPrev.style.display = "none";
            DOM.carouselNext.style.display = "none";
        }
    }

    
    // Crear chips de talles
    DOM.modalSizes.innerHTML = "";
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
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

// Actualizar posición del carrusel y puntos activos
function updateCarousel() {
    if (!DOM.carouselTrack) return;
    const offset = -currentImageIndex * 100;
    DOM.carouselTrack.style.transform = `translateX(${offset}%)`;
    
    // Actualizar puntos
    if (DOM.carouselIndicators) {
        const dots = DOM.carouselIndicators.querySelectorAll(".indicator-dot");
        dots.forEach((dot, idx) => {
            if (idx === currentImageIndex) {
                dot.classList.add("active");
            } else {
                dot.classList.remove("active");
            }
        });
    }
}

// Detener reproductor de video y volver a mostrar fotos
function toggleDetailModal(open) {
    if (open) {
        DOM.modalOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        DOM.modalOverlay.classList.remove("open");
        document.body.style.overflow = "";
    }
}

function toggleCartDrawer(open) {
    if (!DOM.cartOverlay) return;
    if (open) {
        DOM.cartOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        DOM.cartOverlay.classList.remove("open");
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
    let subtotal = 0;
    
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
            subtotal += (item.price || 0) * item.quantity;
            
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
    
    // Calcular descuento por cupón
    let discount = 0;
    if (activeCoupon && subtotal > 0) {
        discount = subtotal * (activeCoupon.percent / 100);
        if (DOM.cartDiscountRow) DOM.cartDiscountRow.style.display = "flex";
        if (DOM.cartDiscountPercent) DOM.cartDiscountPercent.textContent = activeCoupon.percent;
        if (DOM.cartDiscountVal) DOM.cartDiscountVal.textContent = `-$${discount.toLocaleString('es-AR')}`;
    } else {
        if (DOM.cartDiscountRow) DOM.cartDiscountRow.style.display = "none";
    }
    
    // Calcular costo de envío
    const rates = storeConfig.shippingRates || { retiro: 0, moto: 1500, correo: 3500 };
    const shippingCost = subtotal > 0 ? (rates[selectedShippingMethod] || 0) : 0;
    
    if (DOM.cartShippingVal) {
        DOM.cartShippingVal.textContent = shippingCost > 0 
            ? `$${shippingCost.toLocaleString('es-AR')}`
            : `Gratis`;
    }
    
    // Calcular Total
    const finalTotal = Math.max(0, subtotal - discount + shippingCost);
    
    // Actualizar contadores globales
    if (DOM.cartCount) DOM.cartCount.textContent = totalItems;
    if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = `$${subtotal.toLocaleString('es-AR')}`;
    if (DOM.cartTotal) DOM.cartTotal.textContent = `$${finalTotal.toLocaleString('es-AR')}`;
    
    // Exponer funciones auxiliares para que sean clickeables desde el HTML inline temporalmente
    window.updateCartQuantity = updateCartQuantity;
    window.removeFromCart = removeFromCart;
}

// CHECKOUT POR WHATSAPP
async function sendWhatsAppOrder() {
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

    // Calcular totales
    let subtotal = 0;
    let itemsText = "";
    
    cart.forEach(item => {
        const itemSubtotal = (item.price || 0) * item.quantity;
        subtotal += itemSubtotal;
        itemsText += `• *${item.quantity}x* ${item.name}\n  Talle: ${item.size} | Subtotal: $${itemSubtotal.toLocaleString('es-AR')}\n\n`;
    });
    
    // Calcular descuento de cupón
    let discount = 0;
    let couponText = "";
    if (activeCoupon) {
        discount = subtotal * (activeCoupon.percent / 100);
        couponText = `- *Cupón Aplicado:* ${activeCoupon.code} (${activeCoupon.percent}% OFF)\n- *Descuento:* -$${discount.toLocaleString('es-AR')}\n`;
    }
    
    // Calcular costo de envío
    const rates = storeConfig.shippingRates || { retiro: 0, moto: 1500, correo: 3500 };
    const shippingCost = rates[envio] || 0;
    
    const finalTotal = Math.max(0, subtotal - discount + shippingCost);
    
    // Construir mensaje amigable
    let mensaje = `🌸 *Pedido - Curvys Store by Moni* 🌸\n\n`;
    mensaje += `Hola Moni! Me interesa realizar este pedido:\n`;
    mensaje += `-----------------------------------------\n`;
    mensaje += itemsText;
    mensaje += `-----------------------------------------\n`;
    mensaje += `💵 *Subtotal prendas:* $${subtotal.toLocaleString('es-AR')}\n`;
    if (discount > 0) {
        mensaje += `🎟️ *Descuento (${activeCoupon.percent}%):* -$${discount.toLocaleString('es-AR')}\n`;
    }
    mensaje += `📦 *Costo de envío:* ${shippingCost > 0 ? `$${shippingCost.toLocaleString('es-AR')}` : 'Gratis'}\n`;
    mensaje += `💰 *Total del Pedido: $${finalTotal.toLocaleString('es-AR')}*\n\n`;
    
    mensaje += `👤 *Datos del Cliente:*\n`;
    mensaje += `- *Nombre:* ${nombre}\n`;
    let metodoEnvioText = "🏢 Retiro en tienda (Gratis)";
    if (envio === "moto") metodoEnvioText = "🛵 Envío por Moto Express";
    if (envio === "correo") metodoEnvioText = "📦 Envío por Correo (Todo el país)";
    mensaje += `- *Entrega:* ${metodoEnvioText}\n`;
    
    if (envio === 'correo') {
        mensaje += `- *Dirección:* ${direccion}\n`;
    }
    if (notas) {
        mensaje += `- *Notas/Talle personalizado:* ${notas}\n`;
    }
    
    mensaje += `\n🛒 _Pedido generado desde la web tienda._`;

    // 1. Guardar en Base de Datos (Firestore o LocalStorage)
    const orderData = {
        id: `ord-${Date.now()}`,
        clientName: nombre,
        shippingMethod: envio,
        address: (envio === 'correo' || envio === 'moto') ? direccion : '',
        notes: notas,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            size: item.size,
            quantity: item.quantity
        })),
        coupon: activeCoupon ? activeCoupon.code : null,
        discount: discount,
        shippingCost: shippingCost,
        total: finalTotal,
        status: "Pendiente",
        createdAt: new Date().toISOString()
    };

    try {
        await FirebaseService.saveOrder(orderData);
        console.log("💾 Pedido registrado con éxito en la base de datos.");
    } catch (dbErr) {
        console.error("⚠️ Error al registrar pedido en la base de datos:", dbErr);
    }

    // Obtener teléfono de destino (eliminar caracteres raros)
    const phone = (storeConfig.whatsapp || "5491150158665").replace(/[^0-9]/g, "");
    
    // Generar url de WhatsApp moderna
    const encodedText = encodeURIComponent(mensaje);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedText}`;
    
    // Abrir enlace en nueva pestaña
    window.open(whatsappUrl, "_blank");
    
    // Vaciar Carrito
    cart = [];
    activeCoupon = null;
    if (DOM.couponInput) DOM.couponInput.value = "";
    if (DOM.couponMessage) DOM.couponMessage.textContent = "";
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

// ==========================================================================
// NUEVAS FUNCIONALIDADES COMERCIALES Y VISUALES
// ==========================================================================

// 1. SISTEMA DE TEMAS (Claro / Oscuro)
function initTheme() {
    const savedTheme = localStorage.getItem("curvys_theme") || "light";
    setTheme(savedTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    const themeToggleBtn = document.getElementById("theme-toggle");
    
    if (theme === "light") {
        document.body.classList.add("light-theme");
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
        }
    } else {
        document.body.classList.remove("light-theme");
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
        }
    }
    localStorage.setItem("curvys_theme", theme);
}

// 1.5 CONTROL DE MENÚ MÓVIL
function toggleMobileMenu(open) {
    const overlay = document.getElementById("mobile-menu-overlay");
    if (!overlay) return;
    if (open) {
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        overlay.classList.remove("open");
        document.body.style.overflow = "";
    }
}

// 2. HERO SLIDER AUTOMÁTICO
let sliderInterval = null;
function startHeroSlider() {
    if (sliderInterval) clearInterval(sliderInterval);
    
    // Crear dinámicamente diapositivas de fondo del Hero si existen en configuración
    if (DOM.heroSlidesContainer && storeConfig.heroSlides && storeConfig.heroSlides.length > 0) {
        DOM.heroSlidesContainer.innerHTML = "";
        storeConfig.heroSlides.forEach((slideUrl, idx) => {
            const slide = document.createElement("div");
            slide.className = `hero-slide ${idx === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url('${slideUrl}')`;
            DOM.heroSlidesContainer.appendChild(slide);
        });
    }
    
    const slides = document.querySelectorAll(".hero-slide");
    if (slides.length <= 1) return;
    
    let currentSlideIdx = 0;
    sliderInterval = setInterval(() => {
        slides[currentSlideIdx].classList.remove("active");
        currentSlideIdx = (currentSlideIdx + 1) % slides.length;
        slides[currentSlideIdx].classList.add("active");
    }, 5000);
}

// 3. SISTEMA DE FAVORITOS (Wishlist)
function loadFavorites() {
    try {
        const stored = localStorage.getItem("curvys_favorites");
        favoritesList = stored ? JSON.parse(stored) : [];
    } catch (e) {
        favoritesList = [];
    }
}

function saveFavorites() {
    localStorage.setItem("curvys_favorites", JSON.stringify(favoritesList));
}

function toggleFavorite(id, buttonEl) {
    const idx = favoritesList.indexOf(id);
    if (idx > -1) {
        favoritesList.splice(idx, 1);
        buttonEl.classList.remove("active");
        showToast("Eliminado de favoritos");
    } else {
        favoritesList.push(id);
        buttonEl.classList.add("active");
        showToast("❤️ ¡Agregado a favoritos!");
    }
    saveFavorites();
    
    // Si el filtro de favoritos está activo, re-renderizar para ocultar la tarjeta
    if (activeFavoritesFilter) {
        renderProducts();
    }
}

// 4. TABLA DE MEDIDAS DE TALLES
const MEDIDAS_TALLES = {
    "XS": { busto: "80-85", cintura: "60-65", cadera: "85-90" },
    "S": { busto: "85-90", cintura: "65-70", cadera: "90-95" },
    "M": { busto: "90-95", cintura: "70-75", cadera: "95-100" },
    "L": { busto: "95-100", cintura: "75-80", cadera: "100-105" },
    "XL": { busto: "100-106", cintura: "80-87", cadera: "105-112" },
    "XXL": { busto: "106-114", cintura: "87-95", cadera: "112-120" },
    "XXXL": { busto: "114-122", cintura: "95-103", cadera: "120-128" },
    "4XL": { busto: "122-130", cintura: "103-111", cadera: "128-136" },
    "5XL": { busto: "130-138", cintura: "111-119", cadera: "136-144" }
};

function renderSizeGuide() {
    if (!DOM.sizeGuideRows) return;
    
    const product = DOM.currentModalProduct;
    DOM.sizeGuideRows.innerHTML = "";
    
    if (product && product.sizes && product.sizes.length > 0) {
        let hasCustomSizes = false;
        
        product.sizes.forEach(size => {
            const cleanSize = size.toUpperCase().trim();
            const info = MEDIDAS_TALLES[cleanSize];
            
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid var(--border-color)";
            
            if (info) {
                tr.innerHTML = `
                    <td style="padding: 6px 4px; font-weight: 700; color: var(--accent);">${size}</td>
                    <td style="padding: 6px 4px;">${info.busto} cm</td>
                    <td style="padding: 6px 4px;">${info.cintura} cm</td>
                    <td style="padding: 6px 4px;">${info.cadera} cm</td>
                `;
            } else {
                hasCustomSizes = true;
                tr.innerHTML = `
                    <td style="padding: 6px 4px; font-weight: 700; color: var(--accent);">${size}</td>
                    <td colspan="3" style="padding: 6px 4px; color: var(--text-muted); font-style: italic;">Medida adaptable (Ver notas)</td>
                `;
            }
            DOM.sizeGuideRows.appendChild(tr);
        });
    } else {
        DOM.sizeGuideRows.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 10px 4px; text-align: center; color: var(--text-muted);">
                    Esta prenda es de talle único adaptable y suelto (se adapta desde un talle M a un XXL).
                </td>
            </tr>
        `;
    }
}

// Inicialización del DOM
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
