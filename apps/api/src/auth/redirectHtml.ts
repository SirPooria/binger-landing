/** HTML page that opens the native app after magic-link / OAuth (Safari shows blank on raw exp:// 302). */
export function nativeAuthRedirectHtml(targetUrl: string, title = 'ورود به بینجر'): string {
  const safeHref = targetUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeJs = JSON.stringify(targetUrl);
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, sans-serif; background:#050505; color:#fff; text-align:center; padding:2rem; }
    a { display:inline-block; margin-top:1.5rem; background:#ccff00; color:#000; padding:14px 28px;
         border-radius:10px; font-weight:bold; text-decoration:none; }
    p { color:#aaa; font-size:14px; line-height:1.6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>اگر اپ به‌طور خودکار باز نشد، دکمه زیر را بزنید.</p>
  <p><a id="open" href="${safeHref}">باز کردن بینجر</a></p>
  <script>setTimeout(function(){ window.location.replace(${safeJs}); }, 300);</script>
</body>
</html>`;
}

export function isNativeAppRedirect(uri: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(uri) && !/^https?:/i.test(uri);
}
