// Configuración de Firebase para Curvys Store by Moni
// Si deseas conectar una base de datos real en la nube, reemplaza los valores de abajo
// con las credenciales de tu proyecto de Firebase.
const firebaseConfig = {
    apiKey: "",
    authDomain: "curvys.firebaseapp.com",
    projectId: "curvys",
    storageBucket: "curvys.firebasestorage.app",
    messagingSenderId: "382707617453",
    appId: "1:382707617453:web:397f72f079f4ba79ba0024",
    
    // Configuración de Cloudinary (Subida de imágenes)
    // Deja estos campos vacíos si deseas usar las credenciales demo por defecto.
    cloudinaryCloudName: "",
    cloudinaryUploadPreset: ""
};

window.firebaseConfig = firebaseConfig;
