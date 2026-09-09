import * as THREE from 'three';
import { PlanarSectionManager } from './PlanarSectionManager';
import { SectionBoxManager } from './SectionBoxManager';
import { logger } from '../logging/Logger';

export class ClippingCoordinator {
  constructor(
    private renderer: THREE.WebGLRenderer,
    private planarManager: PlanarSectionManager,
    private sectionBoxManager: SectionBoxManager
  ) {
    this.planarManager.setCallback(() => this.updatePlanes());
    this.sectionBoxManager.setCallback(() => this.updatePlanes());
    this.updatePlanes();
  }

  public updatePlanes() {
    const planes: THREE.Plane[] = [];

    // Planar plane (1 plane if enabled)
    const planarPlane = this.planarManager.getClippingPlane();
    if (planarPlane) {
      planes.push(planarPlane);
    }

    // Section box planes (6 planes if enabled)
    const boxPlanes = this.sectionBoxManager.getClippingPlanes();
    if (boxPlanes && boxPlanes.length > 0) {
      planes.push(...boxPlanes);
    }

    this.renderer.clippingPlanes = planes;
    this.renderer.localClippingEnabled = planes.length > 0;
  }

  public clearAll() {
    this.planarManager.disable();
    this.sectionBoxManager.disable();
    this.updatePlanes();
    logger.addLog('INFO', 'All clipping planes disabled');
  }
}
