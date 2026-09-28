#!/bin/sh
# Wraps the prototype source (written for the Claude artifact viewer, which adds
# the <html>/<head> skeleton itself) into a standalone page for browsers and GitHub Pages.
set -e
cd "$(dirname "$0")/.."
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  sed -n '1,/<\/style>/p' prototype/burbit-prototype.html
  printf '</head>\n<body>\n'
  sed '1,/<\/style>/d' prototype/burbit-prototype.html
  printf '</body>\n</html>\n'
} > prototype/index.html
echo "Built prototype/index.html"
