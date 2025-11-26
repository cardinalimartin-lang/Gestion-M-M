document.addEventListener('DOMContentLoaded', () => {
  // Si se abre directamente como archivo, redirige al servidor para evitar CORS
  if (location.protocol === 'file:') {
    location.href = 'http://localhost:3000/Vehiculos/vehiculos.html';
    return;
  }

  const BASE_URL = (location.origin && location.origin !== 'null' && location.protocol.startsWith('http'))
    ? location.origin
    : 'http://localhost:3000';

  const form = document.getElementById('form-vehiculo');
  const idautoInput = document.getElementById('idauto');
  const patenteInput = document.getElementById('patente');
  const marcaInput = document.getElementById('marca');
  const modeloInput = document.getElementById('modelo');
  const kmInput = document.getElementById('kilometraje');
  const aceiteInput = document.getElementById('tipoAceite');
  const fechaInput = document.getElementById('fecha');
  const tbody = document.getElementById('tbody-vehiculos');
  const patenteHint = document.getElementById('patente-hint');
  const clienteSelect = document.getElementById('cliente');
  const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
  const modalNuevoCliente = document.getElementById('modal-nuevo-cliente');
  const formNuevoCliente = document.getElementById('form-nuevo-cliente');
  const ncNombre = document.getElementById('nc-nombre');
  const ncTelefono = document.getElementById('nc-telefono');
  const ncCorreo = document.getElementById('nc-correo');
  const ncCancelar = document.getElementById('nc-cancelar');

  function cargarProximoId() {
    fetch(`${BASE_URL}/vehiculos/next-id`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j && typeof j.nextId === 'number') {
          idautoInput.value = j.nextId;
        } else {
          idautoInput.value = '';
        }
      })
      .catch(() => { idautoInput.value = ''; });
  }

  cargarProximoId();

  // Cargar listado inicial
  cargarVehiculos();

  // Manejo del modal de nuevo cliente
  function abrirModalNuevoCliente() {
    if (!modalNuevoCliente) return;
    modalNuevoCliente.style.display = 'flex';
    modalNuevoCliente.setAttribute('aria-hidden', 'false');
    if (ncNombre) ncNombre.focus();
  }

  function cerrarModalNuevoCliente() {
    if (!modalNuevoCliente) return;
    modalNuevoCliente.style.display = 'none';
    modalNuevoCliente.setAttribute('aria-hidden', 'true');
    if (formNuevoCliente) formNuevoCliente.reset();
  }

  if (btnNuevoCliente) {
    btnNuevoCliente.addEventListener('click', () => {
      abrirModalNuevoCliente();
    });
  }

  if (ncCancelar) {
    ncCancelar.addEventListener('click', () => {
      cerrarModalNuevoCliente();
    });
  }

  if (modalNuevoCliente) {
    modalNuevoCliente.addEventListener('click', (e) => {
      if (e.target === modalNuevoCliente) {
        cerrarModalNuevoCliente();
      }
    });
  }

  // Cargar lista de clientes en el selector
  function cargarClientesEnSelect() {
    if (!clienteSelect) return;
    fetch(`${BASE_URL}/clientes-todos`, { cache: 'no-store' })
      .then(async r => {
        const j = await r.json().catch(() => []);
        if (!r.ok) throw new Error('No se pudo obtener la lista de clientes');
        return Array.isArray(j) ? j : [];
      })
      .then(lista => {
        clienteSelect.innerHTML = '<option value="">Seleccionar cliente...</option>';
        lista.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id != null ? String(c.id) : '';
          opt.textContent = c.NombreCliente || c.nombre || '';
          if (c.Telefono || c.telefono) {
            opt.textContent += ' - ' + (c.Telefono || c.telefono);
          }
          if (opt.value) clienteSelect.appendChild(opt);
        });

        // Si hay un cliente activo guardado, preseleccionarlo
        if (clienteActivo && clienteActivo.id != null) {
          const idStr = String(clienteActivo.id);
          const opt = Array.from(clienteSelect.options).find(o => o.value === idStr);
          if (opt) clienteSelect.value = idStr;
        }
      })
      .catch(() => {
        clienteSelect.innerHTML = '<option value="">(Error cargando clientes)</option>';
      });
  }

  // Intentar recuperar un cliente activo global (seteado desde Clientes)
  let clienteActivo = null;
  try {
    const raw = localStorage.getItem('clienteActivo');
    if (raw) clienteActivo = JSON.parse(raw);
  } catch (_) {}

  cargarClientesEnSelect();

  // Manejar creación de cliente desde el modal
  if (formNuevoCliente) {
    formNuevoCliente.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        nombre: ncNombre ? ncNombre.value.trim() : '',
        email: ncCorreo ? ncCorreo.value.trim() : '',
        telefono: ncTelefono ? ncTelefono.value.trim() : ''
      };
      if (!payload.nombre) {
        alert('El nombre del cliente es obligatorio');
        return;
      }
      fetch(`${BASE_URL}/crear-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      })
        .then(async r => {
          const j = await r.json().catch(() => ({}));
          if (!r.ok) {
            const msg = j.error || `Error al crear cliente (${r.status})`;
            throw new Error(msg);
          }
          return j;
        })
        .then(j => {
          // Guardar como clienteActivo global
          try {
            if (j.id != null) {
              const clienteActivoNuevo = {
                id: j.id,
                nombre: payload.nombre,
                email: payload.email,
                telefono: payload.telefono
              };
              localStorage.setItem('clienteActivo', JSON.stringify(clienteActivoNuevo));
              clienteActivo = clienteActivoNuevo;
            }
          } catch (_) {}

          // Recargar combo y seleccionar al nuevo cliente
          cargarClientesEnSelect();
          cerrarModalNuevoCliente();
        })
        .catch(err => {
          alert('No se pudo crear el cliente: ' + err.message);
        });
    });
  }

  // Búsqueda en vivo por patente para verificar existencia
  let t;
  if (patenteInput) {
    patenteInput.addEventListener('input', () => {
      clearTimeout(t);
      const val = (patenteInput.value || '').trim();
      if (!val) {
        if (patenteHint) patenteHint.textContent = '';
        return;
      }
      t = setTimeout(() => buscarPatente(val), 250);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      idauto: idautoInput.value ? Number(idautoInput.value) : undefined,
      patente: (patenteInput.value || '').trim(),
      marca: (marcaInput.value || '').trim(),
      modelo: (modeloInput.value || '').trim(),
      kilometraje: kmInput.value ? Number(kmInput.value) : '',
      tipoAceite: (aceiteInput.value || '').trim(),
      fecha: (fechaInput.value || '').trim(),
      idCliente: clienteSelect && clienteSelect.value ? Number(clienteSelect.value) : undefined
    };

    fetch(`${BASE_URL}/vehiculos/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    })
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = j.error || `Error del servidor (${r.status})`;
          throw new Error(msg);
        }
        return j;
      })
      .then(j => {
        alert('¡Vehículo guardado! ID asignado: ' + (j.id || ''));
        form.reset();
        cargarProximoId();
        if (patenteHint) patenteHint.textContent = '';
        cargarVehiculos();
      })
      .catch(err => {
        alert('No se pudo guardar el vehículo: ' + err.message);
      });
  });

  function cargarVehiculos() {
    if (!tbody) return;
    fetch(`${BASE_URL}/vehiculos-todos`, { cache: 'no-store' })
      .then(async r => {
        const j = await r.json().catch(() => []);
        if (!r.ok) throw new Error('No se pudo obtener la lista de vehículos');
        return Array.isArray(j) ? j : [];
      })
      .then(renderVehiculos)
      .catch(() => { tbody.innerHTML = '' });
  }

  function renderVehiculos(lista) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!lista.length) return;
    // Normalizar posibles claves según encabezado
    lista.forEach(item => {
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      const tdPat = document.createElement('td');
      const tdMar = document.createElement('td');
      const tdMod = document.createElement('td');
      const tdKm = document.createElement('td');
      const tdAce = document.createElement('td');
      const tdFec = document.createElement('td');
      tdId.textContent = item.Idauto || item.id || '';
      tdPat.textContent = item.Patente || item.patente || '';
      tdMar.textContent = item.Marca || item.marca || '';
      tdMod.textContent = item.Modelo || item.modelo || '';
      tdKm.textContent = item.Kilometraje || item.kilometraje || '';
      tdAce.textContent = item.TipoAceite || item.tipoAceite || '';
      tdFec.textContent = item.Fecha || item.fecha || '';
      [tdId, tdPat, tdMar, tdMod, tdKm, tdAce, tdFec].forEach(td => { td.style.padding = '8px'; td.style.borderBottom = '1px solid #f1f5f9'; });
      tr.appendChild(tdId);
      tr.appendChild(tdPat);
      tr.appendChild(tdMar);
      tr.appendChild(tdMod);
      tr.appendChild(tdKm);
      tr.appendChild(tdAce);
      tr.appendChild(tdFec);
      tbody.appendChild(tr);
    });
  }

  function buscarPatente(pat) {
    if (!patenteHint) return;
    const url = new URL(`${BASE_URL}/historial-vehiculo`);
    url.searchParams.set('patente', pat);
    fetch(url.toString(), { cache: 'no-store' })
      .then(async r => {
        const j = await r.json().catch(() => []);
        if (!r.ok) throw new Error('No se pudo buscar la patente');
        return Array.isArray(j) ? j : [];
      })
      .then(rows => {
        if (rows.length) {
          patenteHint.style.color = '#b91c1c'; // rojo discreto
          patenteHint.textContent = `Atención: patente ya registrada (${rows.length} registro${rows.length>1?'s':''}).`;
        } else {
          patenteHint.style.color = 'var(--muted)';
          patenteHint.textContent = 'Disponible';
        }
      })
      .catch(() => { patenteHint.textContent = ''; });
  }
});
