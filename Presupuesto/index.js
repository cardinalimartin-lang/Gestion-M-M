class SelectWithSearch {
    constructor(container, placeholder, options) {
        this.container = container;
        this.placeholder = placeholder;
        this.options = options;
        this.value = '';

        this.container.innerHTML = `
            <div class="select-with-search">
                <input type="text" placeholder="${this.placeholder}" class="select-with-search-input">
                <div class="select-with-search-dropdown" style="display: none;"></div>
            </div>
        `;

        this.input = this.container.querySelector('.select-with-search-input');
        this.dropdown = this.container.querySelector('.select-with-search-dropdown');

        this.input.addEventListener('focus', () => {
            this.renderDropdown();
            this.dropdown.style.display = 'block';
        });

        this.input.addEventListener('blur', () => {
            setTimeout(() => {
                this.dropdown.style.display = 'none';
            }, 200);
        });

        this.input.addEventListener('input', () => {
            this.renderDropdown(this.input.value);
        });

        this.renderDropdown();
    }

    renderDropdown(filter = '') {
        this.dropdown.innerHTML = '';
        const filteredOptions = this.options.filter(option => option.toLowerCase().includes(filter.toLowerCase()));

        filteredOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('select-with-search-option');
            optionElement.textContent = option;
            optionElement.addEventListener('click', () => {
                this.input.value = option;
                this.value = option;
                this.dropdown.style.display = 'none';
                this.container.dispatchEvent(new CustomEvent('change', { detail: { value: option } }));
            });
            this.dropdown.appendChild(optionElement);
        });
    }

    setOptions(options) {
        this.options = options;
        this.renderDropdown();
    }

    clear() {
        this.input.value = '';
        this.value = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const marcaContainer = document.getElementById('marca-container');
    const modeloContainer = document.getElementById('modelo-container');
    const motorContainer = document.getElementById('motor-container');

    const selectMarca = new SelectWithSearch(marcaContainer, 'Seleccione una marca', []);
    const selectModelo = new SelectWithSearch(modeloContainer, 'Seleccione un modelo', []);
    const selectMotor = new SelectWithSearch(motorContainer, 'Seleccione un motor', []);

    const celdaTipoCombustible = document.getElementById('tipo-combustible');
    const spanAceiteMan = document.getElementById('codigo-aceite-man');
    const spanAceiteWix = document.getElementById('codigo-aceite-wix');
    const spanAireMan = document.getElementById('codigo-aire-man');
    const spanAireWix = document.getElementById('codigo-aire-wix');
    const spanFCombMan = document.getElementById('codigo-fcomb-man');
    const spanFCombWix = document.getElementById('codigo-fcomb-wix');
    const spanHabitaculoMan = document.getElementById('codigo-habitaculo-man');
    const spanHabitaculoWix = document.getElementById('codigo-habitaculo-wix');

    const detalleFiltroAceite = document.getElementById('detalle-filtro-aceite');
    const detalleFiltroAire = document.getElementById('detalle-filtro-aire');
    const detalleFiltroFCombustible = document.getElementById('detalle-filtro-fcombustible');
    const detalleFiltroHabitaculo = document.getElementById('detalle-filtro-habitaculo');

    const cantFiltroAceite = document.getElementById('cant-filtro-aceite');
    const cantFiltroAire = document.getElementById('cant-filtro-aire');
    const cantFiltroCombustible = document.getElementById('cant-filtro-fcombustible');
    const cantFiltroHabitaculo = document.getElementById('cant-filtro-habitaculo');

    const precioFiltroAceite = document.getElementById('precio-filtro-aceite');
    const precioFiltroAire = document.getElementById('precio-filtro-aire');
    const precioFiltroFComb = document.getElementById('precio-filtro-fcombustible');
    const precioFiltroHabitaculo = document.getElementById('precio-filtro-habitaculo');

    const totalFiltroAceite = document.getElementById('total-filtro-aceite');
    const totalFiltroAire = document.getElementById('total-filtro-aire');
    const totalFiltroFComb = document.getElementById('total-filtro-fcombustible');
    const totalFiltroHabitaculo = document.getElementById('total-filtro-habitaculo');

    const existFiltroAceite = document.getElementById('exist-filtro-aceite');
    const existFiltroAire = document.getElementById('exist-filtro-aire');
    const existFiltroFComb = document.getElementById('exist-filtro-fcombustible');
    const existFiltroHabitaculo = document.getElementById('exist-filtro-habitaculo');
    const subtotalFiltros = document.getElementById('subtotal-filtros');

    const tablaFiltrosVehiculo = document.querySelector('.bloque-filtros-vehiculo table');

    let datos = [];

    function parseCSV(texto) {
        const lineas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lineas.length === 0) return [];
        const encabezados = lineas[0].split(';').map(h => h.trim());
        const registros = [];
        for (let i = 1; i < lineas.length; i++) {
            const partes = lineas[i].split(';');
            if (partes.length < encabezados.length) continue;
            const fila = {};
            encabezados.forEach((h, idx) => {
                fila[h] = (partes[idx] || '').toString().trim();
            });
            registros.push(fila);
        }
        return registros;
    }

    function valoresUnicos(lista, clave) {
        const set = new Set();
        lista.forEach(fila => {
            const v = fila[clave];
            if (v) set.add(v);
        });
        return Array.from(set).sort();
    }

    function resetDetalleFiltros() {
        if (detalleFiltroAceite) detalleFiltroAceite.textContent = 'Seleccione Filtro';
        if (detalleFiltroAire) detalleFiltroAire.textContent = 'Seleccione Filtro';
        if (detalleFiltroFCombustible) detalleFiltroFCombustible.textContent = 'Seleccione Filtro';
        if (detalleFiltroHabitaculo) detalleFiltroHabitaculo.textContent = 'Seleccione Filtro';

        [
            precioFiltroAceite, precioFiltroAire, precioFiltroFComb, precioFiltroHabitaculo,
            totalFiltroAceite, totalFiltroAire, totalFiltroFComb, totalFiltroHabitaculo,
            existFiltroAceite, existFiltroAire, existFiltroFComb, existFiltroHabitaculo
        ].forEach(el => { if (el) el.textContent = ''; });

        [cantFiltroAceite, cantFiltroAire, cantFiltroCombustible, cantFiltroHabitaculo].forEach(input => {
            if (input) input.value = 1;
        });
        actualizarSubtotalFiltros();
    }

    function limpiarCeldasFiltros() {
        celdaTipoCombustible.textContent = '';
        spanAceiteMan.textContent = '';
        spanAceiteWix.textContent = '';
        spanAireMan.textContent = '';
        spanAireWix.textContent = '';
        spanFCombMan.textContent = '';
        spanFCombWix.textContent = '';
        spanHabitaculoMan.textContent = '';
        spanHabitaculoWix.textContent = '';

        const filasExtras = document.querySelectorAll('tr[data-extra-filtro]');
        filasExtras.forEach(tr => tr.remove());

        const checkboxes = document.querySelectorAll('.bloque-filtros-vehiculo input[type="checkbox"]');
        checkboxes.forEach(chk => { chk.checked = false; });

        resetDetalleFiltros();
    }

    function parsePrecioFromSpan(spanEl) {
        if (!spanEl) return 0;
        const txt = spanEl.textContent.replace(/[^0-9,.-]/g, '').trim();
        if (!txt) return 0;
        const normalizado = txt.replace('.', '').replace(',', '.');
        const n = parseFloat(normalizado);
        return isNaN(n) ? 0 : n;
    }

    function actualizarSubtotalFiltros() {
        const totalAceite = parsePrecioFromSpan(totalFiltroAceite);
        const totalAire = parsePrecioFromSpan(totalFiltroAire);
        const totalFComb = parsePrecioFromSpan(totalFiltroFComb);
        const totalHabitaculo = parsePrecioFromSpan(totalFiltroHabitaculo);
        const subtotal = totalAceite + totalAire + totalFComb + totalHabitaculo;
        if (subtotalFiltros) {
            subtotalFiltros.textContent = formatearPrecio(subtotal);
        }
    }

    function actualizarTotalLinea(cantInput, precioSpan, totalSpan) {
        if (!cantInput || !precioSpan || !totalSpan) return;
        const cantidad = parseFloat(cantInput.value) || 0;
        const precio = parsePrecioFromSpan(precioSpan);
        const total = cantidad * precio;
        totalSpan.textContent = total ? formatearPrecio(total) : '';
        actualizarSubtotalFiltros();
    }

    function obtenerRefsLinea(grupo) {
        switch (grupo) {
            case 'aceite':
                return {
                    cant: cantFiltroAceite,
                    precio: precioFiltroAceite,
                    total: totalFiltroAceite,
                    exist: existFiltroAceite
                };
            case 'aire':
                return {
                    cant: cantFiltroAire,
                    precio: precioFiltroAire,
                    total: totalFiltroAire,
                    exist: existFiltroAire
                };
            case 'fcombustible':
                return {
                    cant: cantFiltroCombustible,
                    precio: precioFiltroFComb,
                    total: totalFiltroFComb,
                    exist: existFiltroFComb
                };
            case 'habitaculo':
                return {
                    cant: cantFiltroHabitaculo,
                    precio: precioFiltroHabitaculo,
                    total: totalFiltroHabitaculo,
                    exist: existFiltroHabitaculo
                };
            default:
                return null;
        }
    }

    function limpiarLineaPrecio(grupo) {
        const refs = obtenerRefsLinea(grupo);
        if (!refs) return;
        if (refs.precio) refs.precio.textContent = '';
        if (refs.total) refs.total.textContent = '';
        if (refs.exist) refs.exist.textContent = '';
        if (refs.cant) refs.cant.value = 1;
    }

    function formatearPrecio(valor) {
        if (!valor) return '';
        try {
            return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch {
            return valor.toFixed(2);
        }
    }

    function actualizarPrecioDesdeBackend(grupo, codigo) {
        const refs = obtenerRefsLinea(grupo);
        if (!refs) return;
        if (!codigo) {
            limpiarLineaPrecio(grupo);
            return;
        }

        fetch(`/api/existencia?codigo=${encodeURIComponent(codigo)}`)
            .then(resp => resp.json())
            .then(data => {
                if (!data || !data.ok || !data.encontrado || !data.data) {
                    limpiarLineaPrecio(grupo);
                    return;
                }
                const precio = Number(data.data.precioUnidad) || 0;
                const existencia = data.data.existencia || '';
                if (refs.precio) refs.precio.textContent = precio ? formatearPrecio(precio) : '';
                if (refs.exist) refs.exist.textContent = existencia;
                actualizarTotalLinea(refs.cant, refs.precio, refs.total);
            })
            .catch(err => {
                console.error('Error consultando /api/existencia', err);
                limpiarLineaPrecio(grupo);
            });
    }

    function separarPorElemento(registros, nombresElemento) {
        const candidatos = registros.filter(r => nombresElemento.includes(r['Elemento']));
        if (candidatos.length === 0) return { principal: null, extras: [] };

        const codigosVistos = new Set();
        const candidatosUnicos = candidatos.filter(r => {
            const codigoMan = r['Codigo Man'] || '';
            const codigoWix = r['Codigo Wix'] || '';
            const clave = `${codigoMan}|${codigoWix}`;

            if ((!codigoMan || codigoMan === '#N/A') && (!codigoWix || codigoWix === '#N/A')) {
                return false;
            }

            if (codigosVistos.has(clave)) {
                return false;
            } else {
                codigosVistos.add(clave);
                return true;
            }
        });

        if (candidatosUnicos.length === 0) return { principal: null, extras: [] };

        const conCodigos = candidatosUnicos.filter(
            r => r['Codigo Man'] && r['Codigo Man'] !== '#N/A' && r['Codigo Wix'] && r['Codigo Wix'] !== '#N/A'
        );
        const principal = conCodigos.length > 0 ? conCodigos[0] : candidatosUnicos[0];
        const extras = candidatosUnicos.filter(r => r !== principal);
        return { principal, extras };
    }

    function agregarFilasExtras(despuesDeFilaId, tipoTexto, extras, etiquetaFiltro) {
        if (!extras || extras.length === 0) return;
        const filaBase = document.getElementById(despuesDeFilaId);
        if (!filaBase) return;
        let referencia = filaBase;
        extras.forEach(extra => {
            const nueva = document.createElement('tr');
            nueva.setAttribute('data-extra-filtro', etiquetaFiltro);

            const tdTipo = document.createElement('td');
            tdTipo.textContent = tipoTexto;
            const tdMan = document.createElement('td');
            const tdWix = document.createElement('td');

            const labelMan = document.createElement('label');
            const chkMan = document.createElement('input');
            chkMan.type = 'checkbox';
            const spanMan = document.createElement('span');
            spanMan.textContent = extra['Codigo Man'] || '';
            labelMan.appendChild(chkMan);
            labelMan.appendChild(spanMan);

            const labelWix = document.createElement('label');
            const chkWix = document.createElement('input');
            chkWix.type = 'checkbox';
            const spanWix = document.createElement('span');
            spanWix.textContent = extra['Codigo Wix'] || '';
            labelWix.appendChild(chkWix);
            labelWix.appendChild(spanWix);

            tdMan.appendChild(labelMan);
            tdWix.appendChild(labelWix);

            nueva.appendChild(tdTipo);
            nueva.appendChild(tdMan);
            nueva.appendChild(tdWix);

            referencia.parentNode.insertBefore(nueva, referencia.nextSibling);
            referencia = nueva;
        });
    }

    function actualizarFiltrosParaSeleccion() {
        limpiarCeldasFiltros();
        const marca = selectMarca.value;
        const modelo = selectModelo.value;
        const motor = selectMotor.value;
        if (!marca || !modelo || !motor) return;

        const filtrados = datos.filter(r => r['Marca'] === marca && r['Modelo'] === modelo && r['Motor'] === motor);
        if (filtrados.length === 0) return;

        const combustible = filtrados[0]['Combustible'] || '';
        if (combustible) {
            celdaTipoCombustible.textContent = 'Combustible: ' + combustible;
        }

        const aceite = separarPorElemento(filtrados, ['Filtro de aceite']);
        if (aceite.principal) {
            spanAceiteMan.textContent = aceite.principal['Codigo Man'] || '';
            spanAceiteWix.textContent = aceite.principal['Codigo Wix'] || '';
        }
        agregarFilasExtras('row-aceite', 'Filtro de Aceite', aceite.extras, 'aceite');

        const aire = separarPorElemento(filtrados, ['Filtro de aire']);
        if (aire.principal) {
            spanAireMan.textContent = aire.principal['Codigo Man'] || '';
            spanAireWix.textContent = aire.principal['Codigo Wix'] || '';
        }
        agregarFilasExtras('row-aire', 'Filtro de Aire', aire.extras, 'aire');

        const fcomb = separarPorElemento(filtrados, ['Filtro de combustible']);
        if (fcomb.principal) {
            spanFCombMan.textContent = fcomb.principal['Codigo Man'] || '';
            spanFCombWix.textContent = fcomb.principal['Codigo Wix'] || '';
        }
        agregarFilasExtras('row-fcomb', 'Filtro de Combustible', fcomb.extras, 'fcombustible');

        const habit = separarPorElemento(filtrados, ['Filtro de aire de cabina']);
        if (habit.principal) {
            spanHabitaculoMan.textContent = habit.principal['Codigo Man'] || '';
            spanHabitaculoWix.textContent = habit.principal['Codigo Wix'] || '';
        }
        agregarFilasExtras('row-habitaculo', 'Filtro de Habitáculo', habit.extras, 'habitaculo');
    }

    function inicializarEventos() {
        marcaContainer.addEventListener('change', (e) => {
            const marca = e.detail.value;
            const porMarca = marca ? datos.filter(r => r['Marca'] === marca) : datos;
            const modelos = valoresUnicos(porMarca, 'Modelo');
            selectModelo.setOptions(modelos);
            selectMotor.setOptions([]);
            selectModelo.clear();
            selectMotor.clear();
            limpiarCeldasFiltros();
        });

        modeloContainer.addEventListener('change', (e) => {
            const marca = selectMarca.value;
            const modelo = e.detail.value;
            const porMarcaModelo = datos.filter(r => (!marca || r['Marca'] === marca) && (!modelo || r['Modelo'] === modelo));
            const motores = valoresUnicos(porMarcaModelo, 'Motor');
            selectMotor.setOptions(motores);
            selectMotor.clear();
            limpiarCeldasFiltros();
        });

        motorContainer.addEventListener('change', () => {
            actualizarFiltrosParaSeleccion();
        });

        cantFiltroAceite.addEventListener('input', () => actualizarTotalLinea(cantFiltroAceite, precioFiltroAceite, totalFiltroAceite));
        cantFiltroAire.addEventListener('input', () => actualizarTotalLinea(cantFiltroAire, precioFiltroAire, totalFiltroAire));
        cantFiltroCombustible.addEventListener('input', () => actualizarTotalLinea(cantFiltroCombustible, precioFiltroFComb, totalFiltroFComb));
        cantFiltroHabitaculo.addEventListener('input', () => actualizarTotalLinea(cantFiltroHabitaculo, precioFiltroHabitaculo, totalFiltroHabitaculo));

        if (tablaFiltrosVehiculo) {
            tablaFiltrosVehiculo.addEventListener('change', (event) => {
                const target = event.target;
                if (!target || target.tagName !== 'INPUT' || target.type !== 'checkbox') return;

                const fila = target.closest('tr');
                if (!fila) return;

                let grupo = null;
                if (fila.id === 'row-aceite' || fila.dataset.extraFiltro === 'aceite') grupo = 'aceite';
                else if (fila.id === 'row-aire' || fila.dataset.extraFiltro === 'aire') grupo = 'aire';
                else if (fila.id === 'row-fcomb' || fila.dataset.extraFiltro === 'fcombustible') grupo = 'fcombustible';
                else if (fila.id === 'row-habitaculo' || fila.dataset.extraFiltro === 'habitaculo') grupo = 'habitaculo';
                if (!grupo) return;

                const selectoresPorGrupo = {
                    aceite: '#row-aceite input[type="checkbox"], tr[data-extra-filtro="aceite"] input[type="checkbox"]',
                    aire: '#row-aire input[type="checkbox"], tr[data-extra-filtro="aire"] input[type="checkbox"]',
                    fcombustible: '#row-fcomb input[type="checkbox"], tr[data-extra-filtro="fcombustible"] input[type="checkbox"]',
                    habitaculo: '#row-habitaculo input[type="checkbox"], tr[data-extra-filtro="habitaculo"] input[type="checkbox"]'
                };

                const detallePorGrupo = {
                    aceite: detalleFiltroAceite,
                    aire: detalleFiltroAire,
                    fcombustible: detalleFiltroFCombustible,
                    habitaculo: detalleFiltroHabitaculo
                };

                const selectorGrupo = selectoresPorGrupo[grupo];
                const celdaDetalle = detallePorGrupo[grupo];
                if (!selectorGrupo || !celdaDetalle) return;

                if (target.checked) {
                    const otros = document.querySelectorAll(selectorGrupo);
                    otros.forEach(chk => {
                        if (chk !== target) chk.checked = false;
                    });

                    const label = target.closest('label');
                    const spanCodigo = label ? label.querySelector('span') : null;
                    const codigo = spanCodigo ? spanCodigo.textContent.trim() : '';
                    celdaDetalle.textContent = codigo || 'Seleccione Filtro';
                    actualizarPrecioDesdeBackend(grupo, codigo);
                } else {
                    celdaDetalle.textContent = 'Seleccione Filtro';
                    limpiarLineaPrecio(grupo);
                }
            });
        }
    }

    function inicializar() {
        fetch('bdato.csv')
            .then(resp => resp.text())
            .then(texto => {
                datos = parseCSV(texto);
                const marcas = valoresUnicos(datos, 'Marca');
                selectMarca.setOptions(marcas);
                resetDetalleFiltros();
                inicializarEventos();
            })
            .catch(err => {
                console.error('Error cargando bdato.csv', err);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
});