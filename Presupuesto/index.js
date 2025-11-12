const marcaSelect = document.getElementById("marca");
const modeloSelect = document.getElementById("modelo");
const motorSelect = document.getElementById("motor");
const resultadoDiv = document.getElementById("resultado");
const fileBdato = document.getElementById("fileBdato");
const fileExistencia = document.getElementById("fileExistencia");

let datosCSV = [];
let preciosCSV = [];
let filaModeloH = null;

// ---- Utilidades comunes ----
function normalizarFilas(arr) {
  return (arr || [])
    .filter(r => r && typeof r === 'object')
    .map(r => {
      const out = {};
      for (const k in r) out[(k || '').toString().trim()] = (r[k] || '').toString().trim();
      return out;
    });
}

function parsearPrecios(arr) {
  return (arr || []).map(row => {
    const codigo = (row['BSDATO'] || row['Codigo'] || '') + '';
    const descripcion = (row['Descripción'] || row['Descripcion'] || '') + '';
    const precioRaw = (row['Precio de venta'] || row['Precio'] || '') + '';
    const precioNum = precioRaw.toString().trim().replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.');
    return {
      codigo: codigo.trim().toUpperCase(),
      descripcion: descripcion.trim().toUpperCase(),
      precio: isFinite(parseFloat(precioNum)) ? parseFloat(precioNum) : null
    };
  });
}

// ---- Carga por HTTP (si está disponible) ----
Papa.parse("bdato.csv?v=" + Date.now(), {
  download: true,
  header: true,
  delimiter: ";",
  skipEmptyLines: true,
  transformHeader: h => h ? h.trim() : "",
  complete: function (results) {
    if (!results || !Array.isArray(results.data)) {
      console.error('bdato.csv: formato inesperado', results);
      return;
    }

    datosCSV = normalizarFilas(results.data);

    console.log('Filas cargadas bdato.csv:', datosCSV.length);
    cargarMarcas();
  },
  error: function (err) {
    console.error("Error al leer bdato.csv:", err);
  }
});

Papa.parse("existenciacsv.csv?v=" + Date.now(), {
  download: true,
  header: true,
  delimiter: ";",
  skipEmptyLines: true,
  transformHeader: h => h ? h.trim() : "",
  complete: function (results) {
    preciosCSV = parsearPrecios(results.data || []);
    console.log('Precios cargados:', preciosCSV.length);
  },
  error: function (err) {
    console.error("Error al leer existenciacsv.csv:", err);
  }
});

