import { Clone, useGLTF } from "@react-three/drei";

export function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);

  return <Clone object={scene} dispose={null} castShadow receiveShadow />;
}

type ModelProps = { url: string };
