// ifcx-core/layers/layer-providers.ts
var StackedLayerProvider = class {
  providers;
  constructor(providers) {
    this.providers = providers;
  }
  async GetLayerByURI(uri) {
    let errorStack = [];
    for (let provider of this.providers) {
      let layer = await provider.GetLayerByURI(uri);
      if (!(layer instanceof Error)) {
        return layer;
      } else {
        errorStack.push(layer);
      }
    }
    return new Error(JSON.stringify(errorStack));
  }
};
var InMemoryLayerProvider = class {
  layers;
  constructor() {
    this.layers = /* @__PURE__ */ new Map();
  }
  async GetLayerByURI(uri) {
    if (!this.layers.has(uri)) {
      return new Error(`File with uri "${uri}" not found`);
    }
    return this.layers.get(uri);
  }
  add(file) {
    if (this.layers.has(file.header.id)) {
      throw new Error(`Inserting file with duplicate ID "${file.header.id}"`);
    }
    this.layers.set(file.header.id, file);
    return this;
  }
  AddAll(files) {
    files.forEach((f) => this.add(f));
    return this;
  }
};

// ifcx-core/util/log.ts
var LOG_ENABLED = true;
function log(bla) {
  if (LOG_ENABLED) {
    console.log(`${JSON.stringify(arguments)}`);
  }
}

// ifcx-core/layers/fetch-layer-provider.ts
var FetchLayerProvider = class {
  layers;
  constructor() {
    this.layers = /* @__PURE__ */ new Map();
  }
  async FetchJson(url) {
    let result = await fetch(url);
    if (!result.ok) {
      return new Error(`Failed to fetch ${url}: ${result.status}`);
    }
    try {
      return await result.json();
    } catch (e) {
      log(url);
      return new Error(`Failed to parse json at ${url}: ${e}`);
    }
  }
  async GetLayerByURI(uri) {
    if (!this.layers.has(uri)) {
      let fetched = await this.FetchJson(uri);
      if (fetched instanceof Error) {
        return new Error(`File with id "${uri}" not found`);
      }
      let file = fetched;
      this.layers.set(uri, file);
      return file;
    }
    return this.layers.get(uri);
  }
};

// ifcx-core/util/mm.ts
function MMSet(map, key, value) {
  if (map.has(key)) {
    map.get(key)?.push(value);
  } else {
    map.set(key, [value]);
  }
}

// ifcx-core/composition/cycles.ts
var CycleError = class extends Error {
};
function FindRootsOrCycles(nodes) {
  let dependencies = /* @__PURE__ */ new Map();
  let dependents = /* @__PURE__ */ new Map();
  nodes.forEach((node, path) => {
    Object.keys(node.inherits).forEach((inheritName) => {
      MMSet(dependencies, path, node.inherits[inheritName]);
      MMSet(dependents, node.inherits[inheritName], path);
    });
    Object.keys(node.children).forEach((childName) => {
      MMSet(dependencies, path, node.children[childName]);
      MMSet(dependents, node.children[childName], path);
    });
  });
  let paths = [...nodes.keys()];
  let perm = {};
  let temp = {};
  function visit(path) {
    if (perm[path]) return;
    if (temp[path]) throw new Error(`CYCLE!`);
    temp[path] = true;
    let deps = dependencies.get(path);
    if (deps) {
      deps.forEach((dep) => visit(dep));
    }
    perm[path] = true;
  }
  let roots = /* @__PURE__ */ new Set();
  try {
    paths.forEach((path) => {
      if (!dependents.has(path) && path.indexOf("/") === -1) {
        roots.add(path);
      }
      visit(path);
    });
  } catch (e) {
    return null;
  }
  return roots;
}

// ifcx-core/composition/path.ts
function GetHead(path) {
  return path.split("/")[0];
}
function GetTail(path) {
  let parts = path.split("/");
  parts.shift();
  return parts.join("/");
}

// ifcx-core/composition/node.ts
function MakePostCompositionNode(node) {
  return {
    node,
    children: /* @__PURE__ */ new Map(),
    attributes: /* @__PURE__ */ new Map()
  };
}
function GetChildNodeWithPath(node, path) {
  if (path === "") return node;
  let parts = path.split("/");
  let child = node.children.get(parts[0]);
  if (child) {
    if (parts.length === 1) {
      return child;
    }
    return GetChildNodeWithPath(child, GetTail(path));
  } else {
    return null;
  }
}

