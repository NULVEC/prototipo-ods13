# Sistema de Registro y Seguimiento de Acciones Climáticas (ODS 13)

<https://prototipo-ods13.web.app>

Prototipo funcional de alta fidelidad. Universidad Fidélitas — **SC-302 Documentación
del Software**, proyecto final integrador, subgrupo G6.

Una persona registra las acciones sostenibles que ya hace —reciclar, moverse sin
carro, ahorrar agua o electricidad— y el sistema le devuelve, en kilos de CO₂ que no
llegaron al aire, cuánto pesa eso de verdad.

No es un mockup navegable: es la aplicación funcionando. Calcula, guarda, valida y
persiste contra Firebase.

---

## Cómo abrirlo

Está publicado y no hace falta instalar nada:

### **<https://prototipo-ods13.web.app>**

Para correrlo en la máquina, cualquier servidor estático sirve. No hay que compilar ni
instalar dependencias.

```bash
python -m http.server 8777
```

Y abrir <http://localhost:8777>.

> Hace falta un servidor: la aplicación usa módulos ES y el navegador los bloquea si
> se abre el `index.html` con doble clic (`file://`).

Si Firebase no responde en cuatro segundos, arranca solo en **modo local** con datos
simulados guardados en el navegador. El prototipo nunca se queda en blanco.

---

## Cómo se publica

Cada push a `main` dispara `.github/workflows/desplegar.yml`, que primero comprueba y
después despliega:

| Paso | Qué hace |
|---|---|
| Verificar | Sintaxis de los 30 archivos de JavaScript, validez de los JSON y que exista cada archivo que carga `index.html` |
| Desplegar | `firebase deploy --only hosting,firestore:rules` |
| Comprobar | Que el sitio publicado devuelva 200 |

Las dos cosas que despliega importan por igual. **Publicar solo los archivos estáticos
no basta**: `firestore.rules` es lo que hace cumplir los permisos del lado del
servidor, así que si se quedara fuera, editar las reglas cambiaría el archivo del
repositorio mientras las reglas en vivo siguen siendo las viejas — sin que nada avise.
Por eso el despliegue va a Firebase y no a GitHub Pages, que solo sirve archivos.

El workflow necesita un secreto del repositorio, `FIREBASE_SERVICE_ACCOUNT`, con la
clave JSON de una cuenta de servicio que tenga los papeles **Firebase Hosting Admin** y
**Firebase Rules Admin**. Sin él el paso de despliegue falla con ese mensaje en lugar de
quedarse en verde sin haber publicado nada.

Para desplegar a mano, desde la máquina:

```bash
firebase deploy --only hosting,firestore:rules
```

---

## Cómo se usa en treinta segundos

| Quiero | Cómo |
|---|---|
| Ir a cualquier parte | **Ctrl + K** (⌘ + K en Mac) y escribir |
| Registrar algo concreto | Ctrl + K → «autobús» → Enter. El formulario se abre con el tipo puesto y el cursor en la cantidad |
| Cambiar a tema oscuro | El botón de la barra superior. Tres estados: automático, claro, oscuro |
| Recorrer los casos de uso en una defensa | La tecla **P**, y después `→` y `←` |
| Llevarme mis datos | Perfil → Tus datos → CSV o JSON |

---

## Permisos

Hay dos papeles, y la diferencia no es cosmética.

| Papel | Quién | Qué puede hacer de más |
|---|---|---|
| **Participante** | cualquier cuenta | registrar, consultar y editar **lo suyo** |
| **Administrador** | `ecoto70818@ufide.ac.cr` | publicar la información ambiental del UC3, retirar filas de la comparativa del UC8 y auditar los factores de emisión |

### De dónde sale el papel, y por qué importa

Del **correo del token de Firebase Authentication**, que firma Firebase y el cliente no
puede alterar.

Lo que *no* se hizo, a propósito: guardar `rol: "admin"` en el documento del usuario.
Las reglas le dan a cada persona permiso de escritura sobre su propio perfil —lo
necesita para el UC10—, así que cualquiera podría escribirse ese campo y ascenderse
solo. Un permiso tiene que apoyarse en algo que el cliente no controle.

La comprobación está en **los dos lados**, y el que manda es el segundo:

- `data.js` decide qué se dibuja, para no ofrecer un botón que después va a fallar.
- `firestore.rules` decide qué se escribe. Esconder un botón no es un permiso: si
  alguien llama a la API a mano, lo que lo detiene son las reglas.

Además el perfil rechaza cualquier campo llamado `rol`, `roles`, `admin` o `permisos`,
para que no quede en la base un campo que parezca conceder algo y despiste a quien la
lea después.

