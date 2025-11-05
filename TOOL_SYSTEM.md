# 🧩 BMAD Tool System — Technical Documentation

## 1. Concept

In BMAD, a **tool** is a modular, executable capability that agents can use to perform specific tasks. Tools function as detached micro-utilities — similar to "plugins" or "functions" — but operate under strict access control.

### Tool Types

| Type | Description | Example |
|------|-------------|---------|
| `local` | Executes JavaScript/TypeScript logic inside `.bmad-core/runtime/tools/` | System Analyzer, Hello World |
| `remote` | Sends HTTP requests to an external API endpoint | OpenAI API Wrapper, CI/CD Trigger |
| `mcp` | Connects via WebSocket to a Model Control Protocol (MCP) server | Vision Processor, AI Monitor |

---

## 2. Tool Definition Structure

Tools are defined in YAML files located at `.bmad-core/tools/*.md`.

### Example: System Analyzer Tool

```yaml
tool:
  id: system-analyzer
  name: System Analyzer
  title: Architecture Validator
  type: local
  entrypoint: ./bmad-core/runtime/tools/system-analyzer.js
  version: 1.0.0

documentation:
  description: >
    Validates the internal architecture of BMAD modules.
  
  usage: >
    @architect: *tool system-analyzer ./modules
  
  example: |
    ✅ Structure valid
    ⚠️ Missing dependency: audit-checklist

permissions:
  - architect
```

---

## 3. Tool Entrypoint

The **entrypoint** refers to an executable script that exports a `run()` function. This file is loaded and executed dynamically by `tool-runtime.ts`.

### Example Entrypoint: `.bmad-core/runtime/tools/system-analyzer.js`

```javascript
export async function run(input) {
  console.log("Analyzing system:", input);
  return { 
    status: "ok", 
    summary: "All modules valid." 
  };
}
```

BMAD automatically imports and executes this function with the agent's provided payload.

---

## 4. Agent Authorization

Tools are **permission-scoped**. An agent must explicitly declare which tools it can access.

### Example Agent Configuration

```yaml
agent:
  id: architect
  name: System Architect
  type: core
  
  tools:
    allowed:
      - system-analyzer
      - hello-world
    default:
      - hello-world
```

**This means:**
- The `architect` agent can use both `system-analyzer` and `hello-world`
- The `hello-world` tool is loaded automatically when the agent starts

### Access Denial

If an agent tries to call a tool not in its `allowed` list, BMAD blocks it:

```
❌ Access denied: architect not authorized for tool api-linter
```

---

## 5. How BMAD Executes Tools

**Runtime Path:** `.bmad-core/runtime/tool-runtime.ts`

### Execution Flow

1. **Agent issues a command:**
   ```
   @architect: *tool system-analyzer ./modules
   ```

2. **BMAD parses the command** → extracts the tool ID (`system-analyzer`) and arguments

3. **`tool-runtime.ts` runs the following steps:**
   ```javascript
   const tool = resolveTool("system-analyzer");
   if (!isAllowed(agent, tool)) {
     throw new Error("Access denied");
   }
   return executeTool(agent, "system-analyzer", { path: "./modules" });
   ```

4. **Depending on `tool.type`:**
   - **`local`**: Imports a `.js` module and runs it directly
   - **`remote`**: POSTs JSON data to a URL
   - **`mcp`**: Sends an RPC over WebSocket to a remote MCP server

5. **The output (or error) is returned to the agent and logged**

---

## 6. MCP Tool Usage

For tools with `"type": "mcp"`, BMAD connects using the built-in MCP client.

### Example MCP Tool Definition

```yaml
tool:
  id: vision-processor
  type: mcp
  mcpServer: wss://mcp.bmad.ai
  entrypoint: vision-tools
```

**Process:**
1. BMAD establishes a WebSocket connection to `wss://mcp.bmad.ai`
2. Sends the tool request as JSON-RPC
3. Receives JSON response from the MCP server

---

## 7. Builder Integration

You can create tools using the **BMAD Builder CLI**.

### Command

```bash
bmad-builder *create-tool
```

### Interactive Prompts

```
Tool ID: my-analyzer
Name: My Analyzer
Type (local/remote/mcp): local
Entrypoint: ./bmad-core/runtime/tools/my-analyzer.js
Short description: Analyzes configs
Usage example: @dev: *tool my-analyzer ./config
Example output: ✅ Config validated
```

BMAD will generate `.bmad-core/tools/my-analyzer.md` with the correct structure.

---

## 8. Listing and Viewing Tools

### List All Available Tools

```
@dev: *list-tools
```

### View Help for a Specific Tool

```
@dev: *help system-analyzer
```

This pulls from the `documentation` section in the tool definition file.

---

## 9. Tool Registry

BMAD maintains `.bmad-core/data/tool-registry.yaml` as a canonical index.

### Example Registry

```yaml
version: 1.0
registry:
  - id: hello-world
    file: .bmad-core/tools/hello-world.md
  
  - id: system-analyzer
    file: .bmad-core/tools/system-analyzer.md
```

This allows orchestrators, builders, or UIs to list all installed tools globally.

---

## 10. System Architecture Summary

| Component | Description | Location |
|-----------|-------------|----------|
| **Tool Definition** | Metadata + documentation | `.bmad-core/tools/*.md` |
| **Entrypoint Script** | Executable logic | `.bmad-core/runtime/tools/*.js` |
| **Registry** | Central tool list | `.bmad-core/data/tool-registry.yaml` |
| **Runtime** | Loader and executor | `.bmad-core/runtime/tool-runtime.ts` |
| **MCP Client** | Remote socket client | `.bmad-core/utils/mcp-client.ts` |
| **Builder Workflow** | Tool creation wizard | `bmad-builder/workflows/create-tool.mjs` |

---

## Quick Reference

### Creating a New Tool
```bash
bmad-builder *create-tool
```

### Using a Tool
```
@agent-name: *tool tool-id [arguments]
```

### Checking Tool Permissions
```yaml
agent:
  tools:
    allowed:
      - tool-id-1
      - tool-id-2
```

### Tool Types at a Glance
- **Local**: JavaScript/TypeScript execution
- **Remote**: HTTP API calls
- **MCP**: WebSocket-based protocol communication
🧠 Summary of Usage
Action	Command	Description
Create tool	bmad-builder *create-tool	Start interactive creation
Run tool	@agent: *tool <id> [args]	Execute tool
List tools	@agent: *list-tools	Show all installed tools
Tool help	@agent: *help-tool <id>	View usage info
Register tool	Edit .bmad-core/data/tool-registry.yaml	Add global entry
