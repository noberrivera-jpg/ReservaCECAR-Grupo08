/* =========================================================
   api.js – Configuración central de llamadas a la API
   Todas las peticiones HTTP pasan por aquí.
   
   Base URL: https://api.ehily.cecar.cloud
   Alternativa: https://api.reservacecar.cecar.cloud
   Empresa ID: 23 (Grupo08)
   ========================================================= */

/* URL base de la API:
   - Si se ejecuta mediante el proxy local (server.js en puerto 3000), usa ruta relativa ''
   - Si se ejecuta en Live Server o en hosting, usa la URL de Swagger */
var BASE_URL = (window.location.port === '3000') 
  ? '' 
  : 'https://api.ReservaCECAR.cecar.cloud';
var FALLBACK_URL = 'https://api.ehily.cecar.cloud';

/* ID de la empresa asignada a este grupo */
var EMPRESA_ID = 23;

/* ---------------------------------------------------------
   apiFetch – Petición autenticada con Bearer Token
   
   Se usa para todos los endpoints protegidos.
   El token se lee automáticamente de sessionStorage.
   Incluye fallback automático entre ambos dominios de la API.
   --------------------------------------------------------- */
function apiFetch(endpoint, options) {
  options = options || {};
  var token = sessionStorage.getItem('token');
  var activeBase = localStorage.getItem('api_base_url') || BASE_URL;

  var headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  if (options.headers) {
    Object.keys(options.headers).forEach(function(key) {
      headers[key] = options.headers[key];
    });
  }

  var fetchOptions = {
    method:  options.method  || 'GET',
    body:    options.body    || null,
    headers: headers
  };

  return fetch(activeBase + endpoint, fetchOptions)
    .catch(function(err) {
      /* Si falla el primer dominio con error de red, intentar con el alternativo */
      var altBase = (activeBase === BASE_URL) ? FALLBACK_URL : BASE_URL;
      console.warn('Fallo con ' + activeBase + ', probando ' + altBase, err);
      return fetch(altBase + endpoint, fetchOptions).then(function(res) {
        BASE_URL = altBase;
        localStorage.setItem('api_base_url', altBase);
        return res;
      });
    })
    .then(function(response) {
      if (response.status === 401) {
        sessionStorage.clear();
        var esEnPages = window.location.pathname.indexOf('/pages/') !== -1;
        window.location.href = esEnPages ? '../index.html' : 'index.html';
        return Promise.reject(new Error('Sesión expirada'));
      }
      return response;
    });
}

/* ---------------------------------------------------------
   apiFetchPublic – Petición pública sin autenticación
   --------------------------------------------------------- */
function apiFetchPublic(endpoint, options) {
  options = options || {};
  var activeBase = localStorage.getItem('api_base_url') || BASE_URL;

  var headers = {
    'Content-Type': 'application/json',
    'X-Empresa-Id': EMPRESA_ID
  };

  if (options.headers) {
    Object.keys(options.headers).forEach(function(key) {
      headers[key] = options.headers[key];
    });
  }

  var fetchOptions = {
    method:  options.method || 'POST',
    body:    options.body   || null,
    headers: headers
  };

  return fetch(activeBase + endpoint, fetchOptions)
    .catch(function(err) {
      var altBase = (activeBase === BASE_URL) ? FALLBACK_URL : BASE_URL;
      console.warn('Fallo con ' + activeBase + ', probando ' + altBase, err);
      return fetch(altBase + endpoint, fetchOptions).then(function(res) {
        BASE_URL = altBase;
        localStorage.setItem('api_base_url', altBase);
        return res;
      });
    });
}

/* ---------------------------------------------------------
   parseResponse – Parsear respuesta JSON de forma segura
   
   Convierte la respuesta fetch a JSON y lanza error
   con el mensaje del backend si la respuesta no es OK.
   --------------------------------------------------------- */
function parseResponse(response) {
  /* Intentar parsear JSON de la respuesta */
  return response.json().then(function(data) {
    /* Si la respuesta fue exitosa, retornar datos */
    if (response.ok) {
      return data;
    }
    /* Si hubo error, lanzar con el mensaje del backend */
    var mensaje = data.message
      || data.Message
      || data.title
      || data.error
      || 'Error en la operación';
    
    /* Si hay errores de validación, concatenarlos */
    if (data.errors) {
      var errores = [];
      Object.keys(data.errors).forEach(function(campo) {
        if (Array.isArray(data.errors[campo])) {
          errores = errores.concat(data.errors[campo]);
        }
      });
      if (errores.length > 0) mensaje = errores.join(' | ');
    }
    return Promise.reject(new Error(mensaje));
  }).catch(function(err) {
    /* Si la respuesta no tiene body JSON válido */
    if (err instanceof SyntaxError) {
      if (response.ok) return {};
      return Promise.reject(new Error('Error ' + response.status + ': ' + response.statusText));
    }
    return Promise.reject(err);
  });
}
