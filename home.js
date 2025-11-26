// Función para obtener el usuario actual
function getCurrentUser() {
  try {
    const userData = sessionStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  } catch (e) {
    console.error('Error al obtener usuario:', e);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const breadcrumbs = document.getElementById('breadcrumbs');
  const userInfo = document.getElementById('userInfo');
  const userNameLabel = document.getElementById('userNameLabel');
  const userTimeLabel = document.getElementById('userTimeLabel');
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-view]');
  const logoutBtn = document.getElementById('logoutBtn');
  const iframeContainer = document.getElementById('iframeContainer');
  const workFrame = document.getElementById('workFrame');
  const welcomeView = document.getElementById('welcomeView');
  const adminMenuItem = document.getElementById('adminMenuItem');

  function ensureCurrentUserFromQueryIfNeeded() {
    // Si ya hay currentUser, no hacemos nada
    let hasUser = false;
    try {
      const raw = sessionStorage.getItem('currentUser');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.username) hasUser = true;
      }
    } catch (_) {}

    if (hasUser) return;

    // Intentar reconstruir desde parámetros de la URL (username, admin)
    try {
      const params = new URLSearchParams(window.location.search || '');
      const username = params.get('username');
      if (!username) return;
      const adminFlag = params.get('admin');
      const isAdmin = adminFlag === '1' || adminFlag === 'true';
      const sessionPayload = { username, admin: isAdmin, suspended: false };
      sessionStorage.setItem('currentUser', JSON.stringify(sessionPayload));
    } catch (_) {}
  }

  function updateUserInfo() {
    ensureCurrentUserFromQueryIfNeeded();

    let nombre = 'Invitado';
    let esAdmin = false;
    if (typeof window.getCurrentUser === 'function') {
      const user = window.getCurrentUser();
      if (user) {
        nombre = user.username || nombre;
        esAdmin = !!user.admin;
      }
    }

    if (userNameLabel) {
      userNameLabel.textContent = esAdmin ? `${nombre} (Admin)` : nombre;
    } else if (userInfo) {
      userInfo.textContent = esAdmin ? `Usuario: ${nombre} (Admin)` : `Usuario: ${nombre}`;
    }

    if (adminMenuItem) {
      adminMenuItem.style.display = esAdmin ? '' : 'none';
    }
  }

  function updateUserTime() {
    if (!userTimeLabel) return;
    const now = new Date();
    userTimeLabel.textContent = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  function setBreadcrumb(view) {
    switch (view) {
      case 'presupuesto':
        breadcrumbs.textContent = 'Inicio / Presupuesto';
        break;
      case 'clientes':
        breadcrumbs.textContent = 'Inicio / Clientes';
        break;
      case 'vehiculos':
        breadcrumbs.textContent = 'Inicio / Vehículos';
        break;
      case 'reportes':
        breadcrumbs.textContent = 'Inicio / Reportes';
        break;
      case 'admin':
        breadcrumbs.textContent = 'Inicio / Administración de usuarios';
        break;
      default:
        breadcrumbs.textContent = 'Inicio';
    }
  }

  function setActiveSidebar(view) {
    sidebarItems.forEach(btn => {
      const v = btn.getAttribute('data-view');
      btn.classList.toggle('active', v === view);
    });
  }

  function showView(view) {
    if (view === 'inicio') {
      if (welcomeView) welcomeView.style.display = '';
      if (iframeContainer) iframeContainer.style.display = 'none';
      if (workFrame) workFrame.src = '';
      setBreadcrumb('inicio');
      setActiveSidebar('inicio');
      return;
    }

    let url = '';
    if (view === 'presupuesto') {
      url = 'Presupuesto/Presupuesto.html';
    } else if (view === 'clientes') {
      url = 'Clientes/clientes.html';
    } else if (view === 'vehiculos') {
      url = 'Vehiculos/vehiculos.html';
    } else if (view === 'reportes') {
      url = 'Reportes/index.html';
    } else if (view === 'admin') {
      url = 'admin.html';
    }

    if (!url || !workFrame || !iframeContainer) return;

    if (welcomeView) welcomeView.style.display = 'none';
    iframeContainer.style.display = '';
    if (workFrame.src !== url) {
      workFrame.src = url;
    }

    setBreadcrumb(view);
    setActiveSidebar(view);
  }

  sidebarItems.forEach(btn => {
    btn.addEventListener('click', function () {
      const view = this.getAttribute('data-view');
      showView(view);
    });
  });

  const quickButtons = document.querySelectorAll('.quick-actions [data-view]');
  quickButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const view = this.getAttribute('data-view');
      showView(view);
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      try {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminPass');
      } catch (_) {}
      window.location.href = 'login.html';
    });
  }

  // Funcionalidad del modal de ayuda
  const helpModal = document.getElementById('helpModal');
  const closeHelpModal = document.getElementById('closeHelpModal');
  const helpButton = document.querySelector('button[title="Ayuda"]');

  function showHelpModal() {
    if (helpModal) {
      helpModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function hideHelpModal() {
    if (helpModal) {
      helpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  // Inicializar botón de ayuda
  if (helpButton) {
    helpButton.addEventListener('click', showHelpModal);
  }

  if (closeHelpModal) {
    closeHelpModal.addEventListener('click', hideHelpModal);
  }

  if (helpModal) {
    helpModal.addEventListener('click', function(e) {
      if (e.target === helpModal) {
        hideHelpModal();
      }
    });
  }

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && helpModal && helpModal.style.display === 'flex') {
      hideHelpModal();
    }
  });

  updateUserInfo();
  updateUserTime();
  setInterval(updateUserTime, 60000);

  const params = new URLSearchParams(window.location.search || '');
  const initialView = params.get('view');
  if (initialView === 'admin') {
    showView('admin');
  } else if (initialView === 'clientes' || initialView === 'vehiculos' || initialView === 'presupuesto') {
    showView(initialView);
  } else {
    showView('inicio');
  }
});
