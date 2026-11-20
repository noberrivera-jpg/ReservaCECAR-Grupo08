/* =========================================================
   reservas.js – Gestión completa de reservas (RF9)
   
   Operaciones:
     - Listar reservas y filtrar por rango de fechas
     - Crear para cliente registrado (Bearer) o nuevo (X-Empresa-Id)
     - Leer datos preseleccionados desde sessionStorage (vía disponibilidad)
     - Editar: fecha, servicio, profesional
     - Cancelar con confirmación
   ========================================================= */

requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

/* Estado */
var tipoCliente    = 'registrado'; /* 'registrado' o 'nuevo' */
var serviciosCache = [];
var prosCache      = [];

/* ---------------------------------------------------------
   CARGAR DATOS INICIALES (servicios + profesionales)
   --------------------------------------------------------- */
function cargarDatosReserva() {
  /* Servicios */
  apiFetch('/api/servicios')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      serviciosCache = Array.isArray(data) ? data : (data.data || []);
      var items = serviciosCache.map(function(s) {
        return { id: s.Id || s.id, nombre: (s.Nombre || '') + ' – ' + formatPrecio(s.Precio || 0) };
      });
      fillSelect('resServicio',    items, 'id', 'nombre', 'Selecciona un servicio...');
      fillSelect('editResServicio', items, 'id', 'nombre', 'Sin cambio');
    })
    .catch(function() {});

  /* Profesionales activos */
  apiFetch('/api/profesionales?activo=true')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      prosCache = Array.isArray(data) ? data : (data.data || []);
      var items = prosCache.map(function(p) {
        return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
      });
      fillSelect('resProfesional',    items, 'id', 'nombre', 'Sin preferencia');
      fillSelect('editResProfesional', items, 'id', 'nombre', 'Sin cambio');
    })
    .catch(function() {});
}

/* ---------------------------------------------------------
   LEER SLOT PRESELECCIONADO DESDE DISPONIBILIDAD
   Si venimos de disponibilidad.html, pre-rellenar el modal
   --------------------------------------------------------- */
function leerSlotPreseleccionado() {
  var slotJson = sessionStorage.getItem('slotSeleccionado');
  if (!slotJson) return;

  /* Limpiar para no volver a usar */
  sessionStorage.removeItem('slotSeleccionado');

  var slot = JSON.parse(slotJson);
  /* Esperar a que los selects estén cargados antes de pre-rellenar */
  setTimeout(function() {
    if (slot.fecha) {
      /* Convertir a formato datetime-local */
      document.getElementById('resFecha').value = slot.fecha.substring(0, 16);
    }
    if (slot.servicioId) {
      document.getElementById('resServicio').value = slot.servicioId;
    }
    if (slot.profesionalId) {
      document.getElementById('resProfesional').value = slot.profesionalId;
    }
    /* Abrir el modal de creación */
    document.getElementById('modalResTitulo').textContent = 'Nueva Reserva';
    document.getElementById('modalReserva').classList.remove('hidden');
  }, 500);
}

/* ---------------------------------------------------------
   CARGAR RESERVAS
   GET /api/reservas  o  ?FechaInicio=&FechaFin=
   --------------------------------------------------------- */
function cargarReservas() {
  var tbody = document.getElementById('bodyReservas');
  tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  var inicio = document.getElementById('filtroFechaInicio').value;
  var fin    = document.getElementById('filtroFechaFin').value;
  var endpoint = '/api/reservas';
  if (inicio && fin) {
    endpoint += '?FechaInicio=' + inicio + '&FechaFin=' + fin;
  }

  apiFetch(endpoint)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      renderTablaReservas(lista);
      var totalEl = document.getElementById('totalReservas');
      if (totalEl) totalEl.textContent = lista.length + ' reservas';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Error: ' + err.message + '</td></tr>';
    });
}

document.getElementById('btnFiltrarReservas').addEventListener('click', cargarReservas);
document.getElementById('btnTodasReservas').addEventListener('click', function() {
  document.getElementById('filtroFechaInicio').value = '';
  document.getElementById('filtroFechaFin').value    = '';
  cargarReservas();
});

