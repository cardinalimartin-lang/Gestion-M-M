const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const RUTA_VEHICULOS = path.resolve(__dirname, '..', 'Vehiculos', 'vehiculos.csv');
const CLIENTES_CSV = path.resolve(__dirname, 'clientes.csv');
// relaciones.csv eliminado: ahora vehiculos.csv contiene ID_CLIENTE
const LOG_FILE = path.resolve(__dirname, 'server.log');
const PID_FILE = path.resolve(__dirname, 'server.pid');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) { console.error('No se pudo escribir log:', e); }
}

// Guardar pid actual
try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch (e) { /* ignore */ }
// Log inicial
try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] Iniciando servidor PID=${process.pid}\n`); } catch (e) { /* ignore */ }
// Capturar errores no manejados
process.on('uncaughtException', (err) => {
  log('uncaughtException: ' + (err && err.stack ? err.stack : String(err)));
  console.error('uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  log('unhandledRejection: ' + String(reason));
  console.error('unhandledRejection:', reason);
});

// Asegurar vehiculos.csv (en carpeta Vehiculos) con nuevo esquema: Idauto,Patente,Marca,Modelo,Kilometraje,TipoAceite,Fecha
try {
  const headerVehNuevo = 'Idauto,Patente,Marca,Modelo,Kilometraje,TipoAceite,Fecha';
  if (!fs.existsSync(RUTA_VEHICULOS)) {
    fs.writeFileSync(RUTA_VEHICULOS, headerVehNuevo + '\n', { encoding: 'utf8' });
  } else {
    const contenido = fs.readFileSync(RUTA_VEHICULOS, 'utf8');
    const lineas = contenido.split(/\r?\n/);
    if (!lineas.length || !lineas[0].trim()) {
      fs.writeFileSync(RUTA_VEHICULOS, headerVehNuevo + '\n', { encoding: 'utf8' });
    } else {
      const headerActual = (lineas[0] || '').trim();
      const headerOldVehId = 'VehiculoId,Marca,Modelo,Patente,TipoAceite,Kilometraje';
      const headerOldSimple = 'Idauto, Patente, Marca, Modelo';
      if (headerActual.toLowerCase() === headerVehNuevo.toLowerCase()) {
        // ya OK
      } else if (headerActual.toLowerCase() === headerOldVehId.toLowerCase()) {
        // Migrar desde esquema antiguo con VehiculoId ... -> nuevo esquema con Idauto y Fecha vacía
        const nuevas = [headerVehNuevo];
        for (let i = 1; i < lineas.length; i++) {
          const l = (lineas[i] || '').trim();
          if (!l) continue;
          const parts = l.split(',');
          if (parts.length >= 6) {
            const fila = [
              (parts[0] || '').trim(), // Idauto (antes VehiculoId)
              (parts[3] || '').trim(), // Patente
              (parts[1] || '').trim(), // Marca
              (parts[2] || '').trim(), // Modelo
              (parts[5] || '').trim(), // Kilometraje
              (parts[4] || '').trim(), // TipoAceite
              ''                       // Fecha (desconocida)
            ].join(',');
            nuevas.push(fila);
          }
        }
        fs.writeFileSync(RUTA_VEHICULOS, nuevas.join('\n') + '\n', { encoding: 'utf8' });
      } else if (headerActual === headerOldSimple) {
        // Migrar desde encabezado simple (sin datos) al nuevo encabezado
        fs.writeFileSync(RUTA_VEHICULOS, headerVehNuevo + '\n' + lineas.slice(1).filter(Boolean).join('\n') + (lineas.length>1?'\n':''), { encoding: 'utf8' });
      } else if (headerActual.toLowerCase() !== headerVehNuevo.toLowerCase()) {
        console.warn('Header de vehiculos.csv no reconocido, se espera:', headerVehNuevo, 'pero se encontró:', headerActual);
      }
    }
  }
} catch (e) {
  console.error('Error asegurando vehiculos.csv:', e);
}
// Asegurar clientes.csv
if (!fs.existsSync(CLIENTES_CSV)) {
  fs.writeFileSync(CLIENTES_CSV, 'NombreCliente,EmailCliente,Telefono\n', { encoding: 'utf8' });
}
// relaciones.csv ya no se usa

// Configuración de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
    // Servir archivos estáticos de la carpeta Clientes en /clientes
    app.use('/clientes', express.static(__dirname));

    // Servir archivos estáticos de la carpeta padre (Presupuestador) en la raíz
    const PARENT_DIR = path.resolve(__dirname, '..');
    app.use(express.static(PARENT_DIR));

    // Ruta raíz: si existe login.html en la carpeta padre, servirlo; si no, responde 404 mínima
    app.get('/', (req, res) => {
      const loginPath = path.join(PARENT_DIR, 'login.html');
      try {
        if (fs.existsSync(loginPath)) {
          return res.sendFile(loginPath);
        }
      } catch (_) {}
      return res.status(404).send('login.html no encontrado');
    });

// Ruta corta legacy /clientes: redirige a la raíz (ya no existe cliente.html)
app.get('/clientes', (req, res) => {
  return res.redirect('/');
});

// Ruta de healthcheck para confirmar que el servidor está listo
app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// Home (panel con opciones)
app.get('/home', (req, res) => {
  const homePath = path.join(PARENT_DIR, 'home.html');
  try {
    if (fs.existsSync(homePath)) return res.sendFile(homePath);
  } catch (_) {}
  return res.status(404).send('home.html no encontrado');
});

// Usuarios: validar contra un CSV en la carpeta padre (usuarios.csv)
const USERS_CSV = path.join(PARENT_DIR, 'usuarios.csv');

function ensureUsersCsv() {
  try {
    if (!fs.existsSync(USERS_CSV)) {
      fs.writeFileSync(USERS_CSV, 'username,password\n', { encoding: 'utf8' });
      log(`Created users csv at ${USERS_CSV}`);
    }
    // Ensure admin and default users exist without overwriting existing users
    const existing = loadUsersFromCsv();
    const toAdd = [];
    // admin default
    if (!existing['admin'] && !existing['Admmin'] && !existing['Admin']) {
      toAdd.push('admin,Admin123,false');
    }
    // default regular users
    ['Martin,Martin', 'Mateo,Mateo', 'Dario,Dario'].forEach(pair => {
      const u = pair.split(',')[0];
      if (!existing[u]) toAdd.push(pair + ',false');
    });
    if (toAdd.length) {
      fs.appendFileSync(USERS_CSV, toAdd.join('\n') + '\n', { encoding: 'utf8' });
      log(`Added default users: ${toAdd.join(',')}`);
    }
  } catch (e) { console.error('Error al asegurar usuarios.csv', e); }
}

function loadUsersFromCsv() {
  const users = {};
  try {
    if (!fs.existsSync(USERS_CSV)) return users;
    const txt = fs.readFileSync(USERS_CSV, 'utf8');
    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (i === 0 && line.toLowerCase().startsWith('username')) continue; // header
      const parts = line.split(',');
      const username = parts[0] ? parts[0].trim() : '';
      const password = parts[1] ? parts[1].trim() : '';
      const suspended = parts[2] ? (parts[2].trim() === 'true') : false;
      if (username) users[username] = { password, suspended };
    }
  } catch (e) { console.error('Error leyendo usuarios.csv', e); }
  return users;
}

function appendUserToCsv(username, password, suspended = false) {
  try {
    const line = `${username},${password},${suspended ? 'true' : 'false'}\n`;
    fs.appendFileSync(USERS_CSV, line, { encoding: 'utf8' });
    log(`Usuario creado: ${username}`);
    return true;
  } catch (e) {
    console.error('Error al escribir usuarios.csv', e);
    return false;
  }
}

function writeAllUsersToCsv(usersObj) {
  try {
    const lines = ['username,password,suspended'];
    Object.keys(usersObj).forEach(u => {
      const item = usersObj[u];
      lines.push(`${u},${item.password},${item.suspended ? 'true' : 'false'}`);
    });
    fs.writeFileSync(USERS_CSV, lines.join('\n') + '\n', { encoding: 'utf8' });
    return true;
  } catch (e) {
    console.error('Error escribiendo usuarios.csv completo', e);
    return false;
  }
}

ensureUsersCsv();
// Al arrancar, si hay contraseñas en texto plano en usuarios.csv, las convertimos a hash bcrypt
try {
  const usersInitial = loadUsersFromCsv();
  let needRewrite = false;
  Object.keys(usersInitial).forEach(u => {
    const pw = usersInitial[u] || '';
    // simple check: bcrypt hashes empiezan con $2a$/$2b$/$2y$
    if (!pw.startsWith('$2')) {
      const hashed = bcrypt.hashSync(pw, 10);
      usersInitial[u] = hashed;
      needRewrite = true;
    }
  });
  if (needRewrite) {
    // when migrating from two-column to three-column, preserve suspended=false
    const lines = ['username,password,suspended'];
    Object.keys(usersInitial).forEach(u => lines.push(`${u},${usersInitial[u]},false`));
    fs.writeFileSync(USERS_CSV, lines.join('\n') + '\n', { encoding: 'utf8' });
    log('Converted plain passwords to bcrypt hashes in usuarios.csv');
  }
} catch (e) { console.error('Error hashing existing passwords:', e); }

// Clave requerida para permitir registro. Si NO está seteada, el registro público queda DESHABILITADO.
const REGISTRATION_KEY = process.env.REGISTRATION_KEY || null;

app.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: 'Faltan credenciales' });

    const users = loadUsersFromCsv();
    if (users[username] && bcrypt.compareSync(password, users[username].password)) {
      // comprobar si el usuario está suspendido
      if (users[username].suspended) return res.status(403).json({ ok: false, error: 'Cuenta suspendida' });
      return res.json({ ok: true });
    }

    return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// Endpoint para registrar nuevos usuarios (append a usuarios.csv)
app.post('/register-user', (req, res) => {
  try {
    const { username, password, regKey } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: 'Faltan datos' });

    // Para permitir crear usuarios desde el frontend, se requiere que el request incluya
    // las credenciales de un usuario administrador (adminUser/adminPass).
    // Esto evita que cualquiera cree cuentas. Opcionalmente, la variable de entorno
    // REGISTRATION_KEY sigue soportada como alternativa (legacy).
    const { adminUser, adminPass } = req.body || {};
    if (REGISTRATION_KEY) {
      // legacy mode: require regKey matching
      if (!regKey || regKey !== REGISTRATION_KEY) {
        return res.status(401).json({ ok: false, error: 'Clave de registro inválida' });
      }
    } else {
      // new mode: require admin credentials
      if (!adminUser || !adminPass) {
        return res.status(401).json({ ok: false, error: 'Se requieren credenciales de administrador para crear usuarios' });
      }
      const users = loadUsersFromCsv();
      // Detect admin username(s) allowed: prefer env ADMIN_USERNAME, otherwise common names
      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
      const allowedAdminNames = new Set([ADMIN_USERNAME, 'admin', 'Admmin', 'Admin']);
      if (!allowedAdminNames.has(adminUser)) {
        return res.status(403).json({ ok: false, error: 'Usuario no autorizado para crear cuentas' });
      }
      if (!users[adminUser] || !bcrypt.compareSync(adminPass, users[adminUser])) {
        return res.status(401).json({ ok: false, error: 'Credenciales de administrador inválidas' });
      }
    }

    const users = loadUsersFromCsv();
    if (users[username]) return res.status(409).json({ ok: false, error: 'Usuario ya existe' });

    // Guardar el password hasheado en el CSV
    const hashedPw = bcrypt.hashSync(password, 10);
    const ok = appendUserToCsv(username, hashedPw, false);
    if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo crear usuario' });

    return res.status(201).json({ ok: true, message: 'Usuario creado' });
  } catch (err) {
    console.error('Error en /register-user:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// Handler para GET /login: servir la página de login o redirigir a la raíz.
// Evita que el navegador muestre "Cannot GET /login" cuando alguien pega la URL.
app.get('/login', (req, res) => {
  try {
    const loginPath = path.join(PARENT_DIR, 'login.html');
    if (fs.existsSync(loginPath)) {
      return res.sendFile(loginPath);
    }
    // fallback: redirigir a la raíz (ya servimos login.html si existe)
    return res.redirect('/');
  } catch (e) {
    console.error('Error en GET /login:', e);
    return res.redirect('/');
  }
});

// (ruta '/' definida arriba)

// Buscar vehículos de un cliente por ID usando el campo ID_CLIENTE en vehiculos.csv
app.get('/vehiculos-cliente', (req, res) => {
  try {
    const clienteId = (req.query.id || '').trim();
    if (!clienteId) return res.status(400).json({ error: 'Falta id de cliente' });
    if (!fs.existsSync(RUTA_VEHICULOS)) return res.json([]);

    const resultados = [];
    fs.createReadStream(RUTA_VEHICULOS)
      .pipe(csv.parse({ headers: true }))
      .on('data', row => {
        const cid = (row.ID_CLIENTE || '').trim();
        if (cid === clienteId) resultados.push(row);
      })
      .on('error', error => {
        console.error('Error al leer vehiculos.csv:', error);
        res.status(500).json({ error: 'Error al buscar vehículos' });
      })
      .on('end', () => res.json(resultados));
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Buscar en clientes.csv por nombre (partial, case-insensitive) o por email
app.get('/buscar-clientes', (req, res) => {
  try {
    const name = req.query.name;
    const email = req.query.email;
    const results = [];
    if (!fs.existsSync(CLIENTES_CSV)) return res.json([]);
    const txt = fs.readFileSync(CLIENTES_CSV, 'utf8');
    const lines = txt.split(/\r?\n/).filter(l => l.trim());
    if (lines.length <= 1) return res.json([]);
    lines.shift(); // Remove header
    lines.forEach((line, index) => {
      // accept comma or tab separated
      const parts = line.split(/\t|,/);
      const nombre = (parts[0] || '').trim();
      const mail = (parts[1] || '').trim();
      const telefono = (parts[2] || '').trim();
      if (email) {
        if (mail === email) {
          results.push({ 
            id: index + 1,
            NombreCliente: nombre, 
            EmailCliente: mail,
            Telefono: telefono
          });
        }
      } else if (name) {
        if (nombre && nombre.toLowerCase().includes(String(name).toLowerCase())) {
          results.push({ 
            id: index + 1,
            NombreCliente: nombre, 
            EmailCliente: mail,
            Telefono: telefono
          });
        }
      }
    });
    return res.json(results);
  } catch (err) {
    console.error('Error en /buscar-clientes:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Listar todos los clientes
app.get('/clientes-todos', (req, res) => {
  try {
    if (!fs.existsSync(CLIENTES_CSV)) return res.json([]);
    const txt = fs.readFileSync(CLIENTES_CSV, 'utf8');
    const lines = txt.split(/\r?\n/).filter(l => l.trim());
    if (lines.length <= 1) return res.json([]);
    lines.shift(); // header
    const out = [];
    lines.forEach((line, index) => {
      const parts = line.split(/\t|,/);
      const nombre = (parts[0] || '').trim();
      const mail = (parts[1] || '').trim();
      const telefono = (parts[2] || '').trim();
      out.push({ id: index + 1, NombreCliente: nombre, EmailCliente: mail, Telefono: telefono });
    });
    return res.json(out);
  } catch (e) {
    console.error('Error en /clientes-todos:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Contar clientes por apellido (última palabra del NombreCliente)
app.get('/contar-por-apellido', (req, res) => {
  try {
    const apellido = String(req.query.apellido || '').trim().toLowerCase();
    if (!apellido) return res.json({ count: 0 });
    if (!fs.existsSync(CLIENTES_CSV)) return res.json({ count: 0 });
    const txt = fs.readFileSync(CLIENTES_CSV, 'utf8');
    const lines = txt.split(/\r?\n/).filter(l => l.trim());
    if (lines.length <= 1) return res.json({ count: 0 });
    lines.shift(); // header
    let count = 0;
    for (const line of lines) {
      const parts = line.split(/\t|,/);
      const nombre = (parts[0] || '').trim();
      if (!nombre) continue;
      const tokens = nombre.split(/\s+/).filter(Boolean);
      const last = (tokens[tokens.length - 1] || '').toLowerCase();
      if (last === apellido) count++;
    }
    return res.json({ count });
  } catch (e) {
    console.error('Error en /contar-por-apellido:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Crear un nuevo cliente en clientes.csv
app.post('/crear-cliente', (req, res) => {
  try {
    const { nombre, email, telefono } = req.body || {};
    if (!nombre || !email) return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' });
    
    // Leer el archivo para obtener el próximo ID
    let nextId = 1;
    if (fs.existsSync(CLIENTES_CSV)) {
      const lines = fs.readFileSync(CLIENTES_CSV, 'utf8').split('\n').filter(l => l.trim());
      nextId = lines.length; // El header cuenta como línea 1
    }

    // append as CSV (comma separated)
    const line = `${nombre},${email},${telefono || ''}\n`;
    fs.appendFileSync(CLIENTES_CSV, line, { encoding: 'utf8' });
    log(`Cliente creado: ${nombre} <${email}> Tel: ${telefono || 'No registrado'}`);
    
    // Devolver el ID asignado para redireccionar a la página de vehículos
    return res.status(201).json({ ok: true, id: nextId });
  } catch (err) {
    console.error('Error en /crear-cliente:', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// Nuevo endpoint: obtener próximo Idauto para formularios
app.get('/vehiculos/next-id', (_req, res) => {
  try {
    let nextId = 1;
    if (fs.existsSync(RUTA_VEHICULOS)) {
      const content = fs.readFileSync(RUTA_VEHICULOS, 'utf8');
      const lines = content.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 1) {
        // Buscar el mayor Idauto en la primera columna (ignorando header)
        for (let i = 1; i < lines.length; i++) {
          const idStr = (lines[i].split(',')[0] || '').trim();
          const n = parseInt(idStr, 10);
          if (!isNaN(n) && n >= nextId) nextId = n + 1;
        }
      }
    }
    return res.json({ nextId });
  } catch (e) {
    console.error('Error en /vehiculos/next-id:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Nuevo endpoint: crear vehículo con el nuevo esquema
app.post('/vehiculos/crear', (req, res) => {
  try {
    const { idauto, patente, marca, modelo, kilometraje, tipoAceite, fecha } = req.body || {};
    if (!patente || !marca || !modelo) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios (patente, marca, modelo)' });
    }
    // Asegurar encabezado correcto
    const header = 'Idauto,Patente,Marca,Modelo,Kilometraje,TipoAceite,Fecha';
    if (!fs.existsSync(RUTA_VEHICULOS)) {
      fs.writeFileSync(RUTA_VEHICULOS, header + '\n', { encoding: 'utf8' });
    } else {
      const txt = fs.readFileSync(RUTA_VEHICULOS, 'utf8');
      const first = (txt.split(/\r?\n/)[0] || '').trim();
      if (first.toLowerCase() !== header.toLowerCase()) {
        const cuerpo = txt.split(/\r?\n/).slice(1).filter(l => l.trim()).join('\n');
        fs.writeFileSync(RUTA_VEHICULOS, header + '\n' + (cuerpo ? cuerpo + '\n' : ''), { encoding: 'utf8' });
      }
    }
    // Calcular Id si no se envió
    let id = parseInt(idauto, 10);
    if (isNaN(id) || id <= 0) {
      const r = { nextId: 1 };
      try {
        const content = fs.readFileSync(RUTA_VEHICULOS, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            const idStr = (lines[i].split(',')[0] || '').trim();
            const n = parseInt(idStr, 10);
            if (!isNaN(n) && n >= r.nextId) r.nextId = n + 1;
          }
        }
      } catch (_) {}
      id = r.nextId;
    }
    const linea = [
      id,
      String(patente).trim(),
      String(marca).trim(),
      String(modelo).trim(),
      (kilometraje !== undefined && kilometraje !== null) ? String(kilometraje).trim() : '',
      String(tipoAceite || '').trim(),
      String(fecha || '').trim()
    ].join(',') + '\n';
    fs.appendFileSync(RUTA_VEHICULOS, linea, { encoding: 'utf8' });
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error('Error en /vehiculos/crear:', error);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

app.post('/guardar-vehiculo', (req, res) => {
  try {
    const datos = req.body || {};
    const clienteId = String(datos.clienteId || '').trim();
    const marca = String(datos.marca || '').trim();
    const modelo = String(datos.modelo || '').trim();
    const patente = String(datos.patente || '').trim();
    const tipoAceite = String(datos.tipoAceite || '').trim();
    const kilometraje = (datos.kilometraje !== undefined && datos.kilometraje !== null) ? String(datos.kilometraje).trim() : '';

    // Crear nuevo vehículo: se requieren campos básicos
    if (!marca || !modelo || !patente) {
      return res.status(400).json({ error: 'Faltan datos requeridos del vehículo (marca, modelo, patente)' });
    }
    // Escribir una línea en formato: Patente,ID_CLIENTE,Marca,Modelo,TipoAceite,Kilometraje
    try {
      const header = 'Patente,ID_CLIENTE,Marca,Modelo,TipoAceite,Kilometraje';
      if (!fs.existsSync(RUTA_VEHICULOS)) {
        fs.writeFileSync(RUTA_VEHICULOS, header + '\n', { encoding: 'utf8' });
      } else {
        // si el header no coincide, lo reescribimos
        const txt = fs.readFileSync(RUTA_VEHICULOS, 'utf8');
        const first = (txt.split(/\r?\n/)[0] || '').trim();
        if (first.toLowerCase() !== header.toLowerCase()) {
          // migración simple: sobrescribir solo header, mantener cuerpo
          const cuerpo = txt.split(/\r?\n/).slice(1).filter(l => l.trim()).join('\n');
          fs.writeFileSync(RUTA_VEHICULOS, header + '\n' + (cuerpo ? cuerpo + '\n' : ''), { encoding: 'utf8' });
        }
      }
      const linea = [patente, clienteId, marca, modelo, tipoAceite, kilometraje].join(',') + '\n';
      fs.appendFileSync(RUTA_VEHICULOS, linea, { encoding: 'utf8' });
      return res.json({ ok: true, message: 'Vehículo guardado correctamente.' });
    } catch (error) {
      console.error('Error al guardar:', error);
      return res.status(500).json({ error: 'Error al guardar el vehículo.' });
    }
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asignar (o reasignar) un VehiculoId a un ClienteId
// asignar-vehiculo deshabilitado: la vinculación es directa por ID_CLIENTE en vehiculos.csv
app.post('/asignar-vehiculo', (_req, res) => {
  return res.status(410).json({ ok: false, error: 'Endpoint deshabilitado: usar guardar-vehiculo con ID_CLIENTE' });
});

app.get('/historial-vehiculo', (req, res) => {
  const patente = req.query.patente;
  const historial = [];

  if (!fs.existsSync(RUTA_VEHICULOS)) return res.json([]);

  fs.createReadStream(RUTA_VEHICULOS)
    .pipe(csv.parse({ headers: true }))
    .on('data', row => {
      if (row.Patente === patente) historial.push(row);
    })
    .on('end', () => res.json(historial));
});

// Listar todos los vehículos (sin filtro por cliente)
app.get('/vehiculos-todos', (req, res) => {
  try {
    if (!fs.existsSync(RUTA_VEHICULOS)) return res.json([]);
    const todos = [];
    fs.createReadStream(RUTA_VEHICULOS)
      .pipe(csv.parse({ headers: true }))
      .on('data', row => {
        todos.push(row);
      })
      .on('error', (err) => {
        console.error('Error leyendo vehiculos.csv', err);
        res.status(500).json({ error: 'Error leyendo datos' });
      })
      .on('end', () => res.json(todos));
  } catch (e) {
    console.error('Error en /vehiculos-todos', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

    // ADMIN APIs: require adminUser/adminPass in body to authorize actions
    function checkAdminCredentials(adminUser, adminPass) {
      const users = loadUsersFromCsv();
      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
      const allowedAdminNames = new Set([ADMIN_USERNAME, 'admin', 'Admmin', 'Admin']);
      if (!adminUser || !adminPass) return false;
      if (!allowedAdminNames.has(adminUser)) return false;
      if (!users[adminUser]) return false;
      return bcrypt.compareSync(adminPass, users[adminUser].password);
    }

    app.post('/admin/authenticate', (req, res) => {
      const { adminUser, adminPass } = req.body || {};
      if (checkAdminCredentials(adminUser, adminPass)) return res.json({ ok: true });
      return res.status(401).json({ ok: false, error: 'Credenciales de administrador inválidas' });
    });

    app.post('/admin/list', (req, res) => {
      const { adminUser, adminPass } = req.body || {};
      if (!checkAdminCredentials(adminUser, adminPass)) return res.status(401).json({ ok: false, error: 'No autorizado' });
      const users = loadUsersFromCsv();
      const list = Object.keys(users).map(u => ({ username: u, suspended: users[u].suspended }));
      return res.json({ ok: true, users: list });
    });

    app.post('/admin/create', (req, res) => {
      const { adminUser, adminPass, username, password } = req.body || {};
      if (!checkAdminCredentials(adminUser, adminPass)) return res.status(401).json({ ok: false, error: 'No autorizado' });
      if (!username || !password) return res.status(400).json({ ok: false, error: 'Faltan datos' });
      const users = loadUsersFromCsv();
      if (users[username]) return res.status(409).json({ ok: false, error: 'Usuario ya existe' });
      const hashed = bcrypt.hashSync(password, 10);
      const ok = appendUserToCsv(username, hashed, false);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo crear usuario' });
      return res.status(201).json({ ok: true });
    });

    app.post('/admin/update', (req, res) => {
      const { adminUser, adminPass, username, password, suspended } = req.body || {};
      if (!checkAdminCredentials(adminUser, adminPass)) return res.status(401).json({ ok: false, error: 'No autorizado' });
      if (!username) return res.status(400).json({ ok: false, error: 'Falta username' });
      const users = loadUsersFromCsv();
      if (!users[username]) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      if (password) users[username].password = bcrypt.hashSync(password, 10);
      if (typeof suspended === 'boolean') users[username].suspended = suspended;
      const ok = writeAllUsersToCsv(users);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo actualizar usuario' });
      return res.json({ ok: true });
    });

    app.post('/admin/delete', (req, res) => {
      const { adminUser, adminPass, username } = req.body || {};
      if (!checkAdminCredentials(adminUser, adminPass)) return res.status(401).json({ ok: false, error: 'No autorizado' });
      if (!username) return res.status(400).json({ ok: false, error: 'Falta username' });
      const users = loadUsersFromCsv();
      if (!users[username]) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      delete users[username];
      const ok = writeAllUsersToCsv(users);
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo borrar usuario' });
      return res.json({ ok: true });
    });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
  console.log('Presiona Ctrl+C para detener el servidor');
  try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] Servidor escuchando en ${PORT}\n`); } catch (e) { /* ignore */ }
});