// ifcx-core/composition/compose.ts
function FlattenPathToPreCompositionNode(path, inputNodes) {
  let compositionNode = {
    path,
    children: {},
    inherits: {},
    attributes: {}
  };
  inputNodes.forEach((node) => {
    Object.keys(node.children).forEach((childName) => {
      compositionNode.children[childName] = node.children[childName];
    });
    Object.keys(node.inherits).forEach((inheritName) => {
      let ih = node.inherits[inheritName];
      if (ih === null) {
        delete compositionNode.inherits[inheritName];
      } else {
        compositionNode.inherits[inheritName] = ih;
      }
    });
    Object.keys(node.attributes).forEach((attrName) => {
      compositionNode.attributes[attrName] = node.attributes[attrName];
    });
  });
  return compositionNode;
}
function FlattenCompositionInput(input) {
  let compositionNodes = /* @__PURE__ */ new Map();
  for (let [path, inputNodes] of input) {
    compositionNodes.set(path, FlattenPathToPreCompositionNode(path, inputNodes));
  }
  return compositionNodes;
}
function ExpandFirstRootInInput(nodes) {
  let roots = FindRootsOrCycles(nodes);
  if (!roots) {
    throw new CycleError();
  }
  return ComposeNodeFromPath([...roots.values()][0], nodes);
}
function CreateArtificialRoot(nodes) {
  let roots = FindRootsOrCycles(nodes);
  if (!roots) {
    throw new CycleError();
  }
  let pseudoRoot = {
    node: "",
    attributes: /* @__PURE__ */ new Map(),
    children: /* @__PURE__ */ new Map()
  };
  roots.forEach((root) => {
    pseudoRoot.children.set(root, ComposeNodeFromPath(root, nodes));
  });
  return pseudoRoot;
}
function ComposeNodeFromPath(path, preCompositionNodes) {
  return ComposeNode(path, MakePostCompositionNode(path), preCompositionNodes);
}
function ComposeNode(path, postCompositionNode, preCompositionNodes) {
  let preCompositionNode = preCompositionNodes.get(path);
  if (preCompositionNode) {
    AddDataFromPreComposition(preCompositionNode, postCompositionNode, preCompositionNodes);
  }
  postCompositionNode.children.forEach((child, name) => {
    ComposeNode(`${path}/${name}`, child, preCompositionNodes);
  });
  return postCompositionNode;
}
function AddDataFromPreComposition(input, node, nodes) {
  Object.values(input.inherits).forEach((inheritPath) => {
    let classNode = ComposeNodeFromPath(GetHead(inheritPath), nodes);
    let subnode = GetChildNodeWithPath(classNode, GetTail(inheritPath));
    if (!subnode) throw new Error(`Unknown node ${inheritPath}`);
    subnode.children.forEach((child, childName) => {
      node.children.set(childName, child);
    });
    for (let [attrID, attr] of subnode.attributes) {
      node.attributes.set(attrID, attr);
    }
  });
  Object.entries(input.children).forEach(([childName, child]) => {
    if (child !== null) {
      let classNode = ComposeNodeFromPath(GetHead(child), nodes);
      let subnode = GetChildNodeWithPath(classNode, GetTail(child));
      if (!subnode) throw new Error(`Unknown node ${child}`);
      node.children.set(childName, subnode);
    } else {
      node.children.delete(childName);
    }
  });
  Object.entries(input.attributes).forEach(([attrID, attr]) => {
    node.attributes.set(attrID, attr);
  });
}

