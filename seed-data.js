// Datos de semilla (Seed Data) iniciales para Curvys Store by Moni

const initialProducts = [
    {
        id: "prod-1",
        name: "Sweter Lanilla Soft",
        description: "Sweter de lanilla súper suave, abrigado y con caída suelta. Ideal para un look casual y súper cómodo de uso diario. Edición limitada en talles amplios.",
        price: 18500,
        category: "Abrigos",
        sizes: ["L", "XL", "XXL"],
        image: "https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop",
        video: "",
        inStock: true,
        isLimited: true,
        createdAt: new Date().toISOString()
    },
    {
        id: "prod-2",
        name: "Blusa Violeta Abullonada",
        description: "Blusa con cuello alto y mangas abullonadas en color violeta vibrante. Tejido sedoso y de excelente caída para lucir elegante y sofisticada. Edición limitada.",
        price: 15400,
        category: "Blusas",
        sizes: ["M", "L", "XL"],
        image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop",
        video: "",
        inStock: true,
        isLimited: true,
        createdAt: new Date().toISOString()
    },
    {
        id: "prod-3",
        name: "Saco de Abrigo Confort",
        description: "Saco tejido artesanalmente con hilados suaves y esponjosos de lanilla. Calentito, cómodo y con gran elasticidad. Diseño exclusivo de la marca.",
        price: 21500,
        category: "Abrigos",
        sizes: ["L", "XL", "XXL", "XXXL"],
        image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop",
        video: "",
        inStock: true,
        isLimited: false,
        createdAt: new Date().toISOString()
    },
    {
        id: "prod-4",
        name: "Pantalón Sastrero Curve",
        description: "Pantalón pinzado de tiro alto en gabardina elastizada premium. Confeccionado pensando en realzar las curvas con total comodidad.",
        price: 19800,
        category: "Pantalones",
        sizes: ["44", "46", "48", "50", "52"],
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
        video: "",
        inStock: true,
        isLimited: true,
        createdAt: new Date().toISOString()
    }
];

const initialConfig = {
    storeName: "Curvys.Store by Moni",
    whatsapp: "5491133224455", // Teléfono de prueba para WhatsApp
    instagram: "https://www.instagram.com/curvys.store_by_moni",
    shippingText: "Envíos a todo el país",
    bannerText: "✨ Indumentaria de edición limitada — ¡Sé tu propia inspiración! ✨",
    categories: ["Abrigos", "Blusas", "Pantalones", "Remeras", "Accesorios"]
};

// Exportar para uso en otros scripts
window.initialProducts = initialProducts;
window.initialConfig = initialConfig;
