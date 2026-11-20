/* =========================================================
   clientes.js – Gestión completa de clientes (RF2)
   
   Operaciones:
     - Listar todos los clientes
     - Buscar por documento
     - Crear nuevo cliente
     - Actualizar cliente existente
     - Eliminar cliente con confirmación
   ========================================================= */

/* Verificar sesión activa antes de cargar la página */
requireAuth('../index.html');

/* Mostrar info del usuario logueado */
renderUserInfo();
setupSidebar();

/* Avatar inicial del usuario */
var usuario = getUsuario();
var avatarEl = document.getElementById('avatarInicial');
if (avatarEl && usuario) avatarEl.textContent = usuario[0].toUpperCase();

/* ---------------------------------------------------------
   ESTADO GLOBAL del módulo
   --------------------------------------------------------- */
var clienteEnEdicion = null; /* null = crear, objeto = editar */

/* ---------------------------------------------------------
   CARGAR TODOS LOS CLIENTES
   GET /api/clientes
   --------------------------------------------------------- */
function cargarClientes() {
  var tbody = document.getElementById('bodyClientes');
  tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  apiFetch('/api/clientes')
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      /* La API puede retornar array directo o envuelto */
      var lista = Array.isArray(data) ? data : (data.data || data.items || []);
      renderTablaClientes(lista);
      /* Mostrar total */
      var totalEl = document.getElementById('totalClientes');
      if (totalEl) totalEl.textContent = lista.length + ' registros';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Error al cargar: ' + err.message + '</td></tr>';
    });
}

/* ---------------------------------------------------------
   RENDERIZAR TABLA DE CLIENTES
   --------------------------------------------------------- */
function renderTablaClientes(lista) {
  var tbody = document.getElementById('bodyClientes');

  /* Sin registros */
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay clientes registrados</td></tr>';
    return;
  }

  /* Construir filas de la tabla */
  var html = '';
  lista.forEach(function(c) {
    html +=
      '<tr>' +
        '<td><strong>' + (c.Documento || c.documento || '—') + '</strong></td>' +
        '<td>' + (c.Nombres || c.nombres || '—') + '</td>' +
        '<td>' + (c.Apellidos || c.apellidos || '—') + '</td>' +
        '<td>' + (c.Celular || c.celular || '—') + '</td>' +
        '<td>' + (c.Correo || c.correo || '—') + '</td>' +
        '<td>' + (formatFecha(c.FechaNacimiento || c.fechaNacimiento)) + '</td>' +
        '<td>' +
          '<div class="td-actions">' +
            '<button class="btn btn-warning btn-sm" onclick="abrirEditar(' + JSON.stringify(c).replace(/"/g, '&quot;') + ')">✏️ Editar</button>' +
            '<button class="btn btn-danger btn-sm" onclick="eliminarCliente(' + (c.Id || c.id) + ', \'' + (c.Nombres || '') + '\')">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });

  tbody.innerHTML = html;
}

/* ---------------------------------------------------------
   BUSCAR CLIENTE POR DOCUMENTO
   GET /api/clientes/{documento}
   --------------------------------------------------------- */
document.getElementById('btnBuscar').addEventListener('click', function() {
  var doc = document.getElementById('inputBuscarDoc').value.trim();
  if (!doc) {
    showToast('Ingresa un número de documento para buscar', 'warning');
    return;
  }

  var tbody = document.getElementById('bodyClientes');
  tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>';

  apiFetch('/api/clientes/' + doc)
    .then(function(r) { return parseResponse(r); })
    .then(function(data) {
      /* La búsqueda puede retornar un objeto único o un array */
      var lista = Array.isArray(data) ? data : [data];
      renderTablaClientes(lista);
      var totalEl = document.getElementById('totalClientes');
      if (totalEl) totalEl.textContent = lista.length + ' resultado(s)';
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No se encontró cliente con documento: ' + doc + '</td></tr>';
    });
});

/* Buscar al presionar Enter */
document.getElementById('inputBuscarDoc').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('btnBuscar').click();
});

/* Mostrar todos los clientes */
document.getElementById('btnMostrarTodos').addEventListener('click', function() {
  document.getElementById('inputBuscarDoc').value = '';
  cargarClientes();
});

/* ---------------------------------------------------------
   ABRIR MODAL PARA CREAR
   --------------------------------------------------------- */
document.getElementById('btnNuevoCliente').addEventListener('click', function() {
  clienteEnEdicion = null;
  document.getElementById('modalClienteTitulo').textContent = 'Nuevo Cliente';
  limpiarFormulario('formCliente');
  document.getElementById('clienteId').value = '';
  /* Habilitar el campo documento (en edición puede estar deshabilitado) */
  document.getElementById('cliDocumento').disabled = false;
  limpiarErroresForm();
  document.getElementById('modalCliente').classList.remove('hidden');
});

/* ---------------------------------------------------------
   ABRIR MODAL PARA EDITAR
   --------------------------------------------------------- */
