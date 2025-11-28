document.addEventListener('DOMContentLoaded', () => {
  // Almacenará la lista de complementos cargada desde el servidor.
  let complementosDisponibles = [];

  // --- ELEMENTOS DEL DOM ---
  const subtotalComplementosEl = document.getElementById('subtotal-complementos'); // Nota: este ID no existe aún, lo añadiremos.

  // --- FUNCIONES ---

  /**
   * Formatea un número como un string de moneda.
   */
  function formatearPrecio(valor) {
    const numero = parseFloat(valor);
    if (isNaN(numero)) {
      return '0.00';
    }
    return numero.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Carga los datos de complementos desde la API del servidor.
   */
  async function cargarComplementos() {
    try {
      const response = await fetch('http://localhost:3000/api/complementos');
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = await response.json();

      if (data.ok && Array.isArray(data.data)) {
        complementosDisponibles = data.data;
        actualizarSelectores();
      } else {
        console.error('La respuesta de la API de complementos no es válida:', data);
      }
    } catch (error) {
      console.error('Error fatal al cargar los complementos:', error);
    }
  }

  /**
   * Rellena los menús desplegables con los complementos cargados.
   */
  function actualizarSelectores() {
    const selects = Array.from({ length: 7 }, (_, i) => document.getElementById(`select-detalle-complemento-${i + 3}`));
    
    selects.forEach(select => {
      if (!select) return;

      const opcionDefault = select.options[0];
      select.innerHTML = ''; 
      select.appendChild(opcionDefault);

      complementosDisponibles.forEach(complemento => {
        const option = document.createElement('option');
        option.value = complemento.codigo;
        option.textContent = `${complemento.descripcion} (${complemento.codigo})`;
        select.appendChild(option);
      });
    });
  }

  /**
   * Actualiza la fila de la tabla cuando se selecciona un complemento.
   */
  function manejarSeleccionComplemento(num) {
    const select = document.getElementById(`select-detalle-complemento-${num}`);
    const complementoSeleccionado = complementosDisponibles.find(c => c.codigo === select.value);

    const codigoEl = document.getElementById(`codigo-complemento-${num}`);
    const precioEl = document.getElementById(`precio-complemento-${num}`);

    if (complementoSeleccionado) {
      codigoEl.textContent = complementoSeleccionado.codigo;
      precioEl.textContent = formatearPrecio(complementoSeleccionado.precio);
    } else {
      codigoEl.textContent = '';
      precioEl.textContent = '0.00';
    }
    
    actualizarTotalFila(num);
  }

  /**
   * Actualiza el total para una fila específica de complemento.
   */
  function actualizarTotalFila(num) {
    const cantidadInput = document.getElementById(`cant-complemento-${num}`);
    const select = document.getElementById(`select-detalle-complemento-${num}`);
    const complementoSeleccionado = complementosDisponibles.find(c => c.codigo === select.value);

    const cantidad = parseInt(cantidadInput.value, 10) || 0;
    const precio = complementoSeleccionado ? complementoSeleccionado.precio : 0;
    const total = cantidad * precio;

    const totalEl = document.getElementById(`total-complemento-${num}`);
    totalEl.textContent = formatearPrecio(total);
    
    actualizarSubtotalGeneral();
  }

  /**
   * Calcula y actualiza el subtotal de la sección de complementos.
   */
  function actualizarSubtotalGeneral() {
    let subtotal = 0;
    for (let i = 3; i <= 9; i++) {
      const select = document.getElementById(`select-detalle-complemento-${i}`);
      const complemento = complementosDisponibles.find(c => c.codigo === select.value);
      if (complemento) {
        const cantidadInput = document.getElementById(`cant-complemento-${i}`);
        const cantidad = parseInt(cantidadInput.value, 10) || 0;
        subtotal += cantidad * complemento.precio;
      }
    }

    if (subtotalComplementosEl) {
      subtotalComplementosEl.textContent = formatearPrecio(subtotal);
    }
  }
  
  /**
   * Configura los event listeners iniciales.
   */
  function inicializarEventos() {
    for (let i = 3; i <= 9; i++) {
      const select = document.getElementById(`select-detalle-complemento-${i}`);
      const cantidadInput = document.getElementById(`cant-complemento-${i}`);

      if (select) {
        select.addEventListener('change', () => manejarSeleccionComplemento(i));
      }
      if (cantidadInput) {
        cantidadInput.addEventListener('input', () => actualizarTotalFila(i));
      }
    }
  }

  // --- INICIALIZACIÓN ---
  
  cargarComplementos().then(() => {
    inicializarEventos();
    console.log('Sistema de complementos inicializado.');
  });
});
