// Función para obtener el token del localStorage
function getToken() {
    return localStorage.getItem('access_token');
}

// Función para obtener el rol del usuario
function getUserRole() {
    return localStorage.getItem('user_role');
}

// Función para verificar si el usuario está autenticado
function isAuthenticated() {
    const token = getToken();
    return token !== null;
}

// Función para verificar si el usuario es administrador
function isAdmin() {
    return getUserRole() === 'admin';
}

// Función para proteger rutas
function protectRoute() {
    if (!isAuthenticated()) {
        window.location.href = '/login/templates/login.html';
        return;
    }

    // Verificar acceso según el rol
    const currentPath = window.location.pathname;
    const userRole = getUserRole();

    // Rutas protegidas para administradores
    if (currentPath.includes('/admin/') && !isAdmin()) {
        window.location.href = '/Frvttae/albumes.html';
        return;
    }

    // Rutas protegidas para usuarios normales
    if (currentPath.includes('/Frvttae/albumes.html') && !isAuthenticated()) {
        window.location.href = '/login/templates/login.html';
        return;
    }
}

// Función para guardar el token y rol después del login
function handleLoginSuccess(response) {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user_role', response.role);
    window.location.href = response.redirect;
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login/templates/login.html';
}

// Ejecutar protección de ruta en cada carga de página
document.addEventListener('DOMContentLoaded', protectRoute);