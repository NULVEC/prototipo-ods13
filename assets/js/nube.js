/* ============================================================================
   nube.js — Capa de Firebase (Authentication + Cloud Firestore).

   Es el único archivo que habla con la red y el único módulo ES del proyecto;
   el resto sigue siendo JavaScript clásico. Por eso expone su API en
   `window.Nube` y arranca la aplicación cuando ya sabe si hay sesión.

   Si Firebase no carga —sin conexión, o al abrir el archivo con doble clic,
   donde el navegador bloquea los módulos— la aplicación no se rompe: arranca
   en modo local con los datos simulados de `data.js`.

   Modelo de datos en Firestore
   ----------------------------
     usuarios/{uid}                      perfil (clase Usuario)
     usuarios/{uid}/registros/{id}       clase RegistroAccion
     usuarios/{uid}/notificaciones/{id}  clase Notificacion
     usuarios/{uid}/logros/{insignia}    clase LogroUsuario
     comunidad/{uid}                     solo alias, provincia y totales (UC8)

   La colección `comunidad` es la única legible por terceros y no contiene
   nombre ni correo: es lo que hace posible la comparativa anónima.
   ========================================================================= */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  verifyBeforeUpdateEmail, deleteUser, updateProfile
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

/* --------------------------------------------------------------------------
   Configuración del proyecto.
   La apiKey de Firebase Web es un identificador público, no un secreto: viaja
   en el cliente por diseño. Lo que protege los datos son las reglas de
   seguridad de `firestore.rules`, no ocultar esta clave.
   ----------------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: 'AIzaSyBtGDkeQuscm2qrx6T6NsmPXcFdxWkxC6U',
  authDomain: 'prototipo-ods13.firebaseapp.com',
  projectId: 'prototipo-ods13',
  storageBucket: 'prototipo-ods13.firebasestorage.app',
  messagingSenderId: '907557809303',
  appId: '1:907557809303:web:dd955da2a5c3952b558dd2'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================================================================
   Traducción de errores
   Firebase devuelve códigos; la interfaz debe decir qué pasó y qué hacer.
   ========================================================================== */
const MENSAJES = {
  'auth/email-already-in-use':  'Ya hay una cuenta con ese correo. Entrá con ella o usá otra dirección.',
  'auth/invalid-email':         'El correo no tiene un formato válido.',
  'auth/weak-password':         'Esa contraseña es muy débil. Poné al menos ocho caracteres.',
  'auth/invalid-credential':    'El correo o la contraseña no coinciden con ninguna cuenta.',
  'auth/wrong-password':        'La contraseña no es correcta.',
  'auth/user-not-found':        'No hay ninguna cuenta registrada con ese correo.',
  'auth/user-disabled':         'Esta cuenta está deshabilitada. Escribile a quien administra el sistema.',
  'auth/too-many-requests':     'Demasiados intentos seguidos. Esperá unos minutos y probá otra vez.',
  'auth/network-request-failed':'No hay conexión con el servidor. Revisá tu red y probá de nuevo.',
  'auth/requires-recent-login': 'Por seguridad, volvé a iniciar sesión antes de hacer este cambio.',
  'auth/operation-not-allowed': 'El acceso por correo y contraseña no está habilitado en el proyecto de Firebase.',
  'auth/configuration-not-found':
    'Falta activar Authentication en el proyecto de Firebase y habilitar el proveedor de correo y contraseña.',
  'auth/unauthorized-domain':
    'Este dominio no está autorizado en Firebase Authentication. Hay que agregarlo en Authentication → Settings → Authorized domains.',
  'auth/api-key-not-valid': 'La clave de API del proyecto no sirve. Hay que revisar la configuración en nube.js.',
  'permission-denied':          'Las reglas de seguridad no permiten esta operación.',
  'unavailable':                'No hay conexión con la base de datos. Tus cambios se guardan apenas vuelva.',
  'failed-precondition':        'La base de datos de Firestore todavía no está creada en el proyecto.'
};

