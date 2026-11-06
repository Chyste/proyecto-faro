#!/usr/bin/env bash
# Download raw CASEN 2024 and Censo 2024 data into data/raw/ (~450 MB).
# Skips files that already exist. Run from anywhere.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CASEN_BASE="https://observatorio.ministeriodesarrollosocial.gob.cl/storage/docs/casen/2024"
CENSO_URL="https://storage.googleapis.com/bktdescargascenso2024/viv_hog_per_censo2024.zip"

download() {
  local url="$1" dest="$2"
  if [[ -s "$dest" ]]; then
    echo "ok (ya existe)  $dest"
    return
  fi
  echo "descargando     $dest"
  curl -fL --retry 3 -o "$dest.part" "$url"
  mv "$dest.part" "$dest"
}

mkdir -p "$ROOT/data/raw/casen" "$ROOT/data/raw/censo"

for f in casen_2024.RData casen_2024_provincia_comuna.dta \
         Libro_de_codigos_Casen_2024.xlsx Libro_de_codigos_Casen_2024_prov_comuna.xlsx; do
  download "$CASEN_BASE/$f" "$ROOT/data/raw/casen/$f"
done

download "$CENSO_URL" "$ROOT/data/raw/censo/viv_hog_per_censo2024.zip"

echo "listo: datos en $ROOT/data/raw/"
