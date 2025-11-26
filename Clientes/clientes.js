document.addEventListener('DOMContentLoaded', () => {
    // Si se abre directamente como archivo, redirigir al servidor HTTP para evitar CORS y origen null
    if (location.protocol === 'file:') {
        location.href = 'http://localhost:3000/clientes/clientes.html';
        return;
    }

    const BASE_URL = (location.origin && location.origin !== 'null' && location.protocol.startsWith('http'))
        ? location.origin
        : 'http://localhost:3000';
    const formulario = document.getElementById('formulario-cliente');
    const tbody = document.getElementById('tbody-clientes');
    const inputNombre = document.getElementById('nombre');
    const btnEditar = document.getElementById('btn-editar');
    const btnBorrar = document.getElementById('btn-borrar');

    const modalOverlay = document.getElementById('modal-editar-cliente');
    const modalForm = document.getElementById('form-editar-cliente');
    const modalNombre = document.getElementById('modal-nombre');
    const modalCorreo = document.getElementById('modal-correo');
    const modalTelefono = document.getElementById('modal-telefono');
    const modalClienteId = document.getElementById('modal-cliente-id');
    const modalCancelar = document.getElementById('modal-cancelar');

    let clienteSeleccionado = null;

    // Ocultar botón BORRAR si el usuario actual no es admin
    try {
        if (btnBorrar && typeof window.isAdminUser === 'function') {
            if (!window.isAdminUser()) {
                btnBorrar.style.display = 'none';
            }
        } else if (btnBorrar) {
            // fallback: si no hay helper disponible, ocultar el botón por seguridad
            btnBorrar.style.display = 'none';
        }
    } catch (_) {}

    // Cargar clientes existentes al iniciar
    cargarClientes();

    // Filtro en tiempo real por nombre/apellido
    if (inputNombre) {
        let t;
        inputNombre.addEventListener('input', () => {
            const val = inputNombre.value.trim();
            clearTimeout(t);
            t = setTimeout(() => {
                if (val) {
                    buscarPorNombre(val);
                } else {
                    cargarClientes();
                }
            }, 250);
        });
    }

    // 1. Manejar el envío del formulario al hacer click en el botón "GUARDAR CLIENTE"
    formulario.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que el formulario se envíe de la forma tradicional (recarga de página)

        const hiddenIdEl = document.getElementById('cliente-id');
        const idValor = hiddenIdEl ? hiddenIdEl.value.trim() : '';
        const esEdicion = !!idValor;

        // 2. Recopilar los datos necesarios
        const payload = {
            // Información Personal
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('correo').value.trim(),
            telefono: document.getElementById('telefono').value.trim()
        };

        if (esEdicion) {
            payload.id = idValor;
        }

        console.log("Datos recopilados (" + (esEdicion ? 'edición' : 'nuevo') + "):", payload);

        // 3. Elegir endpoint según sea alta o edición
        const endpoint = esEdicion ? `${BASE_URL}/actualizar-cliente` : `${BASE_URL}/crear-cliente`;

        fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
            cache: 'no-store'
        })
        .then(async response => {
            const json = await response.json().catch(() => ({}));
            if (!response.ok || (json && json.ok === false)) {
                const message = (json && json.error) || `Error del servidor: ${response.status}`;
                throw new Error(message);
            }
            return json;
        })
        .then(data => {
            alert(esEdicion ? "Cliente actualizado con éxito" : "¡Cliente guardado con éxito!");
            formulario.reset(); // Limpia el formulario
            if (hiddenIdEl) hiddenIdEl.value = '';
            // Si hay un filtro activo, mantenerlo; si no, cargar todos
            if (inputNombre && inputNombre.value.trim()) {
                buscarPorNombre(inputNombre.value.trim());
            } else {
                cargarClientes();
            }
        })
        .catch(error => {
            console.error('Error al guardar:', error);
            alert("Hubo un error al intentar guardar el cliente: " + error.message);
        });
    });

    function cargarClientes() {
        clienteSeleccionado = null;
        if (tbody) tbody.innerHTML = '';
        fetch(`${BASE_URL}/clientes-todos`, { cache: 'no-store' })
            .then(async r => {
                const j = await r.json().catch(() => []);
                if (!r.ok) throw new Error('No se pudo obtener la lista de clientes');
                return Array.isArray(j) ? j : [];
            })
            .then(renderLista)
            .catch(err => {
                console.error('Error cargando clientes:', err);
                if (tbody) tbody.innerHTML = '';
            });
    }

    function buscarPorNombre(name) {
        const url = new URL(`${BASE_URL}/buscar-clientes`);
        url.searchParams.set('name', name);
        fetch(url.toString(), { cache: 'no-store' })
            .then(async r => {
                const j = await r.json().catch(() => []);
                if (!r.ok) throw new Error('No se pudo buscar clientes');
                return Array.isArray(j) ? j : [];
            })
            .then(renderLista)
            .catch(err => {
                console.error('Error buscando clientes:', err);
                if (tbody) tbody.innerHTML = '';
            });
    }

    function renderLista(lista) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!lista.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 3;
            td.textContent = 'No hay clientes cargados.';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        lista.forEach(item => {
            const tr = document.createElement('tr');
            const tdNombre = document.createElement('td');
            const tdEmail = document.createElement('td');
            const tdTel = document.createElement('td');
            tdNombre.textContent = item.NombreCliente || '';
            tdEmail.textContent = item.EmailCliente || '';
            tdTel.textContent = item.Telefono || '';
            tr.appendChild(tdNombre);
            tr.appendChild(tdEmail);
            tr.appendChild(tdTel);

            tr.addEventListener('click', () => {
                // Quitar selección previa
                Array.from(tbody.querySelectorAll('tr')).forEach(fila => fila.classList.remove('fila-seleccionada'));
                tr.classList.add('fila-seleccionada');
                clienteSeleccionado = item;

                // Rellenar formulario principal
                const nombreInput = document.getElementById('nombre');
                const correoInput = document.getElementById('correo');
                const telefonoInput = document.getElementById('telefono');
                const hiddenId = document.getElementById('cliente-id');
                if (nombreInput) nombreInput.value = item.NombreCliente || '';
                if (correoInput) correoInput.value = item.EmailCliente || '';
                if (telefonoInput) telefonoInput.value = item.Telefono || '';
                if (hiddenId) hiddenId.value = item.id != null ? String(item.id) : '';

                // Guardar cliente activo globalmente para usar desde otras pantallas
                try {
                    if (item.id != null) {
                        const clienteActivo = {
                            id: item.id,
                            nombre: item.NombreCliente || '',
                            email: item.EmailCliente || '',
                            telefono: item.Telefono || ''
                        };
                        localStorage.setItem('clienteActivo', JSON.stringify(clienteActivo));
                    }
                } catch (_) {}
            });

            tbody.appendChild(tr);
        });
    }

    // Abrir modal de edición al hacer click en EDITAR
    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            if (!clienteSeleccionado) {
                alert('Seleccioná primero un cliente de la lista.');
                return;
            }
            if (!modalOverlay || !modalForm) return;
            modalNombre.value = clienteSeleccionado.NombreCliente || '';
            modalCorreo.value = clienteSeleccionado.EmailCliente || '';
            modalTelefono.value = clienteSeleccionado.Telefono || '';
            modalClienteId.value = clienteSeleccionado.id != null ? String(clienteSeleccionado.id) : '';
            modalOverlay.classList.add('visible');
            modalOverlay.setAttribute('aria-hidden', 'false');
        });
    }

    // Cerrar modal al cancelar
    if (modalCancelar && modalOverlay) {
        modalCancelar.addEventListener('click', () => {
            modalOverlay.classList.remove('visible');
            modalOverlay.setAttribute('aria-hidden', 'true');
        });
    }

    // Guardar cambios de edición
    if (modalForm) {
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = modalClienteId.value;
            if (!id) {
                alert('No se pudo determinar el cliente a editar.');
                return;
            }
            const payload = {
                id,
                nombre: modalNombre.value.trim(),
                email: modalCorreo.value.trim(),
                telefono: modalTelefono.value.trim()
            };
            try {
                const resp = await fetch(`${BASE_URL}/actualizar-cliente`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok || !data.ok) {
                    throw new Error(data.error || 'No se pudo actualizar el cliente');
                }
                alert('Cliente actualizado correctamente.');
                modalOverlay.classList.remove('visible');
                modalOverlay.setAttribute('aria-hidden', 'true');
                cargarClientes();
            } catch (err) {
                console.error('Error al actualizar cliente:', err);
                alert('Error al actualizar cliente: ' + err.message);
            }
        });
    }

    // Borrar cliente (solo visible si es admin)
    if (btnBorrar) {
        btnBorrar.addEventListener('click', async () => {
            if (!clienteSeleccionado) {
                alert('Seleccioná primero un cliente de la lista.');
                return;
            }
            const confirmar = confirm(`¿Seguro que querés borrar al cliente "${clienteSeleccionado.NombreCliente}"?`);
            if (!confirmar) return;

            let adminUser = null;
            let adminPass = null;
            try {
                if (typeof window.getAdminCredentials === 'function') {
                    const creds = window.getAdminCredentials();
                    adminUser = creds.adminUser;
                    adminPass = creds.adminPass;
                } else {
                    adminUser = sessionStorage.getItem('adminUser');
                    adminPass = sessionStorage.getItem('adminPass');
                }
            } catch (_) {}

            if (!adminUser || !adminPass) {
                alert('Se requieren credenciales de administrador para borrar clientes.');
                return;
            }

            try {
                const resp = await fetch(`${BASE_URL}/borrar-cliente`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: clienteSeleccionado.id,
                        adminUser,
                        adminPass
                    })
                });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok || !data.ok) {
                    throw new Error(data.error || 'No se pudo borrar el cliente');
                }
                alert('Cliente borrado correctamente.');
                cargarClientes();
            } catch (err) {
                console.error('Error al borrar cliente:', err);
                alert('Error al borrar cliente: ' + err.message);
            }
        });
    }
});
function convertirADisposicionCSV(datos) {
    // Definimos el orden de las columnas:
    const campos = [
        datos.nombre, 
        datos.telefono, 
        datos.correo, 
        datos.direccion, 
        datos.marca, 
        datos.modelo, 
        datos.año, 
        datos.patente, 
        datos.kilometraje
    ];
    
    // Unimos los campos con comas
    // Se utiliza .replace(/"/g, '""') para escapar comillas dobles dentro de los datos
    // y luego se encierra todo en comillas dobles (formato CSV estándar).
    return campos.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(',');
}

// Nota: Esta parte de JavaScript no tiene la capacidad de escribir el CSV directamente.
// Necesitas un script en el servidor (Java/Python/etc.) para recibir los datos y guardarlos.