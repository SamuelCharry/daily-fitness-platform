# Activar acceso con Google

1. Abre https://console.cloud.google.com/ y crea o selecciona un proyecto.
2. En Google Auth Platform configura Branding y Audience. Durante las pruebas agrega tu Gmail como usuario de prueba si corresponde.
3. En Clients crea un cliente OAuth de tipo Web application.
4. Agrega estos Authorized JavaScript origins:
   - https://negative-rir.dvergaram.dev
   - http://localhost:8011 (para pruebas locales)
   - http://127.0.0.1:8011 (si Google acepta este origen en tu configuración)
5. Copia el Client ID terminado en .apps.googleusercontent.com. No hace falta Client Secret ni redirect URI para este flujo popup con callback JavaScript.
6. En el entorno del servidor configura GOOGLE_CLIENT_ID y reinicia el servicio. Docker Compose ya pasa esta variable desde .env.
7. Prueba con tu Gmail existente: las rutinas se conservan al vincularlo. Después verifica una cuenta nueva y un acceso rechazado.

Mientras no exista GOOGLE_CLIENT_ID, la interfaz conserva el inicio de sesión y registro por correo y contraseña. Al configurar el ID, muestra el acceso con Google. Los endpoints antiguos de contraseña permanecen disponibles para migración mientras no exista GOOGLE_CLIENT_ID; se desactivan al configurarlo.

El servidor verifica firma, audiencia, emisor, caducidad y correo verificado mediante google-auth. La identidad duradera es el sub de Google. La vinculación automática con cuentas anteriores solo admite Gmail o Workspace; otros correos existentes requieren un proceso de vinculación adicional. Nunca se borran rutinas ni historiales al vincular.

Referencia: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
