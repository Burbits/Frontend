#!/bin/sh
# Wraps the prototype source (written for the Claude artifact viewer, which adds
# the <html>/<head> skeleton itself) into a standalone, installable page (PWA)
# for browsers and GitHub Pages.
set -e
cd "$(dirname "$0")/.."
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  printf '<meta name="theme-color" content="#FFFFFF">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  printf '<meta name="mobile-web-app-capable" content="yes">\n'
  printf '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
  printf '<meta name="apple-mobile-web-app-title" content="Burbit">\n'
  printf '<link rel="manifest" href="manifest.webmanifest">\n'
  printf '<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">\n'
  printf '<link rel="apple-touch-icon" href="icons/icon-180.png">\n'
  # The Claude viewer adds this reset itself; a standalone page needs it explicitly.
  printf '<style>body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style>\n'
  sed -n '1,/<\/style>/p' prototype/burbit-prototype.html
  printf '</head>\n<body>\n'
  sed '1,/<\/style>/d' prototype/burbit-prototype.html
  printf '<script>\nif ("serviceWorker" in navigator) { window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); }); }\n</script>\n'
  printf '</body>\n</html>\n'
} > prototype/index.html
echo "Built prototype/index.html"
