import * as THREE from "three";

/** GLTF scene nodes retain Three.js mesh classes and their material contract. */
export function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh;
}
