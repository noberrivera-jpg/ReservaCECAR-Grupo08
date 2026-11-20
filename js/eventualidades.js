/* =========================================================
   eventualidades.js – Gestión de eventualidades (RF7)
   
   Operaciones:
     - Listar y filtrar por profesional
     - Crear con múltiples períodos
     - Actualizar
     - Eliminar con confirmación
   ========================================================= */

requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

var evEnEdicion   = null;
var profesionales  = [];
var contadorPeriodos = 0; /* para IDs únicos en DOM */

/* Nombres de motivos para mostrar en tabla */
var MOTIVOS = { '1':'Enfermedad', '2':'Vacaciones', '3':'Capacitación', '4':'Permiso personal', '5':'Otro' };

/* ---------------------------------------------------------
   CARGAR PROFESIONALES para selectores
   --------------------------------------------------------- */
function cargarProfesionalesEv() {
  apiFetch('/api/profesionales')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      profesionales = Array.isArray(data) ? data : (data.data || []);
      var items = profesionales.map(function(p) {
        return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
      });
      fillSelect('evProfesional', items, 'id', 'nombre', 'Selecciona...');
      fillSelect('filtroProfesionalEv', items, 'id', 'nombre', 'Todos los profesionales');
    })
    .catch(function() {});
}

/* ---------------------------------------------------------
   CARGAR EVENTUALIDADES
   GET /api/eventualidades  o  ?profesionalId={id}
   --------------------------------------------------------- */
function cargarEventualidades() {
  var tbody = document.getElementById('bodyEv');
  tbody.innerHTML = '<tr><td colspan="6" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  var proFiltro = document.getElementById('filtroProfesionalEv').value;
  var endpoint  = '/api/eventualidades';
  if (proFiltro) endpoint += '?profesionalId=' + proFiltro;

  apiFetch(endpoint)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      renderTablaEv(lista);
      var totalEl = document.getElementById('totalEv');
      if (totalEl) totalEl.textContent = lista.length + ' registros';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error: ' + err.message + '</td></tr>';
    });
}

document.getElementById('btnFiltrarEv').addEventListener('click', cargarEventualidades);
document.getElementById('btnTodosEv').addEventListener('click', function() {
  document.getElementById('filtroProfesionalEv').value = '';
  cargarEventualidades();
});

/* ---------------------------------------------------------
   RENDERIZAR TABLA
   --------------------------------------------------------- */