> En producción esto se haría con un *custom claim* del Admin SDK, que evita la lista
> escrita a mano. Requiere un proceso de servidor y este proyecto no tiene ninguno:
> corre entero en el navegador. El correo del token es la alternativa correcta bajo esa
> restricción.

### Qué administra el administrador

1. **La información ambiental del UC3.** Hasta ahora esas fichas eran una constante
   dentro del código, así que la frase del Avance 3 —«el sistema muestra información
   ambiental»— no tenía a nadie detrás que la mantuviera. Lo que se publique en el
   panel es lo que ve todo el mundo al entrar. No deja publicar una ficha sin cifra,
   sin titular, sin explicación o sin fuente.
2. **La comparativa comunitaria del UC8.** Puede *retirar* una fila —un alias
   ofensivo, una cifra absurda—, y nada más. No puede editar la cifra de nadie: eso
   convertiría el ranking en una opinión.
3. **La auditoría de los factores de emisión.** Qué factores están contrastados contra
   su fuente publicada y cuáles no. Se puede descargar en CSV.

Lo que **no** puede hacer, y es deliberado: leer los registros de otra persona. Las
reglas no lo permiten y no se les va a abrir una excepción. El UC8 promete anonimato;
un panel que lo rompiera volvería falsa esa promesa en toda la aplicación.

En modo local no hay token que firme nada, así que el panel se puede abrir para
demostrarlo pero lo dice en voz alta: **«Sin verificar»**.

---

## Trazabilidad: requerimiento → caso de uso → pantalla → validación

Los requerimientos funcionales **RF-01 a RF-10** del Avance 2 corresponden uno a uno
con los casos de uso **UC1 a UC10** del Avance 3. Cada uno tiene al menos una
validación en el prototipo, como pide el Avance 4.

| RF | Caso de uso | Ruta | Archivo | Validación |
|----|-------------|------|---------|-----------|
| RF-01 | Registrarse | `#/registro` | `screens/auth.js` | Nombre y apellido · formato de correo · clave ≥ 8 · las dos claves coinciden |
| RF-02 | Iniciar sesión | `#/acceso` | `screens/auth.js` | Correo con formato válido · contraseña obligatoria |
| RF-03 | Visualizar información ambiental | `#/inicio` | `screens/inicio.js` | Si el contenido llega vacío, se avisa y se ofrece reintentar; y el panel de administración no deja publicar una ficha incompleta |
| RF-04 | Registrar acción sostenible | `#/nueva-accion` | `screens/accion.js` | Cantidad mayor que cero · fecha entre la creación de la cuenta y hoy · confirmación al desbloquear una insignia |
| RF-05 | Consultar progreso personal | `#/progreso` | `screens/progreso.js` | Confirmación antes de borrar un registro · estado inicial propio cuando no hay ninguno |
| RF-06 | Recibir notificaciones y recordatorios | `#/notificaciones` | `screens/notificaciones.js` | Hora obligatoria si el recordatorio está activo · confirmar antes de apagar todos los avisos |
| RF-07 | Recibir insignia o logro | `#/insignias` | `screens/insignias.js` | Una insignia bloqueada informa cuánto falta y que no se puede reclamar |
| RF-08 | Ver comparativa comunitaria | `#/comunidad` | `screens/comunidad.js` | Mínimo de tres participantes; con menos, la comparación no informa ni es anónima |
| RF-09 | Generar reporte de emisiones estimadas | `#/reporte` | `screens/reporte.js` | Se bloquea generar o imprimir si el periodo no tiene registros |
| RF-10 | Editar perfil de usuario | `#/perfil` | `screens/perfil.js` | Nombre · correo · meta mayor que cero · contraseña actual y nueva · confirmar el borrado de la cuenta |
| — | Administración | `#/admin` | `screens/admin.js` | La ruta exige la capacidad `admin.entrar`; sin ella redirige y explica por qué |

### Relaciones del diagrama de casos de uso

- **`include`** — UC4, UC5, UC8 y UC10 incluyen UC2: el enrutador redirige a `#/acceso`
  cualquier ruta privada sin sesión abierta (`router.js`).
- **`include`** — UC5 incluye UC9: el resumen de avance siempre enlaza el cálculo de
  CO₂ evitado.
- **`extend`** — UC7 extiende UC4: la insignia solo se otorga si el registro recién
  guardado alcanza una meta (`screens/accion.js`).

### Cómo ver cada validación

Con la cuenta de demostración (la que trae noventa días de actividad):

