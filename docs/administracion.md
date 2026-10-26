# Acceso de Daniel Arroyo

## Desarrollo local

Ejecuta `npm run admin:setup` en una terminal interactiva. Solicita una contraseña de 12 a 256 caracteres y su repetición, sin mostrarla. Genera `.env` con `ADMIN_PASSWORD_HASH` (scrypt con sal aleatoria) y `ADMIN_SESSION_SECRET` (48 bytes aleatorios). No guarda la contraseña en claro. `.env` y `.netlify/` están excluidos de Git, Prettier y comprobaciones de texto.

Reinicia `npm start` y abre `http://127.0.0.1:4200/acceso` o `http://localhost:4200/acceso`. Usuario: `daniel-arroyo`. Este comando inicia Angular y la API Node. El servidor conserva el host local usado por el navegador al comprobar el origen; no se permite mezclar orígenes en una petición. Los datos persisten en `.netlify/local/season.json`; no se envían a Netlify. No ejecutes dos servidores locales sobre ese archivo. Sin contraseña configurada se puede consultar la app; la administración queda cerrada por defecto.

Para cambiar o recuperar la contraseña, vuelve a ejecutar `npm run admin:setup` y reinicia. Se invalidan las sesiones existentes. No hay recuperación por correo ni registro abierto de administradores.

## Netlify

Se usan [Netlify Functions](https://docs.netlify.com/build/functions/get-started/) y [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/). No se han creado servicios ni desplegado esta app durante esta implementación.

Antes de desplegar, configura **solo en el ámbito de Functions**, en los ajustes privados de Netlify, las dos variables generadas por `admin:setup`: `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET`. No incluyas los valores en código, variables del frontend ni mensajes. Rotar cualquiera de ellas invalida las sesiones al actualizar el entorno de Functions.

El build publica `dist/materos-quinieleros/browser`. `auth.mjs` atiende `/api/auth`; `season.mjs`, `/api/season` y `/api/admin`. Las funciones se resuelven antes de la reescritura SPA. El seed se incluye en el bundle del servidor; no se publica `data/season.json`.

Producción usa el store `quinielas-production`, que persiste entre despliegues. Cada despliegue de preview o rama tiene un store distinto y no escribe el grupo de producción; un nuevo deploy de preview arranca con el seed. Se usa `context.deploy` del runtime, sin confiar en variables exclusivas del build. Sin contexto suficiente falla cerrado. Cambiar el seed no migra un store existente; no hay migración automática entre local y producción.

Después del despliegue hay que comprobar en dos navegadores: acceso y recarga de Daniel, persistencia en Blobs, rechazo de `/api/admin` a visitantes, ausencia de pronósticos previos al cierre en `/api/season`, cierre de sesión y respuesta 429 al exceder intentos. Estas verificaciones remotas están pendientes.

## Permisos y persistencia

Cookie firmada de ocho horas con `HttpOnly`, `SameSite=Strict`, ámbito `/api` y `Secure` en HTTPS. Se valida sujeto `daniel-arroyo`, firma, expiración y configuración en cada petición privada. No se guardan tokens en localStorage ni se confía en roles del navegador. Cerrar sesión elimina la cookie; para revocar todas las sesiones se rota un secreto.

Cada escritura exige origen coincidente, JSON de hasta 32 KiB, sesión y revisión actual. El servidor impide cambiar roles, quitar al admin, registrar duplicados o guardar quinielas incompletas. Las bajas conservan el histórico. Todas las respuestas API llevan `Cache-Control: no-store`.

La respuesta pública elimina pronósticos y Pleno antes del cierre y filtra resultados oficiales futuros. El panel recibe una copia privada separada del store público Angular. Blobs usa consistencia `strong` y condiciones `onlyIfNew` / `onlyIfMatch` con ETag. Una revisión obsoleta devuelve 409 y pide recargar; no sobrescribe en silencio. Sin ETag, falla cerrado. La metadata guarda el último autor, instante e identificador de operación; no constituye un historial completo de auditoría.

El acceso tiene [límite de peticiones en Netlify](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/): 20 por IP y minuto para `/api/auth`, incluyendo consultas de sesión. Netlify puede tardar hasta diez segundos en aplicar el bloqueo. El servidor local limita los intentos de login; no sustituye la verificación remota.

La prueba del adaptador usa el emulador oficial local de Blobs. En SDK 11.1.6, GET omite ETag aunque PUT lo devuelve: la prueba registra ese límite y comprueba el rechazo seguro y las condiciones mediante la revisión de PUT. No es una comprobación del servicio remoto. El desarrollo normal usa el adaptador de disco con revisiones propias.
