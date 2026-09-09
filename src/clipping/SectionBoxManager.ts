import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { SectionBoxState, ModelBounds } from '../types';

export class SectionBoxManager {
  private planes: THREE.Plane[] = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),   // Min X (x >= minX)
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),  // Max X (x <= maxX)
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),   // Min Y (y >= minY)
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),  // Max Y (y <= maxY)
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),   // Min Z (z >= minZ)
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),  // Max Z (z <= maxZ)
  ];

  private state: SectionBoxState = {
    enabled: false,
    visible: true,
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10,
    minZ: -10,
    maxZ: 10,
    activeGrip: null,
  };

  private helperGroup = new THREE.Group();
  private boxWireframe: THREE.LineSegments;
  private gripObjects: Map<string, THREE.Mesh> = new Map();
  private transformControls: TransformControls | null = null;
  private gripAnchor = new THREE.Object3D();
  private onChangeCallback?: () => void;
  private modelBounds: ModelBounds | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private domElement: HTMLElement,
    private onGizmoDragChange?: (dragging: boolean) => void
  ) {
    this.helperGroup.name = 'SECTION_BOX_HELPERS';
    this.scene.add(this.helperGroup);
    this.scene.add(this.gripAnchor);

    // Wireframe box outline
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(boxGeom);
    this.boxWireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    );
    this.boxWireframe.visible = false;
    this.helperGroup.add(this.boxWireframe);

    this.createGrips();
    this.setupGizmo();
  }

  private createGrips() {
    const gripDefs = [
      { id: '-X', color: 0xef4444, dir: [-1, 0, 0] },
      { id: '+X', color: 0xef4444, dir: [1, 0, 0] },
      { id: '-Y', color: 0x22c55e, dir: [0, -1, 0] },
      { id: '+Y', color: 0x22c55e, dir: [0, 1, 0] },
      { id: '-Z', color: 0x3b82f6, dir: [0, 0, -1] },
      { id: '+Z', color: 0x3b82f6, dir: [0, 0, 1] },
      { id: 'ALL', color: 0xa855f7, dir: [0, 0, 0] },
    ];

    const gripGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    gripDefs.forEach((def) => {
      const mat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(gripGeom, mat);
      mesh.userData = { gripId: def.id };
      mesh.visible = false;
      this.gripObjects.set(def.id, mesh);
      this.helperGroup.add(mesh);
    });
  }

  private setupGizmo() {
    this.transformControls = new TransformControls(this.camera, this.domElement);
    this.transformControls.size = 0.8;
    this.transformControls.setMode('translate');

    this.transformControls.addEventListener('dragging-changed', (event) => {
      const isDragging = !!event.value;
      if (this.onGizmoDragChange) {
        this.onGizmoDragChange(isDragging);
      }
    });

    this.transformControls.addEventListener('change', () => {
      if (!this.state.enabled || !this.state.activeGrip) return;
      this.syncFromGripAnchor();
    });

    this.scene.add(this.transformControls.getHelper());
    this.transformControls.attach(this.gripAnchor);
    this.transformControls.enabled = false;
    this.transformControls.getHelper().visible = false;
  }

  private syncFromGripAnchor() {
    const pos = this.gripAnchor.position;
    const grip = this.state.activeGrip;

    if (grip === '-X') {
      this.state.minX = Math.min(pos.x, this.state.maxX - 0.2);
    } else if (grip === '+X') {
      this.state.maxX = Math.max(pos.x, this.state.minX + 0.2);
    } else if (grip === '-Y') {
      this.state.minY = Math.min(pos.y, this.state.maxY - 0.2);
    } else if (grip === '+Y') {
      this.state.maxY = Math.max(pos.y, this.state.minY + 0.2);
    } else if (grip === '-Z') {
      this.state.minZ = Math.min(pos.z, this.state.maxZ - 0.2);
    } else if (grip === '+Z') {
      this.state.maxZ = Math.max(pos.z, this.state.minZ + 0.2);
    } else if (grip === 'ALL') {
      const currentCenterX = (this.state.minX + this.state.maxX) / 2;
      const currentCenterY = (this.state.minY + this.state.maxY) / 2;
      const currentCenterZ = (this.state.minZ + this.state.maxZ) / 2;

      const dx = pos.x - currentCenterX;
      const dy = pos.y - currentCenterY;
      const dz = pos.z - currentCenterZ;

      this.state.minX += dx;
      this.state.maxX += dx;
      this.state.minY += dy;
      this.state.maxY += dy;
      this.state.minZ += dz;
      this.state.maxZ += dz;
    }

    this.updatePlanesAndVisuals();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public setCallback(cb: () => void) {
    this.onChangeCallback = cb;
  }

  public setModelBounds(bounds: ModelBounds) {
    this.modelBounds = bounds;
    // Section box initial size equals model bounding box + 2% padding
    this.resetToModel();
  }

  public resetToModel() {
    if (!this.modelBounds) return;
    const { min, max, size } = this.modelBounds;
    const pad = Math.max(size.length() * 0.02, 0.2);

    this.state.minX = min.x - pad;
    this.state.maxX = max.x + pad;
    this.state.minY = min.y - pad;
    this.state.maxY = max.y + pad;
    this.state.minZ = min.z - pad;
    this.state.maxZ = max.z + pad;

    this.updatePlanesAndVisuals();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public fitToElement(expressID: number, modelGroup: THREE.Group): boolean {
    const box = new THREE.Box3();
    let found = false;

    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.expressID === expressID) {
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        const meshBox = child.geometry.boundingBox!.clone().applyMatrix4(child.matrixWorld);
        box.union(meshBox);
        found = true;
      }
    });

    if (!found || box.isEmpty()) return false;

    const size = new THREE.Vector3();
    box.getSize(size);
    const padX = Math.max(size.x * 0.15, 0.3);
    const padY = Math.max(size.y * 0.15, 0.3);
    const padZ = Math.max(size.z * 0.15, 0.3);

    this.state.enabled = true;
    this.state.minX = box.min.x - padX;
    this.state.maxX = box.max.x + padX;
    this.state.minY = box.min.y - padY;
    this.state.maxY = box.max.y + padY;
    this.state.minZ = box.min.z - padZ;
    this.state.maxZ = box.max.z + padZ;

    this.updatePlanesAndVisuals();
    if (this.onChangeCallback) this.onChangeCallback();
    return true;
  }

  public enable() {
    this.state.enabled = true;
    this.updatePlanesAndVisuals();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public disable() {
    this.state.enabled = false;
    this.state.activeGrip = null;
    this.boxWireframe.visible = false;
    this.gripObjects.forEach((m) => (m.visible = false));
    if (this.transformControls) {
      this.transformControls.enabled = false;
      this.transformControls.getHelper().visible = false;
    }
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public toggle() {
    if (this.state.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  public setVisible(visible: boolean) {
    this.state.visible = visible;
    const show = this.state.enabled && visible;
    this.boxWireframe.visible = show;
    this.gripObjects.forEach((m) => (m.visible = show));
    if (this.transformControls) {
      this.transformControls.getHelper().visible = show && this.state.activeGrip !== null;
    }
  }

  public setActiveGrip(gripId: string | null) {
    this.state.activeGrip = gripId;
    if (!this.transformControls) return;

    if (!gripId || !this.state.enabled) {
      this.transformControls.enabled = false;
      this.transformControls.getHelper().visible = false;
      return;
    }

    const gripMesh = this.gripObjects.get(gripId);
    if (gripMesh) {
      this.gripAnchor.position.copy(gripMesh.position);
    }

    // Configure constraint axes
    this.transformControls.showX = gripId === '-X' || gripId === '+X' || gripId === 'ALL';
    this.transformControls.showY = gripId === '-Y' || gripId === '+Y' || gripId === 'ALL';
    this.transformControls.showZ = gripId === '-Z' || gripId === '+Z' || gripId === 'ALL';

    this.transformControls.enabled = true;
    this.transformControls.getHelper().visible = this.state.visible;
  }

  public setBounds(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number
  ) {
    this.state.minX = minX;
    this.state.maxX = maxX;
    this.state.minY = minY;
    this.state.maxY = maxY;
    this.state.minZ = minZ;
    this.state.maxZ = maxZ;
    this.updatePlanesAndVisuals();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  private updatePlanesAndVisuals() {
    const { minX, maxX, minY, maxY, minZ, maxZ, enabled, visible } = this.state;

    // 6 Planes
    this.planes[0].set(new THREE.Vector3(1, 0, 0), -minX);   // x >= minX
    this.planes[1].set(new THREE.Vector3(-1, 0, 0), maxX);   // x <= maxX
    this.planes[2].set(new THREE.Vector3(0, 1, 0), -minY);   // y >= minY
    this.planes[3].set(new THREE.Vector3(0, -1, 0), maxY);   // y <= maxY
    this.planes[4].set(new THREE.Vector3(0, 0, 1), -minZ);   // z >= minZ
    this.planes[5].set(new THREE.Vector3(0, 0, -1), maxZ);   // z <= maxZ

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const sx = Math.max(maxX - minX, 0.001);
    const sy = Math.max(maxY - minY, 0.001);
    const sz = Math.max(maxZ - minZ, 0.001);

    const isVisible = enabled && visible;
    this.boxWireframe.visible = isVisible;

    if (isVisible) {
      this.boxWireframe.position.set(cx, cy, cz);
      this.boxWireframe.scale.set(sx, sy, sz);

      // Position 6 face grips + center
      const gSize = Math.max(Math.min(sx, sy, sz) * 0.06, 0.35);
      this.gripObjects.forEach((m) => {
        m.scale.set(gSize, gSize, gSize);
        m.visible = true;
      });

      this.gripObjects.get('-X')?.position.set(minX, cy, cz);
      this.gripObjects.get('+X')?.position.set(maxX, cy, cz);
      this.gripObjects.get('-Y')?.position.set(cx, minY, cz);
      this.gripObjects.get('+Y')?.position.set(cx, maxY, cz);
      this.gripObjects.get('-Z')?.position.set(cx, cy, minZ);
      this.gripObjects.get('+Z')?.position.set(cx, cy, maxZ);
      this.gripObjects.get('ALL')?.position.set(cx, cy, cz);

      if (this.state.activeGrip) {
        const activeMesh = this.gripObjects.get(this.state.activeGrip);
        if (activeMesh) {
          this.gripAnchor.position.copy(activeMesh.position);
        }
      }
    }
  }

  public checkGripHit(e: MouseEvent, viewportRect: DOMRect): string | null {
    if (!this.state.enabled || !this.state.visible) return null;

    this.mouse.x = ((e.clientX - viewportRect.left) / viewportRect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - viewportRect.top) / viewportRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.gripObjects.values());
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      return intersects[0].object.userData.gripId || null;
    }
    return null;
  }

  public getClippingPlanes(): THREE.Plane[] {
    return this.state.enabled ? this.planes : [];
  }

  public getState(): SectionBoxState {
    return { ...this.state };
  }

  public dispose() {
    this.disable();
    this.boxWireframe.geometry.dispose();
    this.gripObjects.forEach((m) => m.geometry.dispose());
    if (this.transformControls) {
      this.transformControls.dispose();
    }
  }
}
