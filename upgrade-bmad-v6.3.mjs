#!/usr/bin/env node
/**
 * BMAD v6.3 One-File Full Upgrade Installer
 * -------------------------------------------------
 * Adds complete Tool Integration:
 *  - Tool Access Control
 *  - MCP Server Tool Support
 *  - Tool Documentation + Help
 *  - Tool Registry
 *  - Builder Integration
 *  - Sample Tool + README
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}
function write(file, text) {
  ensureDir(file);
  fs.writeFileSync(file, text.trim() + "\n");
  console.log("✅", file);
}
function patch(file, marker, insert) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("tools:")) return console.log("ℹ️  tools section already exists");
  const updated = content.replace(marker, `${marker}\n${insert}`);
  fs.writeFileSync(file, updated);
  console.log("✅ Patched", file);
}

console.log("🚀 Starting BMAD v6.3 Upgrade...");

/* ------------------------------------------------------------------ */
/* 1. TOOL SCHEMA                                                     */
/* ------------------------------------------------------------------ */
write(".bmad-core/schema/tool-schema.yaml", `
# BMAD Tool Definition Schema (v6.3)
version: 6.3
type: tool
fields:
  tool:
    type: map
    fields:
      id: string
      name: string
      title: string
      icon: string
      type:
        type: string
        enum: [local, remote, mcp]
      entrypoint: string
      mcpServer: string
      description: string
      version: string
      dependencies: list
  auth:
    type: map
    optional: true
    fields:
      required: boolean
      method: string
      scopes: list
  permissions:
    type: list
    description: Agents allowed to use this tool
  documentation:
    type: map
    optional: true
    fields:
      description: string
      usage: string
      example: string
`);

/* ------------------------------------------------------------------ */
/* 2. TOOL RUNTIME                                                    */
/* ------------------------------------------------------------------ */
write(".bmad-core/runtime/tool-runtime.ts", `
import { connectMCP } from "../utils/mcp-client.js";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import yaml from "js-yaml";

const TOOL_DIR = path.resolve(".bmad-core/tools");
const REGISTRY_PATH = path.resolve(".bmad-core/data/tool-registry.yaml");

function readYAML(file) {
  return yaml.load(fs.readFileSync(file, "utf8"));
}

export function resolveTool(toolId) {
  if (fs.existsSync(TOOL_DIR)) {
    const files = fs.readdirSync(TOOL_DIR);
    const file = files.find(f => f.startsWith(toolId));
    if (file) return readYAML(path.join(TOOL_DIR, file));
  }
  if (fs.existsSync(REGISTRY_PATH)) {
    const reg = readYAML(REGISTRY_PATH);
    const entry = reg.registry?.find(t => t.id === toolId);
    if (entry && fs.existsSync(entry.file)) return readYAML(entry.file);
  }
  throw new Error(\`Tool not found: \${toolId}\`);
}

export function isAllowed(agent, tool) {
  if (agent.id === "bmad-orchestrator") return true;
  const allowed = agent.tools?.allowed?.map(t => (t.id || t)) || [];
  return allowed.includes(tool.tool?.id);
}

export async function executeTool(agent, toolId, payload = {}) {
  const tool = resolveTool(toolId);
  if (!isAllowed(agent, tool))
    throw new Error(\`Access denied: \${agent.id} not authorized for \${toolId}\`);

  switch (tool.tool.type) {
    case "local": {
      const mod = await import(tool.tool.entrypoint);
      return await mod.run(payload);
    }
    case "remote": {
      const res = await fetch(tool.tool.entrypoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(\`Remote tool \${toolId} failed: \${res.status}\`);
      return await res.json();
    }
    case "mcp": {
      const client = await connectMCP(tool.tool.mcpServer, tool.tool.entrypoint);
      return await client.call(toolId, payload);
    }
    default:
      throw new Error(\`Unknown tool type: \${tool.tool.type}\`);
  }
}

export function showToolHelp(toolId) {
  const tool = resolveTool(toolId);
  const doc = tool.documentation || {};
  console.log(\`=== \${tool.tool.title || tool.tool.name} ===\`);
  console.log(doc.description || "No description provided.");
  if (doc.usage) console.log("\\nUsage:\\n" + doc.usage);
  if (doc.example) console.log("\\nExample:\\n" + doc.example);
}
`);

/* ------------------------------------------------------------------ */
/* 3. MCP CLIENT                                                      */
/* ------------------------------------------------------------------ */
write(".bmad-core/utils/mcp-client.ts", `
import WebSocket from "ws";
import fs from "fs";
import yaml from "js-yaml";

export async function connectMCP(server, namespace) {
  const authFile = ".bmad-core/config/mcp-auth.yaml";
  let token = null;
  if (fs.existsSync(authFile)) {
    const auth = yaml.load(fs.readFileSync(authFile, "utf8"));
    token = auth?.[server]?.token || null;
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(server);
    ws.on("open", () => {
      if (token) ws.send(JSON.stringify({ action: "auth", token }));
      resolve({
        call: (toolId, payload) =>
          new Promise(res => {
            const message = JSON.stringify({
              action: "invoke",
              namespace,
              toolId,
              payload,
            });
            ws.send(message);
            ws.once("message", data => res(JSON.parse(data.toString())));
          }),
      });
    });
    ws.on("error", reject);
  });
}
`);

