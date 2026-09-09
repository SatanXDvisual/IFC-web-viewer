/**
 * Sample IFC BIM Code Templates for Web-IFC Playground
 */

export const FACTORY_MEP_V2_CODE = `(() => {
    console.log("### FACTORY ARCHITECTURE STRUCTURE MEP PARAMETRIC BIM GENERATOR V2.0 - IFC4 / LOD400-ORIENTED ###");

    let __stage = "INIT";
    let __elementCount = 0;
    let __styleWarningShown = false;
    let __semanticWarningShown = false;

    const __counts = {
        PIPE: 0,
        PIPE_FITTING: 0,
        VALVE: 0,
        DUCT: 0,
        DUCT_FITTING: 0,
        AIR_TERMINAL: 0,
        CABLE_TRAY: 0,
        CONDUIT: 0,
        ELECTRICAL: 0,
        EQUIPMENT: 0,
        FIRE: 0,
        SUPPORT: 0,
        STRUCTURE: 0,
        SPACE: 0,
        SENSOR: 0
    };

    try {
        function __setStage(name) {
            __stage = name;
            console.log("[MEP]", name);
        }

        // ============================================================
        // 01. RESOLVE / CREATE CLEAN IFC4 MODEL
        // ============================================================
        __setStage("RESOLVE IFC4 MODEL");

        if (typeof ifcAPI === "undefined" || !ifcAPI) {
            throw new Error("ifcAPI is not available in this Web-IFC Viewer.");
        }

        let __modelID = -1;

        // For a large coordinated MEP model, prefer a fresh model on every run.
        // This avoids duplicate geometry and stale unit assignments from prior tests.
        if (typeof ifcAPI.CreateModel === "function") {
            __modelID = ifcAPI.CreateModel({
                schema: "IFC4",
                name: "Factory_MEP_IFC4_LOD400_V1_0.ifc",
                description: ["Detailed coordinated factory MEP model - pipes, ducts, cable trays, conduits and MEP equipment"],
                authors: ["HQL BIM"],
                organizations: ["HQL"],
                authorization: "Generated in Web-IFC Viewer"
            });
        } else if (typeof model !== "undefined" && model !== null && model >= 0) {
            __modelID = model;
        }

        if (__modelID < 0) {
            throw new Error("Unable to resolve/create IFC4 model.");
        }

        const __schema = String(ifcAPI.GetModelSchema(__modelID)).toUpperCase();
        if (__schema !== "IFC4") {
            throw new Error("IFC4 required. Current schema: " + __schema);
        }

        globalThis.__FACTORY_MEP_MODEL_ID__ = __modelID;

        // ============================================================
        // 02. VERIFIED PRIMITIVE TYPE IDS
        // ============================================================
        const __T_LENGTH = 1243674935;
        const __T_POS_LENGTH = 2815919920;
        const __T_NONNEG_LENGTH = 525895558;
        const __T_REAL = 200335297;
        const __T_LABEL = 3258342251;
        const __T_IDENTIFIER = 983778844;
        const __T_DIM = 4134073009;
        const __T_BOOLEAN = 2735952531;
        const __T_NORM_RATIO = 2095195183;
        const __T_AREA = 2650437152;
        const __T_VOLUME = 3458127941;
        const __RAW_ENUM = 3;

        function __L(v) { return ifcAPI.CreateIfcType(__modelID, __T_LENGTH, Number(v)); }
        function __PL(v) { return ifcAPI.CreateIfcType(__modelID, __T_POS_LENGTH, Math.max(Number(v), 0.001)); }
        function __NNL(v) { return ifcAPI.CreateIfcType(__modelID, __T_NONNEG_LENGTH, Math.max(Number(v), 0)); }
        function __R(v) { return ifcAPI.CreateIfcType(__modelID, __T_REAL, Number(v)); }
        function __Label(v) { return ifcAPI.CreateIfcType(__modelID, __T_LABEL, String(v)); }
        function __Identifier(v) { return ifcAPI.CreateIfcType(__modelID, __T_IDENTIFIER, String(v)); }
        function __Dim(v) { return ifcAPI.CreateIfcType(__modelID, __T_DIM, Number(v)); }
        function __Bool(v) { return ifcAPI.CreateIfcType(__modelID, __T_BOOLEAN, !!v); }
        function __NR(v) { return ifcAPI.CreateIfcType(__modelID, __T_NORM_RATIO, Math.max(0, Math.min(1, Number(v)))); }
        function __Area(v) { return ifcAPI.CreateIfcType(__modelID, __T_AREA, Math.max(0, Number(v))); }
        function __Volume(v) { return ifcAPI.CreateIfcType(__modelID, __T_VOLUME, Math.max(0, Number(v))); }
        function __Enum(v) { return { type: __RAW_ENUM, value: String(v).toUpperCase() }; }

        // ============================================================
        // 03. ENTITY HELPERS
        // ============================================================
        function __E(name) {
            const code = ifcAPI.GetTypeCodeFromName(String(name).toUpperCase());
            if (!code) throw new Error("Unknown IFC entity: " + name);
            return code;
        }

        function __hasEntity(name) {
            try {
                return !!ifcAPI.GetTypeCodeFromName(String(name).toUpperCase());
            } catch (_) {
                return false;
            }
        }

        function __entity(name) {
            const args = Array.prototype.slice.call(arguments, 1);
            const entity = ifcAPI.CreateIfcEntity.apply(ifcAPI, [__modelID, __E(name)].concat(args));
            ifcAPI.WriteLine(__modelID, entity);
            return entity;
        }

        function __GUID() {
            return ifcAPI.CreateIFCGloballyUniqueId(__modelID);
        }

        function __first(name) {
            try {
                const ids = ifcAPI.GetLineIDsWithType(__modelID, __E(name));
                if (ids && typeof ids.size === "function" && ids.size() > 0) {
                    return ifcAPI.GetLine(__modelID, ids.get(0));
                }
            } catch (_) {}
            return null;
        }

        // ============================================================
        // 04. BASIC VECTOR / GEOMETRY HELPERS
        // ============================================================
        function __vec(x, y, z) { return { x: Number(x), y: Number(y), z: Number(z) }; }
        function __sub(a, b) { return __vec(a.x - b.x, a.y - b.y, a.z - b.z); }
        function __add(a, b) { return __vec(a.x + b.x, a.y + b.y, a.z + b.z); }
        function __mul(a, s) { return __vec(a.x * s, a.y * s, a.z * s); }
        function __len(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); }
        function __norm(a) {
            const l = __len(a);
            if (l < 1e-9) throw new Error("Zero-length vector.");
            return __vec(a.x / l, a.y / l, a.z / l);
        }
        function __cross(a, b) {
            return __vec(
                a.y * b.z - a.z * b.y,
                a.z * b.x - a.x * b.z,
                a.x * b.y - a.y * b.x
            );
        }

        function __basisAlong(p1, p2) {
            const uz = __norm(__sub(p2, p1));
            let ux;
            if (Math.abs(uz.z) < 0.90) {
                ux = __norm(__cross(__vec(0, 0, 1), uz));
            } else {
                ux = __vec(1, 0, 0);
            }
            const uy = __norm(__cross(uz, ux));
            return { ux: ux, uy: uy, uz: uz, length: __len(__sub(p2, p1)) };
        }

        function __point2D(x, y) {
            return __entity("IFCCARTESIANPOINT", [__L(x), __L(y)]);
        }
        function __point3D(x, y, z) {
            return __entity("IFCCARTESIANPOINT", [__L(x), __L(y), __L(z)]);
        }
        function __dir2D(x, y) {
            return __entity("IFCDIRECTION", [__R(x), __R(y)]);
        }
        function __dir3D(x, y, z) {
            return __entity("IFCDIRECTION", [__R(x), __R(y), __R(z)]);
        }
        function __axis2D() {
            return __entity("IFCAXIS2PLACEMENT2D", __point2D(0, 0), __dir2D(1, 0));
        }
        function __axis3D(x, y, z) {
            return __entity(
                "IFCAXIS2PLACEMENT3D",
                __point3D(x, y, z),
                __dir3D(0, 0, 1),
                __dir3D(1, 0, 0)
            );
        }
        function __axisAlong(p1, p2, offsetX, offsetY) {
            const b = __basisAlong(p1, p2);
            const start = __add(p1, __add(__mul(b.ux, offsetX || 0), __mul(b.uy, offsetY || 0)));
            return {
                axis: __entity(
                    "IFCAXIS2PLACEMENT3D",
                    __point3D(start.x, start.y, start.z),
                    __dir3D(b.uz.x, b.uz.y, b.uz.z),
                    __dir3D(b.ux.x, b.ux.y, b.ux.z)
                ),
                basis: b,
                start: start
            };
        }

        // ============================================================
        // 05. REPRESENTATION CONTEXT
        // ============================================================
        __setStage("REPRESENTATION CONTEXT");

        let __context = __first("IFCGEOMETRICREPRESENTATIONCONTEXT");
        if (!__context) {
            __context = __entity(
                "IFCGEOMETRICREPRESENTATIONCONTEXT",
                null,
                __Label("Model"),
                __Dim(3),
                __R(0.01),
                __axis3D(0, 0, 0),
                null
            );
        }

        let __ownerHistory = null;
        try { __ownerHistory = __first("IFCOWNERHISTORY"); } catch (_) { __ownerHistory = null; }

        const __originPlacement = __entity("IFCLOCALPLACEMENT", null, __axis3D(0, 0, 0));

        // ============================================================
        // 06. PROJECT UNITS - MILLIMETRES
        // ============================================================
        __setStage("IFC PROJECT UNITS - MILLIMETRES");

        const __unitLength = __entity("IFCSIUNIT", __Enum("LENGTHUNIT"), __Enum("MILLI"), __Enum("METRE"));
        const __unitArea = __entity("IFCSIUNIT", __Enum("AREAUNIT"), null, __Enum("SQUARE_METRE"));
        const __unitVolume = __entity("IFCSIUNIT", __Enum("VOLUMEUNIT"), null, __Enum("CUBIC_METRE"));
        const __unitAngle = __entity("IFCSIUNIT", __Enum("PLANEANGLEUNIT"), null, __Enum("RADIAN"));
        const __projectUnits = __entity("IFCUNITASSIGNMENT", [__unitLength, __unitArea, __unitVolume, __unitAngle]);

        console.log("[MEP] LENGTH UNIT: MILLIMETRE");
        console.log("[MEP] AREA UNIT: SQUARE_METRE");
        console.log("[MEP] VOLUME UNIT: CUBIC_METRE");

        // ============================================================
        // 07. MATERIAL / SYSTEM COLOUR LIBRARY
        // ============================================================
        __setStage("MATERIAL / SYSTEM APPEARANCE LIBRARY");

        const __MAT = {
            CONCRETE: { name: "Concrete, Cast-in-Place", rgb: [0.60, 0.60, 0.58], transparency: 0.0 },
            STEEL: { name: "Galvanized Steel", rgb: [0.50, 0.53, 0.55], transparency: 0.0 },
            DARK_STEEL: { name: "Black Steel", rgb: [0.13, 0.14, 0.15], transparency: 0.0 },
            STAINLESS: { name: "Stainless Steel", rgb: [0.70, 0.72, 0.73], transparency: 0.0 },
            COPPER: { name: "Copper", rgb: [0.72, 0.37, 0.17], transparency: 0.0 },
            INSULATION: { name: "Pipe Insulation", rgb: [0.28, 0.30, 0.31], transparency: 0.0 },
            CHWS: { name: "CHWS - Blue", rgb: [0.05, 0.35, 0.85], transparency: 0.0 },
            CHWR: { name: "CHWR - Light Blue", rgb: [0.20, 0.65, 0.95], transparency: 0.0 },
            PCWS: { name: "Process Cooling Water Supply", rgb: [0.05, 0.55, 0.70], transparency: 0.0 },
            PCWR: { name: "Process Cooling Water Return", rgb: [0.25, 0.80, 0.85], transparency: 0.0 },
            COMP_AIR: { name: "Compressed Air", rgb: [0.80, 0.58, 0.05], transparency: 0.0 },
            FIRE: { name: "Fire Protection", rgb: [0.85, 0.05, 0.05], transparency: 0.0 },
            DUCT_SUPPLY: { name: "Supply Air Duct", rgb: [0.30, 0.65, 0.85], transparency: 0.0 },
            DUCT_RETURN: { name: "Return Air Duct", rgb: [0.55, 0.75, 0.90], transparency: 0.0 },
            DUCT_EXHAUST: { name: "Exhaust Air Duct", rgb: [0.60, 0.42, 0.25], transparency: 0.0 },
            TRAY_POWER: { name: "Power Cable Tray", rgb: [0.30, 0.30, 0.33], transparency: 0.0 },
            TRAY_ELV: { name: "ELV Cable Tray", rgb: [0.38, 0.18, 0.55], transparency: 0.0 },
            CONDUIT: { name: "Electrical Conduit", rgb: [0.42, 0.42, 0.45], transparency: 0.0 },
            ELECTRICAL: { name: "Electrical Equipment", rgb: [0.85, 0.72, 0.12], transparency: 0.0 },
            EQUIPMENT: { name: "Mechanical Equipment", rgb: [0.72, 0.76, 0.78], transparency: 0.0 },
            FILTER: { name: "Filter Media", rgb: [0.45, 0.55, 0.42], transparency: 0.0 },
            GLASS: { name: "Glass", rgb: [0.35, 0.70, 0.85], transparency: 0.65 },
            SENSOR: { name: "Instrumentation", rgb: [0.90, 0.35, 0.08], transparency: 0.0 }
        };

        const __styleAssignments = {};
        const __materialEntities = {};

        function __getMaterial(matKey) {
            if (__materialEntities[matKey]) return __materialEntities[matKey];
            const d = __MAT[matKey];
            if (!d) throw new Error("Unknown material: " + matKey);
            const m = __entity("IFCMATERIAL", __Label(d.name), null, __Label("Factory MEP Material"));
            __materialEntities[matKey] = m;
            return m;
        }

        function __getStyleAssignment(matKey) {
            if (__styleAssignments[matKey] !== undefined) return __styleAssignments[matKey];
            const d = __MAT[matKey];
            if (!d) return null;
            try {
                const colour = __entity("IFCCOLOURRGB", null, __NR(d.rgb[0]), __NR(d.rgb[1]), __NR(d.rgb[2]));
                let shading;
                try {
                    shading = __entity(
                        "IFCSURFACESTYLERENDERING",
                        colour,
                        __NR(d.transparency || 0),
                        null, null, null, null, null, null,
                        __Enum("NOTDEFINED")
                    );
                } catch (_) {
                    shading = __entity("IFCSURFACESTYLESHADING", colour);
                }
                const surfaceStyle = __entity("IFCSURFACESTYLE", __Label(d.name), __Enum("BOTH"), [shading]);
                const assignment = __entity("IFCPRESENTATIONSTYLEASSIGNMENT", [surfaceStyle]);
                __styleAssignments[matKey] = assignment;
                return assignment;
            } catch (e) {
                if (!__styleWarningShown) {
                    console.warn("[MEP] Presentation style creation warning. Geometry will continue.");
                    console.warn(e);
                    __styleWarningShown = true;
                }
                __styleAssignments[matKey] = null;
                return null;
            }
        }

        Object.keys(__MAT).forEach(function(k) {
            try { __getMaterial(k); __getStyleAssignment(k); } catch (_) {}
        });

        function __styleSolid(solid, matKey) {
            if (!matKey) return;
            try {
                const a = __getStyleAssignment(matKey);
                if (a) __entity("IFCSTYLEDITEM", solid, [a], null);
            } catch (_) {}
        }

        // ============================================================
        // 08. SOLID / SHAPE HELPERS
        // ============================================================
        function __rectProfile(width, height, name) {
            return __entity(
                "IFCRECTANGLEPROFILEDEF",
                __Enum("AREA"),
                name ? __Label(name) : null,
                __axis2D(),
                __PL(width),
                __PL(height)
            );
        }

        function __circleProfile(radius, name) {
            return __entity(
                "IFCCIRCLEPROFILEDEF",
                __Enum("AREA"),
                name ? __Label(name) : null,
                __axis2D(),
                __PL(radius)
            );
        }

        function __box(x, y, z, width, depth, height, matKey) {
            if (width <= 0 || depth <= 0 || height <= 0) throw new Error("Invalid box dimensions.");
            const solid = __entity(
                "IFCEXTRUDEDAREASOLID",
                __rectProfile(width, depth, width + "x" + depth),
                __axis3D(x, y, z),
                __dir3D(0, 0, 1),
                __PL(height)
            );
            __styleSolid(solid, matKey);
            return solid;
        }

        function __boxAlong(p1, p2, width, height, offsetX, offsetY, matKey) {
            const a = __axisAlong(p1, p2, offsetX || 0, offsetY || 0);
            const solid = __entity(
                "IFCEXTRUDEDAREASOLID",
                __rectProfile(width, height, width + "x" + height),
                a.axis,
                __dir3D(0, 0, 1),
                __PL(a.basis.length)
            );
            __styleSolid(solid, matKey);
            return solid;
        }

        function __cylinderAlong(p1, p2, diameter, matKey) {
            const a = __axisAlong(p1, p2, 0, 0);
            const solid = __entity(
                "IFCEXTRUDEDAREASOLID",
                __circleProfile(diameter / 2, "D" + diameter),
                a.axis,
                __dir3D(0, 0, 1),
                __PL(a.basis.length)
            );
            __styleSolid(solid, matKey);
            return solid;
        }

        function __shape(solids) {
            const items = Array.isArray(solids) ? solids : [solids];
            const rep = __entity("IFCSHAPEREPRESENTATION", __context, __Label("Body"), __Label("SweptSolid"), items);
            return __entity("IFCPRODUCTDEFINITIONSHAPE", null, null, [rep]);
        }

        // ============================================================
        // 09. PRODUCT / RECORD / SYSTEM HELPERS
        // ============================================================
        const __records = [];
        const __systemMembers = {};
        const __materialGroups = {};
        const __floorProducts = [];

        function __register(rec) {
            __records.push(rec);
            __elementCount++;
            if (__counts[rec.category] !== undefined) __counts[rec.category]++;
            if (rec.system) {
                if (!__systemMembers[rec.system]) __systemMembers[rec.system] = [];
                __systemMembers[rec.system].push(rec.entity);
            }
            if (rec.material) {
                if (!__materialGroups[rec.material]) __materialGroups[rec.material] = [];
                __materialGroups[rec.material].push(rec.entity);
            }
            return rec.entity;
        }

        function __createFallbackProduct(o, representation) {
            return __entity(
                "IFCBUILDINGELEMENTPROXY",
                __GUID(), __ownerHistory,
                __Label(o.name),
                o.description ? __Label(o.description) : null,
                __Label(o.typeName || o.category),
                __originPlacement,
                representation,
                __Identifier(o.tag),
                __Enum("NOTDEFINED")
            );
        }

        function __createSemanticProduct(o, solids) {
            const representation = __shape(solids);
            let product = null;
            const entityName = o.entityName;

            if (entityName && __hasEntity(entityName)) {
                try {
                    product = __entity(
                        entityName,
                        __GUID(), __ownerHistory,
                        __Label(o.name),
                        o.description ? __Label(o.description) : null,
                        __Label(o.typeName || o.category),
                        __originPlacement,
                        representation,
                        __Identifier(o.tag),
                        __Enum(o.predefinedType || "NOTDEFINED")
                    );
                } catch (e) {
                    if (!__semanticWarningShown) {
                        console.warn("[MEP] Some specialized IFC MEP classes are not constructible in this Viewer; fallback proxy will be used where needed.");
                        console.warn(e);
                        __semanticWarningShown = true;
                    }
                    product = null;
                }
            }

            if (!product) {
                product = __createFallbackProduct(o, representation);
            }

            return __register({
                entity: product,
                category: o.category,
                system: o.system || "",
                material: o.material || "",
                name: o.name,
                tag: o.tag,
                typeName: o.typeName || o.category,
                size: o.size || "",
                service: o.service || "",
                elevation: o.elevation || 0,
                pressure: o.pressure || "",
                flow: o.flow || "",
                voltage: o.voltage || "",
                from: o.from || "",
                to: o.to || "",
                insulation: o.insulation || "",
                entityName: entityName || "IFCBUILDINGELEMENTPROXY"
            });
        }

        // ============================================================
        // 10. MEP SEGMENT HELPERS
        // ============================================================
        function __pipeSegment(system, tag, p1, p2, od, material, service, pressure, insulation) {
            const mat = material || system;
            const solids = [];
            if (insulation && insulation.thickness > 0) {
                solids.push(__cylinderAlong(p1, p2, od + 2 * insulation.thickness, insulation.mat || "INSULATION"));
            }
            solids.push(__cylinderAlong(p1, p2, od, mat));
            return __createSemanticProduct({
                entityName: "IFCPIPESEGMENT",
                predefinedType: "RIGIDSEGMENT",
                category: "PIPE",
                system: system,
                material: mat,
                name: service + ":" + tag,
                tag: tag,
                typeName: "Pipe " + od + " mm",
                size: "OD " + od + " mm",
                service: service,
                elevation: Math.round((p1.z + p2.z) / 2),
                pressure: pressure || "",
                insulation: insulation ? (insulation.thickness + " mm") : "None",
                from: "(" + p1.x + "," + p1.y + "," + p1.z + ")",
                to: "(" + p2.x + "," + p2.y + "," + p2.z + ")"
            }, solids);
        }

        function __pipeFitting(system, tag, p, size, material, service, typeName) {
            const d = Math.max(size * 1.45, size + 50);
            const solids = [__box(p.x, p.y, p.z - d / 2, d, d, d, material || system)];
            return __createSemanticProduct({
                entityName: "IFCPIPEFITTING",
                predefinedType: "JUNCTION",
                category: "PIPE_FITTING",
                system: system,
                material: material || system,
                name: service + " " + (typeName || "Fitting") + ":" + tag,
                tag: tag,
                typeName: typeName || "Pipe Fitting",
                size: "DN/OD " + size + " mm",
                service: service,
                elevation: p.z
            }, solids);
        }

        function __valve(system, tag, p, pipeOD, service, typeName) {
            const body = Math.max(170, pipeOD * 1.6);
            const solids = [
                __box(p.x, p.y, p.z - body / 2, body, body * 0.65, body, "STAINLESS"),
                __box(p.x, p.y, p.z + body * 0.5, body * 0.15, body * 0.15, body * 0.65, "DARK_STEEL")
            ];
            return __createSemanticProduct({
                entityName: "IFCVALVE",
                predefinedType: "ISOLATING",
                category: "VALVE",
                system: system,
                material: "STAINLESS",
                name: (typeName || "Isolation Valve") + ":" + tag,
                tag: tag,
                typeName: typeName || "Butterfly Valve",
                size: "DN " + pipeOD,
                service: service,
                elevation: p.z
            }, solids);
        }

        function __ductSegment(system, tag, p1, p2, width, height, matKey, service) {
            const solids = [__boxAlong(p1, p2, width, height, 0, 0, matKey)];
            return __createSemanticProduct({
                entityName: "IFCDUCTSEGMENT",
                predefinedType: "RIGIDSEGMENT",
                category: "DUCT",
                system: system,
                material: matKey,
                name: service + ":" + tag,
                tag: tag,
                typeName: "Rectangular Duct " + width + "x" + height,
                size: width + "x" + height + " mm",
                service: service,
                elevation: Math.round((p1.z + p2.z) / 2)
            }, solids);
        }

        function __ductFitting(system, tag, p, width, height, matKey, service, typeName) {
            const solids = [__box(p.x, p.y, p.z - height / 2, width * 1.15, width * 1.15, height * 1.15, matKey)];
            return __createSemanticProduct({
                entityName: "IFCDUCTFITTING",
                predefinedType: "BEND",
                category: "DUCT_FITTING",
                system: system,
                material: matKey,
                name: service + " " + (typeName || "Elbow") + ":" + tag,
                tag: tag,
                typeName: typeName || "Duct Elbow",
                size: width + "x" + height,
                service: service,
                elevation: p.z
            }, solids);
        }

        function __cableTraySegment(system, tag, p1, p2, width, height, matKey, service) {
            const b = __basisAlong(p1, p2);
            const plate = 20;
            const solids = [
                __boxAlong(p1, p2, width, plate, 0, -height / 2 + plate / 2, matKey),
                __boxAlong(p1, p2, plate, height, -width / 2 + plate / 2, 0, matKey),
                __boxAlong(p1, p2, plate, height, width / 2 - plate / 2, 0, matKey)
            ];
            // Add ladder rungs every 500 mm for LOD400-oriented detail.
            const n = Math.floor(b.length / 500);
            for (let i = 1; i < n; i++) {
                const t = i / n;
                const c = __add(p1, __mul(__sub(p2, p1), t));
                const rungP1 = __add(c, __mul(b.ux, -width / 2 + plate));
                const rungP2 = __add(c, __mul(b.ux, width / 2 - plate));
                solids.push(__boxAlong(rungP1, rungP2, 25, 25, 0, -height / 2 + plate + 12, matKey));
            }
            return __createSemanticProduct({
                entityName: "IFCCABLECARRIERSEGMENT",
                predefinedType: "CABLETRAYSEGMENT",
                category: "CABLE_TRAY",
                system: system,
                material: matKey,
                name: service + ":" + tag,
                tag: tag,
                typeName: "Cable Tray " + width + "x" + height,
                size: width + "x" + height + " mm",
                service: service,
                elevation: Math.round((p1.z + p2.z) / 2)
            }, solids);
        }

        function __conduitSegment(system, tag, p1, p2, od, service) {
            return __createSemanticProduct({
                entityName: "IFCCABLECARRIERSEGMENT",
                predefinedType: "CONDUITSEGMENT",
                category: "CONDUIT",
                system: system,
                material: "CONDUIT",
                name: service + ":" + tag,
                tag: tag,
                typeName: "EMT Conduit " + od + " mm",
                size: "OD " + od + " mm",
                service: service,
                elevation: Math.round((p1.z + p2.z) / 2)
            }, [__cylinderAlong(p1, p2, od, "CONDUIT")]);
        }

        // ============================================================
        // 11. EQUIPMENT / ACCESSORY HELPERS
        // ============================================================
        function __equipmentProduct(o, parts) {
            const solids = [];
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                if (p.kind === "CYL_Z") {
                    solids.push(__cylinderAlong(__vec(p.x, p.y, p.z), __vec(p.x, p.y, p.z + p.h), p.d, p.mat));
                } else {
                    solids.push(__box(p.x, p.y, p.z, p.w, p.d, p.h, p.mat));
                }
            }
            return __createSemanticProduct(o, solids);
        }

        function __chiller(tag, x, y) {
            return __equipmentProduct({
                entityName: "IFCCHILLER", predefinedType: "AIRCOOLED", category: "EQUIPMENT",
                system: "CHW", material: "EQUIPMENT", name: "Air Cooled Chiller:" + tag, tag: tag,
                typeName: "Air Cooled Chiller 450 kW", size: "3200x1450x2100 mm", service: "Chilled Water Plant",
                flow: "21.5 L/s", pressure: "6 bar", elevation: 0
            }, [
                { x: x, y: y, z: 250, w: 3200, d: 1450, h: 1450, mat: "EQUIPMENT" },
                { x: x, y: y, z: 1700, w: 3100, d: 1400, h: 350, mat: "STEEL" },
                { kind: "CYL_Z", x: x - 850, y: y, z: 1750, d: 650, h: 220, mat: "DARK_STEEL" },
                { kind: "CYL_Z", x: x, y: y, z: 1750, d: 650, h: 220, mat: "DARK_STEEL" },
                { kind: "CYL_Z", x: x + 850, y: y, z: 1750, d: 650, h: 220, mat: "DARK_STEEL" },
                { x: x, y: y, z: 100, w: 3400, d: 1650, h: 150, mat: "CONCRETE" }
            ]);
        }

        function __pump(tag, x, y, system, service, od) {
            return __equipmentProduct({
                entityName: "IFCPUMP", predefinedType: "ENDSUCTION", category: "EQUIPMENT",
                system: system, material: "EQUIPMENT", name: "End Suction Pump:" + tag, tag: tag,
                typeName: "Horizontal End Suction Pump", size: "DN " + od, service: service,
                flow: "12 L/s", pressure: "4 bar", elevation: 200
            }, [
                { x: x, y: y, z: 150, w: 1600, d: 700, h: 150, mat: "DARK_STEEL" },
                { kind: "CYL_Z", x: x - 350, y: y, z: 300, d: 550, h: 600, mat: "EQUIPMENT" },
                { x: x + 400, y: y, z: 350, w: 750, d: 500, h: 500, mat: "ELECTRICAL" },
                { kind: "CYL_Z", x: x - 750, y: y, z: 430, d: od, h: 300, mat: system }
            ]);
        }

        function __ahu(tag, x, y) {
            return __equipmentProduct({
                entityName: "IFCUNITARYEQUIPMENT", predefinedType: "AIRHANDLER", category: "EQUIPMENT",
                system: "HVAC-SUPPLY", material: "EQUIPMENT", name: "Air Handling Unit:" + tag, tag: tag,
                typeName: "AHU 18,000 m3/h", size: "4200x1800x2200 mm", service: "Factory Supply Air",
                flow: "18000 m3/h", elevation: 200
            }, [
                { x: x - 1500, y: y, z: 250, w: 1100, d: 1800, h: 2100, mat: "FILTER" },
                { x: x - 350, y: y, z: 250, w: 1200, d: 1800, h: 2100, mat: "EQUIPMENT" },
                { x: x + 950, y: y, z: 250, w: 1300, d: 1800, h: 2100, mat: "EQUIPMENT" },
                { x: x + 1750, y: y, z: 700, w: 500, d: 1200, h: 1200, mat: "DUCT_SUPPLY" },
                { x: x, y: y, z: 100, w: 4500, d: 2000, h: 150, mat: "CONCRETE" }
            ]);
        }

        function __airCompressor(tag, x, y) {
            return __equipmentProduct({
                entityName: "IFCAIRCOMPRESSOR", predefinedType: "ROTARYVANE", category: "EQUIPMENT",
                system: "COMP-AIR", material: "EQUIPMENT", name: "Rotary Screw Compressor:" + tag, tag: tag,
                typeName: "75 kW Rotary Screw Air Compressor", size: "1800x1000x1500 mm", service: "Compressed Air",
                flow: "12 m3/min", pressure: "8 bar", elevation: 100
            }, [
                { x: x, y: y, z: 150, w: 1800, d: 1000, h: 1400, mat: "EQUIPMENT" },
                { x: x - 550, y: y - 510, z: 500, w: 500, d: 35, h: 600, mat: "FILTER" },
                { x: x + 500, y: y, z: 450, w: 600, d: 700, h: 700, mat: "ELECTRICAL" },
                { x: x, y: y, z: 50, w: 2000, d: 1200, h: 100, mat: "CONCRETE" }
            ]);
        }

        function __airReceiver(tag, x, y) {
            return __equipmentProduct({
                entityName: "IFCTANK", predefinedType: "PRESSUREVESSEL", category: "EQUIPMENT",
                system: "COMP-AIR", material: "STAINLESS", name: "Compressed Air Receiver:" + tag, tag: tag,
                typeName: "Vertical Air Receiver 3000 L", size: "Dia 1200 x 3200 mm", service: "Compressed Air",
                pressure: "10 bar", elevation: 150
            }, [
                { kind: "CYL_Z", x: x, y: y, z: 350, d: 1200, h: 2600, mat: "STAINLESS" },
                { kind: "CYL_Z", x: x, y: y, z: 2950, d: 950, h: 300, mat: "STAINLESS" },
                { x: x - 350, y: y, z: 100, w: 130, d: 130, h: 250, mat: "DARK_STEEL" },
                { x: x + 350, y: y, z: 100, w: 130, d: 130, h: 250, mat: "DARK_STEEL" }
            ]);
        }

        function __mcc(tag, x, y, width) {
            const w = width || 3000;
            const parts = [];
            const cub = 600;
            const count = Math.floor(w / cub);
            for (let i = 0; i < count; i++) {
                const cx = x - w / 2 + cub / 2 + i * cub;
                parts.push({ x: cx, y: y, z: 150, w: cub - 15, d: 700, h: 2200, mat: "ELECTRICAL" });
                parts.push({ x: cx, y: y - 365, z: 650, w: 260, d: 20, h: 350, mat: "DARK_STEEL" });
            }
            return __equipmentProduct({
                entityName: "IFCELECTRICDISTRIBUTIONBOARD", predefinedType: "MOTORCONTROLCENTRE", category: "ELECTRICAL",
                system: "POWER", material: "ELECTRICAL", name: "Motor Control Center:" + tag, tag: tag,
                typeName: "MCC 415V", size: w + "x700x2200 mm", service: "Factory Power Distribution",
                voltage: "415 V, 3Ph, 50Hz", elevation: 150
            }, parts);
        }

        function __transformer(tag, x, y) {
            return __equipmentProduct({
                entityName: "IFCTRANSFORMER", predefinedType: "VOLTAGE", category: "ELECTRICAL",
                system: "POWER", material: "ELECTRICAL", name: "Dry Type Transformer:" + tag, tag: tag,
                typeName: "1000 kVA Dry Type Transformer", size: "2000x1200x2200 mm", service: "Electrical Power",
                voltage: "22kV/0.415kV", elevation: 150
            }, [
                { x: x, y: y, z: 150, w: 2000, d: 1200, h: 2100, mat: "ELECTRICAL" },
                { x: x - 500, y: y - 610, z: 700, w: 350, d: 30, h: 1000, mat: "DARK_STEEL" },
                { x: x, y: y - 610, z: 700, w: 350, d: 30, h: 1000, mat: "DARK_STEEL" },
                { x: x + 500, y: y - 610, z: 700, w: 350, d: 30, h: 1000, mat: "DARK_STEEL" }
            ]);
        }

        function __machine(tag, x, y) {
            return __equipmentProduct({
                entityName: "IFCBUILDINGELEMENTPROXY", predefinedType: "USERDEFINED", category: "EQUIPMENT",
                system: "PROCESS", material: "EQUIPMENT", name: "Production Machine:" + tag, tag: tag,
                typeName: "CNC / Process Machine", size: "3200x2200x2400 mm", service: "Production",
                voltage: "415 V", pressure: "Compressed Air 7 bar", elevation: 0
            }, [
                { x: x, y: y, z: 100, w: 3200, d: 2200, h: 2100, mat: "EQUIPMENT" },
                { x: x - 650, y: y - 1110, z: 450, w: 650, d: 30, h: 900, mat: "GLASS" },
                { x: x + 1100, y: y, z: 300, w: 650, d: 900, h: 1500, mat: "ELECTRICAL" },
                { x: x, y: y, z: 50, w: 3400, d: 2400, h: 50, mat: "CONCRETE" }
            ]);
        }

        function __airTerminal(tag, x, y, z, size, system) {
            const s = size || 600;
            const solids = [
                __box(x, y, z - 80, s, s, 80, "DUCT_SUPPLY"),
                __box(x, y, z - 25, s - 80, 30, 25, "DARK_STEEL"),
                __box(x, y, z - 25, 30, s - 80, 25, "DARK_STEEL")
            ];
            return __createSemanticProduct({
                entityName: "IFCAIRTERMINAL", predefinedType: "DIFFUSER", category: "AIR_TERMINAL",
                system: system || "HVAC-SUPPLY", material: "DUCT_SUPPLY", name: "Ceiling Diffuser:" + tag, tag: tag,
                typeName: "4-Way Diffuser " + s, size: s + "x" + s, service: "Supply Air", elevation: z
            }, solids);
        }

        function __sprinkler(tag, x, y, z) {
            const p1 = __vec(x, y, z + 450);
            const p2 = __vec(x, y, z + 70);
            const solids = [
                __cylinderAlong(p1, p2, 25, "FIRE"),
                __box(x, y, z, 85, 85, 70, "FIRE"),
                __box(x, y, z - 15, 120, 25, 20, "STAINLESS")
            ];
            return __createSemanticProduct({
                entityName: "IFCFIRESUPPRESSIONTERMINAL", predefinedType: "SPRINKLER", category: "FIRE",
                system: "FIRE", material: "FIRE", name: "Sprinkler Head:" + tag, tag: tag,
                typeName: "K80 Upright Sprinkler", size: "DN25", service: "Automatic Sprinkler", elevation: z
            }, solids);
        }

        function __sensor(tag, x, y, z, system, typeName) {
            return __createSemanticProduct({
                entityName: "IFCSENSOR", predefinedType: "PRESSURESENSOR", category: "SENSOR",
                system: system, material: "SENSOR", name: typeName + ":" + tag, tag: tag,
                typeName: typeName, size: "100x100x180 mm", service: system, elevation: z
            }, [
                __box(x, y, z, 100, 100, 180, "SENSOR"),
                __box(x, y, z + 180, 35, 35, 130, "STAINLESS")
            ]);
        }

        function __highBayLight(tag, x, y, z) {
            return __createSemanticProduct({
                entityName: "IFCLIGHTFIXTURE", predefinedType: "POINTSOURCE", category: "ELECTRICAL",
                system: "LIGHTING", material: "ELECTRICAL", name: "LED High Bay Light:" + tag, tag: tag,
                typeName: "LED High Bay 150W", size: "Dia 450 x 300 mm", service: "Factory Lighting",
                voltage: "230 V", elevation: z
            }, [
                __cylinderAlong(__vec(x, y, z), __vec(x, y, z + 260), 180, "DARK_STEEL"),
                __box(x, y, z - 80, 450, 450, 80, "ELECTRICAL")
            ]);
        }

        function __disconnectSwitch(tag, x, y, z, loadName) {
            return __createSemanticProduct({
                entityName: "IFCSWITCHINGDEVICE", predefinedType: "DISCONNECTOR", category: "ELECTRICAL",
                system: "POWER", material: "ELECTRICAL", name: "Local Disconnect:" + tag, tag: tag,
                typeName: "IP65 Local Isolator 63A", size: "300x180x450 mm", service: loadName,
                voltage: "415 V", elevation: z
            }, [
                __box(x, y, z, 300, 180, 450, "ELECTRICAL"),
                __box(x, y - 100, z + 170, 70, 35, 120, "DARK_STEEL")
            ]);
        }

        function __firePumpSet() {
            __pump("FP-01", 25000, 21000, "FIRE", "Fire Pump", 100);
            __pump("JP-01", 26500, 22000, "FIRE", "Jockey Pump", 50);
            return __equipmentProduct({
                entityName: "IFCTANK", predefinedType: "STORAGE", category: "EQUIPMENT",
                system: "FIRE", material: "FIRE", name: "Fire Water Break Tank:FWT-01", tag: "FWT-01",
                typeName: "Fire Water Tank 20 m3", size: "3500x2500x2500 mm", service: "Fire Protection Water",
                pressure: "Atmospheric", elevation: 100
            }, [
                { x: 25000, y: 18500, z: 100, w: 3500, d: 2500, h: 2500, mat: "FIRE" },
                { x: 25000, y: 18500, z: 2600, w: 3200, d: 2200, h: 80, mat: "DARK_STEEL" }
            ]);
        }
        function __supportHanger(tag, x, y, zTop, zBottom, width, system) {
            const rod = 20;
            const parts = [
                __box(x - width / 2 + 40, y, zBottom, rod, rod, Math.max(50, zTop - zBottom), "DARK_STEEL"),
                __box(x + width / 2 - 40, y, zBottom, rod, rod, Math.max(50, zTop - zBottom), "DARK_STEEL"),
                __box(x, y, zBottom, width, 45, 45, "DARK_STEEL")
            ];
            return __createSemanticProduct({
                entityName: "IFCBUILDINGELEMENTPROXY", predefinedType: "USERDEFINED", category: "SUPPORT",
                system: system, material: "DARK_STEEL", name: "MEP Hanger:" + tag, tag: tag,
                typeName: "Trapeze Hanger", size: width + " mm", service: system, elevation: zBottom
            }, parts);
        }

        // ============================================================
        // 12. FACTORY PARAMETERS / COORDINATION LEVELS
        // ============================================================
        const __P = {
            WIDTH: 36000,
            LENGTH: 24000,
            CLEAR_HEIGHT: 9000,
            SLAB: 220,
            CHWS_Z: 5950,
            CHWR_Z: 6200,
            PCWS_Z: 5400,
            PCWR_Z: 5650,
            AIR_Z: 5050,
            POWER_TRAY_Z: 6750,
            ELV_TRAY_Z: 6500,
            RETURN_DUCT_Z: 7250,
            SUPPLY_DUCT_Z: 7900,
            EXHAUST_DUCT_Z: 7500,
            FIRE_Z: 8650
        };

        // ============================================================
        // 13. STRUCTURAL CONTEXT - FLOOR / PERIMETER COLUMNS
        // ============================================================
        __setStage("FACTORY STRUCTURAL CONTEXT");

        __createSemanticProduct({
            entityName: "IFCSLAB", predefinedType: "FLOOR", category: "STRUCTURE", system: "",
            material: "CONCRETE", name: "Factory Ground Slab", tag: "S-FLOOR-001",
            typeName: "RC Industrial Floor 220", size: "36000x24000x220", service: "Structure", elevation: 0
        }, [__box(__P.WIDTH / 2, __P.LENGTH / 2, 0, __P.WIDTH, __P.LENGTH, __P.SLAB, "CONCRETE")]);

        const __columnPts = [
            [500, 500], [12000, 500], [24000, 500], [35500, 500],
            [500, 23500], [12000, 23500], [24000, 23500], [35500, 23500]
        ];
        for (let i = 0; i < __columnPts.length; i++) {
            const c = __columnPts[i];
            __createSemanticProduct({
                entityName: "IFCCOLUMN", predefinedType: "COLUMN", category: "STRUCTURE", system: "",
                material: "CONCRETE", name: "Factory RC Column:" + (i + 1), tag: "C-" + (i + 1),
                typeName: "RC Column 600x600", size: "600x600", service: "Structure", elevation: __P.SLAB
            }, [__box(c[0], c[1], __P.SLAB, 600, 600, __P.CLEAR_HEIGHT - __P.SLAB, "CONCRETE")]);
        }

        // ============================================================
        // 14. ARCHITECTURE / STRUCTURE COMPLETION
        // ============================================================
        __setStage("ARCHITECTURE AND PRIMARY STRUCTURE");
        const __wall = (tag,x,y,z,w,d,h,desc) => __createSemanticProduct({
            entityName:"IFCWALL", predefinedType:"SOLIDWALL", category:"ARCHITECTURE", material:"CONCRETE",
            name:"Factory Wall:"+tag, tag:tag, typeName:desc||"RC/Block Industrial Wall", size:w+"x"+d+"x"+h,
            service:"Architecture", elevation:z
        }, [__box(x,y,z,w,d,h,"CONCRETE")]);
        const __beam = (tag,x,y,z,w,d,h,mat) => __createSemanticProduct({
            entityName:"IFCBEAM", predefinedType:"BEAM", category:"STRUCTURE", material:mat||"STEEL",
            name:"Factory Beam:"+tag, tag:tag, typeName:"Portal Frame Beam", size:w+"x"+d+"x"+h,
            service:"Structure", elevation:z
        }, [__box(x,y,z,w,d,h,mat||"STEEL")]);
        const __openingProxy = (kind,tag,x,y,z,w,d,h,mat) => __createSemanticProduct({
            entityName:kind, predefinedType:"NOTDEFINED", category:"ARCHITECTURE", material:mat||"GLASS",
            name:(kind==="IFCWINDOW"?"Window:":"Door:")+tag, tag:tag, typeName:kind==="IFCWINDOW"?"Aluminium Glazed Window":"Steel Industrial Door",
            size:w+"x"+h, service:"Architecture", elevation:z
        }, [__box(x,y,z,w,d,h,mat||"GLASS")]);
        const __space = (tag,x,y,z,w,d,h,name) => __createSemanticProduct({
            entityName:"IFCSPACE", predefinedType:"INTERNAL", category:"SPACE", material:"GLASS",
            name:name||("Factory Space:"+tag), tag:tag, typeName:"IfcSpace", size:w+"x"+d+"x"+h,
            service:"Room/Zone", elevation:z
        }, [__box(x,y,z,w,d,h,"GLASS")]);

        // Weather enclosure: insulated perimeter walls, roof and service/office partitions.
        __wall("W-N", __P.WIDTH/2, __P.LENGTH-150, 0, __P.WIDTH, 300, __P.CLEAR_HEIGHT, "Insulated North Wall");
        __wall("W-S", __P.WIDTH/2, 150, 0, __P.WIDTH, 300, __P.CLEAR_HEIGHT, "Insulated South Wall");
        __wall("W-E", __P.WIDTH-150, __P.LENGTH/2, 0, 300, __P.LENGTH-600, __P.CLEAR_HEIGHT, "Insulated East Wall");
        __wall("W-W", 150, __P.LENGTH/2, 0, 300, __P.LENGTH-600, __P.CLEAR_HEIGHT, "Insulated West Wall");
        __wall("W-OFFICE", 9000, 20500, 0, 300, 6800, 3600, "Office/Control Room Partition");
        __wall("W-UTILITY", 28000, 20500, 0, 300, 6800, 3600, "Utility Room Partition");
        __wall("W-TOILET", 3500, 20500, 0, 4500, 200, 2600, "Welfare Block Partition");
        __beam("B-RIDGE", __P.WIDTH/2, __P.LENGTH/2, __P.CLEAR_HEIGHT, __P.WIDTH-500, 450, 450, "STEEL");
        for (let x=1500, i=1; x<__P.WIDTH; x+=3000,i++) {
            __beam("B-ROOF-"+i, x, __P.LENGTH/2, __P.CLEAR_HEIGHT-450, 250, __P.LENGTH-600, 250, "STEEL");
        }
        // High bay roof panels and translucent rooflights.
        __createSemanticProduct({entityName:"IFCROOF",predefinedType:"GABLE_ROOF",category:"ARCHITECTURE",material:"STEEL",name:"Factory Roof",tag:"R-01",typeName:"Insulated Metal Roof",size:"36000x24000",service:"Architecture",elevation:__P.CLEAR_HEIGHT}, [__box(__P.WIDTH/2,__P.LENGTH/2,__P.CLEAR_HEIGHT,__P.WIDTH,__P.LENGTH,180,"STEEL")]);
        for (let i=1;i<=4;i++) __openingProxy("IFCWINDOW","SKYLIGHT-"+i,4500+i*6500,__P.LENGTH/2,__P.CLEAR_HEIGHT+20,1800,120,80,"GLASS");
        __openingProxy("IFCDOOR","ROLLUP-01",18000,150,0,4200,350,4500,"DARK_STEEL");
        __openingProxy("IFCDOOR","ROLLUP-02",30000,150,0,3200,350,4500,"DARK_STEEL");
        __openingProxy("IFCDOOR","PERSONNEL-01",9000,150,0,1000,350,2200,"DARK_STEEL");
        __openingProxy("IFCDOOR","OFFICE-01",9000,17100,0,1000,200,2200,"GLASS");
        __space("PROD",18000,10500,230,30000,19000,8200,"Production Hall");
        __space("OFFICE",4500,20500,230,8200,6500,3300,"Office and Control Room");
        __space("UTILITY",28000,20500,230,8000,6500,3300,"Utility and Electrical Room");
        __space("WELFARE",3500,22000,230,5000,2500,2400,"Welfare and Sanitary Block");
        // Raised equipment foundations and crane runway beams.
        __beam("CRANE-RUNWAY-N",__P.WIDTH/2,1800,7000,__P.WIDTH-1000,300,350,"STEEL");
        __beam("CRANE-RUNWAY-S",__P.WIDTH/2,__P.LENGTH-1800,7000,__P.WIDTH-1000,300,350,"STEEL");

        // ============================================================
        // 15. MAJOR MEP EQUIPMENT / PROCESS LOADS
        // ============================================================
        __setStage("MAJOR FACTORY MEP EQUIPMENT");

        __chiller("CH-01", 3500, 21200);
        __pump("CHWP-01", 7200, 20500, "CHWS", "Chilled Water Supply", 150);
        __pump("CHWP-02", 7200, 21800, "CHWS", "Chilled Water Supply", 150);
        __ahu("AHU-01", 12500, 21000);
        __airCompressor("AC-01", 19000, 21000);
        __airReceiver("AR-01", 22000, 21000);
        __mcc("MCC-01", 29500, 21000, 3600);
        __transformer("TR-01", 34000, 21000);
        __firePumpSet();

        const __machines = [
            { tag: "M-01", x: 7000, y: 5500 },
            { tag: "M-02", x: 17500, y: 5500 },
            { tag: "M-03", x: 28500, y: 5500 },
            { tag: "M-04", x: 7000, y: 12500 },
            { tag: "M-05", x: 17500, y: 12500 },
            { tag: "M-06", x: 28500, y: 12500 }
        ];
        for (let i = 0; i < __machines.length; i++) {
            __machine(__machines[i].tag, __machines[i].x, __machines[i].y);
        }
        for (let i=0;i<__machines.length;i++) { const m=__machines[i]; __createSemanticProduct({entityName:"IFCSLAB",predefinedType:"BASESLAB",category:"STRUCTURE",material:"CONCRETE",name:"Machine Foundation "+m.tag,tag:"MF-"+m.tag,typeName:"RC Equipment Foundation",size:"2600x2200x300",service:"Structure",elevation:220},[__box(m.x,m.y,220,2600,2200,300,"CONCRETE")]); }

        // ============================================================
        // 15. CHILLED WATER SYSTEM - CHWS / CHWR
        // ============================================================
        __setStage("CHILLED WATER PIPEWORK");

        const __chwIns = { thickness: 40, mat: "INSULATION" };
        const __chwsMainPts = [
            __vec(5200, 19800, __P.CHWS_Z),
            __vec(8500, 19800, __P.CHWS_Z),
            __vec(8500, 17600, __P.CHWS_Z),
            __vec(13500, 17600, __P.CHWS_Z)
        ];
        const __chwrMainPts = [
            __vec(13500, 18300, __P.CHWR_Z),
            __vec(8500, 18300, __P.CHWR_Z),
            __vec(8500, 20500, __P.CHWR_Z),
            __vec(5200, 20500, __P.CHWR_Z)
        ];

        for (let i = 0; i < __chwsMainPts.length - 1; i++) {
            __pipeSegment("CHWS", "CHWS-150-" + (i + 1), __chwsMainPts[i], __chwsMainPts[i + 1], 168, "CHWS", "Chilled Water Supply", "6 bar", __chwIns);
            if (i < __chwsMainPts.length - 2) __pipeFitting("CHWS", "EL-CHWS-" + (i + 1), __chwsMainPts[i + 1], 150, "CHWS", "Chilled Water Supply", "90deg Elbow");
        }
        for (let i = 0; i < __chwrMainPts.length - 1; i++) {
            __pipeSegment("CHWR", "CHWR-150-" + (i + 1), __chwrMainPts[i], __chwrMainPts[i + 1], 168, "CHWR", "Chilled Water Return", "6 bar", __chwIns);
            if (i < __chwrMainPts.length - 2) __pipeFitting("CHWR", "EL-CHWR-" + (i + 1), __chwrMainPts[i + 1], 150, "CHWR", "Chilled Water Return", "90deg Elbow");
        }
        __valve("CHWS", "V-CHWS-01", __vec(9300, 17600, __P.CHWS_Z), 150, "Chilled Water Supply", "Butterfly Valve");
        __valve("CHWR", "V-CHWR-01", __vec(9300, 18300, __P.CHWR_Z), 150, "Chilled Water Return", "Butterfly Valve");
        __sensor("PT-CHWS-01", 10300, 17600, __P.CHWS_Z + 150, "CHWS", "Pressure Sensor");
        __sensor("TT-CHWR-01", 10300, 18300, __P.CHWR_Z + 150, "CHWR", "Temperature Sensor");

        // AHU coil connections and equipment-side isolation valves.
        __pipeSegment("CHWS", "CHWS-AHU-01", __vec(13500, 17600, __P.CHWS_Z), __vec(13500, 19900, __P.CHWS_Z), 89, "CHWS", "AHU Chilled Water Supply", "6 bar", __chwIns);
        __pipeSegment("CHWS", "CHWS-AHU-DROP", __vec(13500, 19900, __P.CHWS_Z), __vec(13500, 19900, 1050), 76, "CHWS", "AHU Chilled Water Supply", "6 bar", __chwIns);
        __valve("CHWS", "V-CHWS-AHU", __vec(13500, 19900, 1450), 65, "AHU Chilled Water Supply", "Butterfly Valve");

        __pipeSegment("CHWR", "CHWR-AHU-01", __vec(13500, 18300, __P.CHWR_Z), __vec(12800, 19900, __P.CHWR_Z), 89, "CHWR", "AHU Chilled Water Return", "6 bar", __chwIns);
        __pipeSegment("CHWR", "CHWR-AHU-DROP", __vec(12800, 19900, __P.CHWR_Z), __vec(12800, 19900, 1050), 76, "CHWR", "AHU Chilled Water Return", "6 bar", __chwIns);
        __valve("CHWR", "V-CHWR-AHU", __vec(12800, 19900, 1450), 65, "AHU Chilled Water Return", "Butterfly Valve");

        // ============================================================
        // 16. PROCESS COOLING WATER - TWO MAINS + MACHINE DROPS
        // ============================================================
        __setStage("PROCESS COOLING WATER PIPEWORK");

        __pipeSegment("PCWS", "PCWS-MAIN-01", __vec(3500, 9000, __P.PCWS_Z), __vec(32500, 9000, __P.PCWS_Z), 114, "PCWS", "Process Cooling Water Supply", "4 bar", null);
        __pipeSegment("PCWR", "PCWR-MAIN-01", __vec(3500, 9800, __P.PCWR_Z), __vec(32500, 9800, __P.PCWR_Z), 114, "PCWR", "Process Cooling Water Return", "4 bar", null);

        for (let i = 0; i < __machines.length; i++) {
            const m = __machines[i];
            const sy = m.y < 9000 ? m.y + 1450 : m.y - 1450;
            const supplyTop = __vec(m.x - 300, 9000, __P.PCWS_Z);
            const returnTop = __vec(m.x + 300, 9800, __P.PCWR_Z);
            __pipeSegment("PCWS", "PCWS-BR-" + m.tag, supplyTop, __vec(m.x - 300, sy, __P.PCWS_Z), 60, "PCWS", "Process Cooling Water Supply", "4 bar", null);
            __pipeSegment("PCWS", "PCWS-DROP-" + m.tag, __vec(m.x - 300, sy, __P.PCWS_Z), __vec(m.x - 300, sy, 900), 42, "PCWS", "Machine Cooling Supply", "4 bar", null);
            __valve("PCWS", "V-PCWS-" + m.tag, __vec(m.x - 300, sy, 1300), 40, "Machine Cooling Supply", "Ball Valve");

            __pipeSegment("PCWR", "PCWR-BR-" + m.tag, returnTop, __vec(m.x + 300, sy, __P.PCWR_Z), 60, "PCWR", "Process Cooling Water Return", "4 bar", null);
            __pipeSegment("PCWR", "PCWR-DROP-" + m.tag, __vec(m.x + 300, sy, __P.PCWR_Z), __vec(m.x + 300, sy, 900), 42, "PCWR", "Machine Cooling Return", "4 bar", null);
            __valve("PCWR", "V-PCWR-" + m.tag, __vec(m.x + 300, sy, 1300), 40, "Machine Cooling Return", "Ball Valve");
        }

        // ============================================================
        // 17. COMPRESSED AIR RING MAIN + DROPS
        // ============================================================
        __setStage("COMPRESSED AIR DISTRIBUTION");

        const __airRing = [
            __vec(3500, 3500, __P.AIR_Z),
            __vec(32500, 3500, __P.AIR_Z),
            __vec(32500, 15500, __P.AIR_Z),
            __vec(3500, 15500, __P.AIR_Z),
            __vec(3500, 3500, __P.AIR_Z)
        ];
        for (let i = 0; i < __airRing.length - 1; i++) {
            __pipeSegment("COMP-AIR", "AIR-MAIN-" + (i + 1), __airRing[i], __airRing[i + 1], 76, "COMP_AIR", "Compressed Air Main", "8 bar", null);
            __pipeFitting("COMP-AIR", "AIR-EL-" + (i + 1), __airRing[i + 1], 65, "COMP_AIR", "Compressed Air", "90deg Elbow");
        }

        // Compressor/receiver connection to ring main.
        __pipeSegment("COMP-AIR", "AIR-PLANT-01", __vec(22000, 21000, __P.AIR_Z), __vec(22000, 15500, __P.AIR_Z), 76, "COMP_AIR", "Compressed Air Plant Header", "8 bar", null);
        __valve("COMP-AIR", "V-AIR-PLANT", __vec(22000, 17000, __P.AIR_Z), 65, "Compressed Air", "Isolation Valve");

        for (let i = 0; i < __machines.length; i++) {
            const m = __machines[i];
            const mainY = m.y < 9000 ? 3500 : 15500;
            const branchP = __vec(m.x + 900, mainY, __P.AIR_Z);
            const nearP = __vec(m.x + 900, m.y, __P.AIR_Z);
            __pipeSegment("COMP-AIR", "AIR-BR-" + m.tag, branchP, nearP, 42, "COMP_AIR", "Compressed Air Branch", "8 bar", null);
            __pipeSegment("COMP-AIR", "AIR-DROP-" + m.tag, nearP, __vec(m.x + 900, m.y, 1200), 28, "COMP_AIR", "Compressed Air Drop", "8 bar", null);
            __valve("COMP-AIR", "V-AIR-" + m.tag, __vec(m.x + 900, m.y, 1500), 25, "Compressed Air", "Ball Valve");
            __sensor("PG-AIR-" + m.tag, m.x + 900, m.y, 1750, "COMP-AIR", "Pressure Gauge");
        }

        // ============================================================
        // 18. HVAC SUPPLY AIR DUCTWORK
        // ============================================================
        __setStage("HVAC SUPPLY DUCTWORK");

        const __supP1 = __vec(14500, 19000, __P.SUPPLY_DUCT_Z);
        const __supP2 = __vec(31000, 19000, __P.SUPPLY_DUCT_Z);
        __ductSegment("HVAC-SUPPLY", "SA-MAIN-01", __supP1, __supP2, 1200, 600, "DUCT_SUPPLY", "Supply Air Main");

        const __ductBranches = [7000, 17500, 28500];
        for (let i = 0; i < __ductBranches.length; i++) {
            const x = __ductBranches[i];
            const pA = __vec(x, 19000, __P.SUPPLY_DUCT_Z);
            const pB = __vec(x, 2500, __P.SUPPLY_DUCT_Z);
            __ductSegment("HVAC-SUPPLY", "SA-BR-" + (i + 1), pA, pB, 650, 400, "DUCT_SUPPLY", "Supply Air Branch");
            __ductFitting("HVAC-SUPPLY", "SA-TEE-" + (i + 1), pA, 650, 400, "DUCT_SUPPLY", "Supply Air", "Tee / Transition");

            const diffuserYs = [5000, 8500, 12000, 15000];
            for (let j = 0; j < diffuserYs.length; j++) {
                const y = diffuserYs[j];
                const trunk = __vec(x, y, __P.SUPPLY_DUCT_Z);
                const neck = __vec(x + 700, y, __P.SUPPLY_DUCT_Z);
                __ductSegment("HVAC-SUPPLY", "SA-NECK-" + (i + 1) + "-" + (j + 1), trunk, neck, 350, 250, "DUCT_SUPPLY", "Supply Air Neck");
                __ductSegment("HVAC-SUPPLY", "SA-DROP-" + (i + 1) + "-" + (j + 1), neck, __vec(x + 700, y, 7020), 300, 300, "DUCT_SUPPLY", "Supply Air Drop");
                __airTerminal("AD-" + (i + 1) + "-" + (j + 1), x + 700, y, 6900, 600, "HVAC-SUPPLY");
            }
        }

        // ============================================================
        // 19. RETURN AIR DUCTWORK
        // ============================================================
        __setStage("HVAC RETURN DUCTWORK");

        __ductSegment("HVAC-RETURN", "RA-MAIN-01", __vec(14500, 20500, __P.RETURN_DUCT_Z), __vec(31000, 20500, __P.RETURN_DUCT_Z), 1000, 500, "DUCT_RETURN", "Return Air Main");
        for (let i = 0; i < __ductBranches.length; i++) {
            const x = __ductBranches[i] + 1200;
            __ductSegment("HVAC-RETURN", "RA-BR-" + (i + 1), __vec(x, 20500, __P.RETURN_DUCT_Z), __vec(x, 3500, __P.RETURN_DUCT_Z), 550, 350, "DUCT_RETURN", "Return Air Branch");
            const grillYs = [6500, 13500];
            for (let j = 0; j < grillYs.length; j++) {
                const y = grillYs[j];
                __createSemanticProduct({
                    entityName: "IFCAIRTERMINAL", predefinedType: "REGISTER", category: "AIR_TERMINAL",
                    system: "HVAC-RETURN", material: "DUCT_RETURN", name: "Return Air Grille:RAG-" + (i + 1) + "-" + (j + 1),
                    tag: "RAG-" + (i + 1) + "-" + (j + 1), typeName: "Return Grille 700x400", size: "700x400",
                    service: "Return Air", elevation: 6900
                }, [__box(x + 650, y, 6850, 700, 60, 400, "DUCT_RETURN")]);
            }
        }

        // ============================================================
        // 20. PROCESS EXHAUST DUCTWORK + EXHAUST FANS
        // ============================================================
        __setStage("PROCESS EXHAUST DUCTWORK");

        __ductSegment("HVAC-EXHAUST", "EA-MAIN-01", __vec(3500, 1800, __P.EXHAUST_DUCT_Z), __vec(32500, 1800, __P.EXHAUST_DUCT_Z), 900, 500, "DUCT_EXHAUST", "Process Exhaust Main");
        const __exhaustMachines = [__machines[0], __machines[1], __machines[2]];
        for (let i = 0; i < __exhaustMachines.length; i++) {
            const m = __exhaustMachines[i];
            __ductSegment("HVAC-EXHAUST", "EA-BR-" + m.tag, __vec(m.x, 1800, __P.EXHAUST_DUCT_Z), __vec(m.x, m.y - 1300, __P.EXHAUST_DUCT_Z), 500, 350, "DUCT_EXHAUST", "Machine Exhaust Branch");
            __ductSegment("HVAC-EXHAUST", "EA-DROP-" + m.tag, __vec(m.x, m.y - 1300, __P.EXHAUST_DUCT_Z), __vec(m.x, m.y - 1300, 3000), 400, 300, "DUCT_EXHAUST", "Machine Exhaust Drop");
        }

        __equipmentProduct({
            entityName: "IFCFAN", predefinedType: "CENTRIFUGALFORWARDCURVED", category: "EQUIPMENT",
            system: "HVAC-EXHAUST", material: "EQUIPMENT", name: "Process Exhaust Fan:EF-01", tag: "EF-01",
            typeName: "Centrifugal Exhaust Fan 15000 m3/h", size: "1800x1200x1500", service: "Process Exhaust",
            flow: "15000 m3/h", elevation: 200
        }, [
            { x: 33000, y: 1800, z: 200, w: 1800, d: 1200, h: 1400, mat: "EQUIPMENT" },
            { kind: "CYL_Z", x: 33000, y: 1800, z: 500, d: 900, h: 500, mat: "DARK_STEEL" }
        ]);

        // ============================================================
        // 21. FIRE SPRINKLER SYSTEM
        // ============================================================
        __setStage("FIRE SPRINKLER SYSTEM");

        __pipeSegment("FIRE", "FIRE-MAIN-01", __vec(2500, 12000, __P.FIRE_Z), __vec(33500, 12000, __P.FIRE_Z), 114, "FIRE", "Fire Sprinkler Main", "10 bar", null);
        __pipeSegment("FIRE", "FIRE-RISER-01", __vec(25000, 20000, 900), __vec(25000, 20000, __P.FIRE_Z), 114, "FIRE", "Fire Pump Riser", "10 bar", null);
        __pipeSegment("FIRE", "FIRE-RISER-LINK", __vec(25000, 20000, __P.FIRE_Z), __vec(25000, 12000, __P.FIRE_Z), 114, "FIRE", "Fire Main Connection", "10 bar", null);
        const __fireXs = [4500, 9000, 13500, 18000, 22500, 27000, 31500];
        for (let i = 0; i < __fireXs.length; i++) {
            const x = __fireXs[i];
            __pipeSegment("FIRE", "FIRE-BR-" + (i + 1), __vec(x, 3000, __P.FIRE_Z - 150), __vec(x, 21000, __P.FIRE_Z - 150), 60, "FIRE", "Fire Sprinkler Branch", "10 bar", null);
            const ys = [4500, 7500, 10500, 13500, 16500, 19500];
            for (let j = 0; j < ys.length; j++) {
                __sprinkler("SP-" + (i + 1) + "-" + (j + 1), x, ys[j], 8000);
            }
        }
        __valve("FIRE", "V-FIRE-01", __vec(3000, 12000, __P.FIRE_Z), 100, "Fire Sprinkler", "OS&Y Gate Valve");
        __sensor("FS-FIRE-01", 3400, 12000, __P.FIRE_Z + 120, "FIRE", "Flow Switch");

        // ============================================================
        // 22. POWER CABLE TRAY SYSTEM
        // ============================================================
        __setStage("POWER CABLE TRAYS");

        __cableTraySegment("POWER", "CT-P-MAIN-01", __vec(3500, 16500, __P.POWER_TRAY_Z), __vec(33000, 16500, __P.POWER_TRAY_Z), 600, 120, "TRAY_POWER", "Power Cable Tray Main");
        const __powerBranchXs = [7000, 17500, 28500];
        for (let i = 0; i < __powerBranchXs.length; i++) {
            const x = __powerBranchXs[i];
            __cableTraySegment("POWER", "CT-P-BR-" + (i + 1), __vec(x, 16500, __P.POWER_TRAY_Z), __vec(x, 3000, __P.POWER_TRAY_Z), 300, 100, "TRAY_POWER", "Power Cable Tray Branch");
        }

        // Main tray supports every 3000 mm.
        for (let x = 4500, n = 1; x <= 31500; x += 3000, n++) {
            __supportHanger("H-CTP-" + n, x, 16500, 8900, __P.POWER_TRAY_Z - 120, 900, "POWER");
        }

        // ============================================================
        // 23. ELV / CONTROL CABLE TRAY SYSTEM
        // ============================================================
        __setStage("ELV / CONTROL CABLE TRAYS");

        __cableTraySegment("ELV", "CT-ELV-MAIN-01", __vec(3500, 17700, __P.ELV_TRAY_Z), __vec(33000, 17700, __P.ELV_TRAY_Z), 300, 80, "TRAY_ELV", "ELV / Control Cable Tray Main");
        for (let i = 0; i < __powerBranchXs.length; i++) {
            const x = __powerBranchXs[i] + 600;
            __cableTraySegment("ELV", "CT-ELV-BR-" + (i + 1), __vec(x, 17700, __P.ELV_TRAY_Z), __vec(x, 4000, __P.ELV_TRAY_Z), 200, 80, "TRAY_ELV", "ELV / Control Cable Tray Branch");
        }

        // ============================================================
        // 24. CONDUIT DROPS TO MACHINES / EQUIPMENT
        // ============================================================
        __setStage("ELECTRICAL CONDUIT DROPS");

        for (let i = 0; i < __machines.length; i++) {
            const m = __machines[i];
            const bx = i % 3 === 0 ? 7000 : (i % 3 === 1 ? 17500 : 28500);
            const sourceY = m.y < 9000 ? 3000 : 16500;
            const top1 = __vec(bx, sourceY, __P.POWER_TRAY_Z - 150);
            const top2 = __vec(m.x + 1250, m.y, __P.POWER_TRAY_Z - 150);
            const low = __vec(m.x + 1250, m.y, 900);
            __conduitSegment("POWER", "C-PWR-H-" + m.tag, top1, top2, 50, "Machine Power Conduit");
            __conduitSegment("POWER", "C-PWR-D-" + m.tag, top2, low, 50, "Machine Power Conduit Drop");

            const cTop = __vec(m.x + 1450, m.y, __P.ELV_TRAY_Z - 100);
            __conduitSegment("ELV", "C-CTL-D-" + m.tag, cTop, __vec(m.x + 1450, m.y, 1150), 32, "Machine Control Conduit");
        }

        // Conduit to AHU, pumps, compressor.
        const __specialLoads = [
            { tag: "AHU-01", x: 14200, y: 21000, od: 63 },
            { tag: "CHWP-01", x: 7600, y: 20500, od: 50 },
            { tag: "CHWP-02", x: 7600, y: 21800, od: 50 },
            { tag: "AC-01", x: 19500, y: 21000, od: 63 }
        ];
        for (let i = 0; i < __specialLoads.length; i++) {
            const l = __specialLoads[i];
            __conduitSegment("POWER", "C-EQ-" + l.tag, __vec(l.x, 17700, __P.POWER_TRAY_Z), __vec(l.x, l.y, __P.POWER_TRAY_Z), l.od, "Equipment Power Conduit");
            __conduitSegment("POWER", "C-EQ-DROP-" + l.tag, __vec(l.x, l.y, __P.POWER_TRAY_Z), __vec(l.x, l.y, 1200), l.od, "Equipment Power Conduit Drop");
        }

        // Local machine disconnect switches.
        for (let i = 0; i < __machines.length; i++) {
            const m = __machines[i];
            __disconnectSwitch("DS-" + m.tag, m.x + 1900, m.y + 900, 1200, "Production Machine " + m.tag);
        }

        // Factory LED high-bay lighting grid, coordinated below return ducts and away from duct centerlines.
        const __lightXs = [4500, 11500, 24500, 32500];
        const __lightYs = [4500, 10500, 15000];
        for (let i = 0; i < __lightXs.length; i++) {
            for (let j = 0; j < __lightYs.length; j++) {
                const tag = "LHB-" + (i + 1) + "-" + (j + 1);
                __highBayLight(tag, __lightXs[i], __lightYs[j], 7000);
                __conduitSegment("LIGHTING", "C-" + tag, __vec(__lightXs[i], __lightYs[j], __P.POWER_TRAY_Z - 100), __vec(__lightXs[i], __lightYs[j], 7300), 25, "Lighting Conduit");
            }
        }

        // Fire alarm smoke/heat detection devices.
        const __detectorPts = [
            [6000, 7500], [12000, 7500], [24000, 7500], [30000, 7500],
            [6000, 14500], [12000, 14500], [24000, 14500], [30000, 14500]
        ];
        for (let i = 0; i < __detectorPts.length; i++) {
            const d = __detectorPts[i];
            __createSemanticProduct({
                entityName: "IFCSENSOR", predefinedType: "SMOKESENSOR", category: "SENSOR",
                system: "FIRE-ALARM", material: "SENSOR", name: "Smoke Detector:SD-" + (i + 1), tag: "SD-" + (i + 1),
                typeName: "Addressable Smoke Detector", size: "Dia 120x55 mm", service: "Fire Alarm", elevation: 8250
            }, [__box(d[0], d[1], 8200, 120, 120, 55, "SENSOR")]);
        }

        // ============================================================
        // 25. DUCT / PIPE / TRAY SUPPORTS
        // ============================================================
        __setStage("MEP SUPPORTS / HANGERS");

        // Supply duct hangers on main.
        for (let x = 15500, n = 1; x <= 30500; x += 2500, n++) {
            __supportHanger("H-SA-" + n, x, 19000, 8900, __P.SUPPLY_DUCT_Z - 400, 1600, "HVAC-SUPPLY");
        }
        // Return duct hangers.
        for (let x = 15500, n = 1; x <= 30500; x += 2500, n++) {
            __supportHanger("H-RA-" + n, x, 20500, 8900, __P.RETURN_DUCT_Z - 320, 1350, "HVAC-RETURN");
        }
        // Process cooling pipe trapeze supports.
        for (let x = 5000, n = 1; x <= 31000; x += 3000, n++) {
            __supportHanger("H-PCW-" + n, x, 9400, 8900, __P.PCWS_Z - 160, 1100, "PCW");
        }
        // Fire pipe supports.
        for (let x = 5000, n = 1; x <= 32000; x += 3000, n++) {
            __supportHanger("H-FIRE-" + n, x, 12000, 8950, __P.FIRE_Z - 180, 500, "FIRE");
        }

        // ============================================================
        // 26. PLUMBING, SANITARY AND DRAINAGE
        // ============================================================
        __setStage("PLUMBING AND DRAINAGE");
        __pipeSegment("DOMESTIC-CW", "CW-MAIN-01", __vec(2500,22000,3200), __vec(8500,22000,3200), 60, "PCWS", "Domestic Cold Water", "5 bar", null);
        __pipeSegment("SANITARY", "SAN-MAIN-01", __vec(2500,23000,450), __vec(8500,23000,450), 160, "CONCRETE", "Sanitary Drain", "Gravity", null);
        __pipeSegment("STORM", "STORM-MAIN-01", __vec(1000,12000,250), __vec(35000,12000,250), 200, "CONCRETE", "Storm Drainage", "Gravity", null);
        const __fixtures=[[3000,21500,"WC-01"],[4500,21500,"LAV-01"],[6000,21500,"WC-02"],[7500,21500,"LAV-02"]];
        for (let i=0;i<__fixtures.length;i++){ const f=__fixtures[i]; __equipmentProduct({entityName:"IFCSANITARYTERMINAL",predefinedType:"NOTDEFINED",category:"EQUIPMENT",system:"SANITARY",material:"GLASS",name:"Sanitary Fixture:"+f[2],tag:f[2],typeName:f[2].startsWith("WC")?"Water Closet":"Lavatory",size:"600x500",service:"Sanitary",elevation:450},[{x:f[0],y:f[1],z:450,w:600,d:500,h:800,mat:"GLASS"}]); __pipeSegment("SANITARY","SAN-BR-"+f[2],__vec(f[0],f[1],450),__vec(f[0],23000,450),50,"CONCRETE","Sanitary Branch","Gravity",null); }
        __equipmentProduct({entityName:"IFCUNITARYEQUIPMENT",predefinedType:"PUMP",category:"EQUIPMENT",system:"DRAINAGE",material:"EQUIPMENT",name:"Sump Pump SP-01",tag:"SP-01",typeName:"Sump Pump",size:"450x450",service:"Drainage",elevation:200},[{x:30000,y:22000,z:220,w:700,d:700,h:500,mat:"EQUIPMENT"}]);

        // ============================================================
        // 27. REVIT-LIKE PROPERTY SETS / BASE QUANTITIES
        // ============================================================
        __setStage("REVIT-LIKE MEP PARAMETERS");

        function __prop(name, value) {
            let nominal;
            if (typeof value === "boolean") nominal = __Bool(value);
            else if (typeof value === "number") nominal = __L(value);
            else nominal = __Label(value == null ? "" : value);
            return __entity("IFCPROPERTYSINGLEVALUE", __Identifier(name), null, nominal, null);
        }

        function __pset(name, props) {
            return __entity("IFCPROPERTYSET", __GUID(), __ownerHistory, __Label(name), null, props);
        }

        function __attachPset(product, pset) {
            return __entity("IFCRELDEFINESBYPROPERTIES", __GUID(), __ownerHistory, null, null, [product], pset);
        }

        for (let i = 0; i < __records.length; i++) {
            const r = __records[i];
            try {
                __attachPset(r.entity, __pset("PSet_Revit_Identity Data", [
                    __prop("Mark", r.tag),
                    __prop("Category", r.category),
                    __prop("Family", r.typeName),
                    __prop("Type", r.typeName),
                    __prop("System Name", r.system),
                    __prop("Service", r.service)
                ]));
                __attachPset(r.entity, __pset("PSet_Revit_MEP", [
                    __prop("System Classification", r.system),
                    __prop("System Abbreviation", r.system),
                    __prop("Size", r.size),
                    __prop("Offset / Elevation", r.elevation),
                    __prop("Flow", r.flow),
                    __prop("Pressure", r.pressure),
                    __prop("Voltage", r.voltage),
                    __prop("Insulation Thickness", r.insulation),
                    __prop("From", r.from),
                    __prop("To", r.to)
                ]));
                __attachPset(r.entity, __pset("PSet_LOD400_Fabrication", [
                    __prop("Fabrication Status", "Coordinated for construction"),
                    __prop("Fabrication Level", "LOD400-oriented"),
                    __prop("Spool / Assembly", r.system + "-" + r.tag),
                    __prop("Installation Zone", r.elevation > 6500 ? "High Level Services" : "Low/Mid Level Services")
                ]));
            } catch (e) {
                if (!__semanticWarningShown) {
                    console.warn("[MEP] PropertySet warning; geometry remains valid.");
                    console.warn(e);
                    __semanticWarningShown = true;
                }
            }
        }

        // ============================================================
        // 28. IFC MATERIAL ASSOCIATIONS
        // ============================================================
        __setStage("IFC MATERIAL ASSOCIATIONS");
        Object.keys(__materialGroups).forEach(function(k) {
            try {
                const products = __materialGroups[k];
                if (products && products.length > 0 && __MAT[k]) {
                    __entity("IFCRELASSOCIATESMATERIAL", __GUID(), __ownerHistory, null, null, products, __getMaterial(k));
                }
            } catch (_) {}
        });

        // ============================================================
        // 29. PROJECT / SITE / BUILDING / STOREY / MEP SYSTEM GROUPS
        // ============================================================
        __setStage("IFC SPATIAL / MEP SYSTEM HIERARCHY");

        const __sitePlacement = __entity("IFCLOCALPLACEMENT", null, __axis3D(0, 0, 0));
        const __buildingPlacement = __entity("IFCLOCALPLACEMENT", __sitePlacement, __axis3D(0, 0, 0));
        const __storeyPlacement = __entity("IFCLOCALPLACEMENT", __buildingPlacement, __axis3D(0, 0, 0));

        const __project = __entity(
            "IFCPROJECT",
            __GUID(), __ownerHistory,
            __Label("Factory MEP Coordination Project"),
            __Label("Detailed factory MEP IFC4 model"),
            null,
            __Label("Factory MEP LOD400-Oriented"),
            null,
            [__context],
            __projectUnits
        );

        const __site = __entity(
            "IFCSITE",
            __GUID(), __ownerHistory,
            __Label("Industrial Site"), null, null,
            __sitePlacement, null,
            __Label("Factory Site"),
            __Enum("ELEMENT"),
            null, null, null, null, null
        );

        const __building = __entity(
            "IFCBUILDING",
            __GUID(), __ownerHistory,
            __Label("Factory Building"), null, null,
            __buildingPlacement, null,
            __Label("36m x 24m Industrial Factory"),
            __Enum("ELEMENT"),
            null, null, null
        );

        const __storey = __entity(
            "IFCBUILDINGSTOREY",
            __GUID(), __ownerHistory,
            __Label("Factory Level 0"), null, null,
            __storeyPlacement, null,
            __Label("Factory Production Floor"),
            __Enum("ELEMENT"),
            __L(0)
        );

        __entity("IFCRELAGGREGATES", __GUID(), __ownerHistory, null, null, __project, [__site]);
        __entity("IFCRELAGGREGATES", __GUID(), __ownerHistory, null, null, __site, [__building]);
        __entity("IFCRELAGGREGATES", __GUID(), __ownerHistory, null, null, __building, [__storey]);

        // Contain all generated physical products in the factory storey.
        const __allPhysical = __records.map(function(r) { return r.entity; });
        if (__allPhysical.length > 0) {
            __entity("IFCRELCONTAINEDINSPATIALSTRUCTURE", __GUID(), __ownerHistory, null, null, __allPhysical, __storey);
        }

        // Revit-like MEP system groups. Prefer IfcDistributionSystem where safe; fallback IfcGroup.
        Object.keys(__systemMembers).forEach(function(systemName) {
            const members = __systemMembers[systemName];
            if (!members || members.length === 0 || !systemName) return;
            let grp = null;
            if (__hasEntity("IFCDISTRIBUTIONSYSTEM")) {
                try {
                    grp = __entity(
                        "IFCDISTRIBUTIONSYSTEM",
                        __GUID(), __ownerHistory,
                        __Label(systemName),
                        __Label("Factory MEP System " + systemName),
                        __Label(systemName),
                        __Label(systemName),
                        __Enum("NOTDEFINED")
                    );
                } catch (_) { grp = null; }
            }
            if (!grp) {
                grp = __entity("IFCGROUP", __GUID(), __ownerHistory, __Label(systemName), __Label("Factory MEP System"), __Label(systemName));
            }
            __entity("IFCRELASSIGNSTOGROUP", __GUID(), __ownerHistory, null, null, members, null, grp);
        });

        // ============================================================
        // 30. LIGHTWEIGHT COORDINATION QA
        // ============================================================
        __setStage("MEP COORDINATION QA");

        const __qa = {
            supplyDuctBottom: __P.SUPPLY_DUCT_Z - 300,
            returnDuctTop: __P.RETURN_DUCT_Z + 250,
            powerTrayTop: __P.POWER_TRAY_Z + 60,
            chwTop: __P.CHWR_Z + 125,
            fireBottom: __P.FIRE_Z - 60
        };

        const __clearances = {
            DUCT_SUPPLY_TO_RETURN: __qa.supplyDuctBottom - __qa.returnDuctTop,
            RETURN_TO_POWER_TRAY: (__P.RETURN_DUCT_Z - 250) - __qa.powerTrayTop,
            POWER_TRAY_TO_CHW: (__P.POWER_TRAY_Z - 60) - __qa.chwTop,
            FIRE_TO_SUPPLY: __qa.fireBottom - (__P.SUPPLY_DUCT_Z + 300)
        };

        Object.keys(__clearances).forEach(function(k) {
            console.log("[MEP QA]", k, "CLEARANCE =", Math.round(__clearances[k]), "mm");
            if (__clearances[k] < 100) throw new Error("MEP vertical coordination clearance too small: " + k);
        });

        // ============================================================
        // 31. SAVE MODEL
        // ============================================================
        __setStage("SAVE IFC MODEL");

        const __bytes = ifcAPI.SaveModel(__modelID);
        globalThis.__FACTORY_MEP_IFC_BYTES__ = __bytes;
        globalThis.__FACTORY_MEP_SUMMARY__ = {
            modelID: __modelID,
            schema: __schema,
            width: __P.WIDTH,
            length: __P.LENGTH,
            clearHeight: __P.CLEAR_HEIGHT,
            elements: __elementCount,
            counts: __counts,
            systems: Object.keys(__systemMembers),
            sizeBytes: __bytes.length
        };

        console.log("============================================================");
        console.log("MODEL GENERATED SUCCESSFULLY");
        console.log("MODEL: FACTORY MEP IFC4 LOD400-ORIENTED");
        console.log("MODEL ID:", __modelID);
        console.log("SCHEMA:", __schema);
        console.log("LENGTH UNIT: MILLIMETRE");
        console.log("FACTORY SIZE:", __P.WIDTH, "x", __P.LENGTH, "mm");
        console.log("CLEAR HEIGHT:", __P.CLEAR_HEIGHT, "mm");
        console.log("ELEMENTS CREATED:", __elementCount);
        console.log("PIPES:", __counts.PIPE);
        console.log("PIPE FITTINGS:", __counts.PIPE_FITTING);
        console.log("VALVES:", __counts.VALVE);
        console.log("DUCTS:", __counts.DUCT);
        console.log("DUCT FITTINGS:", __counts.DUCT_FITTING);
        console.log("AIR TERMINALS:", __counts.AIR_TERMINAL);
        console.log("CABLE TRAYS:", __counts.CABLE_TRAY);
        console.log("CONDUITS:", __counts.CONDUIT);
        console.log("MEP EQUIPMENT:", __counts.EQUIPMENT);
        console.log("ELECTRICAL EQUIPMENT:", __counts.ELECTRICAL);
        console.log("FIRE DEVICES:", __counts.FIRE);
        console.log("SENSORS:", __counts.SENSOR);
        console.log("SUPPORTS:", __counts.SUPPORT);
        console.log("SYSTEMS:", Object.keys(__systemMembers).join(", "));
        console.log("MODEL SIZE:", __bytes.length, "bytes");
        console.log("============================================================");

        return __bytes;

    } catch (error) {
        console.error("============================================================");
        console.error("MODEL BUILD FAILED");
        console.error("FAILED STAGE:", __stage);
        console.error("ELEMENTS CREATED BEFORE FAILURE:", __elementCount);
        console.error("ERROR:", error && error.message ? error.message : error);
        console.error(error);
        console.error("============================================================");
        throw error;
    }
})();`;

