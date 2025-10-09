// index.js

// Obtener todos los elementos <select>
const select1 = document.getElementById('datos-csv');
const select2 = document.getElementById('datos-csv2');
const select3 = document.getElementById('datos-csv3');

// Obtener todos los elementos <span> de las etiquetas
const etqAceite = document.getElementById('etiqueta-aceite');
const etqTipo = document.getElementById('etiqueta-tipo');
const etqFiltroAire = document.getElementById('etiqueta-filtro-aire');
const etqFiltroAceite = document.getElementById('etiqueta-filtro-aceite');
const etqFiltroNafta = document.getElementById('etiqueta-filtro-nafta');
const etqFiltroHabitaculo = document.getElementById('etiqueta-filtro-habitaculo');
const valorFiltroAire = document.getElementById('valor-filtro-aire');
const precioAceite = document.getElementById('precio-aceite');
const valorManoObra = document.getElementById('valor-mano-obra');

let allCsvData = [];
const csvFilePath = 'bdato.csv';

// Función para limpiar el contenido de las etiquetas
const clearLabels = () => {
    etqAceite.textContent = '';
    etqTipo.textContent = '';
    etqFiltroAire.textContent = '';
    etqFiltroAceite.textContent = '';
    etqFiltroNafta.textContent = '';
    etqFiltroHabitaculo.textContent = '';
    valorFiltroAire.textContent = '';
    precioAceite.textContent = '';
    valorManoObra.textContent = '';
    const totalServicio = document.getElementById('total-servicio');
    if (totalServicio) totalServicio.textContent = '$0';
};

// Función para llenar cualquier desplegable
const populateDropdown = (selectElement, values) => {
    selectElement.innerHTML = '<option value="">Selecciona...</option>';
    values.forEach(value => {
        if (value) {
            const option = document.createElement('option');
            option.textContent = value;
            option.value = value;
            selectElement.appendChild(option);
        }
    });
};

// Función para imprimir los datos obtenidos
document.addEventListener('DOMContentLoaded', function() {
    const btnImprimir = document.getElementById('btn-imprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            const datosDiv = document.createElement('div');
            datosDiv.innerHTML = `
                <h3>Datos Obtenidos</h3>
                <p>Aceite: ${etqAceite.textContent}</p>
                <p>Tipo: ${etqTipo.textContent}</p>
                <p>Filtro de Aire: ${etqFiltroAire.textContent}</p>
                <p>Filtro de Aceite: ${etqFiltroAceite.textContent}</p>
                <p>Filtro de Nafta: ${etqFiltroNafta.textContent}</p>
                <p>Filtro de Habitaculo: ${etqFiltroHabitaculo.textContent}</p>
                <p>Valor Filtro de Aire: ${valorFiltroAire.textContent}</p>
                <p>Precio Aceite: ${precioAceite.textContent}</p>
                <p>Mano de Obra: ${valorManoObra.textContent}</p>
            `;
            const ventana = window.open('', '', 'width=600,height=400');
            ventana.document.write('<html><head><title>Imprimir Datos</title></head><body>' + datosDiv.innerHTML + '</body></html>');
            ventana.document.close();
            ventana.print();
        });
    }
});