// ifcx-core/schema/schema-validation.ts
var SchemaValidationError = class extends Error {
};
function ValidateAttributeValue(desc, value, path, schemas) {
  if (desc.optional && value === void 0) {
    return;
  }
  if (desc.inherits) {
    desc.inherits.forEach((inheritedSchemaID) => {
      let inheritedSchema = schemas[inheritedSchemaID];
      if (!inheritedSchema) {
        throw new SchemaValidationError(`Unknown inherited schema id "${desc.inherits}"`);
      }
      ValidateAttributeValue(inheritedSchema.value, value, path, schemas);
    });
  }
  if (desc.dataType === "Boolean") {
    if (typeof value !== "boolean") {
      throw new SchemaValidationError(`Expected "${value}" to be of type boolean`);
    }
  } else if (desc.dataType === "String") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type string`);
    }
  } else if (desc.dataType === "DateTime") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type date`);
    }
  } else if (desc.dataType === "Enum") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type string`);
    }
    let found = desc.enumRestrictions.options.filter((option) => option === value).length === 1;
    if (!found) {
      throw new SchemaValidationError(`Expected "${value}" to be one of [${desc.enumRestrictions.options.join(",")}]`);
    }
  } else if (desc.dataType === "Integer") {
    if (typeof value !== "number") {
      throw new SchemaValidationError(`Expected "${value}" to be of type int`);
    }
  } else if (desc.dataType === "Real") {
    if (typeof value !== "number") {
      throw new SchemaValidationError(`Expected "${value}" to be of type real`);
    }
  } else if (desc.dataType === "Reference") {
    if (typeof value !== "string") {
      throw new SchemaValidationError(`Expected "${value}" to be of type string`);
    }
  } else if (desc.dataType === "Object") {
    if (typeof value !== "object") {
      throw new SchemaValidationError(`Expected "${value}" to be of type object`);
    }
    if (desc.objectRestrictions) {
      Object.keys(desc.objectRestrictions.values).forEach((key) => {
        let optional = desc.objectRestrictions.values[key].optional;
        let hasOwn = Object.hasOwn(value, key);
        if (optional && !hasOwn) return;
        if (!hasOwn) {
          throw new SchemaValidationError(`Expected "${value}" to have key ${key}`);
        }
        ValidateAttributeValue(desc.objectRestrictions.values[key], value[key], path + "." + key, schemas);
      });
    }
  } else if (desc.dataType === "Array") {
    if (!Array.isArray(value)) {
      throw new SchemaValidationError(`Expected "${value}" to be of type array`);
    }
    value.forEach((entry) => {
      ValidateAttributeValue(desc.arrayRestrictions.value, entry, path + ".<array>.", schemas);
    });
  } else {
    throw new SchemaValidationError(`Unexpected datatype ${desc.dataType}`);
  }
}
function Validate(schemas, inputNodes) {
  inputNodes.forEach((node) => {
    Object.keys(node.attributes).filter((v) => !v.startsWith("__internal")).forEach((schemaID) => {
      if (!schemas[schemaID]) {
        throw new SchemaValidationError(`Missing schema "${schemaID}" referenced by ["${node.path}"].attributes`);
      }
      let schema = schemas[schemaID];
      let value = node.attributes[schemaID];
      try {
        ValidateAttributeValue(schema.value, value, "", schemas);
      } catch (e) {
        if (e instanceof SchemaValidationError) {
          throw new SchemaValidationError(`Error validating ["${node.path}"].attributes["${schemaID}"]: ${e.message}`);
        } else {
          throw e;
        }
      }
    });
  });
}

// ifcx-core/workflows.ts
function ToInputNodes(data) {
  let inputNodes = /* @__PURE__ */ new Map();
  data.forEach((ifcxNode) => {
    let node = {
      path: ifcxNode.path,
      children: ifcxNode.children ? ifcxNode.children : {},
      inherits: ifcxNode.inherits ? ifcxNode.inherits : {},
      attributes: ifcxNode.attributes ? ifcxNode.attributes : {}
    };
    MMSet(inputNodes, node.path, node);
  });
  return inputNodes;
}
function LoadIfcxFile(file, checkSchemas = true, createArtificialRoot = true) {
  let inputNodes = ToInputNodes(file.data);
  let compositionNodes = FlattenCompositionInput(inputNodes);
  try {
    if (checkSchemas) {
      Validate(file.schemas, compositionNodes);
    }
  } catch (e) {
    throw e;
  }
  if (createArtificialRoot) {
    return CreateArtificialRoot(compositionNodes);
  } else {
    return ExpandFirstRootInInput(compositionNodes);
  }
}
function Federate(files) {
  if (files.length === 0) {
    throw new Error(`Trying to federate empty set of files`);
  }
  let result = {
    header: files[0].header,
    imports: [],
    schemas: {},
    data: []
  };
  files.forEach((file) => {
    Object.keys(file.schemas).forEach((schemaID) => result.schemas[schemaID] = file.schemas[schemaID]);
  });
  files.forEach((file) => {
    file.data.forEach((node) => result.data.push(node));
  });
  return Prune(result);
}
function Collapse(nodes, deleteEmpty = false) {
  let result = {
    path: nodes[0].path,
    children: {},
    inherits: {},
    attributes: {}
  };
  nodes.forEach((node) => {
    Object.keys(node.children).forEach((name) => {
      result.children[name] = node.children[name];
    });
    Object.keys(node.inherits).forEach((name) => {
      result.inherits[name] = node.inherits[name];
    });
    Object.keys(node.attributes).forEach((name) => {
      result.attributes[name] = node.attributes[name];
    });
  });
  if (deleteEmpty) {
    let empty = true;
    Object.keys(result.children).forEach((name) => {
      if (result.children[name] !== null) empty = false;
    });
    Object.keys(result.inherits).forEach((name) => {
      if (result.inherits[name] !== null) empty = false;
    });
    Object.keys(result.attributes).forEach((name) => {
      if (result.attributes[name] !== null) empty = false;
    });
    if (empty) return null;
  }
  return result;
}
function Prune(file, deleteEmpty = false) {
  let result = {
    header: file.header,
    imports: [],
    schemas: file.schemas,
    data: []
  };
  let inputNodes = ToInputNodes(file.data);
  inputNodes.forEach((nodes) => {
    let collapsed = Collapse(nodes, deleteEmpty);
    if (collapsed) result.data.push({
      path: collapsed.path,
      children: collapsed.children,
      inherits: collapsed.inherits,
      attributes: collapsed.attributes
    });
  });
  return result;
}

// ifcx-core/layers/layer-stack.ts
var IfcxLayerStack = class {
  // main layer at 0
  layers;
  tree;
  schemas;
  federated;
  constructor(layers) {
    this.layers = layers;
    this.Compose();
  }
  GetLayerIds() {
    return this.layers.map((l) => l.header.id);
  }
  Compose() {
    this.federated = Federate(this.layers);
    this.schemas = this.federated.schemas;
    this.tree = LoadIfcxFile(this.federated);
  }
  GetFullTree() {
    this.Compose();
    return this.tree;
  }
  GetFederatedLayer() {
    return this.federated;
  }
  GetSchemas() {
    return this.schemas;
  }
};
var IfcxLayerStackBuilder = class {
  provider;
  mainLayerId = null;
  constructor(provider) {
    this.provider = provider;
  }
  FromId(id) {
    this.mainLayerId = id;
    return this;
  }
  async Build() {
    if (!this.mainLayerId) throw new Error(`no main layer ID specified`);
    let layers = await this.BuildLayerSet(this.mainLayerId);
    if (layers instanceof Error) {
      return layers;
    }
    try {
      return new IfcxLayerStack(layers);
    } catch (e) {
      return e;
    }
  }
  async SatisfyDependencies(activeLayer, placed, orderedLayers) {
    let pending = [];
    for (const impt of activeLayer.imports) {
      if (!placed.has(impt.uri)) {
        let layer = await this.provider.GetLayerByURI(impt.uri);
        if (layer instanceof Error) {
          return layer;
        }
        pending.push(layer);
        placed.set(impt.uri, true);
      }
    }
    let temp = [];
    for (const layer of pending) {
      temp.push(layer);
      let layers = await this.SatisfyDependencies(layer, placed, orderedLayers);
      if (layers instanceof Error) {
        return layers;
      }
      temp.push(...layers);
    }
    temp.forEach((t) => orderedLayers.push(t));
    return temp;
  }
  async BuildLayerSet(activeLayerID) {
    let activeLayer = await this.provider.GetLayerByURI(activeLayerID);
    if (activeLayer instanceof Error) {
      return activeLayer;
    }
    let layerSet = [activeLayer];
    let placed = /* @__PURE__ */ new Map();
    placed.set(activeLayer.header.id, true);
    let result = await this.SatisfyDependencies(activeLayer, placed, layerSet);
    if (result instanceof Error) {
      return result;
    }
    return layerSet;
  }
};

// viewer/compose-flattened.ts
function TreeNodeToComposedObject(path, node, schemas) {
  let co = {
    name: path,
    attributes: {},
    children: []
  };
  node.children.forEach((childNode, childName) => {
    co.children?.push(TreeNodeToComposedObject(`${path}/${childName}`, childNode, schemas));
  });
  node.attributes.forEach((attr, attrName) => {
    if (attr && typeof attr === "object" && !Array.isArray(attr)) {
      Object.keys(attr).forEach((compname) => {
        co.attributes[`${attrName}::${compname}`] = attr[compname];
      });
    } else {
      let schema = schemas[attrName];
      if (schema && schema.value.quantityKind) {
        let postfix = "";
        let quantityKind = schema.value.quantityKind;
        if (quantityKind === "Length") {
          postfix = "m";
        } else if (quantityKind === "Volume") {
          postfix = "m" + String.fromCodePoint(179);
        }
        co.attributes[attrName] = `${attr} ${postfix}`;
      } else {
        co.attributes[attrName] = attr;
      }
    }
  });
  if (Object.keys(co.attributes).length === 0) delete co.attributes;
  return co;
}
async function compose3(files) {
  let userDefinedOrder = {
    header: { ...files[0].header },
    imports: files.map((f) => {
      return { uri: f.header.id };
    }),
    schemas: {},
    data: []
  };
  userDefinedOrder.header.id = "USER_DEF";
  let provider = new StackedLayerProvider([
    new InMemoryLayerProvider().AddAll([userDefinedOrder, ...files]),
    new FetchLayerProvider()
  ]);
  let layerStack = await new IfcxLayerStackBuilder(provider).FromId(userDefinedOrder.header.id).Build();
  if (layerStack instanceof Error) {
    throw layerStack;
  }
  layerStack.GetFederatedLayer().data.forEach((n, i) => {
    n.attributes = n.attributes || {};
    n.attributes[`__internal_${i}`] = n.path;
  });
  return TreeNodeToComposedObject("", layerStack.GetFullTree(), layerStack.GetSchemas());
}

// viewer/render.ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PCDLoader } from "three/addons/loaders/PCDLoader.js";
var CLICK_DRAG_THRESHOLD = 5;
function HasAttr(node, attrName) {
  if (!node || !node.attributes) return false;
  return !!node.attributes[attrName];
}
function setHighlight(obj, highlight) {
  if (!obj) return;
  obj.traverse((o) => {
    const mat = o.material;
    if (mat && mat.color) {
      if (highlight) {
        if (!o.userData._origColor) {
          o.userData._origColor = mat.color.clone();
        }
        o.material = mat.clone();
        o.material.color.set(16711680);
      } else if (o.userData._origColor) {
        mat.color.copy(o.userData._origColor);
        delete o.userData._origColor;
      }
    }
  });
}
function tryCreateMeshGltfMaterial(path) {
  for (let p of path) {
    if (!p.attributes) {
      continue;
    }
    const pbrMetallicRoughness = p.attributes["gltf::material::pbrMetallicRoughness"];
    const normalTexture = p.attributes["gltf::material::normalTexture"];
    const occlusionTexture = p.attributes["gltf::material::occlusionTexture"];
    const emissiveTexture = p.attributes["gltf::material::emissiveTexture"];
    const emissiveFactor = p.attributes["gltf::material::emissiveFactor"];
    const alphaMode = p.attributes["gltf::material::alphaMode"];
    const alphaCutoff = p.attributes["gltf::material::alphaCutoff"];
    const doubleSided = p.attributes["gltf::material::doubleSided"];
    if (!pbrMetallicRoughness && !normalTexture && !occlusionTexture && !emissiveTexture && !emissiveFactor && !alphaMode && !alphaCutoff && !doubleSided) {
      continue;
    }
    let material = new THREE.MeshStandardMaterial();
    material.color = new THREE.Color(1, 1, 1);
    material.metalness = 1;
    material.roughness = 1;
    if (pbrMetallicRoughness) {
      let baseColorFactor = pbrMetallicRoughness["baseColorFactor"];
      if (baseColorFactor) {
        material.color = new THREE.Color(baseColorFactor[0], baseColorFactor[1], baseColorFactor[2]);
      }
      let metallicFactor = pbrMetallicRoughness["metallicFactor"];
      if (metallicFactor !== void 0) {
        material.metalness = metallicFactor;
      }
      let roughnessFactor = pbrMetallicRoughness["roughnessFactor"];
      if (roughnessFactor !== void 0) {
        material.roughness = roughnessFactor;
      }
    }
    material.needsUpdate = true;
    return material;
  }
  return void 0;
}
function createMaterialFromParent(path) {
  let material = {
    color: new THREE.Color(0.88, 0.88, 0.88),
    transparent: false,
    opacity: 1
  };
  for (let p of path) {
    const color = p.attributes ? p.attributes["bsi::ifc::presentation::diffuseColor"] : null;
    if (color) {
      material.color = new THREE.Color(...color);
      const opacity = p.attributes["bsi::ifc::presentation::opacity"];
      if (opacity) {
        material.transparent = true;
        material.opacity = opacity;
      }
      break;
    }
  }
  return material;
}
function createCurveFromJson(path) {
  let points = new Float32Array(path[0].attributes["usd::usdgeom::basiscurves::points"].flat());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const material = createMaterialFromParent(path);
  let lineMaterial = new THREE.LineBasicMaterial({ ...material });
  lineMaterial.color.multiplyScalar(0.8);
  return new THREE.Line(geometry, lineMaterial);
}
function createMeshFromJson(path) {
  let points = new Float32Array(path[0].attributes["usd::usdgeom::mesh::points"].flat());
  let indices = new Uint16Array(path[0].attributes["usd::usdgeom::mesh::faceVertexIndices"]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  var meshMaterial;
  let gltfPbrMaterial = tryCreateMeshGltfMaterial(path);
  if (gltfPbrMaterial) {
    meshMaterial = gltfPbrMaterial;
  } else {
    const m = createMaterialFromParent(path);
    meshMaterial = new THREE.MeshLambertMaterial({ ...m });
  }
  meshMaterial.polygonOffset = true;
  meshMaterial.polygonOffsetFactor = 1;
  meshMaterial.polygonOffsetUnits = 1;
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  const edgesGeo = new THREE.EdgesGeometry(geometry, 15);
  const edgesMat = new THREE.LineBasicMaterial({ color: 1118481, transparent: true, opacity: 0.3 });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  edges.raycast = () => {
  };
  const group = new THREE.Group();
  group.add(mesh);
  group.add(edges);
  return group;
}
function createPointsFromJsonPcdBase64(path) {
  const base64_string = path[0].attributes["pcd::base64"];
  const decoded = atob(base64_string);
  const len = decoded.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  const loader = new PCDLoader();
  const points = loader.parse(bytes.buffer);
  points.material.sizeAttenuation = false;
  points.material.size = 2;
  return points;
}
function createPoints(geometry, withColors) {
  const material = new THREE.PointsMaterial();
  material.sizeAttenuation = false;
  material.fog = true;
  material.size = 5;
  material.color = new THREE.Color(withColors ? 16777215 : 0);
  if (withColors) {
    material.vertexColors = true;
  }
  return new THREE.Points(geometry, material);
}
function createPointsFromJsonArray(path) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(path[0].attributes["points::array::positions"].flat());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const colors = path[0].attributes["points::array::colors"];
  if (colors) {
    const colors_ = new Float32Array(colors.flat());
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors_, 3));
  }
  return createPoints(geometry, colors);
}
function base64ToArrayBuffer(str) {
  let binary;
  try {
    binary = atob(str);
  } catch (e) {
    throw new Error("base64 encoded string is invalid");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; ++i) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
function createPointsFromJsonPositionBase64(path) {
  const geometry = new THREE.BufferGeometry();
  const positions_base64 = path[0].attributes["points::base64::positions"];
  const positions_bytes = base64ToArrayBuffer(positions_base64);
  if (!positions_bytes) {
    return null;
  }
  const positions = new Float32Array(positions_bytes);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const colors_base64 = path[0].attributes["points::base64::colors"];
  if (colors_base64) {
    const colors_bytes = base64ToArrayBuffer(colors_base64);
    if (colors_bytes) {
      const colors = new Float32Array(colors_bytes);
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }
  }
  return createPoints(geometry, colors_base64);
}
function encodeHtmlEntities(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
var icons = {
  "usd::usdgeom::mesh::points": "deployed_code",
  "usd::usdgeom::basiscurves::points": "line_curve",
  "usd::usdshade::material::outputs::surface.connect": "line_style",
  "pcd::base64": "grain",
  "points::array::positions": "grain",
  "points::base64::positions": "grain"
};
var IfcxViewer = class {
  _container;
  _viewport;
  _tree = null;
  _layersContainer = null;
  _attributesTable = null;
  _scene = null;
  _camera = null;
  _renderer = null;
  _controls = null;
  _resizeObserver = null;
  _rafId = null;
  _animating = false;
  _datas = [];
  _objectMap = {};
  _domMap = {};
  _primMap = {};
  _currentPathMapping = null;
  _rootPrim = null;
  _selectedObject = null;
  _selectedDom = null;
  _autoCamera;
  _onSelect;
  _raycaster = new THREE.Raycaster();
  _mouse = new THREE.Vector2();
  _pointerDown = null;
  constructor(container, options = {}) {
    this._container = container;
    this._autoCamera = options.autoCamera ?? true;
    this._onSelect = options.onSelect;
    this._viewport = container.querySelector(".viewport") ?? this._createViewport(container);
    this._tree = container.querySelector(".tree");
    this._attributesTable = container.querySelector(".attributes .table");
    const layers = container.querySelector(".layers");
    this._layersContainer = layers?.querySelector("div") ?? null;
  }
  _createViewport(container) {
    const viewport = document.createElement("div");
    viewport.className = "viewport";
    viewport.style.width = "100%";
    viewport.style.height = "100%";
    container.appendChild(viewport);
    return viewport;
  }
  _ensureScene() {
    if (this._scene) return this._scene;
    const scene = new THREE.Scene();
    const ambient = new THREE.AmbientLight(14544639, 0.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(16777215, 1);
    keyLight.position.set(5, -10, 7.5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(16777215, 0.5);
    fillLight.position.set(-5, 5, 5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(16777215, 0.3);
    rimLight.position.set(0, 8, -10);
    scene.add(rimLight);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    const viewport = this._viewport;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      logarithmicDepthBuffer: true
    });
    renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
    camera.aspect = viewport.offsetWidth / viewport.offsetHeight;
    camera.updateProjectionMatrix();
    const resizeObserver = new ResizeObserver(() => {
      const w = viewport.offsetWidth, h = viewport.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(viewport);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    viewport.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("pointerdown", (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY };
    });
    renderer.domElement.addEventListener("click", this._onCanvasClick);
    this._scene = scene;
    this._camera = camera;
    this._renderer = renderer;
    this._controls = controls;
    this._resizeObserver = resizeObserver;
    return scene;
  }
  _onCanvasClick = (event) => {
    if (this._pointerDown) {
      const dx = event.clientX - this._pointerDown.x;
      const dy = event.clientY - this._pointerDown.y;
      if (dx * dx + dy * dy > CLICK_DRAG_THRESHOLD * CLICK_DRAG_THRESHOLD) {
        this._pointerDown = null;
        return;
      }
      this._pointerDown = null;
    }
    const renderer = this._renderer;
    const rect = renderer.domElement.getBoundingClientRect();
    this._mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(Object.values(this._objectMap), true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.path) obj = obj.parent;
      if (obj && obj.userData.path) {
        const path = obj.userData.path;
        const prim = this._primMap[path];
        if (prim) {
          this._handleClick(prim, this._currentPathMapping, this._rootPrim || prim);
        }
        this._selectPath(path);
      }
    } else {
      this._selectPath(null);
    }
  };
  _disposeSceneObjects() {
    const scene = this._scene;
    if (!scene) return;
    scene.children.filter((n) => !(n instanceof THREE.Light)).forEach((obj) => {
      obj.traverse((child) => {
        const mesh = child;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
    });
    scene.children = scene.children.filter((n) => n instanceof THREE.Light);
  }
  _selectPath(path) {
    if (!path) {
      if (this._selectedObject) setHighlight(this._selectedObject, false);
      if (this._selectedDom) this._selectedDom.classList.remove("selected");
      this._selectedObject = null;
      this._selectedDom = null;
      this._onSelect?.(null);
      return;
    }
    if (this._selectedObject) {
      setHighlight(this._selectedObject, false);
    }
    if (this._selectedDom) {
      this._selectedDom.classList.remove("selected");
    }
    this._selectedObject = this._objectMap[path] || null;
    this._selectedDom = this._domMap[path] || null;
    if (this._selectedObject) setHighlight(this._selectedObject, true);
    if (this._selectedDom) this._selectedDom.classList.add("selected");
    this._onSelect?.(path);
  }
  _handleClick(prim, pathMapping, root) {
    const container = this._attributesTable;
    if (container !== null) {
      container.innerHTML = "";
      const table = document.createElement("table");
      table.setAttribute("border", "0");
      const entries = [["name", prim.name], ...Object.entries(prim.attributes).filter(([k, _]) => !k.startsWith("__internal_"))];
      const format = (value) => {
        if (Array.isArray(value)) {
          let N = document.createElement("span");
          N.appendChild(document.createTextNode("("));
          let first = true;
          for (let n of value.map(format)) {
            if (!first) {
              N.appendChild(document.createTextNode(","));
            }
            N.appendChild(n);
            first = false;
          }
          N.appendChild(document.createTextNode(")"));
          return N;
        } else if (typeof value === "object") {
          const ks = Object.keys(value);
          if (ks.length == 1 && ks[0] === "ref" && pathMapping[value.ref] && pathMapping[value.ref].length == 1) {
            let a = document.createElement("a");
            let resolvedRefAsPath = pathMapping[value.ref][0];
            a.setAttribute("href", "#");
            a.textContent = resolvedRefAsPath;
            a.onclick = () => {
              let primRef = null;
              const recurse = (n) => {
                if (n.name === resolvedRefAsPath) {
                  primRef = n;
                } else {
                  (n.children || []).forEach(recurse);
                }
              };
              recurse(root);
              if (primRef) {
                this._handleClick(primRef, pathMapping, root);
              }
            };
            return a;
          } else {
            return document.createTextNode(JSON.stringify(value));
          }
        } else {
          return document.createTextNode(value);
        }
      };
      entries.forEach(([key, value]) => {
        const tr = document.createElement("tr");
        const tdKey = document.createElement("td");
        tdKey.textContent = encodeHtmlEntities(key);
        const tdValue = document.createElement("td");
        tdValue.appendChild(format(value));
        tr.appendChild(tdKey);
        tr.appendChild(tdValue);
        table.appendChild(tr);
      });
      container.appendChild(table);
    }
  }
  _traverseTree(path, parent, pathMapping) {
    const node = path[0];
    let elem = new THREE.Group();
    if (HasAttr(node, "usd::usdgeom::visibility::visibility")) {
      if (node.attributes["usd::usdgeom::visibility::visibility"] === "invisible") {
        return;
      }
    } else if (HasAttr(node, "usd::usdgeom::mesh::points")) {
      elem = createMeshFromJson(path);
    } else if (HasAttr(node, "usd::usdgeom::basiscurves::points")) {
      elem = createCurveFromJson(path);
    } else if (HasAttr(node, "pcd::base64")) {
      elem = createPointsFromJsonPcdBase64(path);
    } else if (HasAttr(node, "points::array::positions")) {
      elem = createPointsFromJsonArray(path);
    } else if (HasAttr(node, "points::base64::positions")) {
      elem = createPointsFromJsonPositionBase64(path);
    }
    this._objectMap[node.name] = elem;
    this._primMap[node.name] = node;
    elem.userData.path = node.name;
    for (let ref of Object.entries(node.attributes || {}).filter(([k, _]) => k.startsWith("__internal_")).map(([_, v]) => v)) {
      (pathMapping[String(ref)] = pathMapping[String(ref)] || []).push(node.name);
    }
    parent.add(elem);
    if (path.length > 1) {
      elem.matrixAutoUpdate = false;
      let matrixNode = node.attributes && node.attributes["usd::xformop::transform"] ? node.attributes["usd::xformop::transform"].flat() : null;
      if (matrixNode) {
        let matrix = new THREE.Matrix4();
        matrix.set(...matrixNode);
        matrix.transpose();
        elem.matrix = matrix;
      }
    }
    (node.children || []).forEach((child) => this._traverseTree([child, ...path], elem || parent, pathMapping));
  }
  _buildDomTree(prim, node, pathMapping, root = null) {
    const elem = document.createElement("div");
    let span;
    elem.appendChild(document.createTextNode(prim.name ? prim.name.split("/").reverse()[0] : "root"));
    elem.appendChild(span = document.createElement("span"));
    Object.entries(icons).forEach(([k, v]) => span.innerText += (prim.attributes || {})[k] ? v : " ");
    span.className = "material-symbols-outlined";
    this._domMap[prim.name] = elem;
    elem.dataset.path = prim.name;
    elem.onclick = (evt) => {
      this._handleClick(prim, pathMapping, root || prim);
      this._selectPath(prim.name);
      evt.stopPropagation();
    };
    node.appendChild(elem);
    (prim.children || []).forEach((p) => this._buildDomTree(p, elem, pathMapping, root || prim));
  }
  async _composeAndRender() {
    this._disposeSceneObjects();
    this._objectMap = {};
    this._domMap = {};
    this._primMap = {};
    this._currentPathMapping = null;
    this._rootPrim = null;
    const treeEl = this._tree;
    if (treeEl) treeEl.innerHTML = "";
    if (this._datas.length === 0) {
      return;
    }
    let tree = null;
    let dataArray = this._datas.map((arr) => arr[1]);
    tree = await compose3(dataArray);
    if (!tree) {
      console.error("No result from composition");
      return;
    }
    const scene = this._ensureScene();
    const pathMapping = {};
    this._traverseTree([tree], scene, pathMapping);
    this._currentPathMapping = pathMapping;
    this._rootPrim = tree;
    if (this._autoCamera) {
      const boundingBox = new THREE.Box3();
      boundingBox.setFromObject(scene);
      if (!boundingBox.isEmpty()) {
        let avg = boundingBox.min.clone().add(boundingBox.max).multiplyScalar(0.5);
        let ext = boundingBox.max.clone().sub(boundingBox.min).length();
        this._camera.position.copy(avg.clone().add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(ext)));
        this._camera.far = ext * 3;
        this._camera.updateProjectionMatrix();
        this._controls.target.copy(avg);
        this._controls.update();
        this._autoCamera = false;
      }
    }
    if (treeEl) {
      this._buildDomTree(tree, treeEl, pathMapping);
    }
    this._startAnimate();
    this._renderer.render(scene, this._camera);
    const { geometries, textures } = this._renderer.info.memory;
    const programs = this._renderer.info.programs?.length ?? 0;
    console.log(`[bimr-mem] geometries:${geometries} textures:${textures} programs:${programs}`);
  }
  _createLayerDom() {
    const layersContainer = this._layersContainer;
    if (!layersContainer) return;
    layersContainer.innerHTML = "";
    this._datas.forEach(([name, _], index) => {
      const elem = document.createElement("div");
      elem.appendChild(document.createTextNode(name));
      ["\u25B3", "\u25BD", "\xD7"].reverse().forEach((lbl, cmd) => {
        const btn = document.createElement("span");
        btn.onclick = (evt) => {
          evt.stopPropagation();
          if (cmd === 2) {
            if (index > 0) {
              [this._datas[index], this._datas[index - 1]] = [this._datas[index - 1], this._datas[index]];
            }
          } else if (cmd === 1) {
            if (index < this._datas.length - 1) {
              [this._datas[index], this._datas[index + 1]] = [this._datas[index + 1], this._datas[index]];
            }
          } else if (cmd === 0) {
            this._datas.splice(index, 1);
          }
          void this._composeAndRender();
          this._createLayerDom();
        };
        btn.appendChild(document.createTextNode(lbl));
        elem.appendChild(btn);
      });
      layersContainer.appendChild(elem);
    });
  }
  /** Remove every loaded model from the layer list (does not re-render). */
  clearModels() {
    this._datas.length = 0;
  }
  /** Add an IFCX document under `name` and re-render the composed model. */
  async addModel(name, m) {
    this._datas.push([name, m]);
    this._createLayerDom();
    await this._composeAndRender();
  }
  /** Dispose GPU resources and stop the render loop. The instance is unusable afterwards. */
  destroy() {
    this._animating = false;
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._disposeSceneObjects();
    this._scene = null;
    const renderer = this._renderer;
    if (renderer) {
      renderer.domElement.removeEventListener("click", this._onCanvasClick);
      renderer.domElement.parentElement?.removeChild(renderer.domElement);
      renderer.dispose();
    }
    this._renderer = null;
    this._camera = null;
    this._controls = null;
    this._datas.length = 0;
    this._objectMap = {};
    this._domMap = {};
    this._primMap = {};
    this._selectedObject = null;
    this._selectedDom = null;
  }
  _startAnimate() {
    if (!this._animating) {
      this._animating = true;
      this._animate();
    }
  }
  _animate = () => {
    if (!this._animating || !this._renderer || !this._scene || !this._camera) return;
    this._rafId = requestAnimationFrame(this._animate);
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  };
};
export {
  IfcxViewer
};
