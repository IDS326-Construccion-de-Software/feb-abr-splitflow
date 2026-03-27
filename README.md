# SplitFlow

Aplicacion web para dividir gastos entre amigos y grupos, registrar pagos manuales y consultar balances pendientes. El proyecto fue desarrollado con React, TypeScript, Vite, Tailwind CSS y Firebase como parte del laboratorio de Construccion de Software.

## Objetivo del proyecto

SplitFlow busca resolver un problema comun en viajes, salidas, convivencias y trabajos en equipo: saber quien pago, cuanto le corresponde a cada participante y quien todavia debe dinero. La aplicacion centraliza esa informacion y presenta saldos por persona y por grupo.

## Funcionalidades principales

- Registro e inicio de sesion de usuarios.
- Creacion y administracion de grupos.
- Gestion de amistades.
- Registro de gastos compartidos.
- Division de gastos en modo igual o personalizado.
- Calculo de balances netos por grupo y globales.
- Registro manual de pagos entre usuarios.
- Historial de pagos en la pantalla de saldos.
- Vista de detalle por gasto con posibilidad de eliminarlo para su creador.
- Navegacion protegida para usuarios autenticados.

## Mejoras recientes

Estas mejoras ya forman parte del codigo actual:

- Se corrigio la navegacion de regreso en distintas pantallas para evitar que el usuario quede atrapado cuando no existe historial suficiente en el navegador.
- Se agrego historial de pagos manuales en la vista de saldos.
- Se habilito el borrado de gastos desde el detalle del gasto.
- Se mejoro la validacion del reparto personalizado para mostrar errores reales cuando un monto no es valido o cuando la suma de los montos no coincide con el total.

## Tecnologias utilizadas

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Zod
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- ESLint

## Estructura general

```text
src/
  app/
    providers/        Contextos globales y proveedor de autenticacion
    router/           Rutas publicas, privadas y layout principal
  components/         Pantallas y componentes visuales
  features/           Hooks y servicios por modulo
    auth/
    expenses/
    settlements/
    groups/
    friends/
    users/
    activity/
  lib/
    firebase/         Configuracion de Firebase
    utils/            Utilidades de calculo, clases y navegacion
    validations/      Esquemas Zod para formularios
  types/              Tipos de dominio
```

## Modulos principales

### Autenticacion

El acceso a la aplicacion se controla con Firebase Authentication. Las rutas privadas se protegen desde `ProtectedRoute` y el estado de sesion se centraliza en el proveedor de autenticacion.

### Grupos

Permite crear grupos, listar miembros y visualizar balances internos del grupo. Desde el detalle del grupo es posible registrar gastos y liquidar saldos.

### Gastos

Cada gasto contiene:

- descripcion
- monto
- moneda
- fecha
- usuario que pago
- participantes
- tipo de division
- splits individuales

El sistema soporta dos modos de reparto:

- `equal`: divide el monto de forma equitativa, incluyendo manejo de centavos sobrantes.
- `custom`: permite asignar manualmente cuanto corresponde a cada participante.

### Pagos manuales

Los pagos se registran como settlements. Estos reducen las deudas pendientes y ahora tambien quedan visibles en un historial dentro de la pantalla de saldos.

### Balances

Los balances se calculan a partir de gastos y pagos registrados. La aplicacion muestra:

- cuanto te deben
- cuanto debes
- con quien tienes saldo pendiente
- historial de pagos manuales

## Requisitos previos

Antes de ejecutar el proyecto necesitas:

- Node.js 18 o superior
- npm
- Un proyecto de Firebase configurado

## Variables de entorno

Crea un archivo `.env` a partir de `.env.example` y completa las credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Instalacion y ejecucion

1. Clona el repositorio.
2. Instala las dependencias:

```bash
npm install
```

3. Crea el archivo `.env` con tus variables de Firebase.
4. Inicia el entorno de desarrollo:

```bash
npm run dev
```

## Scripts disponibles

```bash
npm run dev      # Ejecuta la aplicacion en desarrollo
npm run build    # Compila TypeScript y genera el build de produccion
npm run lint     # Ejecuta ESLint
npm run preview  # Sirve localmente el build generado
```

## Firebase

El proyecto utiliza:

- `Authentication` para el inicio de sesion.
- `Cloud Firestore` para usuarios, gastos, grupos, amistades, pagos y actividad.
- `Storage` para archivos relacionados con la aplicacion.

Ademas, el repositorio incluye:

- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `firebase.json`

## Rutas principales de la aplicacion

- `/login`
- `/register`
- `/dashboard`
- `/groups`
- `/groups/new`
- `/groups/:groupId`
- `/groups/:groupId/expenses/new`
- `/expenses/:expenseId`
- `/settle-up`
- `/friends`
- `/balances`
- `/profile`

## Validaciones y reglas de negocio

El proyecto aplica validaciones importantes como:

- el monto del gasto debe ser mayor que cero
- el pagador debe formar parte del gasto
- debe existir al menos un participante
- en reparto personalizado, cada participante debe tener un split valido
- la suma de los splits debe coincidir con el monto total
- un pago manual no puede hacerse a uno mismo

## Estado actual

El proyecto ya compila correctamente y fue validado con:

```bash
npm run lint
npm run build
```

## Posibles mejoras futuras

- edicion de gastos y pagos
- filtros avanzados por grupo o rango de fecha
- notificaciones dentro de la aplicacion
- soporte multi-moneda mas amplio
- pruebas unitarias e integracion automatizadas
- mejor division del bundle para optimizar el tamano final

## Creditos

Proyecto academico desarrollado para la asignatura de laboratorio de Construccion de Software. La aplicacion toma como referencia el flujo de herramientas de division de gastos tipo Splitwise, adaptado a los requerimientos del curso.