function traducir(e) {
  const codigo = (e && e.code ? e.code : '').replace('firestore/', '');
  return MENSAJES[codigo] || (e && e.message) || 'Ocurrió un error inesperado.';
}

/* ==========================================================================
   Lectura del usuario completo
   Se descarga todo de una vez al iniciar sesión y se vuelca en `DB.state`.
   Así las diez pantallas siguen siendo síncronas y responden al instante;
   las escrituras van a Firestore en segundo plano.
   ========================================================================== */
async function cargarTodo(uid) {
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  const perfil = perfilSnap.exists() ? perfilSnap.data() : null;

  const [regsSnap, notisSnap, logrosSnap, articulos] = await Promise.all([
    getDocs(query(collection(db, 'usuarios', uid, 'registros'), orderBy('fecha', 'desc'), limit(1000))),
    getDocs(query(collection(db, 'usuarios', uid, 'notificaciones'), orderBy('fecha', 'desc'), limit(100))),
    getDocs(collection(db, 'usuarios', uid, 'logros')),
    cargarArticulos()
  ]);

  return {
    perfil,
    registros: regsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    notificaciones: notisSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    logros: logrosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    articulos
  };
}

/* --------------------------------------------------------------------------
   Contenido ambiental del UC3 (clase InformacionAmbiental).

   Un solo documento con la lista completa, no una colección con un documento
   por artículo. La pantalla siempre los necesita todos y en orden; con un
   documento es una lectura y el orden es el del arreglo, mientras que con una
   colección serían N lecturas más un campo de posición que hay que mantener a
   mano cada vez que se reordena.

   Lo lee cualquier cuenta autenticada y lo escribe solo un administrador. Eso
   no lo decide este archivo: lo decide `firestore.rules`.
   ----------------------------------------------------------------------- */
async function cargarArticulos() {
  try {
    const snap = await getDoc(doc(db, 'contenido', 'ambiental'));
    const lista = snap.exists() ? snap.data().articulos : null;
    return Array.isArray(lista) ? lista : null;
  } catch (e) {
    // Si no se puede leer, la pantalla usa el contenido de fábrica.
    console.warn('No se pudo leer el contenido ambiental:', traducir(e));
    return null;
  }
}

async function guardarArticulos(lista) {
  await setDoc(doc(db, 'contenido', 'ambiental'), {
    articulos: lista,
    actualizado: serverTimestamp(),
    actualizadoPor: auth.currentUser?.email || null
  });
}

/** Retira una fila de la comparativa comunitaria (moderación). */
async function retirarDeComunidad(uid) {
  await deleteDoc(doc(db, 'comunidad', uid));
}

/** Participantes de la comparativa comunitaria (UC8), sin datos personales. */
async function cargarComunidad() {
  try {
    const snap = await getDocs(query(collection(db, 'comunidad'), orderBy('co2', 'desc'), limit(50)));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.warn('No se pudo leer la comunidad:', traducir(e));
    return [];
  }
}

/* ==========================================================================
   Escrituras
   ========================================================================== */

async function guardarPerfil(uid, perfil) {
  await setDoc(doc(db, 'usuarios', uid), perfil, { merge: true });
  await publicarEnComunidad(uid, perfil);
}

/**
 * Publica solo lo que la comparativa necesita: alias, provincia y totales.
 *
 * Respeta los dos ajustes de privacidad del UC10, y los respeta AQUÍ porque
 * este es el único sitio por donde salen datos a la colección compartida. Si
 * el filtro viviera en la pantalla, cualquier camino que no pasara por ella
 * —guardar el perfil, registrar una acción— volvería a publicar la fila de
 * alguien que había pedido salirse.
 */
