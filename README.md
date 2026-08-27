# JR PureLife Wellness — Sitio funcional

## Desplegar
1. Crea un repo vacío en GitHub (github.com/new)
2. `git remote add origin https://github.com/TU-USUARIO/jr-purelife-wellness.git`
3. `git branch -M main && git push -u origin main`
4. En vercel.com → "Import Project" → conecta ese repo → Deploy
   (cada `git push` después de esto despliega automáticamente)

## Antes de publicar
- `assets/config.js`: pon tu Stripe Payment Link real y confirma el email de contacto

## Pruebas
Las pruebas unitarias cubren la lógica del carrito, el motor de idiomas, la
reparación de enlaces y el service worker.

```
npm install
npm test           # ejecuta la suite
npm run coverage   # suite + reporte de cobertura
```

El sitio sigue siendo HTML estático: `npm` solo se usa para las pruebas y no se
necesita para desplegar.
