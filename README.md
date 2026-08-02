# Sistema de Registro y Seguimiento de Acciones Climáticas — ODS 13

Prototipo de alta fidelidad, navegable e interactivo. Cubre los diez casos de uso
(UC1–UC10) definidos en el Avance 3 del proyecto *Acción por el Clima: Estrategias
Sostenibles e Innovadoras en el Marco del ODS 13* (Universidad Fidélitas, SC-302
Documentación del Software).

No hay backend: toda la información proviene de una capa de datos simulada en el
navegador. La navegación entre pantallas se hace con clics reales.

---

## Cómo correrlo

### Opción 1 — abrir el archivo directamente

Doble clic en `index.html`. Funciona porque no se usan módulos ES ni peticiones
`fetch`. Chart.js está incluido en `assets/vendor/`, así que los gráficos también
se dibujan sin conexión. Lo único que necesita internet son las tipografías de
Google Fonts; sin conexión, el navegador usa las tipografías de reserva y el
prototipo sigue siendo funcional.

### Opción 2 — servidor local (recomendada)

Es la forma más fiel al despliegue real y evita cualquier restricción del
protocolo `file://`. Desde la carpeta del proyecto:

```bash
# Con Python (viene instalado en Windows con el instalador oficial)
python -m http.server 8080

# o con Node.js
npx serve .
```

Luego abra <http://localhost:8080>.

### Credenciales de demostración

No hay una cuenta real detrás: **cualquier correo con formato válido y una
contraseña de ocho caracteres o más inician la sesión**.

Para ver el estado de error de la pantalla, que también forma parte del
prototipo, escriba `incorrecta` como contraseña.

La sesión abre siempre con la misma cuenta ficticia de demostración
(*Mariana Solís Vargas*, alias público *Yigüirro-418*), que es la que alimenta
el historial, los gráficos y la comparativa.

---

## Mapa de casos de uso

| Caso de uso | Pantalla                     | Ruta                | Archivo                          |
|-------------|------------------------------|---------------------|----------------------------------|
| UC1         | Registrarse                  | `#/registro`        | `screens/auth.js`                |
| UC2         | Iniciar sesión               | `#/acceso`          | `screens/auth.js`                |
| UC3         | Información ambiental        | `#/inicio`          | `screens/inicio.js`              |
| UC4         | Registrar acción sostenible  | `#/nueva-accion`    | `screens/accion.js`              |
| UC5         | Consultar progreso personal  | `#/progreso`        | `screens/progreso.js`            |
| UC6         | Notificaciones y recordatorios | `#/notificaciones` | `screens/notificaciones.js`      |
| UC7         | Recibir insignia o logro     | `#/insignias`       | `screens/insignias.js`           |
| UC8         | Comparativa comunitaria      | `#/comunidad`       | `screens/comunidad.js`           |
| UC9         | Reporte de emisiones         | `#/reporte`         | `screens/reporte.js`             |
| UC10        | Editar perfil                | `#/perfil`          | `screens/perfil.js`              |

Las relaciones del diagrama de casos de uso están representadas en el prototipo:

- **include** — las ocho pantallas autenticadas redirigen a UC2 si no hay sesión.
  UC5 enlaza de forma permanente con UC9 en su cabecera.
- **extend** — al guardar una acción en UC4, si el registro alcanza una meta, se
  abre la ventana de insignia obtenida (UC7). Solo ocurre en ese caso.
- **Actor secundario (temporizador)** — en UC6, el panel *Temporizador del
  sistema* dispara manualmente lo que en producción ejecutaría el backend por
  SMTP.

---

## Estructura de carpetas

```
prototipo-ods13/
├── index.html                  Único documento: carga estilos, datos y pantallas
├── README.md
└── assets/
    ├── css/
    │   ├── tokens.css          Color, tipografía, espaciado, elevación, movimiento
    │   ├── base.css            Normalización, tipografía base, utilidades, foco
    │   ├── layout.css          Armazón de acceso, armazón de la app, cinta, rejillas
    │   ├── components.css      Botones, formularios, paneles, tablas, avisos, modales
    │   └── screens.css         Reglas propias de una sola pantalla + impresión
    ├── js/
    │   ├── icons.js            Set de iconos SVG de trazo (24×24) y marca del sistema
    │   ├── data.js             Capa de datos simulada (sustituye a Express + MySQL)
    │   ├── ui.js               Avisos, modales, validación, carga, cinta de carbono
    │   ├── charts.js           Configuración de Chart.js con la paleta del sistema
    │   ├── router.js           Enrutador por fragmento, guardia de sesión y armazón
    │   ├── app.js              Arranque
    │   └── screens/            Una pantalla por caso de uso
    └── vendor/
        └── chart.umd.js        Chart.js 4.4.4 (local, para funcionar sin conexión)
```

