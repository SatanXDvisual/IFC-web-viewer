import * as WebIFC from 'web-ifc';
import { ElementPropertiesData, PropertySetSection, PropertyValue } from '../types';
import { logger } from '../logging/Logger';

export class PropertyInspector {
  public static async inspectElement(
    api: WebIFC.IfcAPI,
    modelID: number,
    expressID: number
  ): Promise<ElementPropertiesData> {
    try {
      const line = api.GetLine(modelID, expressID, true);
      const typeCode = line?.type !== undefined ? line.type : api.GetLineType(modelID, expressID);
      const typeName = api.GetNameFromTypeCode(typeCode) || 'IFCELEMENT';

      // 1. Identity & Attributes
      const globalId = line?.GlobalId?.value || line?.GlobalId || '';
      const name = line?.Name?.value || line?.Name || '';
      const description = line?.Description?.value || line?.Description || '';
      const objectType = line?.ObjectType?.value || line?.ObjectType || '';
      const tag = line?.Tag?.value || line?.Tag || '';

      // 2. Property Sets
      const propertySets: PropertySetSection[] = [];
      try {
        const rawPsets = await api.properties.getPropertySets(modelID, expressID, true);
        if (Array.isArray(rawPsets)) {
          for (const pset of rawPsets) {
            const psetName = pset.Name?.value || pset.Name || 'PropertySet';
            const props: PropertyValue[] = [];

            // Case A: HasProperties
            if (Array.isArray(pset.HasProperties)) {
              for (const p of pset.HasProperties) {
                const propVal = this.extractPropertyValue(p);
                if (propVal) props.push(propVal);
              }
            }
            // Case B: Quantities (IfcElementQuantity)
            if (Array.isArray(pset.Quantities)) {
              for (const q of pset.Quantities) {
                const qVal = this.extractQuantityValue(q);
                if (qVal) props.push(qVal);
              }
            }

            if (props.length > 0) {
              propertySets.push({
                name: psetName,
                expressID: pset.expressID,
                properties: props,
              });
            }
          }
        }
      } catch (err: any) {
        logger.addLog('WARN', `Failed to load Psets for element #${expressID}: ${err.message}`);
      }

      // 3. Type Properties
      let typeProps: ElementPropertiesData['typeProperties'];
      try {
        const rawTypeProps = await api.properties.getTypeProperties(modelID, expressID, true);
        if (Array.isArray(rawTypeProps) && rawTypeProps.length > 0) {
          const typeObj = rawTypeProps[0];
          const typeNameVal = typeObj.Name?.value || typeObj.Name || '';
          const typeTagVal = typeObj.Tag?.value || typeObj.Tag || '';
          const innerProps: PropertyValue[] = [];

          if (Array.isArray(typeObj.HasPropertySets)) {
            for (const subPset of typeObj.HasPropertySets) {
              if (Array.isArray(subPset.HasProperties)) {
                for (const p of subPset.HasProperties) {
                  const pv = this.extractPropertyValue(p);
                  if (pv) innerProps.push(pv);
                }
              }
            }
          }

          typeProps = {
            name: typeNameVal,
            tag: typeTagVal,
            expressID: typeObj.expressID,
            properties: innerProps,
          };
        }
      } catch (err: any) {
        logger.addLog('WARN', `Failed to load Type Properties for #${expressID}: ${err.message}`);
      }

      // 4. Material Properties
      const materials: ElementPropertiesData['materialProperties'] = [];
      try {
        const rawMats = await api.properties.getMaterialsProperties(modelID, expressID, true);
        if (Array.isArray(rawMats)) {
          for (const mat of rawMats) {
            const matName = mat.Name?.value || mat.Name || 'Unnamed Material';
            const cat = mat.Category?.value || mat.Category || undefined;
            materials.push({
              name: matName,
              category: cat,
              expressID: mat.expressID,
            });
          }
        }
      } catch (err: any) {
        logger.addLog('WARN', `Failed to load Materials for #${expressID}: ${err.message}`);
      }

      return {
        expressID,
        ifcType: typeName.toUpperCase(),
        globalId: globalId ? String(globalId) : undefined,
        name: name ? String(name) : undefined,
        description: description ? String(description) : undefined,
        objectType: objectType ? String(objectType) : undefined,
        tag: tag ? String(tag) : undefined,
        propertySets,
        typeProperties: typeProps,
        materialProperties: materials.length > 0 ? materials : undefined,
      };
    } catch (err: any) {
      logger.addLog('ERROR', `Error inspecting element #${expressID}: ${err.message}`);
      throw err;
    }
  }

  private static extractPropertyValue(prop: any): PropertyValue | null {
    if (!prop) return null;
    const name = prop.Name?.value || prop.Name || 'Property';
    let value: string | number | boolean = '—';
    let unit: string | undefined;

    if (prop.NominalValue !== undefined && prop.NominalValue !== null) {
      const nom = prop.NominalValue;
      if (typeof nom === 'object') {
        if (nom._representationValue !== undefined) {
          value = nom._representationValue;
        } else if (nom.value !== undefined) {
          value = nom.value;
        } else if (nom._internalValue !== undefined) {
          value = nom._internalValue;
        }
        if (nom.name) {
          const typeStr = String(nom.name).toLowerCase();
          if (typeStr.includes('length')) unit = 'm';
          else if (typeStr.includes('area')) unit = 'm²';
          else if (typeStr.includes('volume')) unit = 'm³';
          else if (typeStr.includes('mass') || typeStr.includes('weight')) unit = 'kg';
        }
      } else {
        value = nom;
      }
    } else if (prop.Value !== undefined) {
      value = prop.Value?.value !== undefined ? prop.Value.value : prop.Value;
    }

    if (typeof value === 'number') {
      value = Number(value.toFixed(3));
    }

    return { name, value, unit };
  }

  private static extractQuantityValue(q: any): PropertyValue | null {
    if (!q) return null;
    const name = q.Name?.value || q.Name || 'Quantity';
    let value: number = 0;
    let unit: string = '';

    if (q.LengthValue !== undefined) {
      value = q.LengthValue?.value || q.LengthValue || 0;
      unit = 'm';
    } else if (q.AreaValue !== undefined) {
      value = q.AreaValue?.value || q.AreaValue || 0;
      unit = 'm²';
    } else if (q.VolumeValue !== undefined) {
      value = q.VolumeValue?.value || q.VolumeValue || 0;
      unit = 'm³';
    } else if (q.CountValue !== undefined) {
      value = q.CountValue?.value || q.CountValue || 0;
      unit = 'pcs';
    } else if (q.WeightValue !== undefined) {
      value = q.WeightValue?.value || q.WeightValue || 0;
      unit = 'kg';
    }

    return {
      name,
      value: Number(value.toFixed(3)),
      unit: unit || undefined,
    };
  }
}
