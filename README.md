# Sistema de Registro y Seguimiento de Acciones Climáticas (ODS 13)
https://prototipo-ods13.web.app

Prototipo funcional de alta fidelidad. Universidad Fidélitas — **SC-302 Documentación
del Software**, proyecto final integrador, subgrupo G6.

Una persona registra las acciones sostenibles que ya hace —reciclar, moverse sin
carro, ahorrar agua o electricidad— y el sistema le devuelve, en kilos de CO₂ que no
llegaron al aire, cuánto pesa eso de verdad.

No es un mockup navegable: es la aplicación funcionando. Calcula, guarda, valida y
persiste contra Firebase.

---

## Cómo abrirlo

Cualquier servidor estático sirve. No hay que compilar ni instalar dependencias.

```bash
python -m http.server 8777
```

Y abrir <http://localhost:8777>.

> Hace falta un servidor: la aplicación usa módulos ES y el navegador los bloquea si
> se abre el `index.html` con doble clic (`file://`).

Si Firebase no responde en cuatro segundos, arranca solo en **modo local** con datos
simulados guardados en el navegador. El prototipo nunca se queda en blanco.

---

## Trazabilidad: requerimiento → caso de uso → pantalla → validación

Los requerimientos funcionales **RF-01 a RF-10** del Avance 2 corresponden uno a uno
con los casos de uso **UC1 a UC10** del Avance 3. Cada uno tiene al menos una
validación en el prototipo, como pide el Avance 4.

| RF | Caso de uso | Ruta | Archivo | Validación |
|----|-------------|------|---------|-----------|
| RF-01 | Registrarse | `#/registro` | `screens/auth.js` | Nombre y apellido · formato de correo · clave ≥ 8 · las dos claves coinciden |
| RF-02 | Iniciar sesión | `#/acceso` | `screens/auth.js` | Correo con formato válido · contraseña obligatoria |
| RF-03 | Visualizar información ambiental | `#/inicio` | `screens/inicio.js` | Si el contenido educativo llega vacío, se avisa y se ofrece reintentar |
| RF-04 | Registrar acción sostenible | `#/nueva-accion` | `screens/accion.js` | Cantidad mayor que cero · confirmación al desbloquear una insignia |
| RF-05 | Consultar progreso personal | `#/progreso` | `screens/progreso.js` | Confirmación antes de borrar un registro |
| RF-06 | Recibir notificaciones y recordatorios | `#/notificaciones` | `screens/notificaciones.js` | Hora obligatoria si el recordatorio está activo · confirmar antes de apagar todos los avisos |
| RF-07 | Recibir insignia o logro | `#/insignias` | `screens/insignias.js` | Una insignia bloqueada informa cuánto falta y que no se puede reclamar |
| RF-08 | Ver comparativa comunitaria | `#/comunidad` | `screens/comunidad.js` | Mínimo de tres participantes; con menos, la comparación no informa ni es anónima |
| RF-09 | Generar reporte de emisiones estimadas | `#/reporte` | `screens/reporte.js` | Se bloquea generar o imprimir si el periodo no tiene registros |
| RF-10 | Editar perfil de usuario | `#/perfil` | `screens/perfil.js` | Nombre · correo · meta mayor que cero · contraseña actual y nueva · confirmar el borrado de la cuenta |

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

El reparto de la comunidad simulada es deliberado: San José, Alajuela, Heredia y
Cartago superan el mínimo de participantes y muestran la tabla; Puntarenas, Guanacaste
y Limón no lo alcanzan y disparan la validación. Los dos comportamientos se pueden
enseñar en vivo.

Con una **cuenta nueva sin datos de ejemplo** (desmarcando la casilla al registrarse):

| Validación | Dónde se ve |
|---|---|
| RF-03 sin contenido | Inicio: el bosque y el cubo explican que todavía no hay nada, e invitan a registrar |
| RF-09 periodo sin datos | Mi reporte: Descargar e Imprimir quedan bloqueados y explican por qué |

Una cuenta vacía es además la mejor forma de enseñar los estados iniciales de UC3 y
UC5, que con la cuenta de demostración nunca se ven.

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
evita 8,14 kg de CO₂; un kilómetro en autobús, 0,103 kg. El cálculo se muestra
desglosado mientras se escribe: ver la fórmula, y no solo el resultado, es lo que
convierte el registro en educación ambiental.

