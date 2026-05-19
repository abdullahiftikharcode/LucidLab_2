/**
 * Prompting and validation helpers for AI-generated LucidLab scene logic graphs.
 */

const CURRENT_LOGIC_JSON_LIMIT = 24000;

/** Complete reference graph: touch (distance < 1.5) → hide object1. Substitute object names from scene list. */
const EXAMPLE_TOUCH_HIDE_GRAPH = {
  n_load: {
    name: "SceneLoad",
    position: [80, 200],
    controls: {},
    execOutputs: { exec: "n_loop" },
    inputValues: {},
    inputsFrom: {},
  },
  n_loop: {
    name: "SceneLoop",
    position: [280, 200],
    controls: {},
    execOutputs: { exec: "n_compare" },
    inputValues: {},
    inputsFrom: {},
  },
  n_dist: {
    name: "GetDistanceBetween",
    position: [280, 400],
    controls: { object1: "OBJECT_A", object2: "OBJECT_B" },
    execOutputs: {},
    inputValues: {},
    inputsFrom: {},
  },
  n_compare: {
    name: "Compare",
    position: [520, 200],
    controls: {},
    execOutputs: { lessthan: "n_hide" },
    inputValues: { right: "1.5" },
    inputsFrom: {
      left: { nodeId: "n_dist", outputName: "value" },
      exec: { nodeId: "n_loop", outputName: "exec" },
    },
  },
  n_hide: {
    name: "SetVisible",
    position: [760, 160],
    controls: { object: "OBJECT_A", visible: "False" },
    execOutputs: {},
    inputValues: {},
    inputsFrom: {
      exec: { nodeId: "n_compare", outputName: "lessthan" },
    },
  },
};

const NODE_SOCKET_REFERENCE = `
## How wiring works (CRITICAL)

ExportedNodes is a map: { "nodeId": { name, position, controls, execOutputs, inputValues, inputsFrom } }

Two connection types:
1) EXECUTION (white/exec flow): source.execOutputs["exec"] = "targetNodeId"
   OR for Compare branches: source.execOutputs["lessthan"] = "targetNodeId"
   Target receives: inputsFrom.exec = { nodeId: "sourceId", outputName: "exec" | "equal" | "lessthan" | "biggerthan" }

2) DATA (numbers/strings): target.inputsFrom["left"] = { nodeId: "sourceId", outputName: "value" }
   Use inputValues on the target for constants (e.g. Compare right = "1.5")

Every action/decider node MUST have inputsFrom.exec wired. Unconnected nodes do nothing.

## Standard per-frame flow (use for interactions, touch, continuous checks)

SceneLoad --exec--> SceneLoop --exec--> Compare --lessthan--> SetVisible/SetColor/...
                              ^
                              |
                    GetDistanceBetween.value --left--> Compare
                    (controls.object1, controls.object2)

SceneLoad runs once at start. SceneLoop runs every frame. Put Compare + distance check inside the loop.

Note: SceneLoad and SceneLoop have exec OUTPUTS only (no exec input in the graph UI). Chain them with execOutputs on the SOURCE (e.g. n_load.execOutputs.exec = "n_loop"). Unity Play mode still runs that chain; the editor may not draw a wire between Load and Loop.

## Node socket reference (use EXACT key names)

| Node | controls | inputValues | inputsFrom (common) | execOutputs |
|------|----------|-------------|---------------------|-------------|
| SceneLoad | (none) | | | exec → next |
| SceneLoop | (none) | | | exec → next |
| GetDistanceBetween | object1, object2 | | | value (data only, no exec) |
| Compare | | left, right (optional constants) | left, right, exec | equal, biggerthan, lessthan |
| SetVisible | object, visible ("True"/"False") | | exec | exec (optional chain) |
| SetColor | object, color (hex e.g. #ff69b4) | | exec | exec |
| SetPosition | object | x,y,z | exec, x,y,z | exec |
| ShowMessage | message | | exec | exec |
| GetPosition | object | | | x, y, z |
| Eval | | a, b | a, b | output |

Compare: wire distance to inputsFrom.left, threshold to inputValues.right (e.g. "1.5"), touch = lessthan branch.
Never use keys like "Object Name", "less_than", or "LessThan" — only lessthan, biggerthan, equal.
`.trim();

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function summarizeSceneLogicConnections(nodes) {
  if (!isPlainObject(nodes) || Object.keys(nodes).length === 0) {
    return "Current graph: (empty)";
  }

  const lines = ["Current graph connection summary:"];
  for (const [id, n] of Object.entries(nodes)) {
    if (!isPlainObject(n)) continue;
    lines.push(`- ${id} [${n.name}]`);

    for (const [outKey, targetId] of Object.entries(n.execOutputs || {})) {
      const target = nodes[targetId];
      lines.push(`    exec:${outKey} → ${targetId}${target ? ` (${target.name})` : " (MISSING)"}`);
    }

    for (const [inKey, ref] of Object.entries(n.inputsFrom || {})) {
      if (!ref?.nodeId) continue;
      const src = nodes[ref.nodeId];
      lines.push(
        `    ${inKey} ← ${ref.nodeId}.${ref.outputName}${src ? ` (${src.name})` : " (MISSING)"}`,
      );
    }

    const ctrl = Object.entries(n.controls || {})
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(", ");
    if (ctrl) lines.push(`    controls: ${ctrl}`);
  }

  return lines.join("\n");
}

