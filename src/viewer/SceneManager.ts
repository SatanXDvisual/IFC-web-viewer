import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as WebIFC from 'web-ifc';
import { IfcMeshBuilder } from './IfcMeshBuilder';
import { SelectionManager } from './SelectionManager';
import { PlanarSectionManager } from '../clipping/PlanarSectionManager';
import { SectionBoxManager } from '../clipping/SectionBoxManager';
import { ClippingCoordinator } from '../clipping/ClippingCoordinator';
import { ModelBounds } from '../types';
import { logger } from '../logging/Logger';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private modelGroup = new THREE.Group();
  private gridHelper: THREE.GridHelper;
  private meshBuilder = new IfcMeshBuilder();
  private selectionManager: SelectionManager;
  private planarManager: PlanarSectionManager;
  private sectionBoxManager: SectionBoxManager;
  private clippingCoordinator: ClippingCoordinator;

  private isRendering = false;
  private animationFrameId: number | null = null;
  private currentBounds: ModelBounds | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(
    private container: HTMLElement,
    private onElementSelected?: (expressID: number | null, modelID: number | null) => void,
    private onToast?: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void
  ) {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8cc7de); // Architectural sky blue

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(20, 20, 20);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(30, 50, 40);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight2.position.set(-30, -20, -30);
    this.scene.add(dirLight2);

    // 6. Grid Helper
    this.gridHelper = new THREE.GridHelper(50, 50, 0x5588aa, 0x77aacc);
    this.gridHelper.position.y = -0.01;
    this.scene.add(this.gridHelper);

    // 7. Model Group
    this.modelGroup.name = 'IFC_MODEL_ROOT';
    this.scene.add(this.modelGroup);

    // 8. Managers
    this.selectionManager = new SelectionManager(this.scene);
    this.selectionManager.setCallback((expressID, modelID) => {
      if (this.onElementSelected) {
        this.onElementSelected(expressID, modelID);
      }
      if (expressID !== null && this.onToast) {
        this.onToast('info', `Selected Element #${expressID}`);
      }
    });

    const onGizmoDrag = (dragging: boolean) => {
      this.controls.enabled = !dragging;
    };

    this.planarManager = new PlanarSectionManager(
      this.scene,
      this.camera,
      this.renderer.domElement,
      onGizmoDrag
    );

    this.sectionBoxManager = new SectionBoxManager(
      this.scene,
      this.camera,
      this.renderer.domElement,
      onGizmoDrag
    );

    this.clippingCoordinator = new ClippingCoordinator(
      this.renderer,
      this.planarManager,
      this.sectionBoxManager
    );

    this.setupEventListeners();
    this.startLoop();
  }

  private setupEventListeners() {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', (e: MouseEvent) => {
      this.selectionManager.onPointerDown(e);
    });

    el.addEventListener('pointerup', (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();

      // Check if picking surface for planar section
      if (this.planarManager.isPicking()) {
        this.handlePlanarSurfacePick(e, rect);
        return;
      }

      // Check if clicked Section Box Grip in 3D
      const hitGrip = this.sectionBoxManager.checkGripHit(e, rect);
      if (hitGrip) {
        this.sectionBoxManager.setActiveGrip(hitGrip);
        if (this.onToast) this.onToast('info', `Active Grip: ${hitGrip}`);
        return;
      }

      // Standard IFC element selection
      this.selectionManager.onPointerUp(e, this.camera, this.modelGroup, rect);
    });

    el.addEventListener('mousemove', (e: MouseEvent) => {
      // Hover effect on Section Box Grips
      const rect = el.getBoundingClientRect();
      const hitGrip = this.sectionBoxManager.checkGripHit(e, rect);
      el.style.cursor = hitGrip ? 'pointer' : this.planarManager.isPicking() ? 'crosshair' : 'default';
    });
  }

  private handlePlanarSurfacePick(e: MouseEvent, rect: DOMRect) {
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.modelGroup.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;
      const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);

      // Convert normal to world space if object has transform
      normal.transformDirection(hit.object.matrixWorld);

      this.planarManager.pickSurface(point, normal);
      if (this.onToast) {
        this.onToast('success', 'Đã đặt mặt cắt phẳng tại bề mặt được chọn');
      }
    } else {
      this.planarManager.setPickingMode(false);
      if (this.onToast) {
        this.onToast('warning', 'Không chạm bề mặt nào, đã hủy chế độ chọn');
      }
    }
  }

  private startLoop() {
    this.isRendering = true;
    const animate = () => {
      if (!this.isRendering) return;
      this.animationFrameId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public renderModel(api: WebIFC.IfcAPI, modelID: number): number {
    this.clearModel();
    let meshCount = 0;

    try {
      api.StreamAllMeshes(modelID, (flatMesh: WebIFC.FlatMesh) => {
        const meshes = this.meshBuilder.buildMeshesForFlatMesh(api, modelID, flatMesh);
        for (const mesh of meshes) {
          this.modelGroup.add(mesh);
          meshCount++;
        }
      });

      this.updateModelBoundsAndCamera();
      logger.addLog('SUCCESS', `Rendered ${meshCount} 3D IFC element meshes into Viewport`);
      return meshCount;
    } catch (err: any) {
      logger.addLog('ERROR', `Failed to render IFC geometry: ${err.message}`, undefined, err.stack);
      throw err;
    }
  }

  public updateModelBoundsAndCamera() {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    if (box.isEmpty()) {
      return;
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 5);
    this.currentBounds = {
      min: box.min.clone(),
      max: box.max.clone(),
      center: center.clone(),
      size: size.clone(),
      maxDimension: maxDim,
    };

    // Auto-fit camera
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.8;

    this.camera.near = Math.max(maxDim / 500, 0.1);
    this.camera.far = Math.max(maxDim * 50, 1000);
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + cameraDistance * 0.7,
      center.y + cameraDistance * 0.6,
      center.z + cameraDistance * 0.8
    );
    this.controls.update();

    // Adjust grid helper position & size
    this.gridHelper.position.y = box.min.y - 0.05;

    // Update bounds in clipping managers
    this.planarManager.setModelBounds(this.currentBounds);
    this.sectionBoxManager.setModelBounds(this.currentBounds);
    this.clippingCoordinator.updatePlanes();
  }

  public fitCamera() {
    if (this.currentBounds) {
      const { center, maxDimension } = this.currentBounds;
      const fov = this.camera.fov * (Math.PI / 180);
      const cameraDistance = (maxDimension / 2) / Math.tan(fov / 2) * 1.8;

      this.controls.target.copy(center);
      this.camera.position.set(
        center.x + cameraDistance * 0.7,
        center.y + cameraDistance * 0.6,
        center.z + cameraDistance * 0.8
      );
      this.controls.update();
    }
  }

  public selectElement(expressID: number, modelID: number) {
    this.selectionManager.selectElement(expressID, modelID, this.modelGroup);
  }

  public clearSelection() {
    this.selectionManager.clearSelection();
  }

  public fitSectionBoxToSelected(): boolean {
    const selectedID = this.selectionManager.getSelectedExpressID();
    if (selectedID === null) {
      return false;
    }
    return this.sectionBoxManager.fitToElement(selectedID, this.modelGroup);
  }

  public clearModel() {
    this.selectionManager.clearSelection();
    this.meshBuilder.clearCache();

    while (this.modelGroup.children.length > 0) {
      const obj = this.modelGroup.children[0];
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
      this.modelGroup.remove(obj);
    }

    this.currentBounds = null;
    this.clippingCoordinator.clearAll();
  }

  public onResize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public getPlanarManager(): PlanarSectionManager {
    return this.planarManager;
  }

  public getSectionBoxManager(): SectionBoxManager {
    return this.sectionBoxManager;
  }

  public getModelBounds(): ModelBounds | null {
    return this.currentBounds;
  }

  public dispose() {
    this.isRendering = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearModel();
    this.selectionManager.dispose();
    this.planarManager.dispose();
    this.sectionBoxManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
