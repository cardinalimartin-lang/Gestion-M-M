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

        // 2. Recopilar los datos necesarios para crear el cliente
        const payload = {
            // Información Personal
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('correo').value.trim(),
            telefono: document.getElementById('telefono').value.trim()
        };

        console.log("Datos recopilados:", payload);

        // 3. Enviar al servidor usando fetch al endpoint absoluto
        fetch(`${BASE_URL}/crear-cliente`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
            cache: 'no-store'
        })
        .then(async response => {
            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = json.error || `Error del servidor: ${response.status}`;
                throw new Error(message);
            }
            return json;
        })
        .then(data => {
            alert("¡Cliente guardado con éxito!");
            formulario.reset(); // Limpia el formulario
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
            tbody.appendChild(tr);
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