/* ---------------------------------------------------------
   RENDERIZAR TABLA DE RESERVAS
   --------------------------------------------------------- */
function renderTablaReservas(lista) {
  var tbody = document.getElementById('bodyReservas');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay reservas registradas</td></tr>';
    return;
  }

  var html = '';
  lista.forEach(function(r) {
    var id          = r.Id || r.id;
    var fecha       = formatFecha(r.Fecha || r.fecha);
    var servicio    = r.ServicioNombre || r.servicioNombre || 'ID:' + (r.ServicioId || r.servicioId || '—');
    var cliente     = r.ClienteNombre || r.clienteNombre || (r.ClienteId ? 'ID:' + r.ClienteId : '—');
    var profesional = r.ProfesionalNombre || r.profesionalNombre || '—';
    var estado      = r.Estado || r.estado || 'Activa';

    var estadoBadge = '';
    var estadoStr = String(estado).toLowerCase();
    if (estadoStr === 'cancelada' || estadoStr === 'cancelled') {
      estadoBadge = '<span class="badge badge-danger">Cancelada</span>';
    } else if (estadoStr === 'completada' || estadoStr === 'completed') {
      estadoBadge = '<span class="badge badge-success">Completada</span>';
    } else {
      estadoBadge = '<span class="badge badge-blue">Activa</span>';
    }

    var esCancelada = estadoStr === 'cancelada' || estadoStr === 'cancelled';

    html +=
      '<tr>' +
        '<td><span class="badge badge-blue">#' + id + '</span></td>' +
        '<td>' + fecha + '</td>' +
        '<td>' + servicio + '</td>' +
        '<td>' + cliente + '</td>' +
        '<td>' + profesional + '</td>' +
        '<td>' + estadoBadge + '</td>' +
        '<td>' +
          '<div class="td-actions">' +
            (!esCancelada ? '<button class="btn btn-warning btn-sm" onclick="abrirEditarRes(' + JSON.stringify(r).replace(/"/g, '&quot;') + ')">✏️</button>' : '') +
            (!esCancelada ? '<button class="btn btn-danger btn-sm" onclick="cancelarReserva(' + id + ')">❌ Cancelar</button>' : '') +
          '</div>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   TIPO DE CLIENTE – toggle registrado / nuevo
   --------------------------------------------------------- */
function mostrarTipoCliente(tipo) {
  tipoCliente = tipo;

  var btnReg   = document.getElementById('btnClienteRegistrado');
  var btnNuevo = document.getElementById('btnClienteNuevo');
  var bloqueReg   = document.getElementById('bloqueClienteRegistrado');
  var bloqueNuevo = document.getElementById('bloqueClienteNuevo');

  if (tipo === 'registrado') {
    btnReg.className   = 'btn btn-primary';
    btnNuevo.className = 'btn btn-secondary';
    bloqueReg.classList.remove('hidden');
    bloqueNuevo.classList.add('hidden');
  } else {
    btnReg.className   = 'btn btn-secondary';
    btnNuevo.className = 'btn btn-primary';
    bloqueReg.classList.add('hidden');
    bloqueNuevo.classList.remove('hidden');
  }
}

/* ---------------------------------------------------------
   BUSCAR CLIENTE POR DOCUMENTO para nueva reserva
   GET /api/clientes/{documento}
   --------------------------------------------------------- */
document.getElementById('btnBuscarClienteRes').addEventListener('click', function() {
  var doc = document.getElementById('buscarDocRes').value.trim();
  if (!doc) { showToast('Ingresa un número de documento', 'warning'); return; }

  apiFetch('/api/clientes/' + doc)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      /* La API puede retornar array o objeto */
      var cliente = Array.isArray(data) ? data[0] : data;
      if (!cliente) throw new Error('No encontrado');

      var id      = cliente.Id || cliente.id;
      var nombre  = (cliente.Nombres || cliente.nombres || '') + ' ' + (cliente.Apellidos || cliente.apellidos || '');
      var docText = 'Doc: ' + (cliente.Documento || cliente.documento || doc);

      document.getElementById('resClienteId').value          = id;
      document.getElementById('nombreClienteEncontrado').textContent = nombre;
      document.getElementById('docClienteEncontrado').textContent    = docText;
      document.getElementById('infoClienteEncontrado').classList.remove('hidden');
      showToast('Cliente encontrado: ' + nombre, 'success');
    })
    .catch(function() {
      document.getElementById('infoClienteEncontrado').classList.add('hidden');
      document.getElementById('resClienteId').value = '';
      showToast('No se encontró cliente con ese documento', 'error');
    });
});

/* Buscar al presionar Enter */
document.getElementById('buscarDocRes').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('btnBuscarClienteRes').click();
});

