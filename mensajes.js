// Sistema de Mensajería M&M

class Mensajeria {
    constructor() {
        this.mensajes = this.cargarMensajes();
        this.usuarioActual = this.obtenerUsuarioActual();
        this.inicializarEventos();
        this.cargarUsuarios();
        this.actualizarContadores();
    }

    obtenerUsuarioActual() {
        // Preferir el usuario de sesión provisto por auth-utils.js
        if (typeof window !== 'undefined' && typeof window.getCurrentUser === 'function') {
            const user = window.getCurrentUser();
            if (user && user.username) {
                return user.username;
            }
        }

        // Fallback a localStorage por compatibilidad
        const usuarioLS = localStorage.getItem('currentUser');
        if (usuarioLS) {
            try {
                const parsed = JSON.parse(usuarioLS);
                if (parsed && parsed.username) return parsed.username;
            } catch (_) {}
        }

        return 'Invitado';
    }

    cargarMensajes() {
        const mensajesGuardados = localStorage.getItem('mensajes');
        return mensajesGuardados ? JSON.parse(mensajesGuardados) : [];
    }

    guardarMensajes() {
        localStorage.setItem('mensajes', JSON.stringify(this.mensajes));
        this.actualizarContadores();
    }

    async cargarUsuarios() {
        const select = document.getElementById('destinatario');
        if (!select) return;

        // Limpiar opciones existentes excepto la primera
        while (select.options.length > 1) {
            select.remove(1);
        }

        try {
            // Pedir lista de usuarios activos al backend
            const res = await fetch('/api/usuarios');
            if (!res.ok) throw new Error('No se pudo obtener la lista de usuarios');

            const usuariosList = await res.json();

            usuariosList
                .filter(u => u && u.username && u.username !== this.usuarioActual && !u.suspended)
                .forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.username;
                    option.textContent = u.username;
                    select.appendChild(option);
                });

