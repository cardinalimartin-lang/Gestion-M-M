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
      fecha: (fechaInput.value || '').trim()
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