/* ------------------------------------------------------------------ */
/* 4. TOOL REGISTRY                                                   */
/* ------------------------------------------------------------------ */
if (!fs.existsSync(".bmad-core/data/tool-registry.yaml")) {
  write(".bmad-core/data/tool-registry.yaml", `
# BMAD Tool Registry
version: 1.0
registry: []
`);
}

/* ------------------------------------------------------------------ */
/* 5. PATCH AGENT SCHEMA                                              */
/* ------------------------------------------------------------------ */
const agentSchema = ".bmad-core/schema/agent-schema.yaml";
if (fs.existsSync(agentSchema)) {
  const marker = "dependencies:";
  const insert = `
  tools:
    type: map
    description: Tool access configuration
    fields:
      allowed:
        type: list
      default:
        type: list
`;
  patch(agentSchema, marker, insert);
} else {
  console.log("⚠️  agent-schema.yaml not found; skipping patch");
}

/* ------------------------------------------------------------------ */
/* 6. BUILDER WORKFLOW (create-tool)                                  */
/* ------------------------------------------------------------------ */
write("bmad-builder/workflows/create-tool.mjs", `
import fs from "fs";
import readline from "readline";

export default async function createTool() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(res => rl.question(q, res));

  const id = await ask("Tool ID: ");
  const name = await ask("Name: ");
  const type = await ask("Type (local/remote/mcp): ");
  const entrypoint = await ask("Entrypoint (path/url/namespace): ");
  const description = await ask("Short description: ");
  const usage = await ask("Usage example: ");
  const example = await ask("Example output snippet: ");
  rl.close();

  const yaml = \`
tool:
  id: \${id}
  name: \${name}
  type: \${type}
  entrypoint: \${entrypoint}
documentation:
  description: >
    \${description}
  usage: >
    \${usage}
  example: |
    \${example}
\`;

  fs.mkdirSync(".bmad-core/tools", { recursive: true });
  fs.writeFileSync(\`.bmad-core/tools/\${id}.md\`, yaml);
  console.log("✅ Created tool definition: .bmad-core/tools/" + id + ".md");
}
`);

/* ------------------------------------------------------------------ */
/* 7. SAMPLE TOOL                                                     */
/* ------------------------------------------------------------------ */
write(".bmad-core/tools/hello-world.md", `
tool:
  id: hello-world
  name: Hello World
  title: Example Local Tool
  icon: 💬
  type: local
  entrypoint: "./bmad-core/runtime/tools/hello-world.js"
  description: Demonstration tool that prints a message.
  version: 1.0.0
documentation:
  description: >
    This example tool demonstrates how to define and run a BMAD local tool.
  usage: >
    @dev: *tool hello-world
  example: |
    Input: *tool hello-world
    Output: "Hello from BMAD Tools!"
`);

write(".bmad-core/runtime/tools/hello-world.js", `
export async function run() {
  console.log("Hello from BMAD Tools!");
  return { message: "Hello from BMAD Tools!" };
}
`);

/* ------------------------------------------------------------------ */
/* 8. README                                                          */
/* ------------------------------------------------------------------ */
write("BMAD-v6.3-UPDATE-README.md", `
# BMAD v6.3 Update

This upgrade installs the complete **BMAD Tool System**.

## What's New

- Tool Access Control per Agent
- Local, Remote, and MCP Tool Types
- Tool Documentation Support
- Tool Registry
- Builder Workflow: \`create-tool\`
- Runtime Help via \`showToolHelp()\`
- Sample Tool: \`hello-world\`

## Testing

After running:

\`\`\`bash
node upgrade-bmad-v6.3.mjs
\`\`\`

You can test with:

\`\`\`bash
@dev: *tool hello-world
\`\`\`

Expected output:

\`\`\`
Hello from BMAD Tools!
\`\`\`

## Directory Overview

- \`.bmad-core/schema/tool-schema.yaml\` – Tool definition schema  
- \`.bmad-core/runtime/tool-runtime.ts\` – Execution system  
- \`.bmad-core/tools/\` – Tool definitions  
- \`bmad-builder/workflows/create-tool.mjs\` – Tool creation wizard  
- \`.bmad-core/data/tool-registry.yaml\` – Registry of tools  
- \`.bmad-core/runtime/tools/hello-world.js\` – Example tool logic  

## Version
BMAD Framework **v6.3 – Full Tool Integration**
`);

/* ------------------------------------------------------------------ */
console.log("\n🎉 BMAD successfully upgraded to v6.3");
console.log("Includes: tool access control, MCP support, documentation, sample tool, and README.\n");
