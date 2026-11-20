/* =========================================================
   servicios.js – Gestión de servicios (RF5)
   
   Operaciones:
     - Listar servicios
     - Crear con nombre, precio, duración, especialidad
     - Actualizar nombre, precio, duración, estado
     - Toggle activo/inactivo
     - Eliminar con confirmación
   ========================================================= */

requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

var srvEnEdicion  = null;
var especialidades = [];

/* ---------------------------------------------------------
   CARGAR ESPECIALIDADES para el selector
   --------------------------------------------------------- */
function cargarEspParaServicio() {
  apiFetch('/api/especialidades')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      especialidades = Array.isArray(data) ? data : (data.data || []);
      fillSelect('srvEspecialidad', especialidades, 'Id', 'Nombre', 'Selecciona especialidad...');
    })
    .catch(function() {});
}

/* ---------------------------------------------------------
   CARGAR SERVICIOS
   GET /api/servicios
   --------------------------------------------------------- */
function cargarServicios() {
  var tbody = document.getElementById('bodyServicios');
  tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  apiFetch('/api/servicios')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      renderTablaServicios(lista);
      var totalEl = document.getElementById('totalServicios');
      if (totalEl) totalEl.textContent = lista.length + ' registros';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Error: ' + err.message + '</td></tr>';
    });
}

/* ---------------------------------------------------------
   RENDERIZAR TABLA
   --------------------------------------------------------- */