/* ---------------------------------------------------------
   ABRIR MODAL CREAR RESERVA
   --------------------------------------------------------- */
document.getElementById('btnNuevaReserva').addEventListener('click', function() {
  document.getElementById('modalResTitulo').textContent = 'Nueva Reserva';
  document.getElementById('resId').value  = '';
  limpiarFormulario('formReserva');
  document.getElementById('infoClienteEncontrado').classList.add('hidden');
  document.getElementById('resClienteId').value = '';
  mostrarTipoCliente('registrado');
  /* Recargar selects */
  fillSelect('resServicio', serviciosCache.map(function(s) {
    return { id: s.Id || s.id, nombre: (s.Nombre || '') + ' – ' + formatPrecio(s.Precio || 0) };
  }), 'id', 'nombre', 'Selecciona un servicio...');
  fillSelect('resProfesional', prosCache.map(function(p) {
    return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
  }), 'id', 'nombre', 'Sin preferencia');
  document.getElementById('modalReserva').classList.remove('hidden');
});

function cerrarModalRes() {
  document.getElementById('modalReserva').classList.add('hidden');
}

/* ---------------------------------------------------------
   GUARDAR RESERVA
   
   - Cliente registrado → POST /api/reservas  con Bearer token
   - Cliente nuevo      → POST /api/reservas  con X-Empresa-Id (público)
   --------------------------------------------------------- */
document.getElementById('btnGuardarRes').addEventListener('click', function() {
  var fecha      = document.getElementById('resFecha').value;
  var servicioId = document.getElementById('resServicio').value;
  var proId      = document.getElementById('resProfesional').value;

  /* Limpiar errores */
  ['resFecha','resServicio'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.classList.remove('error');
  });
  ['errResFecha','errResServicio','errResDoc','errResNombres','errResApellidos'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.classList.remove('visible');
  });

  var hayError = false;
  if (!fecha)      { document.getElementById('resFecha').classList.add('error');      document.getElementById('errResFecha').classList.add('visible');      hayError = true; }
  if (!servicioId) { document.getElementById('resServicio').classList.add('error');   document.getElementById('errResServicio').classList.add('visible');   hayError = true; }
  if (hayError) return;

  var body;
  var esNuevo = (tipoCliente === 'nuevo');

  if (!esNuevo) {
    /* CLIENTE REGISTRADO */
    var clienteId = document.getElementById('resClienteId').value;
    if (!clienteId) {
      showToast('Busca y selecciona un cliente registrado', 'warning');
      return;
    }
    body = {
      Fecha:      fecha,
      ServicioId: parseInt(servicioId),
      ClienteId:  parseInt(clienteId)
    };
    if (proId) body.ProfesionalId = parseInt(proId);
  } else {
    /* CLIENTE NUEVO */
    var doc       = document.getElementById('resNuevoDoc').value.trim();
    var nombres   = document.getElementById('resNuevoNombres').value.trim();
    var apellidos = document.getElementById('resNuevoApellidos').value.trim();
    var celular   = document.getElementById('resNuevoCelular').value.trim();

    if (!doc)       { document.getElementById('errResDoc').classList.add('visible');       hayError = true; }
    if (!nombres)   { document.getElementById('errResNombres').classList.add('visible');   hayError = true; }
    if (!apellidos) { document.getElementById('errResApellidos').classList.add('visible'); hayError = true; }
    if (hayError) return;

    body = {
      Fecha:     fecha,
      ServicioId: parseInt(servicioId),
      Documento: doc,
      Nombres:   nombres,
      Apellidos: apellidos
    };
    if (celular) body.Celular = celular;
    if (proId)   body.ProfesionalId = parseInt(proId);
  }

  var btn = document.getElementById('btnGuardarRes');
  btn.disabled = true; btn.textContent = 'Guardando...';

  /* Elegir la función de petición según el tipo de cliente */
  var peticion;
  if (esNuevo) {
    /* Sin token → usar apiFetchPublic con X-Empresa-Id */
    peticion = apiFetchPublic('/api/reservas', {
      method: 'POST',
      body:   JSON.stringify(body)
    });
  } else {
    /* Con Bearer token */
    peticion = apiFetch('/api/reservas', {
      method: 'POST',
      body:   JSON.stringify(body)
    });
  }

  peticion
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      showToast('Reserva creada correctamente', 'success');
      cerrarModalRes();
      cargarReservas();
    })
    .catch(function(err) { showToast('Error: ' + err.message, 'error', 5000); })
    .finally(function() { btn.disabled = false; btn.textContent = 'Guardar Reserva'; });
});

