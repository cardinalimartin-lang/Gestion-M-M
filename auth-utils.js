// Utilidades de autenticación reutilizables en todo el frontend
(function() {
    function getCurrentUser() {
        try {
            const raw = sessionStorage.getItem('currentUser');
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function isAdminUser() {
        const user = getCurrentUser();
        return !!(user && user.admin);
    }

    function getAdminCredentials() {
        try {
            return {
                adminUser: sessionStorage.getItem('adminUser') || null,
                adminPass: sessionStorage.getItem('adminPass') || null
            };
        } catch (_) {
            return { adminUser: null, adminPass: null };
        }
    }

    // Exponer en window para que cualquier script pueda usarlo
    window.getCurrentUser = getCurrentUser;
    window.isAdminUser = isAdminUser;
    window.getAdminCredentials = getAdminCredentials;
})();