function buildLogicSystemPrompt({ objects, currentSceneLogic }) {
  const objLines =
    Array.isArray(objects) && objects.length > 0
      ? objects
          .map((o) => `- ${o.objectName} (type=${o.objectType})`)
          .join("\n")
      : "- (no objects)";

  let currentLogicSection = "Current scene logic: none.";
  let connectionSummary = "";

  if (isPlainObject(currentSceneLogic) && Object.keys(currentSceneLogic).length > 0) {
    connectionSummary = summarizeSceneLogicConnections(currentSceneLogic);
    const asString = JSON.stringify(currentSceneLogic, null, 2);
    const truncated =
      asString.length > CURRENT_LOGIC_JSON_LIMIT
        ? asString.slice(0, CURRENT_LOGIC_JSON_LIMIT) + "\n... (truncated) ..."
        : asString;
    currentLogicSection = [
      connectionSummary,
      "",
      "Full current logic JSON (update this graph; return the COMPLETE map, not a diff):",
      "[CURRENT_SCENE_LOGIC_JSON_START]",
      truncated,
      "[CURRENT_SCENE_LOGIC_JSON_END]",
    ].join("\n");
  }

  const exampleJson = JSON.stringify(EXAMPLE_TOUCH_HIDE_GRAPH, null, 2);

  return [
    "You are an expert visual-logic designer for LucidLab.",
    "Output ONLY valid JSON: a single ExportedNodes object (no markdown, no commentary).",
    "",
    NODE_SOCKET_REFERENCE,
    "",
    "## Complete example graph (touch → hide)",
    "When the user wants proximity/touch behavior, copy this STRUCTURE. Replace OBJECT_A/OBJECT_B with real objectName values from the scene list.",
    "[EXAMPLE_GRAPH_START]",
    exampleJson,
    "[EXAMPLE_GRAPH_END]",
    "",
    "Allowed node types (name field):",
    "SceneLoad, SceneLoop, GotoScene, ShowMessage, Compare, Eval, GetPosition, GetRotation, GetScale,",
    "SetPosition, SetRotation, SetScale, SetVisible, SetBounciness, SetStaticFriction, SetDynamicFriction,",
    "SetMass, SetObjectDescription, GetVariable, SetVariable, EvalString, ApplyForceOnObject,",
    "GetSpeed, GetTimeSinceLastLoop, GetElapsedTime, SetColor, GetDistanceBetween, SetColorRGB",
    "",
    "Scene objects (use exact objectName in controls.object / object1 / object2):",
    objLines,
    "",
    currentLogicSection,
    "",
    "## Requirements for EVERY response",
    "1. Return the FULL ExportedNodes map (all nodes), not a single node or partial patch.",
    "2. Include SceneLoad; for per-frame logic include SceneLoad → SceneLoop → …",
    "3. Wire ALL execution paths: every Compare/SetVisible/SetColor must have inputsFrom.exec.",
    "4. Wire ALL data paths: e.g. GetDistanceBetween.value → Compare.inputsFrom.left.",
    "5. Use unique nodeIds (e.g. n_load, n_loop, n_dist, n_compare, n_hide). Spread position [x,y] so nodes don't overlap.",
    "6. SetColor: controls.object AND controls.color (hex). SetVisible: controls.visible is \"True\" or \"False\".",
    "7. When editing existing logic, preserve working connections unless the user asks to change them.",
    "",
    "Object naming:",
    "- Use scene objectName values only (not display labels). Map 'cow' → objectName if type matches.",
    "- Never invent object names.",
  ].join("\n");
}

function buildLogicUserMessage(instruction) {
  return [
    instruction.trim(),
    "",
    "---",
    "Return a complete connected ExportedNodes JSON graph.",
    "Include SceneLoad (and SceneLoop for continuous/touch logic).",
    "Wire execOutputs and inputsFrom on every node that needs them — do not output disconnected nodes.",
  ].join("\n");
}

