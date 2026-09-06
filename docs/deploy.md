# Deploy — ForgeBoard

App 100% estático (`dist/` após `npm run build`): sirva por qualquer host
estático (ou `npm run preview` para fumaça local). Sem backend, sem variáveis
de ambiente, sem segredos.

## Content Security Policy (produção)

O app não usa scripts, estilos, fontes ou imagens externos — tudo é `self`,
exceto:

- **1 script inline** (tema pré-pintura no `index.html`): liberado por hash,
  regenerado a cada mudança no `index.html`;
- **`style-src 'unsafe-inline'`**: exigido pelos estilos inline do React
  (cores de projeto/etiquetas, barras de progresso) e pelo `<style>` do splash.
  Alternativa (trabalhosa, sem ganho prático aqui): mover tudo para classes.

Exemplo de headers (nginx / host estático):

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-2ckcHailROiezF23WY9Jx754HTmkpP+dH0NUptdNw8Y='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options "nosniff" always;
```

Regenerar o hash após editar o `index.html` (PowerShell):

```powershell
$html = Get-Content dist/index.html -Raw
$js = [regex]::Match($html, '<script>(.*?)</script>', 'Singleline').Groups[1].Value
[Convert]::ToBase64String([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($js)))
```

O teste `e2e/csp.spec.ts` prova localmente que o app funciona sob CSP
restritiva (via `route.fulfill` com headers; em dev usa-se `'unsafe-inline'`
no lugar do hash — o hash é verificado no documento de produção).

## Offline / PWA

O service worker (gerado no build) faz precache do shell; dados vivem no
IndexedDB do navegador. Funciona offline após a primeira visita.
