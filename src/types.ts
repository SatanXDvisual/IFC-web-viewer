/**
 * Shared Type Definitions for Web-IFC BIM Viewer & IFC Code Playground
 */
import * as THREE from 'three';

export type LogType = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
  details?: string;
  stack?: string;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
  duration?: number;
}

export interface PropertyValue {
  name: string;
  value: string | number | boolean;
  unit?: string;
}

export interface PropertySetSection {
  name: string;
  expressID?: number;
  properties: PropertyValue[];
}

export interface ElementPropertiesData {
  expressID: number;
  ifcType: string;
  globalId?: string;
  name?: string;
  description?: string;
  objectType?: string;
  tag?: string;
  propertySets: PropertySetSection[];
  typeProperties?: {
    name?: string;
    tag?: string;
    expressID?: number;
    properties?: PropertyValue[];
  };
  materialProperties?: {
    name: string;
    category?: string;
    expressID: number;
  }[];
}

export interface PlanarSectionState {
  enabled: boolean;
  visible: boolean;
  normal: [number, number, number];
  offset: number;
  picking: boolean;
}

export interface SectionBoxState {
  enabled: boolean;
  visible: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  activeGrip: string | null; // '-X' | '+X' | '-Y' | '+Y' | '-Z' | '+Z' | 'ALL' | null
}

export interface ModelBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  maxDimension: number;
}