// Cargar y procesar el archivo CSV
fetch(csvFilePath)
    .then(response => {
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo CSV');
        }
        return response.text();
    })
    .then(data => {
        const lines = data.split('\n');
        allCsvData = lines.slice(1).map(line => line.trim().split(';')).filter(fields => fields.length > 1);

        // Llenar el primer desplegable
        populateDropdown(select1, [...new Set(allCsvData.map(fields => fields[0]))]);
        
        // Listener para el primer desplegable
        select1.addEventListener('change', () => {
            const selectedValue = select1.value;
            if (!selectedValue) {
                populateDropdown(select2, []);
                populateDropdown(select3, []);
                clearLabels();
                return;
            }
            const filteredData = allCsvData.filter(fields => fields[0] === selectedValue);
            const uniqueValues2 = new Set(filteredData.map(fields => fields[1]));
            populateDropdown(select2, [...uniqueValues2]);
            select2.dispatchEvent(new Event('change'));
        });
        
        // Listener para el segundo desplegable
        select2.addEventListener('change', () => {
            const selectedValue1 = select1.value;
            const selectedValue2 = select2.value;
            if (!selectedValue2) {
                populateDropdown(select3, []);
                clearLabels();
                return;
            }
            const filteredData = allCsvData.filter(fields => {
                return fields[0] === selectedValue1 && fields[1] === selectedValue2;
            });
            const uniqueValues3 = new Set(filteredData.map(fields => fields[2]));
            populateDropdown(select3, [...uniqueValues3]);
            select3.dispatchEvent(new Event('change'));
        });
        
        // Listener para el tercer desplegable (el nuevo, para mostrar las etiquetas)
        select3.addEventListener('change', () => {
            const selectedValue1 = select1.value;
            const selectedValue2 = select2.value;
            const selectedValue3 = select3.value;

            // Referencias a los checkboxes
            const checkFiltroAire = document.getElementById('check-valor-filtro-aire');
            const checkAceite = document.getElementById('check-precio-aceite');
            const checkManoObra = document.getElementById('check-valor-mano-obra');

            if (!selectedValue3) {
                clearLabels();
                // Destildar todos los checkboxes
                checkFiltroAire.checked = false;
                checkAceite.checked = false;
                checkManoObra.checked = false;
                calcularTotal();
                return;
            }
            
            // Encontrar la fila que coincida con los 3 filtros
            const finalResult = allCsvData.find(fields => {
                return fields[0] === selectedValue1 && fields[1] === selectedValue2 && fields[2] === selectedValue3;
            });

            // Si se encuentra un resultado, actualizar las etiquetas
            if (finalResult) {
                etqAceite.textContent = finalResult[7];
                etqTipo.textContent = finalResult[6];
                etqFiltroAire.textContent = finalResult[9];
                etqFiltroAceite.textContent = finalResult[11];
                etqFiltroNafta.textContent = finalResult[12];
                etqFiltroHabitaculo.textContent = finalResult[14];
                    // Precios manuales
                    let precioFiltroAire = '';
                    let precioAceiteValor = '';
                    // Ejemplo: asignar precios según el código del filtro de aire
                    switch(finalResult[9]) {
                        case 'C18 003':
                            precioFiltroAire = '$8.000';
                            break;
                        case 'C1589/3':
                            precioFiltroAire = '$7.500';
                            break;
                        default:
                            precioFiltroAire = '$6.000';
                    }
                    // Ejemplo: asignar precios según viscosidad de aceite
                    switch(finalResult[7]) {
                        case '5W-40':
                            precioAceiteValor = '$60.000';
                            break;
                        case '0W-30':
                            precioAceiteValor = '$80.000';
                            break;
                            case '5W-30':
                            precioAceiteValor = '$80.000';
                            break;
                        default:
                            precioAceiteValor = '$10.000';
                    }
                    valorFiltroAire.textContent = precioFiltroAire;
                    precioAceite.textContent = precioAceiteValor;
                    valorManoObra.textContent = '$15.000';

                                    // Calcular el total
                                    function parsePrecio(precioStr) {
                                        return Number(precioStr.replace(/[^\d]/g, '')) || 0;
                                    }
                                    const total = parsePrecio(precioFiltroAire) + parsePrecio(precioAceiteValor) + 15000;
                                    const totalServicio = document.getElementById('total-servicio');
                                    totalServicio.textContent = `$${total.toLocaleString()}`;
            } else {
                clearLabels();
                etqAceite.textContent = 'No se encontraron datos';
            }

            // Tildar todos los checkboxes de productos con valor
            checkFiltroAire.checked = true;
            checkAceite.checked = true;
            checkManoObra.checked = true;
            calcularTotal();
        });

        // Disparar un evento inicial para llenar el primer desplegable al cargar la página
        select1.dispatchEvent(new Event('change'));
    })
    .catch(error => {
        console.error('Error:', error);
        select1.innerHTML = `<option>Error al cargar datos</option>`;
        select2.innerHTML = `<option>Error al cargar datos</option>`;
        select3.innerHTML = `<option>Error al cargar datos</option>`;
        clearLabels();
    });

function parsePrecio(precioStr) {
    return Number(precioStr.replace(/[^\d]/g, '')) || 0;
}

function calcularTotal() {
    let total = 0;

    if (document.getElementById('check-valor-filtro-aire').checked) {
        let valor = parsePrecio(document.getElementById('valor-filtro-aire').textContent);
        total += valor;
    }
    if (document.getElementById('check-precio-aceite').checked) {
        let valor = parsePrecio(document.getElementById('precio-aceite').textContent);
        total += valor;
    }
    if (document.getElementById('check-valor-mano-obra').checked) {
        let valor = parsePrecio(document.getElementById('valor-mano-obra').textContent);
        total += valor;
    }

    document.getElementById('total-servicio').textContent = `$${total.toLocaleString()}`;
}

// Escucha los cambios en los checkboxes
document.getElementById('check-valor-filtro-aire').addEventListener('change', calcularTotal);
document.getElementById('check-precio-aceite').addEventListener('change', calcularTotal);
document.getElementById('check-valor-mano-obra').addEventListener('change', calcularTotal);

// Llama calcularTotal cada vez que cambian los valores de los precios
select3.addEventListener('change', calcularTotal);