El orden de carga de las hojas de estilo importa: `tokens → base → layout →
components → screens`. Ninguna pantalla declara colores o tamaños a mano; todos
salen de `tokens.css`.

---

## Decisiones de diseño

**Dirección visual: un instrumento de medición, no un folleto ecológico.**
La aplicación calcula kilogramos de CO₂e, así que se ve como un tablero de
instrumentos: papel milimetrado de fondo, reglas de 1 px en lugar de sombras
difusas, radios pequeños y todo dato numérico en monoespaciado con cifras
tabulares.

**Paleta derivada del contexto costarricense**, no del verde menta genérico:

| Rol | Color | Uso |
|-----|-------|-----|
| Pino | `#17493b` | Color institucional del sistema; barra lateral en `#0c2921` |
| Azul | `#1d4e9b` | Referencia al programa Bandera Azul Ecológica: enlaces, foco, series de datos |
| Ámbar | `#b8862a` / `#7d5a12` | Exclusivo de insignias y logros |
| Brasa | `#b8412a` | Exclusivo de emisiones, alertas y errores |
| Papel | `#e9ebe4` | Fondo de trabajo, tipo cuaderno de laboratorio |

**Tipografía con tres funciones claras.** *Bricolage Grotesque* para titulares
(tiene carácter propio y ancho variable), *IBM Plex Sans* para texto e interfaz,
*IBM Plex Mono* para toda cifra medida y para las micro-etiquetas en versalitas.

**Elemento de firma: la cinta de carbono.** Una traza tipo sismógrafo de los
últimos noventa días de CO₂ evitado, presente bajo la cabecera de todas las
pantallas autenticadas. Da continuidad entre casos de uso y contexto permanente.
Se escala por el percentil 90 para que un solo día atípico no aplaste la lectura.

**Iconografía.** Un único set SVG de trazo de 24×24 con grosor 2 y extremos
redondos, definido en `icons.js`. No se usan emojis en ningún punto de la
interfaz.

---

## Comportamientos implementados

- **Estados de interacción completos** en cada control: reposo, hover, foco
  visible, activo, deshabilitado y cargando (los botones conservan su ancho al
  cargar para que el diseño no salte).
- **Validación de formularios** declarativa (`data-reglas`), con mensaje en
  línea, icono, color y `aria-invalid`. El estado válido se marca con el borde y
  una casilla dentro del campo, sin insertar una línea nueva: así el formulario
  no se desplaza mientras la persona lo llena.
- **Cálculo de CO₂ en vivo** en UC4, mostrando la fórmula completa
  (`cantidad × factor = CO₂e`) y una equivalencia tangible.
- **Gráficos** con Chart.js en UC5, UC8 y UC9, configurados con la tipografía y
  la paleta del sistema.
- **Accesibilidad**: enlace de salto al contenido, región viva que anuncia el
  cambio de pantalla, `aria-current` en la navegación, etiquetas asociadas a
  todos los campos, contraste verificado y foco visible en todo control.
- **Adaptabilidad**: verificado sin desbordamiento horizontal en las diez rutas a
  390 px de ancho. Por debajo de 900 px la barra lateral pasa a panel deslizante.
- **Movimiento**: transiciones cortas y una sola animación de entrada por
  pantalla. Se respeta `prefers-reduced-motion`.
- **Impresión**: el reporte de emisiones (UC9) tiene hoja de impresión propia.

---

## Nota sobre los datos

El historial se genera con un generador pseudoaleatorio con semilla fija, de modo
que los gráficos se ven iguales en cada recarga. Las acciones que registre y las
preferencias que guarde se conservan en `localStorage`; para volver al estado
inicial, borre el almacenamiento del sitio o ejecute en la consola del navegador:

```js
localStorage.removeItem('ods13.proto.v1'); location.reload();
```

Los factores de emisión y las cifras citadas son valores de referencia académica
para el prototipo y no constituyen un inventario oficial de gases de efecto
invernadero.