| Validación | Cómo provocarla |
|---|---|
| RF-01 / RF-02 / RF-10 | Enviar cualquiera de los formularios con un campo vacío o mal escrito |
| RF-04 cantidad inválida | Registrar una acción con cantidad cero o en blanco |
| RF-05 borrado | Pulsar el basurero de cualquier fila del historial |
| RF-06 hora obligatoria | En Notificaciones, dejar el recordatorio activo y borrar la hora |
| RF-06 apagar todo | Apagar los cuatro interruptores y guardar |
| RF-07 insignia bloqueada | Tocar cualquier insignia gris del catálogo |
| RF-08 pocos participantes | Filtrar la comunidad por **Puntarenas**, **Guanacaste** o **Limón** |
| RF-08 salirse | Perfil → Privacidad → apagar «Participar en la comparativa» |
| Permisos | Pedir `#/admin` sin ser administrador |

El reparto de la comunidad simulada es deliberado: San José, Alajuela, Heredia y
Cartago llegan al mínimo de participantes y muestran la tabla; Puntarenas, Guanacaste
y Limón no lo alcanzan y disparan la validación. Los dos comportamientos se pueden
enseñar en vivo.

Con una **cuenta nueva sin datos de ejemplo** (desmarcando la casilla al registrarse):

| Validación | Dónde se ve |
|---|---|
| RF-03 sin contenido | Inicio: el bosque y el cubo explican que todavía no hay nada, e invitan a registrar |
| RF-05 sin registros | Mi progreso: explica qué va a medir en cuanto haya un registro, en lugar de mostrar ceros |
| RF-09 periodo sin datos | Mi reporte: Descargar e Imprimir quedan bloqueados y explican por qué |

### Modo presentación

Con la tecla **P** la aplicación se recorre con `→` y `←`, en el orden UC3 → UC10, y
una barra al pie indica en qué caso de uso se está. Pensado para la defensa: permite
mostrar el recorrido completo sin buscar en el menú.

---

## Cómo se calcula el CO₂

```
cantidad registrada  ×  factor de emisión  =  kg de CO₂ evitados
```

El factor sale del catálogo de acciones (`data.js`). Reciclar un kilo de aluminio
evita 10,086 kg de CO₂; un kilómetro en autobús, 0,098 kg. El glosario y el recorrido
de bienvenida citan esas mismas cifras leyéndolas del catálogo, para que no puedan
quedarse viejas si un factor se recalcula. El cálculo se muestra
desglosado mientras se escribe: ver la fórmula, y no solo el resultado, es lo que
convierte el registro en educación ambiental.

El factor eléctrico es deliberadamente bajo (0,0879 kg/kWh) porque la matriz eléctrica
del país es casi totalmente renovable.

> Los factores son valores de referencia académica para el prototipo. No provienen de
> un inventario oficial de gases de efecto invernadero, y las cantidades las declara
> la persona usuaria sin verificación externa.

Cinco factores siguen marcados **«Por verificar»**: los cuatro de agua y el del
vehículo eléctrico. Salen señalados en el reporte y en la auditoría del panel de
administración para que nadie los cite sin confirmarlos.

---

## Las tres escenas en 3D

Los kilos de CO₂ no le dicen nada a nadie. El volumen sí.

| Escena | Dónde | Qué muestra |
|--------|-------|-------------|
| **Tu bosque** | UC3 Inicio | Un árbol por acción registrada, en espiral de ángulo áureo. El color de la copa dice de qué categoría vino |
| **El tamaño de lo que no emitiste** | UC3 Inicio | El CO₂ evitado como el cubo de aire que ocuparía a escala real, junto a una figura de 1,70 m |
| **El podio** | UC8 Comunidad | El ranking anónimo como columnas cuya altura es el CO₂ evitado |

Las tres se giran arrastrando, y se detienen solas: giran unos segundos al aparecer
—lo justo para que se entienda que tienen volumen— y se quedan quietas. Tampoco
dibujan nada cuando su panel está fuera de la pantalla o la pestaña está en segundo
plano. Si el navegador no tiene WebGL, cada una muestra la misma información en
texto: la pantalla nunca queda con un hueco.

---

## Estructura

```
index.html               Orden de carga: núcleo → pantallas → enrutador → escenas → Firebase
manifest.webmanifest     Datos para poder instalarla como aplicación
firestore.rules          Quién puede leer y escribir qué. Es lo que protege los datos
assets/
  icono.svg              Marca del sistema, para el icono de la aplicación
  css/
    tokens.css           Color, tipografía, espaciado y los dos temas. Ninguna pantalla declara un color a mano
    base.css             Reinicio y elementos HTML
    layout.css           Armazón: barra lateral, cabecera, cinta, rejillas
    components.css       Lo que se repite en dos o más pantallas
    screens.css          Lo propio de una sola pantalla
  js/
    tema.js              Claro, oscuro o el del sistema
    icons.js             Set de iconos SVG de trazo. Nunca emojis
    data.js             Capa de datos, permisos y glosario. Sustituye al backend Node + MySQL
    ui.js                Avisos, modales, validación, cinta de carbono, descargas, glosario
    charts.js            Gráficos (Chart.js), con los colores leídos del tema
    fiesta.js            Confeti y contadores ascendentes
    vista3d.js           Base común de las escenas 3D: lienzo, cámara, giro, bucle y limpieza
    escena3d.js          El cubo de CO₂
    bosque3d.js          El bosque
    podio3d.js           El podio de la comunidad
    router.js            Enrutado por fragmento, armazón persistente y guardia de permisos
    paleta.js            Paleta de comandos (Ctrl/⌘ + K)
    explicador.js        "¿Cómo funciona?", cuatro pasos
    presentacion.js      Modo presentación
    app.js               Punto de entrada
    nube.js              Firebase Authentication + Cloud Firestore
    screens/             Una pantalla por caso de uso, más la de administración
  vendor/                Chart.js y three.js, versionados para funcionar sin conexión
```

