import * as THREE from 'three';
import * as WebIFC from 'web-ifc';

export class IfcMeshBuilder {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private defaultMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c0cc,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }

  public clearCache() {
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
  }

  public getOrCreateMaterial(color?: WebIFC.Color): THREE.MeshStandardMaterial {
    if (!color) return this.defaultMaterial;

    const r = color.x !== undefined ? Math.max(0, Math.min(1, color.x)) : 0.7;
    const g = color.y !== undefined ? Math.max(0, Math.min(1, color.y)) : 0.7;
    const b = color.z !== undefined ? Math.max(0, Math.min(1, color.z)) : 0.7;
    const a = color.w !== undefined ? Math.max(0, Math.min(1, color.w)) : 1.0;

    // Check if color is virtually black or missing
    if (r < 0.04 && g < 0.04 && b < 0.04) {
      return this.defaultMaterial;
    }

    const key = `${r.toFixed(3)}_${g.toFixed(3)}_${b.toFixed(3)}_${a.toFixed(3)}`;
    let mat = this.materialCache.get(key);
    if (!mat) {
      const threeColor = new THREE.Color(r, g, b);
      mat = new THREE.MeshStandardMaterial({
        color: threeColor,
        roughness: 0.45,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: a < 0.99,
        opacity: a,
      });
      this.materialCache.set(key, mat);
    }
    return mat;
  }

  public buildMeshesForFlatMesh(
    api: WebIFC.IfcAPI,
    modelID: number,
    flatMesh: WebIFC.FlatMesh
  ): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const geomSize = flatMesh.geometries.size();

    for (let i = 0; i < geomSize; i++) {
      const placedGeom = flatMesh.geometries.get(i);
      const ifcGeom = api.GetGeometry(modelID, placedGeom.geometryExpressID);

      const vData = api.GetVertexArray(ifcGeom.GetVertexData(), ifcGeom.GetVertexDataSize());
      const iData = api.GetIndexArray(ifcGeom.GetIndexData(), ifcGeom.GetIndexDataSize());

      if (!vData || vData.length === 0 || !iData || iData.length === 0) {
        continue;
      }

      // vData is interleaved: 6 floats per vertex: [x, y, z, nx, ny, nz]
      const numVertices = Math.floor(vData.length / 6);
      const positions = new Float32Array(numVertices * 3);
      const normals = new Float32Array(numVertices * 3);

      for (let v = 0; v < numVertices; v++) {
        const src = v * 6;
        const dst = v * 3;
        positions[dst] = vData[src];
        positions[dst + 1] = vData[src + 1];
        positions[dst + 2] = vData[src + 2];

        normals[dst] = vData[src + 3];
        normals[dst + 1] = vData[src + 4];
        normals[dst + 2] = vData[src + 5];
      }

      const bufferGeometry = new THREE.BufferGeometry();
      bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(iData), 1));

      // Apply transformation matrix
      if (placedGeom.flatTransformation && placedGeom.flatTransformation.length === 16) {
        const matrix = new THREE.Matrix4();
        matrix.fromArray(placedGeom.flatTransformation);
        bufferGeometry.applyMatrix4(matrix);
      }

      const material = this.getOrCreateMaterial(placedGeom.color);
      const mesh = new THREE.Mesh(bufferGeometry, material);

      mesh.userData = {
        expressID: flatMesh.expressID,
        modelID: modelID,
      };

      meshes.push(mesh);
    }

    return meshes;
  }
}
