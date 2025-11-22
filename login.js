document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    // Si la página se abrió como archivo local (file:///), redirigimos automáticamente
    // al backend en http://localhost:3000/, que ya sabe servir login.html en la raíz.
    // Esto restaura el comportamiento "doble click y termina en localhost:3000".
    try {
        if (location.protocol === 'file:' || !location.protocol) {
            window.location.href = 'http://localhost:3000/';
            return; // detenemos el resto del script en este contexto
        }
    } catch (e) {
        // Si algo falla al leer location, no hacemos nada especial
    }

    // limpiar campos al cargar (y desactivar autocomplete) — el usuario quiere siempre los campos limpios
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) { usernameInput.value = ''; usernameInput.setAttribute('autocomplete','off'); }
    if (passwordInput) { passwordInput.value = ''; passwordInput.setAttribute('autocomplete','new-password'); }
    // limpiar campos del formulario de registro si existen
    const regU = document.getElementById('reg_username'); if (regU) regU.value = '';
    const regP = document.getElementById('reg_password'); if (regP) { regP.value = ''; regP.setAttribute('autocomplete','new-password'); }
    const regP2 = document.getElementById('reg_password2'); if (regP2) regP2.value = '';
    const regKeyF = document.getElementById('reg_key'); if (regKeyF) regKeyF.value = '';

    const loginMessage = document.getElementById('loginMessage');
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        loginMessage.textContent = '';
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            // Determinar base del API: si la página NO está ya en el backend (localhost:3000),
            // usamos explicitamente http://localhost:3000 — útil cuando abrís con Live Server (127.0.0.1:5500)
            const DEFAULT_BACKEND = 'http://localhost:3000';
            let apiBase = '';
            try {
                if (!(location.hostname === 'localhost' && location.port === '3000') && !(location.hostname === '127.0.0.1' && location.port === '3000')) {
                    apiBase = DEFAULT_BACKEND;
                }
            } catch (e) {
                apiBase = DEFAULT_BACKEND;
            }
            const res = await fetch(`${apiBase}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.ok) {
                    // Guardar información básica de sesión reutilizable en todo el frontend
                    try {
                        sessionStorage.removeItem('currentUser');
                        sessionStorage.removeItem('adminUser');
                        sessionStorage.removeItem('adminPass');

                        const isAdmin = !!data.admin;
                        const sessionPayload = {
                            username: data.username || username,
                            admin: isAdmin,
                            suspended: !!data.suspended
                        };
                        sessionStorage.setItem('currentUser', JSON.stringify(sessionPayload));

                        // Para acciones que requieren credenciales admin fuertes (borrar cliente, etc.)
                        if (isAdmin) {
                            sessionStorage.setItem('adminUser', username);
                            sessionStorage.setItem('adminPass', password);
                        }
                    } catch (_) {}

                    // Redirigir a la app (si usamos Live Server, apiBase apunta al backend)
                    // limpiar campos antes de redirigir
                    if (usernameInput) usernameInput.value = '';
                    if (passwordInput) passwordInput.value = '';

                    let redirectUrl = '/home';
                    if (typeof apiBase === 'string' && apiBase) {
                        const params = new URLSearchParams();
                        params.set('username', sessionPayload.username);
                        params.set('admin', String(isAdmin ? 1 : 0));
                        redirectUrl = `${apiBase}/home?${params.toString()}`;
                    }

                    // debug console
                    try { console.debug('Redirecting to', redirectUrl); } catch (e) {}
                    window.location.href = redirectUrl;
                    return;
                }
            }

            // Si no es ok, mostrar mensaje de error en la página (no redirigir)
            const err = await res.json().catch(() => ({}));
            loginMessage.textContent = err.error || 'Usuario o contraseña incorrectos.';
            loginMessage.style.color = 'crimson';
            // No vaciamos los inputs aquí: permitimos que el usuario corrija sin reescribir el usuario
            return;
        } catch (e) {
            loginMessage.textContent = 'No se pudo conectar con el servidor. Verificá que esté corriendo en http://localhost:3000.';
            loginMessage.style.color = 'crimson';
            // No vaciamos los inputs aquí para que el usuario pueda reintentar sin reescribir todo
        }
    });

    // Registro de nuevos usuarios
    // Gestionar cuentas (admin)
    const manageBtn = document.getElementById('manageBtn');
    if (manageBtn) {
        manageBtn.addEventListener('click', async () => {
            // Pedir credenciales admin en modal (prompt simple)
            const adminUser = prompt('Usuario administrador (ej: admin):');
            if (adminUser === null) return;
            const adminPass = prompt('Contraseña administrador:');
            if (adminPass === null) return;

            // comprobar credenciales
            try {
                const DEFAULT_BACKEND = 'http://localhost:3000';
                let apiBase = '';
                try { if (!(location.hostname === 'localhost' && location.port === '3000') && !(location.hostname === '127.0.0.1' && location.port === '3000')) apiBase = DEFAULT_BACKEND; } catch(e){ apiBase = DEFAULT_BACKEND; }
                const res = await fetch(`${apiBase}/admin/authenticate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser, adminPass }) });
                if (res.ok) {
                    // guardar credenciales temporalmente en sessionStorage para la UI de admin
                    sessionStorage.setItem('adminUser', adminUser);
                    sessionStorage.setItem('adminPass', adminPass);
                    // abrir el dashboard en modo administración
                    window.location.href = 'home.html?view=admin';
                    return;
                }
                const b = await res.json().catch(()=>({}));
                alert(b.error || 'Credenciales inválidas');
            } catch (e) {
                alert('Error de conexión al autenticar administrador.');
            }
        });
    }
});