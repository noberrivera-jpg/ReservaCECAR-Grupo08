/* =========================================================
   especialidades.js – Gestión de especialidades (RF3)
   
   Operaciones:
     - Listar todas las especialidades
     - Crear nueva especialidad
     - Actualizar nombre de especialidad
     - Eliminar con confirmación
   ========================================================= */

/* Verificar sesión */
requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

/* Estado: null = crear, número = editar */
var espEnEdicion = null;

/* ---------------------------------------------------------
   CARGAR ESPECIALIDADES
   GET /api/especialidades
   --------------------------------------------------------- */
function cargarEspecialidades() {
  var tbody = document.getElementById('bodyEspecialidades');
  tbody.innerHTML = '<tr><td colspan="3" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  apiFetch('/api/especialidades')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      renderTablaEspecialidades(lista);
      var totalEl = document.getElementById('totalEspecialidades');
      if (totalEl) totalEl.textContent = lista.length + ' registros';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="3" class="table-empty">Error: ' + err.message + '</td></tr>';
    });
}

/* ---------------------------------------------------------
   RENDERIZAR TABLA
   --------------------------------------------------------- */
function renderTablaEspecialidades(lista) {
  var tbody = document.getElementById('bodyEspecialidades');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="table-empty">No hay especialidades registradas</td></tr>';
    return;
  }

  var html = '';
  lista.forEach(function(e) {
    var id     = e.Id || e.id;
    var nombre = e.Nombre || e.nombre || '—';
    html +=
      '<tr>' +
        '<td><span class="badge badge-blue">#' + id + '</span></td>' +
        '<td><strong>' + nombre + '</strong></td>' +
        '<td>' +
          '<div class="td-actions">' +
            '<button class="btn btn-warning btn-sm" onclick="abrirEditarEsp(' + id + ', \'' + nombre.replace(/'/g, "\\'") + '\')">✏️ Editar</button>' +
            '<button class="btn btn-danger btn-sm" onclick="eliminarEspecialidad(' + id + ', \'' + nombre.replace(/'/g, "\\'") + '\')">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   ABRIR MODAL CREAR
   --------------------------------------------------------- */
document.getElementById('btnNuevaEspecialidad').addEventListener('click', function() {
  espEnEdicion = null;
  document.getElementById('modalEspTitulo').textContent = 'Nueva Especialidad';
  document.getElementById('espId').value = '';
  document.getElementById('espNombre').value = '';
  document.getElementById('espNombre').classList.remove('error');
  document.getElementById('errEspNombre').classList.remove('visible');
  document.getElementById('modalEspecialidad').classList.remove('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL EDITAR
   --------------------------------------------------------- */
function abrirEditarEsp(id, nombre) {
  espEnEdicion = id;
  document.getElementById('modalEspTitulo').textContent = 'Editar Especialidad';
  document.getElementById('espId').value     = id;
  document.getElementById('espNombre').value = nombre;
  document.getElementById('espNombre').classList.remove('error');
  document.getElementById('errEspNombre').classList.remove('visible');
  document.getElementById('modalEspecialidad').classList.remove('hidden');
}

/* ---------------------------------------------------------
   CERRAR MODAL
   --------------------------------------------------------- */
function cerrarModalEsp() {
  document.getElementById('modalEspecialidad').classList.add('hidden');
  espEnEdicion = null;
}

/* ---------------------------------------------------------
   GUARDAR ESPECIALIDAD (crear o actualizar)
   POST /api/especialidades  o  PUT /api/especialidades/{id}
   --------------------------------------------------------- */
document.getElementById('btnGuardarEsp').addEventListener('click', function() {
  var id     = document.getElementById('espId').value;
  var nombre = document.getElementById('espNombre').value.trim();

  /* Validar nombre */
  document.getElementById('espNombre').classList.remove('error');
  document.getElementById('errEspNombre').classList.remove('visible');

  if (!nombre) {
    document.getElementById('espNombre').classList.add('error');
    document.getElementById('errEspNombre').classList.add('visible');
    return;
  }

  var btn = document.getElementById('btnGuardarEsp');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  var promesa;
  if (espEnEdicion) {
    /* ACTUALIZAR */
    promesa = apiFetch('/api/especialidades/' + id, {
      method: 'PUT',
      body:   JSON.stringify({ Nombre: nombre })
    });
  } else {
    /* CREAR */
    promesa = apiFetch('/api/especialidades', {
      method: 'POST',
      body:   JSON.stringify({ Nombre: nombre })
    });
  }

  promesa
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      var accion = espEnEdicion ? 'actualizada' : 'creada';
      showToast('Especialidad ' + accion + ' correctamente', 'success');
      cerrarModalEsp();
      cargarEspecialidades();
    })
    .catch(function(err) {
      showToast('Error: ' + err.message, 'error', 5000);
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    });
});

/* ---------------------------------------------------------
   ELIMINAR ESPECIALIDAD
   DELETE /api/especialidades/{id}
   --------------------------------------------------------- */
function eliminarEspecialidad(id, nombre) {
  showConfirm(
    '¿Eliminar la especialidad "' + nombre + '"? Los profesionales y servicios asociados pueden verse afectados.',
    function() {
      apiFetch('/api/especialidades/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Especialidad eliminada', 'success');
          cargarEspecialidades();
        })
        .catch(function(err) {
          showToast('No se pudo eliminar: ' + err.message, 'error', 5000);
        });
    },
    'Eliminar Especialidad'
  );
}

/* Iniciar */
cargarEspecialidades();
