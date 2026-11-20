/* =========================================================
   auth.js – Manejo de autenticación y sesión del gestor
   
   Funciones:
     - requireAuth()  → protege páginas privadas
     - login()        → inicia sesión y guarda token
     - logout()       → cierra sesión y limpia datos
     - getUsuario()   → retorna el nombre del usuario actual
   ========================================================= */

/* ---------------------------------------------------------
   requireAuth – Verificar que haya sesión activa
   
   Si no hay token en sessionStorage, redirige al login.
   Llamar al inicio de cada página protegida.
   
   Parámetro:
     redirectPath → ruta al index.html según la ubicación del archivo
   --------------------------------------------------------- */
function requireAuth(redirectPath) {
  redirectPath = redirectPath || 'index.html';
  var token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = redirectPath;
  }
}

/* ---------------------------------------------------------
   login – Iniciar sesión con usuario y contraseña
   
   Hace POST a /api/sesion, guarda el token y redirige
   al dashboard si la autenticación es correcta.
   --------------------------------------------------------- */
function login(usuario, clave) {
  return apiFetch('/api/sesion', {
    method: 'POST',
    body: JSON.stringify({
      Usuario: usuario,
      Clave:   clave
    })
  })
  .then(function(response) {
    return parseResponse(response);
  })
  .then(function(data) {
    /* Buscar el token en diferentes propiedades posibles o respuesta directa */
    var token = (data && typeof data === 'object')
      ? (data.token || data.Token || data.access_token || (data.data && (data.data.token || data.data.Token)))
      : (typeof data === 'string' ? data : null);

    if (!token) {
      return Promise.reject(new Error('No se recibió token del servidor'));
    }

    /* Guardar token y datos del usuario en sessionStorage */
    sessionStorage.setItem('token', token);
    var userVal = (data && (data.usuario || data.Usuario || data.user || (data.data && data.data.usuario))) || usuario;
    sessionStorage.setItem('usuario', userVal);
    sessionStorage.setItem('empresa', 'Grupo08');

    /* Redirigir al dashboard */
    window.location.href = 'dashboard.html';
  });
}

/* ---------------------------------------------------------
   logout – Cerrar sesión y limpiar datos guardados
   
   Elimina todos los datos de sessionStorage y regresa
   a la página de login.
   --------------------------------------------------------- */
function logout() {
  /* Limpiar toda la sesión */
  sessionStorage.clear();

  /* Detectar si estamos en la carpeta pages/ y ajustar ruta */
  var esEnPages = window.location.pathname.indexOf('/pages/') !== -1;
  window.location.href = esEnPages ? '../index.html' : 'index.html';
}

/* ---------------------------------------------------------
   getUsuario – Obtener el nombre del usuario logueado
   --------------------------------------------------------- */
function getUsuario() {
  return sessionStorage.getItem('usuario') || 'Gestor';
}

/* ---------------------------------------------------------
   getEmpresa – Obtener el nombre de la empresa
   --------------------------------------------------------- */
function getEmpresa() {
  return sessionStorage.getItem('empresa') || 'Grupo08';
}

/* ---------------------------------------------------------
   renderUserInfo – Mostrar usuario y empresa en el navbar
   
   Busca elementos con id="userName" y "companyName" en el DOM
   y los rellena con los datos de sesión.
   --------------------------------------------------------- */
function renderUserInfo() {
  var userNameEl   = document.getElementById('userName');
  var companyNameEl = document.getElementById('companyName');

  if (userNameEl) userNameEl.textContent = getUsuario();
  if (companyNameEl) companyNameEl.textContent = getEmpresa();
}
