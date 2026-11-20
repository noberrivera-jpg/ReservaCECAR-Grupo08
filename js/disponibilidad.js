/* =========================================================
   disponibilidad.js – Consulta de disponibilidad (RF8)
   
   Operaciones:
     - Consultar disponibilidad por fecha + servicio [+ profesional]
     - Consultar agenda por fecha
     - Mostrar slots disponibles como cards
     - Al seleccionar slot, redirigir a reservas con datos pre-cargados
   ========================================================= */

requireAuth('../index.html');
renderUserInfo();
setupSidebar();

var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

/* ---------------------------------------------------------
   CARGAR SERVICIOS Y PROFESIONALES para los selectores
   --------------------------------------------------------- */
function cargarDatosDisp() {
  /* Servicios */
  apiFetch('/api/servicios')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      /* Solo servicios activos para la consulta */
      var items = lista.filter(function(s) {
        return s.Activo === true || s.activo === true || s.Estado === true;
      }).map(function(s) {
        return {
          id:     s.Id || s.id,
          nombre: (s.Nombre || s.nombre || '') + ' (' + formatPrecio(s.Precio || s.precio) + ')'
        };
      });
      fillSelect('dispServicio', items, 'id', 'nombre', 'Todos los servicios');
    })
    .catch(function() {});

  /* Profesionales */
  apiFetch('/api/profesionales?activo=true')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      var lista = Array.isArray(data) ? data : (data.data || []);
      var items = lista.map(function(p) {
        return { id: p.Id || p.id, nombre: (p.Nombres || '') + ' ' + (p.Apellidos || '') };
      });
      fillSelect('dispProfesional', items, 'id', 'nombre', 'Todos los profesionales');
    })
    .catch(function() {});
}

/* Poner la fecha de hoy por defecto */
var hoy = new Date();
var fechaHoy = hoy.getFullYear() + '-' +
  String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
  String(hoy.getDate()).padStart(2, '0');
document.getElementById('dispFecha').value = fechaHoy;

/* ---------------------------------------------------------
   CONSULTAR DISPONIBILIDAD
   GET /api/agenda?fecha={f}&servicioId={id}[&profesionalId={id}]
   --------------------------------------------------------- */
document.getElementById('btnConsultarDisp').addEventListener('click', function() {
  var fecha      = document.getElementById('dispFecha').value;
  var servicioId = document.getElementById('dispServicio').value;
  var proId      = document.getElementById('dispProfesional').value;

  /* Validar fecha */
  document.getElementById('errDispFecha').classList.remove('visible');
  document.getElementById('dispFecha').classList.remove('error');
  if (!fecha) {
    document.getElementById('errDispFecha').classList.add('visible');
    document.getElementById('dispFecha').classList.add('error');
    return;
  }

  /* Ocultar secciones */
  document.getElementById('seccionResultados').classList.add('hidden');
  document.getElementById('seccionAgenda').classList.add('hidden');
  document.getElementById('sinDisponibilidad').classList.add('hidden');

  showLoading();

  /* Construir URL de la API */
  var url = '/api/agenda?fecha=' + fecha;
  if (servicioId) url += '&servicioId=' + servicioId;
  if (proId)      url += '&profesionalId=' + proId;

  apiFetch(url)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      hideLoading();
      var slots = Array.isArray(data) ? data : (data.slots || data.disponibilidad || data.data || []);

      if (!slots || slots.length === 0) {
        document.getElementById('sinDisponibilidad').classList.remove('hidden');
        return;
      }

      /* Mostrar los slots */
      document.getElementById('fechaConsultada').textContent = formatFecha(fecha);
      document.getElementById('totalSlots').textContent = slots.length + ' horario(s) disponible(s)';
      document.getElementById('seccionResultados').classList.remove('hidden');
      renderSlots(slots, fecha, servicioId);
    })
    .catch(function(err) {
      hideLoading();
      showToast('Error al consultar: ' + err.message, 'error', 5000);
      document.getElementById('sinDisponibilidad').classList.remove('hidden');
    });
});

/* ---------------------------------------------------------
   CONSULTAR AGENDA POR FECHA
   GET /api/agenda/{fecha}
   --------------------------------------------------------- */
