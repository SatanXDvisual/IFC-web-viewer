import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { PlanarSectionState, ModelBounds } from '../types';

export class PlanarSectionManager {
  private clippingPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  private state: PlanarSectionState = {
    enabled: false,
    visible: true,
    normal: [0, -1, 0],
    offset: 0,
    picking: false,
  };

  private helperGroup = new THREE.Group();
  private planeMesh: THREE.Mesh;
  private transformControls: TransformControls | null = null;
  private gizmoAnchor = new THREE.Object3D();
  private onChangeCallback?: () => void;
  private baseCenter = new THREE.Vector3(0, 0, 0);
  private modelBounds: ModelBounds | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private domElement: HTMLElement,
    private onGizmoDragChange?: (dragging: boolean) => void
  ) {
    this.helperGroup.name = 'PLANAR_SECTION_HELPERS';
    this.scene.add(this.helperGroup);
    this.scene.add(this.gizmoAnchor);

    // Visual plane helper (semi-transparent colored sheet)
    const geom = new THREE.PlaneGeometry(30, 30);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.planeMesh = new THREE.Mesh(geom, mat);
    this.planeMesh.visible = false;
    this.helperGroup.add(this.planeMesh);

    this.setupGizmo();
  }

  private setupGizmo() {
    this.transformControls = new TransformControls(this.camera, this.domElement);
    this.transformControls.size = 0.8;
    this.transformControls.setMode('translate');
    this.transformControls.showX = true;
    this.transformControls.showY = true;
    this.transformControls.showZ = true;

    this.transformControls.addEventListener('dragging-changed', (event) => {
      const isDragging = !!event.value;
      if (this.onGizmoDragChange) {
        this.onGizmoDragChange(isDragging);
      }
    });

    this.transformControls.addEventListener('change', () => {
      if (!this.state.enabled) return;
      // When gizmo anchor moves, update plane position & offset
      const normal = new THREE.Vector3(...this.state.normal).normalize();
      const currentPos = this.gizmoAnchor.position;
      // Constant = -dot(normal, point)
      this.clippingPlane.constant = -normal.dot(currentPos);
      this.state.offset = normal.dot(currentPos.clone().sub(this.baseCenter));
      this.updateVisuals();
      if (this.onChangeCallback) this.onChangeCallback();
    });

    this.scene.add(this.transformControls.getHelper());
    this.transformControls.attach(this.gizmoAnchor);
    this.transformControls.enabled = false;
    this.transformControls.getHelper().visible = false;
  }

  public setCallback(cb: () => void) {
    this.onChangeCallback = cb;
  }

  public setModelBounds(bounds: ModelBounds) {
    this.modelBounds = bounds;
    this.baseCenter.copy(bounds.center);
    const maxDim = Math.max(bounds.maxDimension * 1.5, 20);
    this.planeMesh.geometry.dispose();
    this.planeMesh.geometry = new THREE.PlaneGeometry(maxDim, maxDim);
  }

  public enable() {
    this.state.enabled = true;
    this.updatePlaneFromState();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public disable() {
    this.state.enabled = false;
    this.state.picking = false;
    this.planeMesh.visible = false;
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
    this.planeMesh.visible = this.state.enabled && visible;
    if (this.transformControls) {
      this.transformControls.getHelper().visible = this.state.enabled && visible;
    }
  }

  public setPreset(preset: 'top' | 'front' | 'side') {
    this.state.enabled = true;
    this.state.offset = 0;
    if (preset === 'top') {
      this.state.normal = [0, -1, 0];
    } else if (preset === 'front') {
      this.state.normal = [0, 0, -1];
    } else if (preset === 'side') {
      this.state.normal = [-1, 0, 0];
    }
    this.updatePlaneFromState();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public setOffset(offset: number) {
    this.state.offset = offset;
    this.updatePlaneFromState();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public flip() {
    this.state.normal = [-this.state.normal[0], -this.state.normal[1], -this.state.normal[2]];
    this.state.offset = -this.state.offset;
    this.updatePlaneFromState();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  public setPickingMode(picking: boolean) {
    this.state.picking = picking;
  }

  public isPicking(): boolean {
    return this.state.picking;
  }

  public pickSurface(point: THREE.Vector3, normal: THREE.Vector3) {
    this.state.enabled = true;
    this.state.picking = false;
    // Section normal points opposite to hit normal so model behind face is kept
    const cutNormal = normal.clone().negate().normalize();
    this.state.normal = [cutNormal.x, cutNormal.y, cutNormal.z];
    this.baseCenter.copy(point);
    this.state.offset = 0;
    this.updatePlaneFromState();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  private updatePlaneFromState() {
    const normal = new THREE.Vector3(...this.state.normal).normalize();
    const planePos = this.baseCenter.clone().add(normal.clone().multiplyScalar(this.state.offset));
    this.clippingPlane.setFromNormalAndCoplanarPoint(normal, planePos);
    this.gizmoAnchor.position.copy(planePos);

    this.updateVisuals();
  }

  private updateVisuals() {
    const isVisible = this.state.enabled && this.state.visible;
    this.planeMesh.visible = isVisible;

    if (isVisible) {
      const normal = new THREE.Vector3(...this.state.normal).normalize();
      const planePos = this.gizmoAnchor.position;
      this.planeMesh.position.copy(planePos);
      this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    }

    if (this.transformControls) {
      this.transformControls.enabled = isVisible;
      this.transformControls.getHelper().visible = isVisible;
    }
  }

  public getClippingPlane(): THREE.Plane | null {
    return this.state.enabled ? this.clippingPlane : null;
  }

  public getState(): PlanarSectionState {
    return { ...this.state };
  }

  public dispose() {
    this.disable();
    this.planeMesh.geometry.dispose();
    if (this.transformControls) {
      this.transformControls.dispose();
    }
  }
}