            // Si no hay ningún usuario disponible, mostramos un placeholder
            if (select.options.length === 1) {
                const opt = document.createElement('option');
                opt.disabled = true;
                opt.value = '';
                opt.textContent = 'No hay otros usuarios disponibles';
                select.appendChild(opt);
            }
        } catch (e) {
            console.error('Error cargando usuarios para mensajería:', e);
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.value = '';
            opt.textContent = 'Error al cargar usuarios';
            select.appendChild(opt);
        }
    }

    enviarMensaje(event) {
        event.preventDefault();
        
        const destinatario = document.getElementById('destinatario').value;
        const asunto = document.getElementById('asunto').value.trim();
        const mensaje = document.getElementById('mensaje').value.trim();
        
        if (!destinatario || !asunto || !mensaje) {
            this.mostrarNotificacion('Por favor complete todos los campos', 'error');
            alert('Por favor complete todos los campos antes de enviar.');
            return;
        }
        
        const nuevoMensaje = {
            id: Date.now(),
            remitente: this.usuarioActual,
            destinatario,
            asunto,
            mensaje,
            fecha: new Date().toISOString(),
            leido: false
        };
        
        this.mensajes.push(nuevoMensaje);
        this.guardarMensajes();
        
        // Limpiar formulario
        document.getElementById('formMensaje').reset();
        this.mostrarNotificacion('Mensaje enviado correctamente', 'success');
        alert('Mensaje enviado correctamente');
        
        // Cambiar explícitamente a la pestaña de enviados para que el usuario vea el resultado
        const enviadosBtn = document.querySelector('.tab-button[data-tab="enviados"]');
        if (enviadosBtn) {
            // Activar botón y desactivar los demás
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            enviadosBtn.classList.add('active');

            // Mostrar panel de enviados y ocultar otros
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            const enviadosPane = document.getElementById('enviadosTab');
            if (enviadosPane) enviadosPane.classList.add('active');
        }

        // Actualizar contenido de la bandeja de enviados
        this.mostrarMensajes('enviados');
    }

    mostrarMensajes(tipo) {
        let mensajesFiltrados = [];
        const contenedor = tipo === 'recibidos' ? 'listaRecibidos' : 'listaEnviados';

        // Base: recibidos/enviados para el usuario actual, ordenados por fecha desc
        if (tipo === 'recibidos') {
            mensajesFiltrados = this.mensajes
                .filter(msg => msg.destinatario === this.usuarioActual)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        } else if (tipo === 'enviados') {
            mensajesFiltrados = this.mensajes
                .filter(msg => msg.remitente === this.usuarioActual)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }

        // Búsqueda y filtros desde el UI
        const searchInputId = tipo === 'recibidos' ? 'buscarRecibidos' : 'buscarEnviados';
        const searchInput = document.getElementById(searchInputId);
        const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';

        let estado = 'todos';
        if (tipo === 'recibidos') {
            const estadoSelect = document.getElementById('filtroEstadoRecibidos');
            if (estadoSelect) estado = estadoSelect.value || 'todos';
        }

        mensajesFiltrados = mensajesFiltrados.filter(msg => {
            const texto = `${msg.remitente} ${msg.destinatario} ${msg.asunto} ${msg.mensaje}`.toLowerCase();
            const coincideTexto = !searchText || texto.includes(searchText);

            if (tipo === 'recibidos' && estado !== 'todos') {
                const esNoLeido = !msg.leido;
                const coincideEstado = estado === 'no-leidos' ? esNoLeido : !esNoLeido;
                return coincideTexto && coincideEstado;
            }

            return coincideTexto;
        });

        const lista = document.getElementById(contenedor);
        if (!lista) return;

        if (mensajesFiltrados.length === 0) {
            lista.innerHTML = '<div class="empty-state">No hay mensajes ' + 
                (tipo === 'recibidos' ? 'recibidos' : 'enviados') + '</div>';
            return;
        }
        
        lista.innerHTML = mensajesFiltrados.map(msg => {
            const fecha = new Date(msg.fecha).toLocaleString();
            const noLeido = !msg.leido && tipo === 'recibidos' ? 'no-leido' : '';
            
            return `
                <div class="message-item ${noLeido}" data-id="${msg.id}">
                    <div class="message-header">
                        <span class="message-sender">${tipo === 'recibidos' ? 'De: ' + msg.remitente : 'Para: ' + msg.destinatario}</span>
                        <span class="message-date">${fecha}</span>
                    </div>
                    <div class="message-subject">${msg.asunto}</div>
                    <div class="message-preview">${this.recortarTexto(msg.mensaje, 100)}</div>
                    <div class="message-actions">
                        <button class="btn-ver" data-id="${msg.id}">Ver mensaje</button>
                        ${tipo === 'recibidos' ? 
                            `<button class="btn-responder" data-remitente="${msg.remitente}" data-asunto="Re: ${msg.asunto}">Responder</button>` : 
                            ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar eventos a los botones
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', (e) => this.verMensaje(e.target.dataset.id));
        });
        
        document.querySelectorAll('.btn-responder').forEach(btn => {
            btn.addEventListener('click', (e) => this.responderMensaje(e.target.dataset.remitente, e.target.dataset.asunto));
        });
    }

    verMensaje(id) {
        const mensaje = this.mensajes.find(msg => msg.id === parseInt(id));
        if (!mensaje) return;
        
        // Marcar como leído si es un mensaje recibido
        if (mensaje.destinatario === this.usuarioActual && !mensaje.leido) {
            mensaje.leido = true;
            this.guardarMensajes();
        }
        
        const fecha = new Date(mensaje.fecha).toLocaleString();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${mensaje.asunto}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="message-meta">
                        <p><strong>De:</strong> ${mensaje.remitente}</p>
                        <p><strong>Para:</strong> ${mensaje.destinatario}</p>
                        <p><strong>Fecha:</strong> ${fecha}</p>
                    </div>
                    <div class="message-content">
                        ${mensaje.mensaje.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cerrar">Cerrar</button>
                    ${mensaje.remitente !== this.usuarioActual ? 
                        `<button class="btn-responder" data-remitente="${mensaje.remitente}" data-asunto="Re: ${mensaje.asunto}">
                            Responder
                        </button>` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cerrar modal
        modal.querySelector('.modal-close, .btn-cerrar').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Manejar respuesta
        const btnResponder = modal.querySelector('.btn-responder');
        if (btnResponder) {
            btnResponder.addEventListener('click', () => {
                this.responderMensaje(
                    btnResponder.dataset.remitente,
                    btnResponder.dataset.asunto
                );
                document.body.removeChild(modal);
            });
        }
    }

    responderMensaje(destinatario, asunto) {
        // Cerrar cualquier modal abierto
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.id !== 'mensajesModal') {
                document.body.removeChild(modal);
            }
        });
        
        // Abrir pestaña de nuevo mensaje
        const mensajesModal = document.getElementById('mensajesModal');
        if (mensajesModal) {
            mensajesModal.style.display = 'block';
            
            // Cambiar a la pestaña de nuevo mensaje
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.tab-button[data-tab="nuevo"]').classList.add('active');
            
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById('nuevoTab').classList.add('active');
            
            // Rellenar destinatario y asunto
            if (destinatario) {
                const select = document.getElementById('destinatario');
                if (select) {
                    select.value = destinatario;
                }
            }
            
            if (asunto) {
                const inputAsunto = document.getElementById('asunto');
                if (inputAsunto) {
                    inputAsunto.value = asunto;
                }
            }
            
            // Enfocar el área de mensaje
            const textarea = document.getElementById('mensaje');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    actualizarContadores() {
        if (!this.usuarioActual) return;
        
        const mensajesNoLeidos = this.mensajes.filter(msg => 
            msg.destinatario === this.usuarioActual && !msg.leido
        ).length;
        
        // Actualizar notificación en el ícono de mensajes
        const iconoMensajes = document.querySelector('.icon-btn[title="Mensajes"]');
        if (iconoMensajes) {
            // Eliminar notificación anterior si existe
            let notificacion = iconoMensajes.querySelector('.notification-badge');
            
            if (mensajesNoLeidos > 0) {
                if (!notificacion) {
                    notificacion = document.createElement('span');
                    notificacion.className = 'notification-badge';
                    iconoMensajes.appendChild(notificacion);
                }
                notificacion.textContent = mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos;
            } else if (notificacion) {
                iconoMensajes.removeChild(notificacion);
            }
        }
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        // Implementación básica de notificación
        console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
        // Aquí podrías implementar un sistema de notificaciones más elaborado
    }

    recortarTexto(texto, longitud) {
        if (texto.length <= longitud) return texto;
        return texto.substring(0, longitud) + '...';
    }

    inicializarEventos() {
        console.log('Inicializando eventos de mensajería...');
        
        // Enviar mensaje
        const formMensaje = document.getElementById('formMensaje');
        if (formMensaje) {
            // Eliminar cualquier evento existente para evitar duplicados
            const newForm = formMensaje.cloneNode(true);
            formMensaje.parentNode.replaceChild(newForm, formMensaje);
            
            // Agregar el nuevo evento
            newForm.addEventListener('submit', (e) => this.enviarMensaje(e));
            console.log('Evento de formulario configurado');
        }
        
        // Configurar eventos de las pestañas
        this.configurarEventosPestanas();
        
        // Cerrar modal de mensajes
        const closeBtn = document.getElementById('closeMensajesModal');
        if (closeBtn) {
            // Eliminar cualquier evento existente
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            // Agregar el nuevo evento
            newCloseBtn.addEventListener('click', () => {
                document.getElementById('mensajesModal').style.display = 'none';
            });
            console.log('Evento de cierre configurado');
        }
        
        // Cerrar al hacer clic fuera del modal
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('mensajesModal');
            if (modal && e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Eventos de búsqueda/filtrado en bandejas
        const buscarRecibidos = document.getElementById('buscarRecibidos');
        if (buscarRecibidos) {
            buscarRecibidos.addEventListener('input', () => this.mostrarMensajes('recibidos'));
        }

        const filtroEstado = document.getElementById('filtroEstadoRecibidos');
        if (filtroEstado) {
            filtroEstado.addEventListener('change', () => this.mostrarMensajes('recibidos'));
        }

        const buscarEnviados = document.getElementById('buscarEnviados');
        if (buscarEnviados) {
            buscarEnviados.addEventListener('input', () => this.mostrarMensajes('enviados'));
        }
        
        console.log('Eventos de mensajería inicializados correctamente');
    }
    
    configurarEventosPestanas() {
        console.log('Configurando eventos de pestañas...');
        
        // Obtener todos los botones de pestaña
        const botonesPestana = document.querySelectorAll('.tab-button');
        
        // Verificar si se encontraron botones
        if (botonesPestana.length === 0) {
            console.error('No se encontraron botones de pestaña');
            return;
        }
        
        // Configurar cada botón de pestaña
        botonesPestana.forEach(boton => {
            // Clonar el botón para eliminar cualquier evento existente
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            // Agregar el evento de clic
            nuevoBoton.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                console.log(`Cambiando a la pestaña: ${tabId}`);
                
                // Actualizar botones de pestaña
                document.querySelectorAll('.tab-button').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Mostrar contenido de la pestaña
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                const tabPane = document.getElementById(tabId + 'Tab');
                if (tabPane) {
                    tabPane.classList.add('active');
                    
                    // Cargar mensajes si es necesario
                    if (tabId === 'recibidos' || tabId === 'enviados') {
                        console.log(`Mostrando mensajes: ${tabId}`);
                        this.mostrarMensajes(tabId);
                    }
                } else {
                    console.error(`No se encontró el panel de la pestaña: ${tabId}Tab`);
                }
            });
            
            // Si es la pestaña activa, activarla
            if (nuevoBoton.classList.contains('active')) {
                nuevoBoton.click();
            }
            
            console.log(`Botón de pestaña configurado: ${nuevoBoton.textContent.trim()}`);
        });
        
        console.log('Eventos de pestañas configurados correctamente');
    }
}

// Inicializar mensajería cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Función global para abrir la mensajería
    window.abrirMensajeria = function() {
        const modal = document.getElementById('mensajesModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Inicializar la mensajería si aún no está inicializada
            if (!window.mensajeria) {
                window.mensajeria = new Mensajeria();
            } else {
                // Si ya existe, actualizar la vista actual
                const activeTab = document.querySelector('.tab-button.active');
                if (activeTab) {
                    const tabId = activeTab.dataset.tab;
                    if (tabId === 'recibidos' || tabId === 'enviados') {
                        window.mensajeria.mostrarMensajes(tabId);
                    }
                }
            }
        }
    };
    
    // Inicializar la mensajería
    window.mensajeria = new Mensajeria();
});
