/* =========================================================
   horarios.js – Gestión de horarios laborales (RF6)
   
   Operaciones:
     - Listar horarios (todos o por profesional)
     - Crear horario individual
     - Crear horario masivo (varios días a la vez)
     - Actualizar horario
     - Eliminar con confirmación
   ========================================================= */

requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

var horEnEdicion = null;
var profesionales = [];

/* Nombres de los días de la semana */
var DIAS = { '1':'Lunes', '2':'Martes', '3':'Miércoles', '4':'Jueves', '5':'Viernes', '6':'Sábado', '7':'Domingo' };

/* ---------------------------------------------------------
   CARGAR PROFESIONALES para selectores
   --------------------------------------------------------- */
function cargarProfesionalesHorario() {
  apiFetch('/api/profesionales')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      profesionales = Array.isArray(data) ? data : (data.data || []);

      /* Crear opciones con nombre completo */
      var items = profesionales.map(function(p) {
        return {
          id:     p.Id || p.id,
          nombre: (p.Nombres || p.nombres || '') + ' ' + (p.Apellidos || p.apellidos || '')
        };
      });

      /* Llenar todos los selectores de profesional */
      ['horProfesional', 'masivoProfesional', 'filtroProfesionalHorario'].forEach(function(selId) {
        var placeholder = selId === 'filtroProfesionalHorario' ? 'Todos los profesionales' : 'Selecciona un profesional...';
        fillSelect(selId, items, 'id', 'nombre', placeholder);
      });
    })
    .catch(function() {});
}

/* ---------------------------------------------------------
   CARGAR HORARIOS
   GET /api/horarios  o  /api/horarios?profesionalId={id}
   --------------------------------------------------------- */
function cargarHorarios() {
  var tbody = document.getElementById('bodyHorarios');
  tbody.innerHTML = '<tr><td colspan="8" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  var proFiltro = document.getElementById('filtroProfesionalHorario').value;
  var endpoint  = '/api/horarios';
  if (proFiltro) endpoint += '?profesionalId=' + proFiltro;

  apiFetch(endpoint)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      renderTablaHorarios(lista);
      var totalEl = document.getElementById('totalHorarios');
      if (totalEl) totalEl.textContent = lista.length + ' registros';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error al cargar: ' + err.message + '</td></tr>';
    });
}

document.getElementById('btnFiltrarHorario').addEventListener('click', cargarHorarios);
document.getElementById('btnTodosHorarios').addEventListener('click', function() {
  document.getElementById('filtroProfesionalHorario').value = '';
  cargarHorarios();
});

/* ---------------------------------------------------------
   RENDERIZAR TABLA
   --------------------------------------------------------- */
