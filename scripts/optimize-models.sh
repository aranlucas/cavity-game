#!/bin/sh
# Preserve gameplay node names, material names and repair insert pivots.
set -eu
cd "$(dirname "$0")/.."
for model in patient treatment-mouth equipment; do
  npx --yes @gltf-transform/cli@4.5.0 optimize \
    "client/public/models/$model.glb" "client/public/models/$model.optimized.glb" \
    --compress meshopt --simplify false --flatten false --join false \
    --instance false --palette false
  mv "client/public/models/$model.optimized.glb" "client/public/models/$model.glb"
done