El factor eléctrico es deliberadamente bajo (0,035 kg/kWh) porque la matriz eléctrica
del país es casi totalmente renovable.

> Los factores son valores de referencia académica para el prototipo. No provienen de
> un inventario oficial de gases de efecto invernadero, y las cantidades las declara
> la persona usuaria sin verificación externa.

---

## Las tres escenas en 3D

Los kilos de CO₂ no le dicen nada a nadie. El volumen sí.

| Escena | Dónde | Qué muestra |
|--------|-------|-------------|
| **Tu bosque** | UC3 Inicio | Un árbol por acción registrada, en espiral de ángulo áureo. El color de la copa dice de qué categoría vino |
| **El tamaño de lo que no emitiste** | UC3 Inicio | El CO₂ evitado como el cubo de aire que ocuparía a escala real, junto a una figura de 1,70 m |
| **El podio** | UC8 Comunidad | El ranking anónimo como columnas cuya altura es el CO₂ evitado |

Las tres se giran arrastrando. Si el navegador no tiene WebGL, cada una muestra la
misma información en texto: la pantalla nunca queda con un hueco.

---

## Estructura

```
index.html               Orden de carga: núcleo → pantallas → enrutador → escenas → Firebase
assets/
  css/
    tokens.css           Color, tipografía, espaciado. Ninguna pantalla declara un color a mano
    base.css             Reinicio y elementos HTML
    layout.css           Armazón: barra lateral, cabecera, rejillas
    components.css       Lo que se repite en dos o más pantallas
    screens.css          Lo propio de una sola pantalla
  js/
    icons.js             Set de iconos SVG de trazo. Nunca emojis
    data.js              Capa de datos y glosario. Sustituye al backend Node + MySQL
    ui.js                Avisos, modales, validación de formularios, glosario en línea
    charts.js            Gráficos (Chart.js)
    fiesta.js            Confeti y contadores ascendentes
    vista3d.js           Base común de las escenas 3D: lienzo, cámara, giro, limpieza
    escena3d.js          El cubo de CO₂
    bosque3d.js          El bosque
    podio3d.js           El podio de la comunidad
    router.js            Enrutado por fragmento y armazón de la aplicación
    explicador.js        "¿Cómo funciona?", cuatro pasos
    presentacion.js      Modo presentación
    app.js               Punto de entrada
    nube.js              Firebase Authentication + Cloud Firestore
    screens/             Una pantalla por caso de uso (nueve archivos, UC1 y UC2 comparten auth.js)
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

El actor secundario **Temporizador** del Avance 3 —el que dispara las notificaciones
automáticas— se puede ejecutar a mano desde la pantalla de Notificaciones, para poder
demostrar UC6 sin esperar a que llegue la hora.

Sin dependencias de construcción. Nada de `npm install`, nada que compilar.

---

## Accesibilidad

- Navegación completa por teclado, con foco visible y enlace de salto al contenido.
- El cambio de pantalla se anuncia a los lectores de pantalla mediante una región viva.
- Las escenas 3D llevan `role="img"` con una descripción textual de lo que representan.
- Todo el movimiento —confeti, contadores, giro de las escenas— se desactiva con
  `prefers-reduced-motion`, y el dato final aparece igual.
- Los colores sobre fondo oscuro se eligieron comprobando su contraste: la paleta
  distingue variantes específicas para fondos claros y oscuros (`--azul-bright`,
  `--ember-bright`) en lugar de reutilizar el mismo tono en ambos.

---

## Glosario

La aplicación explica su propio vocabulario. Los términos técnicos —CO₂ evitado,
factor de emisión, huella de carbono, racha, ODS 13— llevan un botón que abre la
definición sin sacar a nadie de la pantalla. Ninguna definición usa otra palabra que
también haya que buscar.

Quien entra por primera vez recibe además un recorrido de cuatro pasos: qué mide la
aplicación, de dónde sale el número, por qué un bosque y qué hacer ahora. Queda
disponible después en el botón **¿Cómo funciona?** de la barra superior.