async function publicarEnComunidad(uid, perfil, totales) {
  if (DB.state.usuario.enComunidad === false) return;

  const t = totales || {
    co2: +DB.sumaCO2(DB.state.registros).toFixed(1),
    acciones: DB.state.registros.length
  };
  await setDoc(doc(db, 'comunidad', uid), {
    alias: perfil.alias,
    zona: DB.state.usuario.mostrarProvincia === false ? '—' : (perfil.provincia || '—'),
    co2: t.co2,
    acciones: t.acciones,
    actualizado: serverTimestamp()
  });
}

async function agregarRegistro(uid, reg) {
  const { id, ...datos } = reg;
  await setDoc(doc(db, 'usuarios', uid, 'registros', id), { ...datos, creado: serverTimestamp() });
  await publicarEnComunidad(uid, DB.state.usuario);
}

async function eliminarRegistro(uid, id) {
  await deleteDoc(doc(db, 'usuarios', uid, 'registros', id));
  await publicarEnComunidad(uid, DB.state.usuario);
}

async function marcarNotificaciones(uid, ids) {
  const lote = writeBatch(db);
  ids.forEach(id => lote.update(doc(db, 'usuarios', uid, 'notificaciones', id), { leida: true }));
  await lote.commit();
}

async function crearNotificacion(uid, n) {
  const { id, ...datos } = n;
  await setDoc(doc(db, 'usuarios', uid, 'notificaciones', id), datos);
}

async function registrarLogro(uid, insigniaId, nombre) {
  await setDoc(doc(db, 'usuarios', uid, 'logros', insigniaId), {
    nombre, fecha: new Date().toISOString()
  });
}

/* ==========================================================================
   Alta de cuenta y siembra de datos de ejemplo
   ========================================================================== */

/**
 * Escribe el historial de demostración de una cuenta nueva. Es opcional: la
 * pantalla de registro deja decidir si se quiere una cuenta vacía o una con
 * noventa días de actividad para poder recorrer todas las pantallas.
 * Firestore admite 500 operaciones por lote, así que se trocea.
 */
async function sembrarEjemplo(uid, registros, notificaciones) {
  const items = [
    ...registros.map(r => ({ ref: doc(db, 'usuarios', uid, 'registros', r.id), datos: (({ id, ...d }) => d)(r) })),
    ...notificaciones.map(n => ({ ref: doc(db, 'usuarios', uid, 'notificaciones', n.id), datos: (({ id, ...d }) => d)(n) }))
  ];
  for (let i = 0; i < items.length; i += 400) {
    const lote = writeBatch(db);
    items.slice(i, i + 400).forEach(x => lote.set(x.ref, x.datos));
    await lote.commit();
  }
}

/* `createUserWithEmailAndPassword` abre la sesión antes de resolver, así que el
   observador de sesión llega a ejecutarse mientras todavía se escriben el perfil
   y el historial. Esta puerta se abre ANTES de crear la cuenta —si se abriera
   después, el observador ya habría pasado— y el observador la espera antes de
   descargar nada. Sin esto, el panel aparece vacío recién creada la cuenta. */
let altaEnCurso = null;

async function crearCuenta({ correo, clave, nombre, provincia, conEjemplo }) {
  let listo;
  altaEnCurso = new Promise(res => { listo = res; });

  try {
    const cred = await createUserWithEmailAndPassword(auth, correo, clave);
    const uid = cred.user.uid;

    await updateProfile(cred.user, { displayName: nombre });

    const perfil = DB.perfilNuevo({ uid, nombre, correo, provincia });
    await setDoc(doc(db, 'usuarios', uid), perfil);

    let totales = { co2: 0, acciones: 0 };
    if (conEjemplo) {
      const ejemplo = DB.datosDeEjemplo();
      await sembrarEjemplo(uid, ejemplo.registros, ejemplo.notificaciones);
      totales = {
        co2: +ejemplo.registros.reduce((a, r) => a + r.co2, 0).toFixed(1),
        acciones: ejemplo.registros.length
      };
    }
    await publicarEnComunidad(uid, perfil, totales);
    return cred.user;
  } finally {
    // La puerta se abre pase lo que pase: si el alta falla, un acceso
    // posterior no debe quedarse esperando para siempre.
    listo();
  }
}

