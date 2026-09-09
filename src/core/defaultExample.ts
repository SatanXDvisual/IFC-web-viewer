/**
 * Default TypeScript sample code for Web-IFC Code Playground
 * Generates a 6x6 grid of parametric 3D structural IFC columns with shapes & properties
 */
export const DEFAULT_IFC_CODE = `/**
 * Web-IFC BIM Code Playground
 * 6x6 Structural Column Grid (36 IFC Columns)
 * 
 * Available in execution scope:
 * - ifcAPI: initialized Web-IFC API instance
 * - modelID: current IFC4 model ID handle
 * - WebIFC: root WebIFC namespace
 * - All IFC entity codes (IFCCOLUMN, IFCCARTESIANPOINT, etc.)
 */

// Helper functions for IFC types
const len = (val: number) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCLENGTHMEASURE, val);
const posLen = (val: number) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCPOSITIVELENGTHMEASURE, val);
const label = (str: string) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCLABEL, str);
const text = (str: string) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCTEXT, str);
const id = (str: string) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCIDENTIFIER, str);
const guid = () => ifcAPI.CreateIFCGloballyUniqueId(modelID);

console.log("Generating 6x6 Structural Column Grid in IFC4...");

// 1. World Origin and Coordinate Axes
const pt0 = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCCARTESIANPOINT, [len(0), len(0), len(0)]);
ifcAPI.WriteLine(modelID, pt0);

const dirZ = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCDIRECTION, [len(0), len(0), len(1)]);
ifcAPI.WriteLine(modelID, dirZ);

const dirX = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCDIRECTION, [len(1), len(0), len(0)]);
ifcAPI.WriteLine(modelID, dirX);

const axisWorld = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCAXIS2PLACEMENT3D, pt0, dirZ, dirX);
ifcAPI.WriteLine(modelID, axisWorld);

// 2. Project Units (Metre, Square Metre, Cubic Metre)
const unitLength = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCSIUNIT, null, { type: WebIFC.ENUM, value: "LENGTHUNIT" }, null, { type: WebIFC.ENUM, value: "METRE" });
ifcAPI.WriteLine(modelID, unitLength);

const unitArea = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCSIUNIT, null, { type: WebIFC.ENUM, value: "AREAUNIT" }, null, { type: WebIFC.ENUM, value: "SQUARE_METRE" });
ifcAPI.WriteLine(modelID, unitArea);

const unitVolume = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCSIUNIT, null, { type: WebIFC.ENUM, value: "VOLUMEUNIT" }, null, { type: WebIFC.ENUM, value: "CUBIC_METRE" });
ifcAPI.WriteLine(modelID, unitVolume);

const unitAssignment = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCUNITASSIGNMENT, [unitLength, unitArea, unitVolume]);
ifcAPI.WriteLine(modelID, unitAssignment);

// 3. Geometric Representation Context
const context = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCGEOMETRICREPRESENTATIONCONTEXT,
  null,
  label("Model"),
  3,
  1e-5,
  axisWorld,
  dirZ
);
ifcAPI.WriteLine(modelID, context);

// 4. Root IFCPROJECT Entity
const project = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCPROJECT,
  guid(),
  null,
  label("Column Grid Project"),
  text("Parametric 6x6 Concrete Columns"),
  null,
  null,
  null,
  [context],
  unitAssignment
);
ifcAPI.WriteLine(modelID, project);

// 3. Circle Profile Definition (Radius = 0.25m -> 500mm diameter)
const pt2d = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCCARTESIANPOINT, [len(0), len(0)]);
ifcAPI.WriteLine(modelID, pt2d);

const axis2d = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCAXIS2PLACEMENT2D, pt2d, null);
ifcAPI.WriteLine(modelID, axis2d);

const circleProfile = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCCIRCLEPROFILEDEF,
  { type: WebIFC.ENUM, value: "AREA" },
  label("CircularColumnProfile"),
  axis2d,
  posLen(0.25)
);
ifcAPI.WriteLine(modelID, circleProfile);

// 4. Extruded Area Solid (Height = 3.6m)
const solid = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCEXTRUDEDAREASOLID,
  circleProfile,
  axisWorld,
  dirZ,
  posLen(3.6)
);
ifcAPI.WriteLine(modelID, solid);

// 5. Shape Representation & Product Definition Shape
const shapeRep = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCSHAPEREPRESENTATION,
  context,
  label("Body"),
  label("SweptSolid"),
  [solid]
);
ifcAPI.WriteLine(modelID, shapeRep);

const prodDefShape = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCPRODUCTDEFINITIONSHAPE,
  null,
  null,
  [shapeRep]
);
ifcAPI.WriteLine(modelID, prodDefShape);

// 6. Generate 6x6 Grid of IFC Columns (36 Columns)
const SPACING = 4.0; // 4 meters grid spacing
let count = 0;

for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 6; col++) {
    count++;
    const x = col * SPACING;
    const y = row * SPACING;

    // Local placement for this column
    const ptCol = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCCARTESIANPOINT, [len(x), len(y), len(0)]);
    ifcAPI.WriteLine(modelID, ptCol);

    const axisCol = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCAXIS2PLACEMENT3D, ptCol, dirZ, dirX);
    ifcAPI.WriteLine(modelID, axisCol);

    const locPl = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCLOCALPLACEMENT, null, axisCol);
    ifcAPI.WriteLine(modelID, locPl);

    // Create IFCCOLUMN entity
    const colEntity = ifcAPI.CreateIfcEntity(
      modelID,
      WebIFC.IFCCOLUMN,
      guid(),
      null,
      label("Column_R" + (row + 1) + "_C" + (col + 1)),
      text("Round Reinforced Concrete Column Ø500mm"),
      label("Structural Column"),
      locPl,
      prodDefShape,
      id("COL-" + count),
      null
    );
    ifcAPI.WriteLine(modelID, colEntity);
  }
}

console.log("Successfully created 36 IFC columns in model!");
`;