function renderTablaServicios(lista) {
  var tbody = document.getElementById('bodyServicios');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay servicios registrados</td></tr>';
    return;
  }

  var html = '';
  lista.forEach(function(s) {
    var id     = s.Id || s.id;
    var activo = s.Activo === true || s.activo === true || s.Estado === true;

    /* Nombre de especialidad */
    var espNombre = s.EspecialidadNombre || s.especialidadNombre || '';
    if (!espNombre) {
      var espId = s.EspecialidadId || s.especialidadId || s.Especialidad;
      especialidades.forEach(function(e) {
        if ((e.Id || e.id) == espId) espNombre = e.Nombre || e.nombre;
      });
    }

    html +=
      '<tr>' +
        '<td><strong>' + (s.Nombre || s.nombre || '—') + '</strong></td>' +
        '<td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (s.Descripcion || s.descripcion || '—') + '</td>' +
        '<td>' + formatPrecio(s.Precio || s.precio) + '</td>' +
        '<td>' + (s.Duracion || s.duracion || '—') + ' min</td>' +
        '<td>' + (espNombre || '—') + '</td>' +
        '<td>' + getActivoBadge(activo) + '</td>' +
        '<td>' +
          '<div class="td-actions">' +
            '<button class="btn btn-warning btn-sm" onclick="abrirEditarSrv(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')">✏️</button>' +
            '<button class="btn ' + (activo ? 'btn-secondary' : 'btn-success') + ' btn-sm" onclick="toggleActivoSrv(' + id + ', ' + activo + ')">' +
              (activo ? '⏸️' : '▶️') +
            '</button>' +
            '<button class="btn btn-danger btn-sm" onclick="eliminarSrv(' + id + ', \'' + (s.Nombre || '') + '\')">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   ABRIR MODAL CREAR
   --------------------------------------------------------- */
document.getElementById('btnNuevoServicio').addEventListener('click', function() {
  srvEnEdicion = null;
  document.getElementById('modalSrvTitulo').textContent = 'Nuevo Servicio';
  limpiarFormulario('formServicio');
  document.getElementById('srvId').value = '';
  document.getElementById('srvActivo').checked = true;
  fillSelect('srvEspecialidad', especialidades, 'Id', 'Nombre', 'Selecciona especialidad...');
  limpiarErrSrv();
  document.getElementById('modalServicio').classList.remove('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL EDITAR
   --------------------------------------------------------- */
function abrirEditarSrv(srv) {
  srvEnEdicion = srv;
  document.getElementById('modalSrvTitulo').textContent = 'Editar Servicio';
  document.getElementById('srvId').value          = srv.Id || srv.id || '';
  document.getElementById('srvNombre').value      = srv.Nombre || srv.nombre || '';
  document.getElementById('srvDescripcion').value = srv.Descripcion || srv.descripcion || '';
  document.getElementById('srvPrecio').value      = srv.Precio || srv.precio || '';
  document.getElementById('srvDuracion').value    = srv.Duracion || srv.duracion || '';
  document.getElementById('srvActivo').checked    = srv.Activo === true || srv.activo === true || srv.Estado === true;

  var espId = srv.EspecialidadId || srv.especialidadId || srv.Especialidad;
  fillSelect('srvEspecialidad', especialidades, 'Id', 'Nombre', 'Selecciona especialidad...');
  if (espId) document.getElementById('srvEspecialidad').value = espId;

  limpiarErrSrv();
  document.getElementById('modalServicio').classList.remove('hidden');
}

function cerrarModalSrv() {
  document.getElementById('modalServicio').classList.add('hidden');
  srvEnEdicion = null;
}

/* ---------------------------------------------------------
   GUARDAR SERVICIO
   POST /api/servicios  o  PUT /api/servicios/{id}
   --------------------------------------------------------- */
document.getElementById('btnGuardarSrv').addEventListener('click', function() {
  var id          = document.getElementById('srvId').value;
  var nombre      = document.getElementById('srvNombre').value.trim();
  var descripcion = document.getElementById('srvDescripcion').value.trim();
  var precio      = document.getElementById('srvPrecio').value;
  var duracion    = document.getElementById('srvDuracion').value;
  var espId       = document.getElementById('srvEspecialidad').value;
  var activo      = document.getElementById('srvActivo').checked;

  limpiarErrSrv();
  var hayError = false;

  if (!nombre) { setErrSrv('srvNombre', 'errSrvNombre'); hayError = true; }
  if (!descripcion) { setErrSrv('srvDescripcion', 'errSrvDescripcion'); hayError = true; }

  var prc = parseInt(precio);
  if (isNaN(prc) || prc < 0) { setErrSrv('srvPrecio', 'errSrvPrecio'); hayError = true; }

  var dur = parseInt(duracion);
  if (isNaN(dur) || dur < 1) { setErrSrv('srvDuracion', 'errSrvDuracion'); hayError = true; }

  if (!espId && !srvEnEdicion) { setErrSrv('srvEspecialidad', 'errSrvEspecialidad'); hayError = true; }

  if (hayError) return;

  var body;
  if (srvEnEdicion) {
    body = { Nombre: nombre, Precio: prc, Duracion: dur, Activo: activo };
  } else {
    body = {
      Nombre:      nombre,
      Descripcion: descripcion,
      Precio:      prc,
      Duracion:    dur,
      Especialidad: parseInt(espId)
    };
  }

  var btn = document.getElementById('btnGuardarSrv');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var promesa;
  if (srvEnEdicion) {
    promesa = apiFetch('/api/servicios/' + id, { method: 'PUT', body: JSON.stringify(body) });
  } else {
    promesa = apiFetch('/api/servicios', { method: 'POST', body: JSON.stringify(body) });
  }

  promesa
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      showToast('Servicio ' + (srvEnEdicion ? 'actualizado' : 'creado') + ' correctamente', 'success');
      cerrarModalSrv();
      cargarServicios();
    })
    .catch(function(err) { showToast('Error: ' + err.message, 'error', 5000); })
    .finally(function() { btn.disabled = false; btn.textContent = 'Guardar'; });
});

/* ---------------------------------------------------------
   TOGGLE ACTIVO
   --------------------------------------------------------- */
function toggleActivoSrv(id, activoActual) {
  var nuevo = !activoActual;
  apiFetch('/api/servicios/' + id, {
    method: 'PUT',
    body:   JSON.stringify({ Activo: nuevo })
  })
  .then(function(r) { return parseResponse(r); })
  .then(function() {
    showToast('Servicio ' + (nuevo ? 'activado' : 'desactivado'), 'success');
    cargarServicios();
  })
  .catch(function(err) { showToast('Error: ' + err.message, 'error'); });
}

/* ---------------------------------------------------------
   ELIMINAR SERVICIO
   --------------------------------------------------------- */
function eliminarSrv(id, nombre) {
  showConfirm(
    '¿Eliminar el servicio "' + nombre + '"?',
    function() {
      apiFetch('/api/servicios/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Servicio eliminado', 'success');
          cargarServicios();
        })
        .catch(function(err) { showToast('No se pudo eliminar: ' + err.message, 'error', 5000); });
    },
    'Eliminar Servicio'
  );
}

/* Helpers errores */
function limpiarErrSrv() {
  ['srvNombre','srvDescripcion','srvPrecio','srvDuracion','srvEspecialidad'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.classList.remove('error');
  });
  ['errSrvNombre','errSrvDescripcion','errSrvPrecio','errSrvDuracion','errSrvEspecialidad'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.classList.remove('visible');
  });
}

function setErrSrv(inputId, errId) {
  var inp = document.getElementById(inputId); if (inp) inp.classList.add('error');
  var err = document.getElementById(errId);   if (err) err.classList.add('visible');
}

/* Iniciar */
cargarEspParaServicio();
cargarServicios();