/* ==========================================================================
   Operaciones sobre la propia cuenta (UC10)
   ========================================================================== */

async function reautenticar(claveActual) {
  const u = auth.currentUser;
  if (!u) throw { code: 'auth/user-not-found' };
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, claveActual));
}

async function cambiarClave(claveActual, claveNueva) {
  await reautenticar(claveActual);
  await updatePassword(auth.currentUser, claveNueva);
}

/** El correo no cambia hasta que la persona confirma desde el correo nuevo. */
async function cambiarCorreo(correoNuevo) {
  await verifyBeforeUpdateEmail(auth.currentUser, correoNuevo);
}

async function borrarCuenta(claveActual) {
  const uid = auth.currentUser.uid;
  await reautenticar(claveActual);
  // Se borran primero los datos: al eliminar la cuenta se pierde el permiso.
  for (const sub of ['registros', 'notificaciones', 'logros']) {
    const snap = await getDocs(collection(db, 'usuarios', uid, sub));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const lote = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach(d => lote.delete(d.ref));
      await lote.commit();
    }
  }
  await deleteDoc(doc(db, 'comunidad', uid));
  await deleteDoc(doc(db, 'usuarios', uid));
  await deleteUser(auth.currentUser);
}

/* ==========================================================================
   API pública
   ========================================================================== */
window.Nube = {
  disponible: true,
  traducir,
  uid: () => auth.currentUser?.uid || null,
  correo: () => auth.currentUser?.email || null,
  crearCuenta,
  entrar: (correo, clave) => signInWithEmailAndPassword(auth, correo, clave),
  salir: () => signOut(auth),
  recuperarClave: correo => sendPasswordResetEmail(auth, correo),
  cargarTodo, cargarComunidad, cargarArticulos,
  guardarPerfil, publicarEnComunidad,
  agregarRegistro, eliminarRegistro,
  marcarNotificaciones, crearNotificacion, registrarLogro,
  cambiarClave, cambiarCorreo, borrarCuenta,
  // Solo funcionan para un administrador: las reglas rechazan al resto.
  guardarArticulos, retirarDeComunidad
};

/* ==========================================================================
   Arranque
   La aplicación no se dibuja hasta saber si hay sesión: así se evita el
   parpadeo de mostrar la pantalla de acceso a alguien que ya entró.
   ========================================================================== */
let primeraVez = true;

onAuthStateChanged(auth, async usuario => {
  try {
    if (usuario) {
      // Si hay un alta a medio escribir, se espera antes de leer.
      if (altaEnCurso) { await altaEnCurso; altaEnCurso = null; }
      const datos = await cargarTodo(usuario.uid);
      const comunidad = await cargarComunidad();
      DB.iniciarNube(usuario.uid, usuario.email, datos, comunidad);
    } else {
      DB.cerrarNube();
    }
  } catch (e) {
    console.error('Firebase:', e);
    // Un fallo de datos no debe dejar la pantalla en blanco: se sigue en local.
    DB.usarLocal();
    window.UI?.toast('Sin acceso a la base de datos', traducir(e), 'error', 9000);
  }

  /* Tras entrar o crear la cuenta, la ruta actual sigue siendo pública
     (#/acceso o #/registro). Hay que llevar a la persona adentro; si no,
     se quedaría mirando el formulario que acaba de completar. */
  const rutaActual = location.hash.replace(/^#/, '');
  const enPublica = ['/acceso', '/registro', ''].includes(rutaActual);

  if (primeraVez) {
    primeraVez = false;
    Aplicacion.arrancar('nube');
    if (usuario && enPublica) Router.ir('/inicio');
  } else if (usuario && enPublica) {
    Router.ir('/inicio');
  } else {
    Router.resolver();
  }
});