const NEEDS_EXEC_INPUT = new Set([
  "Compare",
  "SetVisible",
  "SetColor",
  "SetColorRGB",
  "SetPosition",
  "SetRotation",
  "SetScale",
  "SetMass",
  "SetBounciness",
  "SetStaticFriction",
  "SetDynamicFriction",
  "SetObjectDescription",
  "ApplyForceOnObject",
  "ShowMessage",
  "GotoScene",
  "SetVariable",
]);

const COMPARE_BRANCH_ALIASES = {
  less_than: "lessthan",
  lessthan: "lessthan",
  lt: "lessthan",
  greater_than: "biggerthan",
  bigger_than: "biggerthan",
  biggerthan: "biggerthan",
  gt: "biggerthan",
  equal_to: "equal",
  equals: "equal",
  eq: "equal",
};

function normalizeCompareBranches(nodes) {
  if (!isPlainObject(nodes)) return;
  for (const n of Object.values(nodes)) {
    if (n.name !== "Compare" || !isPlainObject(n.execOutputs)) continue;
    const fixed = {};
    for (const [key, target] of Object.entries(n.execOutputs)) {
      const normalized = COMPARE_BRANCH_ALIASES[String(key).toLowerCase()] || key;
      if (["equal", "lessthan", "biggerthan"].includes(normalized)) {
        fixed[normalized] = target;
      }
    }
    n.execOutputs = fixed;
  }
}

function validateGraphConnectivity(nodes) {
  if (!isPlainObject(nodes)) {
    return { ok: false, error: "sceneLogic must be an object map" };
  }

  const entries = Object.entries(nodes);
  if (entries.length === 0) {
    return { ok: false, error: "Graph must contain at least SceneLoad" };
  }

  const loadId = entries.find(([, n]) => n.name === "SceneLoad")?.[0];
  if (!loadId) {
    return { ok: false, error: "Graph must include a SceneLoad node" };
  }

  if (!nodes[loadId].execOutputs?.exec) {
    return { ok: false, error: "SceneLoad must have execOutputs.exec pointing to the next node" };
  }

  for (const [id, n] of entries) {
    for (const [outKey, targetId] of Object.entries(n.execOutputs || {})) {
      if (!nodes[targetId]) {
        return {
          ok: false,
          error: `node '${id}' execOutputs.${outKey} references missing node '${targetId}'`,
        };
      }
    }

    for (const [inKey, ref] of Object.entries(n.inputsFrom || {})) {
      if (!ref?.nodeId || !nodes[ref.nodeId]) {
        return {
          ok: false,
          error: `node '${id}' inputsFrom.${inKey} references missing node '${ref?.nodeId}'`,
        };
      }
    }

    if (NEEDS_EXEC_INPUT.has(n.name) && !n.inputsFrom?.exec?.nodeId) {
      return {
        ok: false,
        error: `node '${id}' (${n.name}) must have inputsFrom.exec wired from an upstream node`,
      };
    }

    if (n.name === "SceneLoop" || n.name === "SceneLoad") {
      if (n.inputsFrom && Object.keys(n.inputsFrom).length > 0) {
        return {
          ok: false,
          error: `node '${id}' (${n.name}) must not use inputsFrom — only execOutputs on upstream nodes`,
        };
      }
    }

    if (n.name === "GetDistanceBetween") {
      if (!n.controls?.object1 || !n.controls?.object2) {
        return {
          ok: false,
          error: `node '${id}' (GetDistanceBetween) needs controls.object1 and controls.object2`,
        };
      }
    }

    if (n.name === "Compare") {
      const branches = Object.keys(n.execOutputs || {});
      if (branches.length === 0) {
        return {
          ok: false,
          error: `node '${id}' (Compare) must have at least one execOutputs branch (equal, lessthan, or biggerthan)`,
        };
      }
    }
  }

  const hasLoop = entries.some(([, n]) => n.name === "SceneLoop");
  const needsLoop = entries.some(
    ([, n]) => n.name === "Compare" || n.name === "GetDistanceBetween",
  );
  if (needsLoop && !hasLoop) {
    return {
      ok: false,
      error:
        "Per-frame checks need SceneLoop: chain SceneLoad.exec → SceneLoop.exec → Compare (or other actions)",
    };
  }

  return { ok: true };
}

module.exports = {
  CURRENT_LOGIC_JSON_LIMIT,
  buildLogicSystemPrompt,
  buildLogicUserMessage,
  summarizeSceneLogicConnections,
  normalizeCompareBranches,
  validateGraphConnectivity,
};
