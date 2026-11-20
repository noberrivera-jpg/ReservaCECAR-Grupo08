/* =========================================================
   profesionales.js – Gestión de profesionales (RF4)
   
   Operaciones:
     - Listar todos / filtrar por estado
     - Cargar especialidades para el selector
     - Crear profesional
     - Actualizar datos y estado
     - Eliminar con confirmación
   ========================================================= */

requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

var proEnEdicion  = null; /* null = crear, objeto = editar */
var especialidades = [];  /* cache de especialidades */

/* ---------------------------------------------------------
   CARGAR ESPECIALIDADES para el selector del formulario
   GET /api/especialidades
   --------------------------------------------------------- */
function cargarEspecialidadesParaSelector() {
  apiFetch('/api/especialidades')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      especialidades = Array.isArray(data) ? data : (data.data || []);
      /* Llenar el select del formulario */
      fillSelect('proEspecialidad', especialidades, 'Id', 'Nombre', 'Selecciona una especialidad...');
    })
    .catch(function() {
      /* Si falla, dejar vacío */
    });
}

/* ---------------------------------------------------------
   CARGAR PROFESIONALES
   GET /api/profesionales  o  ?activo=true|false
   --------------------------------------------------------- */
function cargarProfesionales() {
  var tbody = document.getElementById('bodyProfesionales');
  tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  var filtroEstado = document.getElementById('filtroEstado').value;
  var endpoint = '/api/profesionales';
  if (filtroEstado !== '') {
    endpoint += '?activo=' + filtroEstado;
  }

  apiFetch(endpoint)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      renderTablaProfesionales(lista);
      var totalEl = document.getElementById('totalProfesionales');
      if (totalEl) totalEl.textContent = lista.length + ' registros';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Error: ' + err.message + '</td></tr>';
    });
}

/* Botón filtrar */
document.getElementById('btnFiltrar').addEventListener('click', cargarProfesionales);

/* ---------------------------------------------------------
   RENDERIZAR TABLA
   --------------------------------------------------------- */