export const COLUMN_GRID_CODE = `/**
 * Web-IFC BIM Code Playground
 * 6x6 Structural Column Grid (36 IFC Columns)
 */

const len = (val) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCLENGTHMEASURE, val);
const posLen = (val) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCPOSITIVELENGTHMEASURE, val);
const label = (str) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCLABEL, str);
const text = (str) => ifcAPI.CreateIfcType(modelID, WebIFC.IFCTEXT, str);
const guid = () => ifcAPI.CreateIFCGloballyUniqueId(modelID);

console.log("Generating 6x6 Structural Column Grid in IFC4...");

const pt0 = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCCARTESIANPOINT, [len(0), len(0), len(0)]);
ifcAPI.WriteLine(modelID, pt0);

const dirZ = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCDIRECTION, [len(0), len(0), len(1)]);
ifcAPI.WriteLine(modelID, dirZ);

const dirX = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCDIRECTION, [len(1), len(0), len(0)]);
ifcAPI.WriteLine(modelID, dirX);

const axisWorld = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCAXIS2PLACEMENT3D, pt0, dirZ, dirX);
ifcAPI.WriteLine(modelID, axisWorld);

const unitLength = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCSIUNIT, null, { type: WebIFC.ENUM, value: "LENGTHUNIT" }, null, { type: WebIFC.ENUM, value: "METRE" });
ifcAPI.WriteLine(modelID, unitLength);

const unitArea = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCSIUNIT, null, { type: WebIFC.ENUM, value: "AREAUNIT" }, null, { type: WebIFC.ENUM, value: "SQUARE_METRE" });
ifcAPI.WriteLine(modelID, unitArea);

const unitVolume = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCSIUNIT, null, { type: WebIFC.ENUM, value: "VOLUMEUNIT" }, null, { type: WebIFC.ENUM, value: "CUBIC_METRE" });
ifcAPI.WriteLine(modelID, unitVolume);

const unitAssignment = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCUNITASSIGNMENT, [unitLength, unitArea, unitVolume]);
ifcAPI.WriteLine(modelID, unitAssignment);

const context = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCGEOMETRICREPRESENTATIONCONTEXT,
  null,
  label("Model"),
  3,
  1e-5,
  axisWorld,
  null
);
ifcAPI.WriteLine(modelID, context);

const project = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCPROJECT,
  guid(),
  null,
  label("6x6 Structural Column Grid"),
  null,
  null,
  null,
  null,
  [context],
  unitAssignment
);
ifcAPI.WriteLine(modelID, project);

const ptProfile = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCCARTESIANPOINT, [len(0), len(0)]);
ifcAPI.WriteLine(modelID, ptProfile);

const axisProfile = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCAXIS2PLACEMENT2D, ptProfile, null);
ifcAPI.WriteLine(modelID, axisProfile);

const colProfile = ifcAPI.CreateIfcEntity(
  modelID,
  WebIFC.IFCRECTANGLEPROFILEDEF,
  { type: WebIFC.ENUM, value: "AREA" },
  label("Col_400x400"),
  axisProfile,
  posLen(0.4),
  posLen(0.4)
);
ifcAPI.WriteLine(modelID, colProfile);

const GRID_SIZE = 6;
const SPACING = 6.0;
const COL_HEIGHT = 4.0;

for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const x = i * SPACING;
    const y = j * SPACING;

    const ptCol = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCCARTESIANPOINT, [len(x), len(y), len(0)]);
    ifcAPI.WriteLine(modelID, ptCol);

    const axisCol = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCAXIS2PLACEMENT3D, ptCol, dirZ, dirX);
    ifcAPI.WriteLine(modelID, axisCol);

    const solid = ifcAPI.CreateIfcEntity(
      modelID,
      WebIFC.IFCEXTRUDEDAREASOLID,
      colProfile,
      axisCol,
      dirZ,
      posLen(COL_HEIGHT)
    );
    ifcAPI.WriteLine(modelID, solid);

    const shapeRep = ifcAPI.CreateIfcEntity(
      modelID,
      WebIFC.IFCSHAPEREPRESENTATION,
      context,
      label("Body"),
      label("SweptSolid"),
      [solid]
    );
    ifcAPI.WriteLine(modelID, shapeRep);

    const prodShape = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCPRODUCTDEFINITIONSHAPE, null, null, [shapeRep]);
    ifcAPI.WriteLine(modelID, prodShape);

    const localPlacement = ifcAPI.CreateIfcEntity(modelID, WebIFC.IFCLOCALPLACEMENT, null, axisCol);
    ifcAPI.WriteLine(modelID, localPlacement);

    const colName = \`COL_\${String.fromCharCode(65 + i)}\${j + 1}\`;
    const column = ifcAPI.CreateIfcEntity(
      modelID,
      WebIFC.IFCCOLUMN,
      guid(),
      null,
      label(colName),
      text(\`Reinforced Concrete Column \${colName}\`),
      null,
      localPlacement,
      prodShape,
      null
    );
    ifcAPI.WriteLine(modelID, column);
  }
}
console.log("Created 36 structural columns successfully!");
`;

// Default code requested by user:
export const DEFAULT_IFC_CODE = FACTORY_MEP_V2_CODE;