function abrirEditar(cliente) {
  clienteEnEdicion = cliente;
  document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';

  /* Rellenar el formulario con los datos del cliente */
  document.getElementById('clienteId').value = cliente.Id || cliente.id || '';
  document.getElementById('cliDocumento').value = cliente.Documento || cliente.documento || '';
  document.getElementById('cliNombres').value   = cliente.Nombres || cliente.nombres || '';
  document.getElementById('cliApellidos').value = cliente.Apellidos || cliente.apellidos || '';
  document.getElementById('cliCelular').value   = cliente.Celular || cliente.celular || '';
  document.getElementById('cliCorreo').value    = cliente.Correo || cliente.correo || '';

  /* Formatear fecha de nacimiento para input[type=date] */
  var fechaNac = cliente.FechaNacimiento || cliente.fechaNacimiento;
  if (fechaNac) {
    document.getElementById('cliFechaNac').value = fechaNac.substring(0, 10);
  } else {
    document.getElementById('cliFechaNac').value = '';
  }

  limpiarErroresForm();
  document.getElementById('modalCliente').classList.remove('hidden');
}

/* ---------------------------------------------------------
   CERRAR MODAL
   --------------------------------------------------------- */
document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);

function cerrarModal() {
  document.getElementById('modalCliente').classList.add('hidden');
  clienteEnEdicion = null;
}

/* ---------------------------------------------------------
   GUARDAR CLIENTE (crear o actualizar)
   POST /api/clientes  o  PUT /api/clientes/{id}
   --------------------------------------------------------- */
document.getElementById('btnGuardarCliente').addEventListener('click', function() {
  /* Recoger valores del formulario */
  var id        = document.getElementById('clienteId').value;
  var documento = document.getElementById('cliDocumento').value.trim();
  var nombres   = document.getElementById('cliNombres').value.trim();
  var apellidos = document.getElementById('cliApellidos').value.trim();
  var celular   = document.getElementById('cliCelular').value.trim();
  var correo    = document.getElementById('cliCorreo').value.trim();
  var fechaNac  = document.getElementById('cliFechaNac').value;

  /* Limpiar errores previos */
  limpiarErroresForm();
  var hayError = false;

  /* Validar campos obligatorios */
  if (!documento) {
    mostrarErrorCampo('cliDocumento', 'errCliDocumento'); hayError = true;
  }
  if (!nombres) {
    mostrarErrorCampo('cliNombres', 'errCliNombres'); hayError = true;
  }
  if (!apellidos) {
    mostrarErrorCampo('cliApellidos', 'errCliApellidos'); hayError = true;
  }
  if (hayError) return;

  /* Construir body de la petición */
  var body = {
    Documento:        documento,
    Nombres:          nombres,
    Apellidos:        apellidos
  };
  if (celular)  body.Celular  = celular;
  if (correo)   body.Correo   = correo;
  if (fechaNac) body.FechaNacimiento = fechaNac;

  /* Deshabilitar botón mientras guarda */
  var btnGuardar = document.getElementById('btnGuardarCliente');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  var promesa;

  if (clienteEnEdicion) {
    /* ACTUALIZAR – PUT /api/clientes/{id} */
    promesa = apiFetch('/api/clientes/' + id, {
      method: 'PUT',
      body:   JSON.stringify(body)
    });
  } else {
    /* CREAR – POST /api/clientes */
    promesa = apiFetch('/api/clientes', {
      method: 'POST',
      body:   JSON.stringify(body)
    });
  }

  promesa
    .then(function(r) { return parseResponse(r); })
    .then(function() {
      var accion = clienteEnEdicion ? 'actualizado' : 'creado';
      showToast('Cliente ' + accion + ' correctamente', 'success');
      cerrarModal();
      cargarClientes(); /* Recargar la tabla */
    })
    .catch(function(err) {
      showToast('Error: ' + err.message, 'error', 5000);
    })
    .finally(function() {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    });
});

/* ---------------------------------------------------------
   ELIMINAR CLIENTE
   DELETE /api/clientes/{id}
   --------------------------------------------------------- */
function eliminarCliente(id, nombre) {
  if (!id) {
    showToast('No se puede eliminar: ID no encontrado', 'error');
    return;
  }

  showConfirm(
    '¿Deseas eliminar al cliente "' + nombre + '"? Esta acción no se puede deshacer.',
    function() {
      apiFetch('/api/clientes/' + id, { method: 'DELETE' })
        .then(function(r) { return parseResponse(r); })
        .then(function() {
          showToast('Cliente eliminado correctamente', 'success');
          cargarClientes();
        })
        .catch(function(err) {
          showToast('No se pudo eliminar: ' + err.message, 'error', 5000);
        });
    },
    'Eliminar Cliente'
  );
}

/* ---------------------------------------------------------
   HELPERS del formulario
   --------------------------------------------------------- */
function limpiarErroresForm() {
  ['cliDocumento', 'cliNombres', 'cliApellidos'].forEach(function(id) {
    document.getElementById(id).classList.remove('error');
  });
  ['errCliDocumento', 'errCliNombres', 'errCliApellidos'].forEach(function(id) {
    document.getElementById(id).classList.remove('visible');
  });
}

function mostrarErrorCampo(inputId, errorId) {
  document.getElementById(inputId).classList.add('error');
  document.getElementById(errorId).classList.add('visible');
}

/* ---------------------------------------------------------
   INICIALIZACIÓN – Cargar clientes al abrir la página
   --------------------------------------------------------- */
cargarClientes();
