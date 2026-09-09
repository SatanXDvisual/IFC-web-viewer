import * as THREE from 'three';

export class SelectionManager {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pointerDownPos = new THREE.Vector2();
  private highlightGroup = new THREE.Group();
  private selectedExpressID: number | null = null;
  private selectedModelID: number | null = null;
  private isEnabled = true;

  // Custom Highlight Materials
  private surfaceHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });

  private wireframeHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    wireframe: true,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
    depthWrite: false,
  });

  private onSelectCallback?: (expressID: number | null, modelID: number | null) => void;

  constructor(scene: THREE.Scene) {
    this.highlightGroup.name = 'IFC_HIGHLIGHT_GROUP';
    scene.add(this.highlightGroup);
  }

  public setCallback(cb: (expressID: number | null, modelID: number | null) => void) {
    this.onSelectCallback = cb;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public onPointerDown(e: MouseEvent) {
    this.pointerDownPos.set(e.clientX, e.clientY);
  }

  public onPointerUp(
    e: MouseEvent,
    camera: THREE.Camera,
    modelGroup: THREE.Group,
    viewportRect: DOMRect
  ) {
    if (!this.isEnabled) return;

    // Distinguish click from orbit/pan: max 6px movement
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 36) {
      // Considered drag / orbit
      return;
    }

    // Normalized Device Coordinates (-1 to +1) relative to viewport
    this.mouse.x = ((e.clientX - viewportRect.left) / viewportRect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - viewportRect.top) / viewportRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObjects(modelGroup.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (hit.userData && hit.userData.expressID !== undefined) {
        const expressID = hit.userData.expressID;
        const modelID = hit.userData.modelID;
        this.selectElement(expressID, modelID, modelGroup);
        return;
      }
    }

    // Clicked empty background -> clear selection
    this.clearSelection();
  }

  public selectElement(expressID: number, modelID: number, modelGroup: THREE.Group) {
    this.selectedExpressID = expressID;
    this.selectedModelID = modelID;
    this.clearHighlight();

    // Find all meshes belonging to this expressID
    const targetMeshes: THREE.Mesh[] = [];
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.expressID === expressID) {
        targetMeshes.push(child);
      }
    });

    // Create 2 highlight layers (surface + wireframe)
    for (const mesh of targetMeshes) {
      const surfaceMesh = new THREE.Mesh(mesh.geometry, this.surfaceHighlightMaterial);
      surfaceMesh.matrix = mesh.matrix.clone();
      surfaceMesh.matrixAutoUpdate = false;
      this.highlightGroup.add(surfaceMesh);

      const wireframeMesh = new THREE.Mesh(mesh.geometry, this.wireframeHighlightMaterial);
      wireframeMesh.matrix = mesh.matrix.clone();
      wireframeMesh.matrixAutoUpdate = false;
      this.highlightGroup.add(wireframeMesh);
    }

    if (this.onSelectCallback) {
      this.onSelectCallback(expressID, modelID);
    }
  }

  public clearHighlight() {
    while (this.highlightGroup.children.length > 0) {
      this.highlightGroup.remove(this.highlightGroup.children[0]);
    }
  }

  public clearSelection() {
    this.selectedExpressID = null;
    this.selectedModelID = null;
    this.clearHighlight();
    if (this.onSelectCallback) {
      this.onSelectCallback(null, null);
    }
  }

  public getSelectedExpressID(): number | null {
    return this.selectedExpressID;
  }

  public getSelectedModelID(): number | null {
    return this.selectedModelID;
  }

  public dispose() {
    this.clearHighlight();
    this.surfaceHighlightMaterial.dispose();
    this.wireframeHighlightMaterial.dispose();
  }
}