function cargarMarcas() {
  const marcas = [...new Set(datosCSV.map(r => (r.Marca || '').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'es', {sensitivity:'base'}));
  marcas.forEach(marca => {
    const option = document.createElement("option");
    option.value = marca;
    option.textContent = marca;
    marcaSelect.appendChild(option);
  });
}

marcaSelect.addEventListener("change", () => {
  modeloSelect.innerHTML = '<option value="">Seleccione un modelo</option>';
  motorSelect.innerHTML = '<option value="">Seleccione un motor</option>';
  resultadoDiv.innerHTML = "";
  modeloSelect.disabled = true;
  motorSelect.disabled = true;
  filaModeloH = null;

  const marca = marcaSelect.value;
  if (!marca) return;

  const modelos = [...new Set(
    datosCSV
      .filter(row => row.Marca === marca)
      .map(row => (row.Modelo || '').toString().trim())
      .filter(m => m && m !== '')
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  modelos.forEach(modelo => {
    const option = document.createElement("option");
    option.value = modelo;
    option.textContent = modelo;
    modeloSelect.appendChild(option);
  });

  modeloSelect.disabled = modelos.length > 0 ? false : true;
});

modeloSelect.addEventListener("change", () => {
  motorSelect.innerHTML = '<option value="">Seleccione un motor</option>';
  resultadoDiv.innerHTML = "";
  motorSelect.disabled = true;

  const marca = marcaSelect.value;
  const modelo = modeloSelect.value;
  if (!modelo) return;

  const filasModelo = datosCSV.filter(row => row.Marca === marca && (row.Modelo || '').toString().trim() === modelo);

  // Extraer motores tanto de la columna Motor como de cadenas embebidas en Modelo (p.ej. "Motorcode... CJCD,CMFB")
  const motoresSet = new Set();
  filasModelo.forEach(row => {
    const motorField = (row.Motor || '').toString().trim();
    if (motorField) {
      motorField.split(/[;,\/]+/).map(s => s.trim()).filter(Boolean).forEach(code => motoresSet.add(code));
    } else {
      const modeloField = (row.Modelo || '').toString();
      // Buscar patrones tipo "CJCD,CMFB" (grupos de 2-6 mayúsculas/dígitos separados por comas)
      const matches = modeloField.match(/[A-Z0-9]{2,6}(?:,[A-Z0-9]{2,6})*/g);
      if (matches) {
        matches.forEach(m => m.split(',').map(x => x.trim()).filter(Boolean).forEach(code => motoresSet.add(code)));
      }
    }
  });

  const motoresValidos = [...motoresSet].filter(m => m && m !== '').sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  motoresValidos.forEach(motor => {
    const option = document.createElement("option");
    option.value = motor;
    option.textContent = motor;
    motorSelect.appendChild(option);
  });

  motorSelect.disabled = motoresValidos.length > 0 ? false : true;

  filaModeloH = filasModelo.reduce((mejor, actual) => {
    const score = ["H1", "H2"].filter(col => actual[col] && actual[col].trim() !== "").length;
    const mejorScore = ["H1", "H2"].filter(col => mejor[col] && mejor[col].trim() !== "").length;
    return score > mejorScore ? actual : mejor;
  }, filasModelo[0]);

  mostrarTabla([filaModeloH], ["H1", "H2"]);
});

motorSelect.addEventListener("change", () => {
  resultadoDiv.innerHTML = "";

  const marca = marcaSelect.value;
  const modelo = modeloSelect.value;
  const motor = motorSelect.value;

  const filasMotor = datosCSV.filter(
    row => row.Marca === marca && row.Modelo === modelo && row.Motor === motor
  );

  if (filasMotor.length === 0) {
    resultadoDiv.innerHTML = "<p>No se encontraron datos para ese motor.</p>";
    return;
  }

  const filaMasCompleta = filasMotor.reduce((mejor, actual) => {
    const score = Object.values(actual).filter(val => val && val.trim() !== "").length;
    const mejorScore = Object.values(mejor).filter(val => val && val.trim() !== "").length;
    return score > mejorScore ? actual : mejor;
  }, filasMotor[0]);

  const filaFinal = { ...filaMasCompleta };
  if (filaModeloH) {
    filaFinal.H1 = filaModeloH.H1 || filaFinal.H1;
    filaFinal.H2 = filaModeloH.H2 || filaFinal.H2;
  }

  mostrarTabla([filaFinal], [
    "Motor",
    "Desde/Hasta",
    "Filtro de Aire",
    "Filtro de Aceite 1",
    "F Nafta",
    "H1",
    "H2"
  ]);
});

function buscarPrecio(codigo) {
  if (!codigo || codigo.trim() === "") return null;
  const codigoUpper = codigo.trim().toUpperCase();
  const match = preciosCSV.find(p =>
    p.codigo === codigoUpper || p.descripcion.includes(codigoUpper)
  );
  return match ? parseFloat(match.precio) : null;
}

function mostrarTabla(filas, columnasDeseadas) {
  if (!filas || filas.length === 0) return;

  // 🧼 Excluir columna CA si aparece por error
  const columnasFiltradas = columnasDeseadas.filter(col => col !== "CA");

  let html = `
    <table>
      <thead>
        <tr>${columnasFiltradas.map(col => `<th>${col}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${filas.map(fila => `
          <tr>
            ${columnasFiltradas.map(col => `<td>${fila[col] || "—"}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // ❌ Excluir H2 del bloque de precios
  const codigos = [
    filas[0]["Filtro de Aire"],
    filas[0]["Filtro de Aceite 1"],
    filas[0]["F Nafta"],
    filas[0]["H1"]
  ].filter(c => c && c.trim() !== "");

  let preciosHTML = `
    <h3>Precios encontrados</h3>
    <table>
      <thead>
        <tr><th>✔</th><th>Código</th><th>Precio</th></tr>
      </thead>
      <tbody>
        ${codigos.map((codigo, i) => {
          const precio = buscarPrecio(codigo);
          return `
            <tr>
              <td><input type="checkbox" class="selector-precio" data-precio="${precio || 0}" /></td>
              <td>${codigo}</td>
              <td>${precio !== null ? `$${precio.toFixed(2)}` : "—"}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
    <div style="text-align:right; font-weight:bold; margin-top:10px;">
      Total: $<span id="total-precio">0.00</span>
    </div>
  `;

  resultadoDiv.innerHTML += html + preciosHTML;

  document.querySelectorAll(".selector-precio").forEach(checkbox => {
    checkbox.addEventListener("change", actualizarTotal);
  });
}

function actualizarTotal() {
  let total = 0;
  document.querySelectorAll(".selector-precio").forEach(cb => {
    if (cb.checked) {
      total += parseFloat(cb.dataset.precio);
    }
  });
  document.getElementById("total-precio").textContent = total.toFixed(2);
}

// ---- Carga desde archivos locales (evita CORS con file://) ----
function parseBdatoDesdeArchivo(file) {
  if (!file) return;
  Papa.parse(file, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: h => h ? h.trim() : "",
    complete: function (results) {
      datosCSV = normalizarFilas(results.data);
      // Reset selects
      marcaSelect.innerHTML = '<option value="">Seleccione una marca</option>';
      modeloSelect.innerHTML = '<option value="">Seleccione un modelo</option>';
      motorSelect.innerHTML = '<option value="">Seleccione un motor</option>';
      modeloSelect.disabled = true;
      motorSelect.disabled = true;
      resultadoDiv.innerHTML = '';
      cargarMarcas();
    },
    error: function (err) {
      console.error('Error al leer archivo bdato.csv local:', err);
    }
  });
}

function parseExistenciaDesdeArchivo(file) {
  if (!file) return;
  Papa.parse(file, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: h => h ? h.trim() : "",
    complete: function (results) {
      preciosCSV = parsearPrecios(results.data || []);
      console.log('Precios (archivo local) cargados:', preciosCSV.length);
    },
    error: function (err) {
      console.error('Error al leer archivo existenciacsv.csv local:', err);
    }
  });
}

if (fileBdato) {
  fileBdato.addEventListener('change', (e) => parseBdatoDesdeArchivo(e.target.files[0]));
}
if (fileExistencia) {
  fileExistencia.addEventListener('change', (e) => parseExistenciaDesdeArchivo(e.target.files[0]));
}
