'use strict';

(function(){
  const DEFAULT_BACKEND = 'http://localhost:3000';
  function getApiBase(){
    try {
      if ((location.hostname === 'localhost' && location.port === '3000') || (location.hostname === '127.0.0.1' && location.port === '3000')) return '';
    } catch(e){}
    return DEFAULT_BACKEND;
  }

  function getAdminCreds(){
    const adminUser = sessionStorage.getItem('adminUser');
    const adminPass = sessionStorage.getItem('adminPass');
    return { adminUser, adminPass };
  }

  function ensureAuth(){
    const { adminUser, adminPass } = getAdminCreds();
    if (!adminUser || !adminPass){
      alert('Sesión de administrador no encontrada. Volviendo al login.');
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  async function verifyAdminPrivilege(){
    try {
      const { adminUser, adminPass } = getAdminCreds();
      const res = await fetch(getApiBase() + '/admin/authenticate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser, adminPass }) });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json().catch(()=>({ ok:false }));
      if (!data.ok) throw new Error('No autorizado');
    } catch(_) {
      try { alert('No tenés privilegios de administrador. Volviendo al login.'); } catch(e){}
      window.location.href = 'login.html';
    }
  }

  function showPanel(id){
    const buttons = document.querySelectorAll('.menu button[data-panel]');
    buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-panel') === id));
    const panels = ['panel-list','panel-create','panel-edit'];
    panels.forEach(p => {
      const el = document.getElementById(p);
      if (el) el.style.display = (p === id) ? '' : 'none';
    });
  }

  function fillAdminHeader(){
    const adminName = document.getElementById('adminName');
    const { adminUser } = getAdminCreds();
    if (adminName && adminUser) adminName.textContent = adminUser;
  }

  async function listUsers(){
    const msg = document.getElementById('msg');
    msg.textContent = '';
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
    try {
      const { adminUser, adminPass } = getAdminCreds();
      const res = await fetch(getApiBase() + '/admin/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser, adminPass }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al listar');
      tbody.innerHTML = '';
      data.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'rowlink';
        tr.addEventListener('click', () => selectUser(u.username, !!u.suspended, !!u.admin));
        const tdU = document.createElement('td'); tdU.textContent = u.username;
        const tdS = document.createElement('td'); tdS.textContent = u.suspended ? 'Suspendido' : 'Activo';
        const tdA = document.createElement('td'); tdA.textContent = u.admin ? 'Sí' : 'No';
        tr.appendChild(tdU);
        tr.appendChild(tdS);
        tr.appendChild(tdA);
        tbody.appendChild(tr);
      });
      if (!data.users || !data.users.length){
        tbody.innerHTML = '<tr><td colspan="3">No hay usuarios</td></tr>';
      }
    } catch (e){
      tbody.innerHTML = '';
      msg.textContent = e.message || 'Error cargando usuarios';
      msg.style.color = 'crimson';
    }
  }

  async function createUser(fromAltPanel){
    const msg = document.getElementById('msg');
    msg.textContent = '';
    const uId = fromAltPanel ? 'newUser2' : 'newUser';
    const pId = fromAltPanel ? 'newPass2' : 'newPass';
    const aId = fromAltPanel ? 'newAdmin2' : 'newAdmin';
    const username = (document.getElementById(uId)?.value || '').trim();
    const password = (document.getElementById(pId)?.value || '');
    const isAdmin = !!document.getElementById(aId)?.checked;
    if (!username || !password){
      msg.textContent = 'Usuario y contraseña son requeridos';
      msg.style.color = 'crimson';
      return;
    }
    try {
      const { adminUser, adminPass } = getAdminCreds();
      const res = await fetch(getApiBase() + '/admin/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser, adminPass, username, password, admin: isAdmin }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al crear usuario');
      msg.textContent = 'Usuario creado';
      msg.style.color = 'green';
      const uEl = document.getElementById(uId); if (uEl) uEl.value = '';
      const pEl = document.getElementById(pId); if (pEl) pEl.value = '';
      const aEl = document.getElementById(aId); if (aEl) aEl.checked = false;
      await listUsers();
      showPanel('panel-list');
    } catch (e){
      msg.textContent = e.message || 'Error creando usuario';
      msg.style.color = 'crimson';
    }
  }

  async function updateUser(username, password, suspended, admin){
    const msg = document.getElementById('msg');
    msg.textContent = '';
    try {
      const { adminUser, adminPass } = getAdminCreds();
      const body = { adminUser, adminPass, username };
      if (password !== null) body.password = password;
      if (suspended !== null) body.suspended = suspended;
      if (admin !== null) body.admin = admin;
      const res = await fetch(getApiBase() + '/admin/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al actualizar');
      await listUsers();
      showPanel('panel-list');
    } catch (e){
      msg.textContent = e.message || 'Error actualizando usuario';
      msg.style.color = 'crimson';
    }
  }

  async function deleteUser(username){
    const msg = document.getElementById('msg');
    msg.textContent = '';
    try {
      const { adminUser, adminPass } = getAdminCreds();
      const res = await fetch(getApiBase() + '/admin/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUser, adminPass, username }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al eliminar');
      await listUsers();
      showPanel('panel-list');
    } catch (e){
      msg.textContent = e.message || 'Error eliminando usuario';
      msg.style.color = 'crimson';
    }
  }

  function selectUser(username, suspended, admin){
    showPanel('panel-edit');
    const u = document.getElementById('editUsername'); if (u) u.value = username;
    const p = document.getElementById('editPassword'); if (p) p.value = '';
    const s = document.getElementById('editSuspended'); if (s) s.checked = !!suspended;
    const a = document.getElementById('editAdmin'); if (a) a.checked = !!admin;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!ensureAuth()) return;
    // Verificar privilegios admin con el backend
    verifyAdminPrivilege();

    fillAdminHeader();

    // Menú
    document.querySelectorAll('.menu button[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => showPanel(btn.getAttribute('data-panel')));
    });

    // Crear (panel rápido original si existe)
    const createBtn = document.getElementById('createBtn');
    if (createBtn) createBtn.addEventListener('click', () => createUser(false));
    // Crear (panel crear)
    const createBtn2 = document.getElementById('createBtn2');
    if (createBtn2) createBtn2.addEventListener('click', () => createUser(true));

    // Guardar edición
    const saveEditBtn = document.getElementById('saveEditBtn');
    if (saveEditBtn) saveEditBtn.addEventListener('click', async () => {
      const username = (document.getElementById('editUsername')?.value || '').trim();
      const passwordRaw = document.getElementById('editPassword')?.value || '';
      const suspended = !!document.getElementById('editSuspended')?.checked;
      const isAdmin = !!document.getElementById('editAdmin')?.checked;
      const password = passwordRaw ? passwordRaw : null;
      if (!username) return;
      await updateUser(username, password, suspended, isAdmin);
    });

    // Eliminar desde panel de edición
    const deleteEditBtn = document.getElementById('deleteEditBtn');
    if (deleteEditBtn) deleteEditBtn.addEventListener('click', async () => {
      const username = (document.getElementById('editUsername')?.value || '').trim();
      if (!username) return;
      if (!confirm('¿Eliminar usuario ' + username + '?')) return;
      await deleteUser(username);
    });

    // Botones comunes
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', listUsers);

    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) exitBtn.addEventListener('click', () => {
      sessionStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminPass');
      window.location.href = 'login.html';
    });

    // Arranque
    showPanel('panel-list');
    listUsers();
  });
})();