function renderTablaEv(lista) {
  var tbody = document.getElementById('bodyEv');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No hay eventualidades registradas</td></tr>';
    return;
  }

  var html = '';
  lista.forEach(function(ev) {
    var id = ev.Id || ev.id;

    /* Nombre del profesional */
    var proNombre = ev.ProfesionalNombre || ev.profesionalNombre || '';
    if (!proNombre) {
      var proId = ev.ProfesionalId || ev.profesionalId;
      profesionales.forEach(function(p) {
        if ((p.Id || p.id) == proId) proNombre = (p.Nombres || '') + ' ' + (p.Apellidos || '');
      });
    }

    /* Nombre del motivo */
    var motivoVal  = String(ev.Motivo || ev.motivo || '');
    var motivoNombre = MOTIVOS[motivoVal] || motivoVal;

    /* Primer período */
    var periodos = ev.Periodos || ev.periodos || [];
    var primerPer = periodos[0] || {};

    html +=
      '<tr>' +
        '<td>' + (proNombre || '—') + '</td>' +
        '<td><span class="badge badge-warning">' + motivoNombre + '</span></td>' +
        '<td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (ev.Observacion || ev.observacion || '—') + '</td>' +
        '<td>' + (formatFecha(primerPer.FechaInicio || primerPer.fechaInicio)) + '</td>' +
        '<td>' + (formatFecha(primerPer.FechaFin || primerPer.fechaFin)) + '</td>' +
        '<td>' +
          '<div class="td-actions">' +
            '<button class="btn btn-warning btn-sm" onclick="abrirEditarEv(' + JSON.stringify(ev).replace(/"/g, '&quot;') + ')">✏️</button>' +
            '<button class="btn btn-danger btn-sm" onclick="eliminarEv(' + id + ')">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   AGREGAR UN PERÍODO al formulario dinámicamente
   --------------------------------------------------------- */
function agregarPeriodo(fechaInicio, fechaFin) {
  contadorPeriodos++;
  var idx = contadorPeriodos;
  var contenedor = document.getElementById('contenedorPeriodos');

  var div = document.createElement('div');
  div.id = 'periodo_' + idx;
  div.className = 'periodo-item';
  div.innerHTML =
    '<div class="form-group">' +
      '<label class="form-label">Inicio <span class="required">*</span></label>' +
      '<input type="datetime-local" id="perInicio_' + idx + '" value="' + (fechaInicio || '') + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">Fin <span class="required">*</span></label>' +
      '<input type="datetime-local" id="perFin_' + idx + '" value="' + (fechaFin || '') + '" />' +
    '</div>' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="quitarPeriodo(' + idx + ')" style="flex-shrink:0;align-self:flex-end">🗑️</button>';

  contenedor.appendChild(div);
}

function quitarPeriodo(idx) {
  var div = document.getElementById('periodo_' + idx);
  if (div) div.parentNode.removeChild(div);
}

/* Recolectar todos los períodos del formulario */
function recogerPeriodos() {
  var periodos = [];
  var items    = document.querySelectorAll('#contenedorPeriodos .periodo-item');

  for (var i = 0; i < items.length; i++) {
    var id = items[i].id.replace('periodo_', '');
    var inicio = document.getElementById('perInicio_' + id);
    var fin    = document.getElementById('perFin_' + id);
    if (inicio && fin) {
      periodos.push({ FechaInicio: inicio.value, FechaFin: fin.value });
    }
  }
  return periodos;
}

/* ---------------------------------------------------------
   ABRIR MODAL CREAR
   --------------------------------------------------------- */
document.getElementById('btnNuevaEventualidad').addEventListener('click', function() {
  evEnEdicion = null;
  document.getElementById('modalEvTitulo').textContent = 'Nueva Eventualidad';
  document.getElementById('evId').value           = '';
  document.getElementById('evProfesional').value  = '';
  document.getElementById('evMotivo').value       = '';
  document.getElementById('evObservacion').value  = '';
  document.getElementById('contenedorPeriodos').innerHTML = '';
  contadorPeriodos = 0;
  /* Agregar al menos un período */
  agregarPeriodo();
  document.getElementById('evProfesional').value = '';
  fillSelect('evProfesional',
    profesionales.map(function(p) {
      return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
    }),
    'id', 'nombre', 'Selecciona...'
  );
  document.getElementById('modalEv').classList.remove('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL EDITAR
   --------------------------------------------------------- */
function abrirEditarEv(ev) {
  evEnEdicion = ev;
  document.getElementById('modalEvTitulo').textContent = 'Editar Eventualidad';
  document.getElementById('evId').value = ev.Id || ev.id || '';

  fillSelect('evProfesional',
    profesionales.map(function(p) {
      return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
    }),
    'id', 'nombre', 'Selecciona...'
  );
  var proId = ev.ProfesionalId || ev.profesionalId;
  if (proId) document.getElementById('evProfesional').value = proId;

  document.getElementById('evMotivo').value      = ev.Motivo || ev.motivo || '';
  document.getElementById('evObservacion').value = ev.Observacion || ev.observacion || '';

  /* Cargar períodos existentes */
  document.getElementById('contenedorPeriodos').innerHTML = '';
  contadorPeriodos = 0;
  var periodos = ev.Periodos || ev.periodos || [];
  if (periodos.length === 0) {
    agregarPeriodo();
  } else {
    periodos.forEach(function(p) {
      var ini = (p.FechaInicio || p.fechaInicio || '').replace(' ', 'T').substring(0, 16);
      var fin = (p.FechaFin || p.fechaFin || '').replace(' ', 'T').substring(0, 16);
      agregarPeriodo(ini, fin);
    });
  }

  document.getElementById('modalEv').classList.remove('hidden');
}

function cerrarModalEv() {
  document.getElementById('modalEv').classList.add('hidden');
  evEnEdicion = null;
}

/* ---------------------------------------------------------
   GUARDAR EVENTUALIDAD
   POST /api/eventualidades  o  PUT /api/eventualidades/{id}
   --------------------------------------------------------- */
document.getElementById('btnGuardarEv').addEventListener('click', function() {
  var id         = document.getElementById('evId').value;
  var proId      = document.getElementById('evProfesional').value;
  var motivo     = document.getElementById('evMotivo').value;
  var observacion = document.getElementById('evObservacion').value.trim();

  /* Validaciones */
  document.getElementById('errEvPro').classList.remove('visible');
  document.getElementById('errEvMotivo').classList.remove('visible');

  var hayError = false;
  if (!proId) { document.getElementById('errEvPro').classList.add('visible'); hayError = true; }
  if (!motivo) { document.getElementById('errEvMotivo').classList.add('visible'); hayError = true; }
  if (hayError) return;

  var periodos = recogerPeriodos();
  if (periodos.length === 0) { showToast('Agrega al menos un período', 'warning'); return; }

  /* Validar que inicio < fin en cada período */
  var errorPeriodo = false;
  periodos.forEach(function(p) {
    if (!p.FechaInicio || !p.FechaFin) { errorPeriodo = true; return; }
    if (p.FechaInicio >= p.FechaFin) { errorPeriodo = true; }
  });
  if (errorPeriodo) { showToast('Verifica que las fechas de inicio sean anteriores a las de fin', 'error'); return; }

  var body = {
    ProfesionalId: parseInt(proId),
    Motivo:        parseInt(motivo),
    Periodos:      periodos
  };
  if (observacion) body.Observacion = observacion;

  var btn = document.getElementById('btnGuardarEv');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var promesa;
  if (evEnEdicion) {
    promesa = apiFetch('/api/eventualidades/' + id, { method: 'PUT', body: JSON.stringify(body) });
  } else {
    promesa = apiFetch('/api/eventualidades', { method: 'POST', body: JSON.stringify(body) });
  }

  promesa
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      showToast('Eventualidad ' + (evEnEdicion ? 'actualizada' : 'creada') + ' correctamente', 'success');
      cerrarModalEv();
      cargarEventualidades();
    })
    .catch(function(err) { showToast('Error: ' + err.message, 'error', 5000); })
    .finally(function() { btn.disabled = false; btn.textContent = 'Guardar'; });
});

/* ---------------------------------------------------------
   ELIMINAR EVENTUALIDAD
   DELETE /api/eventualidades/{id}
   --------------------------------------------------------- */
function eliminarEv(id) {
  showConfirm(
    '¿Deseas eliminar esta eventualidad?',
    function() {
      apiFetch('/api/eventualidades/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Eventualidad eliminada', 'success');
          cargarEventualidades();
        })
        .catch(function(err) { showToast('No se pudo eliminar: ' + err.message, 'error', 5000); });
    },
    'Eliminar Eventualidad'
  );
}

/* Iniciar */
cargarProfesionalesEv();
cargarEventualidades();
