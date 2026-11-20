/* =========================================================
   utils.js – Funciones de utilidad compartidas
   
   Funciones:
     - showToast()     → notificaciones de éxito/error/info
     - showConfirm()   → diálogo de confirmación
     - showLoading()   → spinner de carga
     - hideLoading()   → ocultar spinner
     - setupSidebar()  → menú lateral responsive
     - formatFecha()   → formatear fechas para mostrar
     - fillSelect()    → llenar un <select> con opciones
   ========================================================= */

/* ---------------------------------------------------------
   TOAST – Notificaciones flotantes
   
   Parámetros:
     mensaje  → texto a mostrar
     tipo     → 'success' | 'error' | 'warning' | 'info'
     duracion → milisegundos (por defecto 3500)
   --------------------------------------------------------- */
function showToast(mensaje, tipo, duracion) {
  tipo     = tipo     || 'info';
  duracion = duracion || 3500;

  /* Buscar o crear el contenedor de toasts */
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  /* Iconos según el tipo */
  var iconos = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️'
  };

  /* Crear el toast */
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + tipo;
  toast.innerHTML =
    '<span class="toast-icon">' + (iconos[tipo] || 'ℹ️') + '</span>' +
    '<span class="toast-message">' + mensaje + '</span>';

  container.appendChild(toast);

  /* Eliminar el toast después de la duración indicada */
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 300ms ease';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duracion);
}

/* ---------------------------------------------------------
   CONFIRM – Diálogo de confirmación
   
   Muestra un modal con dos botones: Cancelar y Confirmar.
   
   Parámetros:
     mensaje   → pregunta de confirmación
     onConfirm → función que se llama al confirmar
     titulo    → título del modal (opcional)
   --------------------------------------------------------- */
function showConfirm(mensaje, onConfirm, titulo) {
  titulo = titulo || '¿Estás seguro?';

  /* Eliminar cualquier diálogo anterior */
  var old = document.getElementById('confirmOverlay');
  if (old) old.parentNode.removeChild(old);

  /* Crear overlay */
  var overlay = document.createElement('div');
  overlay.id = 'confirmOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal confirm-dialog">' +
      '<div class="modal-body" style="text-align:center;padding:2rem">' +
        '<span class="confirm-icon">🗑️</span>' +
        '<h3 style="margin-bottom:.75rem">' + titulo + '</h3>' +
        '<p class="confirm-message">' + mensaje + '</p>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="confirmCancel">Cancelar</button>' +
        '<button class="btn btn-danger" id="confirmOk">Confirmar</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  /* Cerrar al hacer clic en Cancelar */
  document.getElementById('confirmCancel').addEventListener('click', function() {
    document.body.removeChild(overlay);
  });

  /* Ejecutar la acción al confirmar */
  document.getElementById('confirmOk').addEventListener('click', function() {
    document.body.removeChild(overlay);
    onConfirm();
  });
}

/* ---------------------------------------------------------
   LOADING – Spinner de carga global
   --------------------------------------------------------- */
function showLoading() {
  var old = document.getElementById('globalLoading');
  if (old) return; /* Ya está visible */

  var overlay = document.createElement('div');
  overlay.id = 'globalLoading';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  var overlay = document.getElementById('globalLoading');
  if (overlay) overlay.parentNode.removeChild(overlay);
}

/* ---------------------------------------------------------
   SIDEBAR – Configurar el menú lateral responsive
   
   Habilita el botón hamburguesa y el overlay oscuro
   para abrir/cerrar el sidebar en pantallas pequeñas.
   --------------------------------------------------------- */
function setupSidebar() {
  var sidebar   = document.getElementById('sidebar');
  var toggleBtn = document.getElementById('sidebarToggle');
  var overlay   = document.getElementById('sidebarOverlay');

  if (!sidebar || !toggleBtn) return;

  /* Abrir/cerrar el sidebar */
  toggleBtn.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  });

  /* Cerrar al hacer clic en el overlay */
  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

/* ---------------------------------------------------------
   fillSelect – Llenar un <select> con un array de opciones
   
   Parámetros:
     selectId    → id del elemento <select>
     items       → array de objetos
     valorProp   → propiedad que se usa como value
     textoProp   → propiedad que se muestra como texto
     placeholder → texto de la opción vacía (opcional)
   --------------------------------------------------------- */
function fillSelect(selectId, items, valorProp, textoProp, placeholder) {
  var sel = document.getElementById(selectId);
  if (!sel) return;

  /* Limpiar opciones previas */
  sel.innerHTML = '';

  /* Agregar placeholder si se proporcionó */
  if (placeholder !== undefined) {
    var optVacia = document.createElement('option');
    optVacia.value = '';
    optVacia.textContent = placeholder;
    sel.appendChild(optVacia);
  }

  /* Agregar cada opción */
  items.forEach(function(item) {
    var opt = document.createElement('option');
    opt.value = item[valorProp];
    opt.textContent = item[textoProp];
    sel.appendChild(opt);
  });
}

/* ---------------------------------------------------------
   formatFecha – Formatear una fecha ISO a texto legible
   
   Entrada:  "2026-10-15T14:30:00"
   Salida:   "15/10/2026 14:30"
   --------------------------------------------------------- */
function formatFecha(isoString) {
  if (!isoString) return '—';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  var dia  = String(d.getDate()).padStart(2, '0');
  var mes  = String(d.getMonth() + 1).padStart(2, '0');
  var anio = d.getFullYear();
  var hora = String(d.getHours()).padStart(2, '0');
  var min  = String(d.getMinutes()).padStart(2, '0');

  /* Si tiene hora significativa, mostrar también */
  if (d.getHours() !== 0 || d.getMinutes() !== 0) {
    return dia + '/' + mes + '/' + anio + ' ' + hora + ':' + min;
  }
  return dia + '/' + mes + '/' + anio;
}

/* ---------------------------------------------------------
   formatHora – Extraer solo la hora de una fecha ISO
   
   Entrada:  "2026-10-15T14:30:00"
   Salida:   "14:30"
   --------------------------------------------------------- */
function formatHora(isoString) {
  if (!isoString) return '—';
  /* Si viene solo como hora "HH:mm:ss" */
  if (isoString.length <= 8) return isoString.substring(0, 5);
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------------------------------------------------------
   formatPrecio – Formatear número como moneda colombiana
   --------------------------------------------------------- */
function formatPrecio(valor) {
  if (valor === null || valor === undefined) return '—';
  return '$' + Number(valor).toLocaleString('es-CO');
}

/* ---------------------------------------------------------
   getActivoBadge – Generar badge de estado activo/inactivo
   --------------------------------------------------------- */
function getActivoBadge(activo) {
  if (activo) {
    return '<span class="badge badge-success">Activo</span>';
  }
  return '<span class="badge badge-danger">Inactivo</span>';
}

/* ---------------------------------------------------------
   limpiarFormulario – Limpiar todos los campos de un form
   --------------------------------------------------------- */
function limpiarFormulario(formId) {
  var form = document.getElementById(formId);
  if (form) form.reset();
}

/* ---------------------------------------------------------
   setActiveNav – Marcar el item activo en el sidebar
   
   Parámetro:
     linkHref → fragmento del href del link activo, ej: 'clientes'
   --------------------------------------------------------- */
function setActiveNav(linkHref) {
  var navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(function(item) {
    item.classList.remove('active');
    if (item.getAttribute('href') && item.getAttribute('href').indexOf(linkHref) !== -1) {
      item.classList.add('active');
    }
  });
}
