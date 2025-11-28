document.addEventListener('DOMContentLoaded', () => {
  // Almacenará la lista de aceites cargada desde el servidor.
  let aceitesDisponibles = [];

  // --- ELEMENTOS DEL DOM ---
  const selectAceite1 = document.getElementById('select-detalle-aceite-1');
  const selectAceite2 = document.getElementById('select-detalle-aceite-2');
  const subtotalAceitesEl = document.getElementById('subtotal-aceites');

  // --- FUNCIONES ---

  /**
   * Formatea un número como un string de moneda.
   * @param {number} valor - El número a formatear.
   * @returns {string} - El valor formateado (ej. "1,234.50").
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
   * Carga los datos de aceites desde la API del servidor.
   */
  async function cargarAceites() {
    try {
      const response = await fetch('http://localhost:3000/api/aceites');
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = await response.json();

      if (data.ok && Array.isArray(data.data)) {
        aceitesDisponibles = data.data;
        actualizarSelectores();
      } else {
        console.error('La respuesta de la API de aceites no es válida:', data);
      }
    } catch (error) {
      console.error('Error fatal al cargar los aceites:', error);
      // Opcional: mostrar un mensaje de error al usuario en la UI.
    }
  }

  /**
   * Rellena los menús desplegables con los aceites cargados.
   */
  function actualizarSelectores() {
    const selects = [selectAceite1, selectAceite2];
    
    selects.forEach(select => {
      if (!select) return;

      // Guardar la opción "Seleccione Detalle"
      const opcionDefault = select.options[0];
      select.innerHTML = ''; // Limpiar todas las opciones
      select.appendChild(opcionDefault); // Volver a agregar la default

      // Agregar las nuevas opciones
      aceitesDisponibles.forEach(aceite => {
        const option = document.createElement('option');
        option.value = aceite.codigo;
        // Mostrar descripción y código en el desplegable
        option.textContent = `${aceite.descripcion} (${aceite.codigo})`;
        select.appendChild(option);
      });
    });
  }

  /**
   * Actualiza la fila de la tabla cuando se selecciona un aceite.
   * @param {number} num - El número de la fila (1 o 2).
   */
  function manejarSeleccionAceite(num) {
    const select = document.getElementById(`select-detalle-aceite-${num}`);
    const aceiteSeleccionado = aceitesDisponibles.find(a => a.codigo === select.value);

    const codigoEl = document.getElementById(`codigo-aceite-${num}`);
    const precioEl = document.getElementById(`precio-aceite-${num}`);

    if (aceiteSeleccionado) {
      codigoEl.textContent = aceiteSeleccionado.codigo;
      precioEl.textContent = formatearPrecio(aceiteSeleccionado.precio);
    } else {
      // Si se selecciona "Seleccione Detalle", limpiar los campos
      codigoEl.textContent = '';
      precioEl.textContent = '0.00';
    }
    
    // Recalcular el total de la línea y el subtotal general
    actualizarTotalFila(num);
    actualizarSubtotalGeneral();
  }

  /**
   * Actualiza el total para una fila específica de aceite.
   * @param {number} num - El número de la fila (1 o 2).
   */
  function actualizarTotalFila(num) {
    const cantidadInput = document.getElementById(`cant-aceite-${num}`);
    const select = document.getElementById(`select-detalle-aceite-${num}`);
    const aceiteSeleccionado = aceitesDisponibles.find(a => a.codigo === select.value);

    const cantidad = parseInt(cantidadInput.value, 10) || 0;
    const precio = aceiteSeleccionado ? aceiteSeleccionado.precio : 0;
    const total = cantidad * precio;

    const totalEl = document.getElementById(`total-aceite-${num}`);
    totalEl.textContent = formatearPrecio(total);
    
    // Cada vez que se actualiza una fila, actualizar el subtotal
    actualizarSubtotalGeneral();
  }

  /**
   * Calcula y actualiza el subtotal de la sección de aceites.
   */
  function actualizarSubtotalGeneral() {
    let subtotal = 0;
    [1, 2].forEach(num => {
      const select = document.getElementById(`select-detalle-aceite-${num}`);
      const aceite = aceitesDisponibles.find(a => a.codigo === select.value);
      if (aceite) {
        const cantidadInput = document.getElementById(`cant-aceite-${num}`);
        const cantidad = parseInt(cantidadInput.value, 10) || 0;
        subtotal += cantidad * aceite.precio;
      }
    });

    if (subtotalAceitesEl) {
      subtotalAceitesEl.textContent = formatearPrecio(subtotal);
    }
  }
  
  /**
   * Configura los event listeners iniciales.
   */
  function inicializarEventos() {
    [1, 2].forEach(num => {
      const select = document.getElementById(`select-detalle-aceite-${num}`);
      const cantidadInput = document.getElementById(`cant-aceite-${num}`);

      if (select) {
        select.addEventListener('change', () => manejarSeleccionAceite(num));
      }
      if (cantidadInput) {
        cantidadInput.addEventListener('input', () => actualizarTotalFila(num));
      }
    });
  }

  // --- INICIALIZACIÓN ---
  
  // Cargar los datos y luego configurar los eventos.
  cargarAceites().then(() => {
    inicializarEventos();
    console.log('Sistema de aceites inicializado.');
  });
});