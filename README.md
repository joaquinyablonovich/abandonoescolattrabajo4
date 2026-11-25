# SATED — versión SIN CARPETAS

Todos los archivos de este ZIP van juntos en la raíz del repositorio. No hay que crear carpetas src, api, scripts ni public. No subir el ZIP cerrado: primero extraerlo y subir todos los archivos que contiene.

## Subir a GitHub
1. Extraer SATED_SIN_CARPETAS.zip.
2. Abrir el repositorio conectado a Vercel, en la rama main y en su página principal.
3. Elegir Add file → Upload files.
4. Arrastrar TODOS los archivos extraídos juntos, conservando sus nombres. Aceptar reemplazar los que ya existen.
5. Guardar con Commit changes.

Hay que subir el conjunto completo: actualizar sólo index.html o un componente puede mezclar versiones incompatibles. Esta versión está pensada para el repositorio en el que los archivos se suben sueltos en la raíz.

## Vercel
El archivo vercel.json incluye la configuración del despliegue. Root Directory debe apuntar a la raíz del repositorio (vacío o ./), nunca a src.

El proyecto usa Node 24. El comando npm run build genera automáticamente el frontend compilado y las funciones de API usando el Build Output API de Vercel. No hay que subir las carpetas que se generan durante la instalación o compilación.

Si se configura manualmente: Framework Preset = Other; Build Command = npm run build; Install Command = npm ci; Output Directory = .vercel/output.

Si antes hiciste Instant Rollback, los commits nuevos no reemplazan automáticamente el sitio restaurado. Primero verificá el nuevo despliegue y luego usá Undo Rollback para promover esa versión.

## Recuperar una versión anterior que funcionaba
Vercel → proyecto → Production Deployment → Instant Rollback → seleccionar versión anterior → Continue → confirmar. Esto recupera la web; no revierte el commit de GitHub. En Hobby la opción se limita al despliegue de producción inmediatamente anterior elegible.

## Probar la corrección
1. Abrir Mis propios datos.
2. Mantener activada la referencia provincial de abandono de 2022.
3. Seleccionar Buenos Aires y luego Salta: cambian la referencia y la predicción.
4. Si se escribe una tasa propia, esa tasa tiene prioridad y se conserva al cambiar la provincia.

La provincia no se agregó como una variable artificial al Random Forest: se usa su referencia histórica de 2022 cuando falta una tasa propia. Dos provincias pueden dar una predicción igual si sus valores llevan a las mismas hojas del modelo. El resultado representa una zona educativa, no una probabilidad individual de un alumno. La referencia provincial es un promedio agregado y su uso como reemplazo no fue validado por separado con las métricas históricas del notebook.

## Comprobaciones locales
npm ci
npm run check

Incluye TypeScript, 20 pruebas del modelo/API/formulario, compilación y pruebas HTTP de los bundles generados para Vercel. No equivale a verificar un despliegue real en tu cuenta.

Desarrollo: npm run dev.
Producción local: npm run build y luego npm start.
Verificación de versión: /api/health debe informar 1.2.0-sin-carpetas.

## Archivos clave
- main.tsx e index.html: entrada de la página.
- SinglePageEvaluator.tsx y evaluatorState.ts: formulario y cambio de provincia.
- provinces.ts: referencia histórica provincial.
- schema.ts, model.ts y realForest.ts: preparación de entradas y predicción.
- randomForestData.ts: Random Forest existente de 400 árboles, sin reentrenamiento.
- handlers.ts: API.
- vercelRuntime.ts y build.mjs: adaptación y empaquetado automático para Vercel.
- deployment.test.mjs: pruebas HTTP de las funciones compiladas.

Referencia técnica: https://vercel.com/docs/build-output-api
Rollback: https://vercel.com/docs/instant-rollback