function renderTablaHorarios(lista) {
  var tbody = document.getElementById('bodyHorarios');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No hay horarios registrados</td></tr>';
    return;
  }

  var html = '';
  lista.forEach(function(h) {
    var id = h.Id || h.id;
    var proNombre = h.ProfesionalNombre || h.profesionalNombre || '';
    if (!proNombre) {
      var proId = h.ProfesionalId || h.profesionalId;
      profesionales.forEach(function(p) {
        if ((p.Id || p.id) == proId) {
          proNombre = (p.Nombres || p.nombres || '') + ' ' + (p.Apellidos || p.apellidos || '');
        }
      });
    }

    var dia      = h.DiaSemana || h.diaSemana || h.Dia || h.dia;
    var diaNombre = DIAS[String(dia)] || 'Día ' + dia;
    var tieneAlm = h.TieneAlmuerzo === true || h.tieneAlmuerzo === true;

    html +=
      '<tr>' +
        '<td>' + (proNombre || '—') + '</td>' +
        '<td><span class="badge badge-blue">' + diaNombre + '</span></td>' +
        '<td>' + (formatHora(h.HoraInicio || h.horaInicio)) + '</td>' +
        '<td>' + (formatHora(h.HoraFin || h.horaFin)) + '</td>' +
        '<td>' + (tieneAlm ? '<span class="badge badge-success">Sí</span>' : '<span class="badge badge-danger">No</span>') + '</td>' +
        '<td>' + (tieneAlm ? formatHora(h.InicioAlmuerzo || h.inicioAlmuerzo) : '—') + '</td>' +
        '<td>' + (tieneAlm ? formatHora(h.FinAlmuerzo || h.finAlmuerzo) : '—') + '</td>' +
        '<td>' +
          '<div class="td-actions">' +
            '<button class="btn btn-warning btn-sm" onclick="abrirEditarHor(' + JSON.stringify(h).replace(/"/g, '&quot;') + ')">✏️</button>' +
            '<button class="btn btn-danger btn-sm" onclick="eliminarHorario(' + id + ')">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   TOGGLE ALMUERZO en el modal individual
   --------------------------------------------------------- */
document.getElementById('horTieneAlmuerzo').addEventListener('change', function() {
  var bloque = document.getElementById('bloqueAlmuerzo');
  if (this.checked) bloque.classList.remove('hidden');
  else              bloque.classList.add('hidden');
});

document.getElementById('masivoTieneAlm').addEventListener('change', function() {
  var bloque = document.getElementById('bloqueAlmMasivo');
  if (this.checked) bloque.classList.remove('hidden');
  else              bloque.classList.add('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL NUEVO HORARIO INDIVIDUAL
   --------------------------------------------------------- */
document.getElementById('btnNuevoHorario').addEventListener('click', function() {
  horEnEdicion = null;
  document.getElementById('modalHorTitulo').textContent = 'Nuevo Horario';
  limpiarFormulario('formHorario');
  document.getElementById('horId').value = '';
  document.getElementById('bloqueAlmuerzo').classList.add('hidden');
  fillSelect('horProfesional',
    profesionales.map(function(p) {
      return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
    }),
    'id', 'nombre', 'Selecciona un profesional...'
  );
  document.getElementById('modalHorario').classList.remove('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL EDITAR HORARIO
   --------------------------------------------------------- */
function abrirEditarHor(h) {
  horEnEdicion = h;
  document.getElementById('modalHorTitulo').textContent = 'Editar Horario';
  document.getElementById('horId').value = h.Id || h.id || '';

  /* Llenar selector de profesional */
  fillSelect('horProfesional',
    profesionales.map(function(p) {
      return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
    }),
    'id', 'nombre', 'Selecciona...'
  );
  var proId = h.ProfesionalId || h.profesionalId;
  if (proId) document.getElementById('horProfesional').value = proId;

  document.getElementById('horDia').value    = h.DiaSemana || h.diaSemana || h.Dia || h.dia || '';
  document.getElementById('horInicio').value = (h.HoraInicio || h.horaInicio || '').substring(0, 5);
  document.getElementById('horFin').value    = (h.HoraFin || h.horaFin || '').substring(0, 5);

  var tieneAlm = h.TieneAlmuerzo === true || h.tieneAlmuerzo === true;
  document.getElementById('horTieneAlmuerzo').checked = tieneAlm;

  if (tieneAlm) {
    document.getElementById('bloqueAlmuerzo').classList.remove('hidden');
    document.getElementById('horInicioAlm').value = (h.InicioAlmuerzo || h.inicioAlmuerzo || '').substring(0, 5);
    document.getElementById('horFinAlm').value    = (h.FinAlmuerzo || h.finAlmuerzo || '').substring(0, 5);
  } else {
    document.getElementById('bloqueAlmuerzo').classList.add('hidden');
  }

  document.getElementById('modalHorario').classList.remove('hidden');
}

function cerrarModalHor() {
  document.getElementById('modalHorario').classList.add('hidden');
  horEnEdicion = null;
}

/* ---------------------------------------------------------
   GUARDAR HORARIO INDIVIDUAL
   POST /api/horarios  o  PUT /api/horarios/{id}
   --------------------------------------------------------- */
document.getElementById('btnGuardarHorario').addEventListener('click', function() {
  var id        = document.getElementById('horId').value;
  var proId     = document.getElementById('horProfesional').value;
  var dia       = document.getElementById('horDia').value;
  var inicio    = document.getElementById('horInicio').value;
  var fin       = document.getElementById('horFin').value;
  var tieneAlm  = document.getElementById('horTieneAlmuerzo').checked;
  var inicioAlm = document.getElementById('horInicioAlm').value;
  var finAlm    = document.getElementById('horFinAlm').value;

  /* Validaciones */
  if (!proId) { showToast('Selecciona un profesional', 'warning'); return; }
  if (!dia)   { showToast('Selecciona un día de la semana', 'warning'); return; }
  if (!inicio) { showToast('Ingresa la hora de inicio', 'warning'); return; }
  if (!fin)   { showToast('Ingresa la hora de fin', 'warning'); return; }
  if (inicio >= fin) { showToast('La hora de inicio debe ser anterior a la de fin', 'error'); return; }

  if (tieneAlm) {
    if (!inicioAlm || !finAlm) { showToast('Ingresa las horas del almuerzo', 'warning'); return; }
    if (inicioAlm < inicio || finAlm > fin) {
      showToast('El almuerzo debe estar dentro de la jornada laboral', 'error'); return;
    }
    if (inicioAlm >= finAlm) { showToast('El inicio del almuerzo debe ser antes del fin', 'error'); return; }
  }

  var body = {
    ProfesionalId: parseInt(proId),
    DiaSemana:     parseInt(dia),
    HoraInicio:    inicio + ':00',
    HoraFin:       fin + ':00',
    TieneAlmuerzo: tieneAlm
  };
  if (tieneAlm) {
    body.InicioAlmuerzo = inicioAlm + ':00';
    body.FinAlmuerzo    = finAlm + ':00';
  }

  var btn = document.getElementById('btnGuardarHorario');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var promesa;
  if (horEnEdicion) {
    promesa = apiFetch('/api/horarios/' + id, { method: 'PUT', body: JSON.stringify(body) });
  } else {
    promesa = apiFetch('/api/horarios', { method: 'POST', body: JSON.stringify(body) });
  }

  promesa
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      showToast('Horario ' + (horEnEdicion ? 'actualizado' : 'creado') + ' correctamente', 'success');
      cerrarModalHor();
      cargarHorarios();
    })
    .catch(function(err) { showToast('Error: ' + err.message, 'error', 5000); })
    .finally(function() { btn.disabled = false; btn.textContent = 'Guardar'; });
});

/* ---------------------------------------------------------
   ABRIR MODAL MASIVO
   --------------------------------------------------------- */
document.getElementById('btnNuevoMasivo').addEventListener('click', function() {
  /* Reiniciar el formulario masivo */
  document.getElementById('masivoProfesional').value = '';
  [1,2,3,4,5,6,7].forEach(function(d) {
    var el = document.getElementById('dia' + d);
    if (el) el.checked = false;
  });
  document.getElementById('masivoInicio').value  = '';
  document.getElementById('masivoFin').value     = '';
  document.getElementById('masivoTieneAlm').checked = false;
  document.getElementById('bloqueAlmMasivo').classList.add('hidden');
  /* Llenar selector */
  fillSelect('masivoProfesional',
    profesionales.map(function(p) {
      return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
    }),
    'id', 'nombre', 'Selecciona un profesional...'
  );
  document.getElementById('modalMasivo').classList.remove('hidden');
});

function cerrarModalMasivo() {
  document.getElementById('modalMasivo').classList.add('hidden');
}

/* ---------------------------------------------------------
   GUARDAR HORARIO MASIVO
   POST /api/horarios/masivo  (array de horarios)
   --------------------------------------------------------- */
document.getElementById('btnGuardarMasivo').addEventListener('click', function() {
  var proId    = document.getElementById('masivoProfesional').value;
  var inicio   = document.getElementById('masivoInicio').value;
  var fin      = document.getElementById('masivoFin').value;
  var tieneAlm = document.getElementById('masivoTieneAlm').checked;
  var inicioAlm = document.getElementById('masivoInicioAlm').value;
  var finAlm    = document.getElementById('masivoFinAlm').value;

  if (!proId)  { showToast('Selecciona un profesional', 'warning'); return; }
  if (!inicio) { showToast('Ingresa la hora de inicio', 'warning'); return; }
  if (!fin)    { showToast('Ingresa la hora de fin', 'warning'); return; }
  if (inicio >= fin) { showToast('Inicio debe ser menor que fin', 'error'); return; }

  /* Recolectar días seleccionados */
  var diasSeleccionados = [];
  [1,2,3,4,5,6,7].forEach(function(d) {
    var el = document.getElementById('dia' + d);
    if (el && el.checked) diasSeleccionados.push(d);
  });
  if (diasSeleccionados.length === 0) { showToast('Selecciona al menos un día', 'warning'); return; }

  /* Construir array de horarios */
  var horarios = diasSeleccionados.map(function(dia) {
    var h = {
      ProfesionalId: parseInt(proId),
      DiaSemana:     dia,
      HoraInicio:    inicio + ':00',
      HoraFin:       fin + ':00',
      TieneAlmuerzo: tieneAlm
    };
    if (tieneAlm && inicioAlm && finAlm) {
      h.InicioAlmuerzo = inicioAlm + ':00';
      h.FinAlmuerzo    = finAlm + ':00';
    }
    return h;
  });

  var btn = document.getElementById('btnGuardarMasivo');
  btn.disabled = true; btn.textContent = 'Guardando...';

  /* Intentar endpoint masivo, si falla hacer peticiones individuales */
  apiFetch('/api/horarios/masivo', {
    method: 'POST',
    body:   JSON.stringify(horarios)
  })
  .then(function(r) { return parseResponse(r); })
  .then(function() {
    showToast(diasSeleccionados.length + ' horarios creados correctamente', 'success');
    cerrarModalMasivo();
    cargarHorarios();
  })
  .catch(function() {
    /* Fallback: crear uno por uno */
    var promesas = horarios.map(function(h) {
      return apiFetch('/api/horarios', { method: 'POST', body: JSON.stringify(h) })
        .then(function(r) { return parseResponse(r); });
    });
    Promise.all(promesas)
      .then(function() {
        showToast(diasSeleccionados.length + ' horarios creados correctamente', 'success');
        cerrarModalMasivo();
        cargarHorarios();
      })
      .catch(function(err) { showToast('Error: ' + err.message, 'error', 5000); });
  })
  .finally(function() { btn.disabled = false; btn.textContent = 'Guardar Horarios'; });
});

/* ---------------------------------------------------------
   ELIMINAR HORARIO
   DELETE /api/horarios/{id}
   --------------------------------------------------------- */
function eliminarHorario(id) {
  showConfirm(
    '¿Deseas eliminar este horario?',
    function() {
      apiFetch('/api/horarios/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Horario eliminado', 'success');
          cargarHorarios();
        })
        .catch(function(err) { showToast('No se pudo eliminar: ' + err.message, 'error', 5000); });
    },
    'Eliminar Horario'
  );
}

/* Iniciar */
cargarProfesionalesHorario();
cargarHorarios();