document.getElementById('btnConsultarAgenda').addEventListener('click', function() {
  var fecha = document.getElementById('dispFecha').value;

  document.getElementById('errDispFecha').classList.remove('visible');
  document.getElementById('dispFecha').classList.remove('error');
  if (!fecha) {
    document.getElementById('errDispFecha').classList.add('visible');
    document.getElementById('dispFecha').classList.add('error');
    return;
  }

  document.getElementById('seccionResultados').classList.add('hidden');
  document.getElementById('seccionAgenda').classList.add('hidden');
  document.getElementById('sinDisponibilidad').classList.add('hidden');

  showLoading();

  apiFetch('/api/agenda/' + fecha)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      hideLoading();
      var items = Array.isArray(data) ? data : (data.agenda || data.data || []);

      document.getElementById('fechaAgenda').textContent = formatFecha(fecha);
      document.getElementById('seccionAgenda').classList.remove('hidden');
      renderAgenda(items, fecha);
    })
    .catch(function(err) {
      hideLoading();
      showToast('Error al consultar agenda: ' + err.message, 'error', 5000);
    });
});

/* ---------------------------------------------------------
   RENDERIZAR CARDS DE SLOTS
   --------------------------------------------------------- */
function renderSlots(slots, fecha, servicioId) {
  var grid = document.getElementById('slotsGrid');
  grid.innerHTML = '';

  slots.forEach(function(slot) {
    /* La API puede retornar diferentes estructuras */
    var hora        = slot.Hora || slot.hora || slot.HoraInicio || slot.horaInicio || '';
    var proNombre   = slot.ProfesionalNombre || slot.profesionalNombre || slot.Profesional || '';
    var proId       = slot.ProfesionalId || slot.profesionalId || '';
    var srvNombre   = slot.ServicioNombre || slot.servicioNombre || '';

    /* Hora formateada */
    var horaStr = hora.length > 5 ? hora.substring(0, 5) : hora;
    var fechaHora = fecha + 'T' + (hora.length >= 8 ? hora : hora + ':00');

    var card = document.createElement('div');
    card.className = 'slot-card';
    card.innerHTML =
      '<span class="slot-time">' + horaStr + '</span>' +
      '<div class="slot-professional" style="margin-bottom:.5rem">' + (proNombre || 'Disponible') + '</div>' +
      (srvNombre ? '<div class="slot-professional">' + srvNombre + '</div>' : '') +
      '<button class="btn btn-primary btn-sm" style="margin-top:.75rem;width:100%">📋 Reservar</button>';

    /* Al hacer clic en reservar, guardar en sessionStorage y redirigir */
    card.querySelector('button').addEventListener('click', function() {
      sessionStorage.setItem('slotSeleccionado', JSON.stringify({
        fecha:       fechaHora,
        servicioId:  servicioId,
        profesionalId: proId,
        proNombre:   proNombre
      }));
      window.location.href = 'reservas.html';
    });

    card.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      /* Marcar como seleccionado */
      document.querySelectorAll('.slot-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    });

    grid.appendChild(card);
  });
}

/* ---------------------------------------------------------
   RENDERIZAR TABLA AGENDA DEL DÍA
   --------------------------------------------------------- */
function renderAgenda(items, fecha) {
  var tbody = document.getElementById('bodyAgenda');
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No hay agenda para este día</td></tr>';
    return;
  }

  var html = '';
  items.forEach(function(item) {
    var proNombre = item.ProfesionalNombre || item.profesionalNombre || item.Profesional || '—';
    var srvNombre = item.ServicioNombre || item.servicioNombre || item.Servicio || '—';
    var hora      = item.Hora || item.hora || item.HoraInicio || '—';
    var horaStr   = hora !== '—' ? hora.substring(0, 5) : hora;
    var servicioId = item.ServicioId || item.servicioId || '';
    var proId      = item.ProfesionalId || item.profesionalId || '';
    var fechaHora  = fecha + 'T' + (hora.length >= 8 ? hora : hora + ':00');

    html +=
      '<tr>' +
        '<td>' + proNombre + '</td>' +
        '<td>' + srvNombre + '</td>' +
        '<td><strong style="color:var(--accent-blue)">' + horaStr + '</strong></td>' +
        '<td>' +
          '<button class="btn btn-primary btn-sm" onclick="irAReservar(\'' + fechaHora + '\', ' + servicioId + ', ' + proId + ')">📋 Reservar</button>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

/* Redirigir a reservas con slot preseleccionado */
function irAReservar(fecha, servicioId, proId) {
  sessionStorage.setItem('slotSeleccionado', JSON.stringify({
    fecha:        fecha,
    servicioId:   servicioId,
    profesionalId: proId
  }));
  window.location.href = 'reservas.html';
}

/* Inicializar */
cargarDatosDisp();