---

## Arquitectura

El Avance 3 describe un backend Node.js + Express con MySQL y API REST. El prototipo
lo sustituye por una capa de datos en el navegador (`data.js`) que respeta los mismos
nombres del diagrama de clases —`Usuario`, `RegistroAccion`, `AccionSostenible`,
`Insignia`, `LogroUsuario`, `Notificacion`, `InformacionAmbiental`, `ReporteProgreso`—
para que la correspondencia sea directa.

La persistencia real corre sobre **Firebase Authentication** y **Cloud Firestore**.
Las escrituras se replican en segundo plano: la interfaz nunca espera a la red, y si
una escritura falla se avisa sin bloquear la pantalla.

**El armazón se construye una vez.** La barra lateral, la cabecera y la cinta de
carbono no se rehacen al cambiar de pantalla: solo se reemplaza el contenido, y lo que
cambia se actualiza en su sitio. Eso es lo que hace que la navegación no parpadee y
que la cinta no vuelva a animarse en cada clic del menú.

El actor secundario **Temporizador** del Avance 3 —el que dispara las notificaciones
automáticas— se puede ejecutar a mano desde la pantalla de Notificaciones, para poder
demostrar UC6 sin esperar a que llegue la hora.

Sin dependencias de construcción. Nada de `npm install`, nada que compilar.

### Modelo de datos en Firestore

```
usuarios/{uid}                      perfil (clase Usuario)          — privado
usuarios/{uid}/registros/{id}       clase RegistroAccion            — privado
usuarios/{uid}/notificaciones/{id}  clase Notificacion              — privado
usuarios/{uid}/logros/{insignia}    clase LogroUsuario              — privado
comunidad/{uid}                     alias, provincia y totales      — lo leen todas las cuentas
contenido/ambiental                 clase InformacionAmbiental      — lo lee todo el mundo, lo escribe el administrador
```

`comunidad` es la única colección legible por terceros y no contiene nombre ni correo:
es lo que hace posible la comparativa anónima del UC8.

---

## Accesibilidad

- Navegación completa por teclado, con foco visible y enlace de salto al contenido.
- El cambio de pantalla se anuncia a los lectores de pantalla mediante una región viva.
- Las ventanas modales encierran el foco de verdad: con el tabulador no se puede salir
  al contenido de detrás, y el foco arranca en el primer campo, que es lo que la
  persona vino a llenar.
- La cinta de carbono es una figura con descripción de texto, no noventa botones: antes
  ponía noventa paradas de tabulación —que además no hacían nada al pulsarlas— delante
  del contenido de todas las pantallas.
- Las escenas 3D llevan `role="img"` con una descripción textual de lo que representan.
- Todo el movimiento —confeti, contadores, giro de las escenas, transiciones entre
  pantallas— se desactiva con `prefers-reduced-motion`, y el dato final aparece igual.
- Los colores se eligieron comprobando su contraste, en los dos temas. El texto pequeño
  sobre las superficies oscuras usa tres niveles de tinta que pasan AA (15,5:1, 9,9:1 y
  6,2:1); antes eran transparencias del 45 % al 62 % que se quedaban entre 2,8:1 y
  4,5:1, justo en la letra más pequeña de la interfaz.
- En pantallas angostas las tablas se convierten en fichas con el nombre de la columna
  delante de cada dato, en lugar de obligar a arrastrar de lado para leer una fila.

---

## Glosario

La aplicación explica su propio vocabulario. Los términos técnicos —CO₂ evitado,
factor de emisión, huella de carbono, racha, ODS 13— llevan un botón que abre la
definición sin sacar a nadie de la pantalla. Ninguna definición usa otra palabra que
también haya que buscar. También se pueden buscar con Ctrl + K.

Quien entra por primera vez recibe además un recorrido de cuatro pasos: qué mide la
aplicación, de dónde sale el número, por qué un bosque y qué hacer ahora. Queda
disponible después en el botón **¿Cómo funciona?** de la barra superior.
