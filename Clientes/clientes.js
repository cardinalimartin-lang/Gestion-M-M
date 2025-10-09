document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-cliente');

    // 1. Manejar el envío del formulario al hacer click en el botón "GUARDAR CLIENTE"
    formulario.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que el formulario se envíe de la forma tradicional (recarga de página)

        // 2. Recopilar todos los datos
        const datosCliente = {
            // Información Personal
            nombre: document.getElementById('nombre').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            correo: document.getElementById('correo').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
            
            // Datos del Vehículo
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            año: document.getElementById('año').value.trim(),
            patente: document.getElementById('patente').value.trim(),
            kilometraje: document.getElementById('kilometraje').value.trim()
        };

        console.log("Datos recopilados:", datosCliente);

        // 3. Convertir a formato CSV (simulación de línea)
        const lineaCSV = convertirADisposicionCSV(datosCliente);
        console.log("Línea CSV generada:", lineaCSV);

        // 4. *** PUNTO CLAVE: Envío al servidor (simulación) ***
        // Aquí es donde, en un proyecto real, se enviaría 'datosCliente' o 'lineaCSV' 
        // a un endpoint del servidor (ej. usando 'fetch') para que el servidor 
        // lo guarde en el archivo 'clientes.csv'.

        // fetch('/guardar-cliente', {
        //     method: 'POST',
        //     headers: {'Content-Type': 'application/json'},
        //     body: JSON.stringify(datosCliente)
        // })
        // .then(response => response.json())
        // .then(data => {
        //     alert("¡Cliente guardado con éxito!");
        //     formulario.reset(); // Limpia el formulario
        // })
        // .catch(error => {
        //     console.error('Error al guardar:', error);
        //     alert("Hubo un error al intentar guardar el cliente.");
        // });


        // --- Mensaje de éxito simulado ---
        alert("Datos listos para enviar. ¡Revisa la consola para ver el CSV! (Necesitas un backend para guardarlo realmente)");
        // Limpia el formulario después de la simulación
        formulario.reset(); 
    });
});

/**
 * Función auxiliar para generar la línea CSV.
 * @param {object} datos - Objeto con los datos del cliente.
 * @returns {string} La línea de texto con formato CSV.
 */
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