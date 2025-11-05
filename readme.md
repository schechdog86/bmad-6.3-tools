# 🧠 BMAD Framework v6.3

A modular, agent-driven system for building autonomous components and command-line assistants with integrated tool support.

## Overview

BMAD Framework enables you to create AI-powered agents that can securely execute tools and utilities in a controlled environment. Version 6.3 introduces comprehensive **Tool Integration**, making local utilities, remote APIs, and MCP (Model Context Protocol) servers first-class citizens in your agent workflows.

---

## ✨ Key Features

### Tool Integration System
- **Access Control** – Fine-grained permissions via `tools.allowed` lists ensure agents only use approved tools
- **MCP Server Support** – Connect to external tools through secure MCP socket connections
- **Multiple Tool Types** – Support for local utilities, remote APIs, and MCP servers
- **Comprehensive Documentation** – Every tool includes descriptions, usage instructions, and examples
- **Central Registry** – Discover and manage tools through a unified registry system

### Developer Experience
- **Builder Workflows** – Streamlined `create-tool` command for rapid tool development
- **Runtime Help System** – Access tool documentation with `showToolHelp(toolId)`
- **Sample Tools** – Working `hello-world` example to get started quickly
- **YAML Configuration** – Simple, readable configuration schemas

---

## 🚀 Quick Start

### Installation

Run the upgrade installer from your project root:

```bash
node upgrade-bmad-v6.3.mjs
```

This will set up:
- Tool schemas and runtime components
- MCP client support
- Sample tools and documentation
- Configuration templates

### Basic Usage

1. **Configure your agent** with allowed tools in your YAML config:
```yaml
tools:
  allowed:
    - hello-world
    - your-custom-tool
```

2. **Create a new tool** using the builder:
```bash
bmad create-tool my-tool
```

3. **Get help on any tool** at runtime:
```javascript
showToolHelp('hello-world')
```

---

## 📚 Documentation

- **Tool Development Guide** – Learn how to create custom tools
- **MCP Integration** – Connect external MCP servers
- **Security Model** – Understand the permission system
- **API Reference** – Complete runtime API documentation

---

## 🔒 Security

BMAD implements a permission-based security model:
- Agents can only execute explicitly allowed tools
- Tool access is controlled via configuration
- MCP connections use secure socket protocols
- All tool executions are logged and auditable

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- New tool implementations
- Documentation improvements
- Bug fixes
- Feature requests

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For issues, questions, or feature requests, please open an issue on GitHub or consult the documentation.