/* ---------------------------------------------------------
   ABRIR MODAL EDITAR RESERVA
   PUT /api/reservas/{id}
   --------------------------------------------------------- */
function abrirEditarRes(reserva) {
  document.getElementById('editResId').value = reserva.Id || reserva.id || '';

  var fechaVal = reserva.Fecha || reserva.fecha || '';
  document.getElementById('editResFecha').value = fechaVal.substring(0, 16);

  /* Recargar selects de edición */
  fillSelect('editResServicio', serviciosCache.map(function(s) {
    return { id: s.Id || s.id, nombre: s.Nombre || '' };
  }), 'id', 'nombre', 'Sin cambio');
  fillSelect('editResProfesional', prosCache.map(function(p) {
    return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
  }), 'id', 'nombre', 'Sin cambio');

  var srvId = reserva.ServicioId || reserva.servicioId;
  var proId = reserva.ProfesionalId || reserva.profesionalId;
  if (srvId) document.getElementById('editResServicio').value    = srvId;
  if (proId) document.getElementById('editResProfesional').value = proId;

  document.getElementById('modalEditarRes').classList.remove('hidden');
}

function cerrarModalEditarRes() {
  document.getElementById('modalEditarRes').classList.add('hidden');
}

document.getElementById('btnActualizarRes').addEventListener('click', function() {
  var id    = document.getElementById('editResId').value;
  var fecha = document.getElementById('editResFecha').value;
  var srvId = document.getElementById('editResServicio').value;
  var proId = document.getElementById('editResProfesional').value;

  var body = {};
  if (fecha) body.Fecha      = fecha;
  if (srvId) body.ServicioId   = parseInt(srvId);
  if (proId) body.ProfesionalId = parseInt(proId);

  if (Object.keys(body).length === 0) {
    showToast('No hay cambios para guardar', 'warning'); return;
  }

  var btn = document.getElementById('btnActualizarRes');
  btn.disabled = true; btn.textContent = 'Actualizando...';

  apiFetch('/api/reservas/' + id, { method: 'PUT', body: JSON.stringify(body) })
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      showToast('Reserva actualizada correctamente', 'success');
      cerrarModalEditarRes();
      cargarReservas();
    })
    .catch(function(err) { showToast('Error: ' + err.message, 'error', 5000); })
    .finally(function() { btn.disabled = false; btn.textContent = 'Actualizar'; });
});

/* ---------------------------------------------------------
   CANCELAR RESERVA
   DELETE /api/reservas/{id}
   --------------------------------------------------------- */
function cancelarReserva(id) {
  showConfirm(
    '¿Deseas cancelar la reserva #' + id + '? Esta acción no se puede deshacer.',
    function() {
      apiFetch('/api/reservas/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Reserva #' + id + ' cancelada', 'success');
          cargarReservas();
        })
        .catch(function(err) { showToast('No se pudo cancelar: ' + err.message, 'error', 5000); });
    },
    'Cancelar Reserva'
  );
}

/* ---------------------------------------------------------
   INICIALIZACIÓN
   --------------------------------------------------------- */
cargarDatosReserva();
cargarReservas();
/* Verificar si hay slot preseleccionado desde disponibilidad */
setTimeout(leerSlotPreseleccionado, 600);