function renderTablaProfesionales(lista) {
  var tbody = document.getElementById('bodyProfesionales');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay profesionales registrados</td></tr>';
    return;
  }

  var html = '';
  lista.forEach(function(p) {
    var id = p.Id || p.id;

    /* Buscar nombre de la especialidad */
    var espId     = p.EspecialidadId || p.especialidadId || p.Especialidad || p.especialidad;
    var espNombre = '—';
    especialidades.forEach(function(e) {
      if ((e.Id || e.id) == espId) espNombre = e.Nombre || e.nombre;
    });
    /* Si la API ya trae el nombre */
    if (p.EspecialidadNombre || p.especialidadNombre) {
      espNombre = p.EspecialidadNombre || p.especialidadNombre;
    }

    var activo = p.Estado === true || p.estado === true || p.Activo === true || p.activo === true;

    html +=
      '<tr>' +
        '<td><strong>' + (p.Documento || p.documento || '—') + '</strong></td>' +
        '<td>' + (p.Nombres || p.nombres || '—') + '</td>' +
        '<td>' + (p.Apellidos || p.apellidos || '—') + '</td>' +
        '<td>' + espNombre + '</td>' +
        '<td>' + (p.Porcentaje || p.porcentaje || 0) + '%</td>' +
        '<td>' + getActivoBadge(activo) + '</td>' +
        '<td>' +
          '<div class="td-actions">' +
            '<button class="btn btn-warning btn-sm" onclick="abrirEditarPro(' + JSON.stringify(p).replace(/"/g, '&quot;') + ')">✏️</button>' +
            '<button class="btn ' + (activo ? 'btn-secondary' : 'btn-success') + ' btn-sm" onclick="toggleEstado(' + id + ', ' + activo + ')">' +
              (activo ? '⏸️' : '▶️') +
            '</button>' +
            '<button class="btn btn-danger btn-sm" onclick="eliminarPro(' + id + ', \'' + (p.Nombres || '') + '\')">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   ABRIR MODAL CREAR
   --------------------------------------------------------- */
document.getElementById('btnNuevoPro').addEventListener('click', function() {
  proEnEdicion = null;
  document.getElementById('modalProTitulo').textContent = 'Nuevo Profesional';
  limpiarFormulario('formPro');
  document.getElementById('proId').value = '';
  document.getElementById('proEstado').checked = true;
  /* Recargar especialidades en el selector */
  fillSelect('proEspecialidad', especialidades, 'Id', 'Nombre', 'Selecciona una especialidad...');
  limpiarErroresPro();
  document.getElementById('modalPro').classList.remove('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL EDITAR
   --------------------------------------------------------- */
function abrirEditarPro(pro) {
  proEnEdicion = pro;
  document.getElementById('modalProTitulo').textContent = 'Editar Profesional';

  document.getElementById('proId').value        = pro.Id || pro.id || '';
  document.getElementById('proDocumento').value = pro.Documento || pro.documento || '';
  document.getElementById('proNombres').value   = pro.Nombres || pro.nombres || '';
  document.getElementById('proApellidos').value = pro.Apellidos || pro.apellidos || '';
  document.getElementById('proPorcentaje').value = pro.Porcentaje || pro.porcentaje || '';

  var fechaNac = pro.FechaNacimiento || pro.fechaNacimiento;
  document.getElementById('proFechaNac').value = fechaNac ? fechaNac.substring(0, 10) : '';

  var activo = pro.Estado === true || pro.estado === true;
  document.getElementById('proEstado').checked = activo;

  /* Seleccionar la especialidad actual */
  var espId = pro.EspecialidadId || pro.especialidadId || pro.Especialidad || pro.especialidad;
  fillSelect('proEspecialidad', especialidades, 'Id', 'Nombre', 'Selecciona...');
  if (espId) document.getElementById('proEspecialidad').value = espId;

  limpiarErroresPro();
  document.getElementById('modalPro').classList.remove('hidden');
}

function cerrarModalPro() {
  document.getElementById('modalPro').classList.add('hidden');
  proEnEdicion = null;
}

/* ---------------------------------------------------------
   GUARDAR PROFESIONAL
   POST /api/profesionales  o  PUT /api/profesionales/{id}
   --------------------------------------------------------- */
document.getElementById('btnGuardarPro').addEventListener('click', function() {
  var id         = document.getElementById('proId').value;
  var documento  = document.getElementById('proDocumento').value.trim();
  var nombres    = document.getElementById('proNombres').value.trim();
  var apellidos  = document.getElementById('proApellidos').value.trim();
  var porcentaje = document.getElementById('proPorcentaje').value;
  var espId      = document.getElementById('proEspecialidad').value;
  var estado     = document.getElementById('proEstado').checked;
  var fechaNac   = document.getElementById('proFechaNac').value;

  limpiarErroresPro();
  var hayError = false;

  if (!documento) { mostrarErrPro('proDocumento', 'errProDocumento'); hayError = true; }
  if (!nombres)   { mostrarErrPro('proNombres',   'errProNombres');   hayError = true; }
  if (!apellidos) { mostrarErrPro('proApellidos', 'errProApellidos'); hayError = true; }
  if (!espId && !proEnEdicion) { mostrarErrPro('proEspecialidad', 'errProEspecialidad'); hayError = true; }

  var pct = parseFloat(porcentaje);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    mostrarErrPro('proPorcentaje', 'errProPorcentaje'); hayError = true;
  }

  if (hayError) return;

  var body;
  if (proEnEdicion) {
    /* En edición solo enviar campos permitidos */
    body = {
      Nombres:    nombres,
      Apellidos:  apellidos,
      Porcentaje: pct,
      Estado:     estado
    };
  } else {
    /* Creación: todos los campos */
    body = {
      Documento:  documento,
      Nombres:    nombres,
      Apellidos:  apellidos,
      Porcentaje: pct,
      Estado:     estado,
      Especialidad: parseInt(espId)
    };
    if (fechaNac) body.FechaNacimiento = fechaNac;
  }

  var btn = document.getElementById('btnGuardarPro');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var promesa;
  if (proEnEdicion) {
    promesa = apiFetch('/api/profesionales/' + id, { method: 'PUT', body: JSON.stringify(body) });
  } else {
    promesa = apiFetch('/api/profesionales', { method: 'POST', body: JSON.stringify(body) });
  }

  promesa
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      showToast('Profesional ' + (proEnEdicion ? 'actualizado' : 'creado') + ' correctamente', 'success');
      cerrarModalPro();
      cargarProfesionales();
    })
    .catch(function(err) {
      showToast('Error: ' + err.message, 'error', 5000);
    })
    .finally(function() {
      btn.disabled = false; btn.textContent = 'Guardar';
    });
});

/* ---------------------------------------------------------
   TOGGLE ESTADO (activar/desactivar)
   PUT /api/profesionales/{id}
   --------------------------------------------------------- */
function toggleEstado(id, estadoActual) {
  var nuevoEstado = !estadoActual;
  var accion = nuevoEstado ? 'activar' : 'desactivar';

  showConfirm(
    '¿Deseas ' + accion + ' este profesional?',
    function() {
      apiFetch('/api/profesionales/' + id, {
        method: 'PUT',
        body:   JSON.stringify({ Estado: nuevoEstado })
      })
      .then(function(r) { return parseResponse(r); })
      .then(function() {
        showToast('Profesional ' + (nuevoEstado ? 'activado' : 'desactivado'), 'success');
        cargarProfesionales();
      })
      .catch(function(err) {
        showToast('Error: ' + err.message, 'error', 5000);
      });
    },
    'Cambiar Estado'
  );
}

/* ---------------------------------------------------------
   ELIMINAR PROFESIONAL
   DELETE /api/profesionales/{id}
   --------------------------------------------------------- */
function eliminarPro(id, nombre) {
  showConfirm(
    '¿Eliminar al profesional "' + nombre + '"? Las reservas y horarios asociados pueden verse afectados.',
    function() {
      apiFetch('/api/profesionales/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Profesional eliminado', 'success');
          cargarProfesionales();
        })
        .catch(function(err) {
          showToast('No se pudo eliminar: ' + err.message, 'error', 5000);
        });
    },
    'Eliminar Profesional'
  );
}

/* Helpers de errores */
function limpiarErroresPro() {
  ['proDocumento','proNombres','proApellidos','proPorcentaje','proEspecialidad'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('error');
  });
  ['errProDocumento','errProNombres','errProApellidos','errProPorcentaje','errProEspecialidad'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
}

function mostrarErrPro(inputId, errorId) {
  var inp = document.getElementById(inputId);
  var err = document.getElementById(errorId);
  if (inp) inp.classList.add('error');
  if (err) err.classList.add('visible');
}

/* Inicializar */
cargarEspecialidadesParaSelector();
cargarProfesionales();
