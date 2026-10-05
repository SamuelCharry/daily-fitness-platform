# Cool for the Summer

Bitácora personal para entrenamientos, peso y preparación de culturismo natural. Interfaz en español, grafito sobre blanco y sesiones pensadas para usar desde el gimnasio. React / FastAPI / SQLite, una sola aplicación para publicar con cuentas y registros privados para cada persona.

## Qué funciona

- Mi resumen: check-in diario (peso, cintura, cuello, sueño, pasos, calorías, proteína y dieta sí/no), que se guarda campo por campo para poder registrar en distintos momentos del día, con atajos a hoy/ayer. Al lado, check-in semanal frente a la semana anterior.
- Indicadores: peso promedio de 7 días y ritmo semanal, % de grasa aproximado (método Navy), FFMI normalizado, distancia a la meta y días sin registrar.
- Gráficas de peso, cintura, sueño, pasos, calorías y proteína, y un heatmap de constancia (registro, dieta, pasos o sueño).
- Entrenamientos: semana fija con días que se arrastran, avisos de agenda, recuperación, redundancia, volumen y frecuencia, y cambio de ejercicio por uno equivalente (mismo músculo, acción articular y plano) sin perder el historial de series.
- Esta semana (en Mi resumen): mueve un entreno a otro día solo esa semana; marca hechos, pendientes y perdidos.
- Sesiones con kg, repeticiones, RIR, valores de la sesión anterior y descanso con reloj real. Objetivos y datos personales en Preferencias.
- Sincronización con iPhone: un Atajo de iOS envía pasos y sueño de Salud a `POST /api/sync/health` con una clave propia (Preferencias → Sincronizar con iPhone). Solo funciona con la app publicada; el iPhone no llega a 127.0.0.1.
- Sesiones con contador de tiempo total y de descanso entre series (vibra al cumplir el descanso).
- Registro y login con correo y contraseña; datos separados por cuenta y sesión recordada durante 7 días. Modo local personal sin login para el propietario.

Referencia de experiencia: [MacroFactor Workouts](https://macrofactor.com/workouts/). Esta versión no replica su algoritmo de progresión, sus programas comerciales ni todas sus funciones avanzadas.

## Usar ahora en Windows

Desde la raíz, crear el entorno y construir el frontend:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm ci --prefix frontend
npm run build --prefix frontend
.\scripts\start-local.ps1
```

Abrir http://127.0.0.1:8000. El script reutiliza la cuenta existente si hay exactamente una. Si hay varias, pasar `-OwnerEmail 'correo-de-la-cuenta-existente'`. La base existente en `backend/fitness.db` se mantiene; las columnas nuevas se añaden sin borrar tablas. No exponer este modo a Internet.

Para desarrollo: levantar la API con el script y `npm run dev --prefix frontend`; Vite redirige `/api` a la API local.

## Publicar por poco dinero

### Ruta de publicación

En un dominio propio (como `negative-rir.dvergaram.dev`), compilar con la base predeterminada `/`. El router toma `import.meta.env.BASE_URL` de Vite: no debe fijarse `/daily-fitness-platform` en `App.tsx`, porque en la raíz del dominio dejaría la página vacía. Para publicar bajo una subcarpeta, usar `npm run build --prefix frontend -- --base=/daily-fitness-platform/`; los recursos y el router usarán esa misma ruta. El servidor debe entregar el HTML de la aplicación en las rutas de navegación, incluidas `/login` y `/app`.

Recomendación inicial: **Railway Hobby**, mínimo US$5/mes con US$5 de consumo incluido; puede aumentar con el uso. Una sola aplicación y un volumen para SQLite evitan pagar dos servicios y una base aparte. Configuración revisada el 4 de octubre de 2026. [Precio oficial](https://railway.com/pricing).

1. Crear un servicio desde este repositorio (raíz). Railway detecta `Dockerfile`; `railway.toml` configura el healthcheck.
2. Añadir un volumen montado en `/data` **antes de empezar a registrar datos**. [Volúmenes](https://docs.railway.com/volumes).
3. Configurar `APP_ENV=production`, `PERSONAL_MODE=false`, `OWNER_EMAIL`, `OWNER_PASSWORD` (al menos 12 caracteres), `JWT_SECRET` (aleatorio y largo), `DATABASE_URL=sqlite:////data/fitness.db`, `TZ=America/Bogota`.
4. Generar el dominio HTTPS de Railway. No necesitas comprar dominio.
5. Entrar con el correo/contraseña configurados. El propietario se crea una vez; cambiar OWNER_PASSWORD después no reemplaza la contraseña de una cuenta existente.
6. Establecer alertas/límite de gasto en Railway y comprobar `/api/health`, login, guardado y persistencia después de reiniciar.

La cuenta y pago del alojamiento requieren al propietario. No hay despliegue remoto realizado todavía.

### Más adelante: servidor propio

Copiar `.env.example` a `.env`, rellenar dominio, correo, contraseña y secreto. En un VPS con Docker y un dominio apuntando al servidor:

```sh
docker compose up -d --build
```

Caddy gestiona HTTPS; la API solo se expone dentro de la red interna. El volumen `fitness_data` conserva SQLite entre reinicios. No usar `docker compose down -v`: elimina los volúmenes.

## Datos y copias

### Cuentas y acceso

En el login, «Crear una cuenta» abre `/register`. Cada persona elige correo y contraseña (12 caracteres mínimo, 72 bytes máximo), entra automáticamente tras registrarse y tiene sus propios registros, rutinas, sesiones y perfil. No necesita código de configuración. Las contraseñas se guardan con bcrypt y las sesiones JWT duran siete días; el logout elimina la sesión de este navegador. El correo no se verifica por email y todavía no hay recuperación de contraseña. Las cuentas y datos existentes se conservan. `REGISTRATION_ENABLED=false` permite cerrar nuevas altas sin impedir el login. El límite de intentos funciona por proceso/IP; si el proxy agrupa las IP, comparte ese límite. El modo local sin login mantiene desactivado el registro.

Antes de actualizar o migrar:

```powershell
.\.venv\Scripts\python.exe scripts/backup.py backend/fitness.db
```

Para migrar registros al servidor, cargar la copia de SQLite al volumen `/data/fitness.db` con la aplicación detenida y configurar OWNER_EMAIL con el correo de la cuenta que posee las rutinas. La clave existente continúa vigente; OWNER_PASSWORD solo crea cuentas nuevas. Restaurar una copia únicamente con la aplicación detenida. CSV respalda la bitácora; la copia SQLite conserva también rutinas, series y perfil.

## Verificación

```powershell
npm run build --prefix frontend
npm run lint --prefix frontend
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

Docker requiere Docker Desktop iniciado. El despliegue antiguo de GitHub Pages queda manual: una página estática por sí sola no ejecuta la API ni guarda la base de datos.

Validación realizada: compilación correcta, lint sin errores (8 advertencias), 7 pruebas de integración aprobadas y revisión en escritorio/móvil. La configuración de Compose se validó; la imagen Docker aún no se ha probado porque el motor local no respondió.
