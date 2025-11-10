# Extension Pack for Java - Developer Guide

## 🎯 Project Overview

**Extension Pack for Java** is a **meta-extension** that bundles and coordinates 7 essential Java extensions for VS Code. This extension provides orchestration, UX features, and first-time user experiences—it does NOT provide core language services like IntelliSense, debugging, or build tools directly.

### What This Extension Does
- Bundles and installs Java extensions as a pack
- Provides unified UX (Help Center, Getting Started guides, Project Settings UI)
- Manages JDK detection and configuration via webviews
- Offers walkthrough experiences for new Java developers
- Coordinates extension interactions and recommendations

### What This Extension Does NOT Do
- Language services (handled by `redhat.java`)
- Debugging (handled by `vscjava.vscode-java-debug`)
- Testing (handled by `vscjava.vscode-java-test`)
- Maven/Gradle support (handled by respective extensions)

### Bundled Extensions (Defined in `package.json` > `extensionPack`)
1. **Language Support for Java™ by Red Hat** (`redhat.java`) - Core language services
2. **Debugger for Java** (`vscjava.vscode-java-debug`) - Debugging support
3. **Test Runner for Java** (`vscjava.vscode-java-test`) - JUnit/TestNG testing
4. **Maven for Java** (`vscjava.vscode-maven`) - Maven project support
5. **Gradle for Java** (`vscjava.vscode-gradle`) - Gradle project support
6. **Project Manager for Java** (`vscjava.vscode-java-dependency`) - Project explorer
7. **Visual Studio IntelliCode** (`VisualStudioExptTeam.vscodeintellicode`) - AI assistance

---

## 📁 Architecture

### Directory Structure
```
src/
├── commands/          # Command handlers (register in package.json)
├── webviews/          # React/Redux webview implementations
│   ├── overview/      # Java Overview page
│   ├── welcome/       # Help Center
│   ├── beginner-tips/ # Getting Started guide
│   ├── ext-guide/     # Extensions guide
│   ├── install-jdk/   # JDK installation UI
│   ├── project-settings/    # Project settings editor (React)
│   └── formatter-settings/  # Custom formatter editor (React + Redux)
├── providers/         # VS Code providers (CodeActionProvider)
├── utils/             # Shared utilities (telemetry, webview helpers, JDK utils)
├── daemon/            # Background monitoring (LSP stats, process watching)
├── recommendation/    # Extension recommendation logic
├── exp/               # Experimentation service integration
└── extension.ts       # Extension entry point

webview-resources/     # Static resources for webviews
assets/                # Build output for webview bundles
```

### Key Modules

#### `extension.ts` - Activation & Initialization
- Activates on Java files, `pom.xml`, `build.gradle`, or specific commands
- Initializes telemetry, commands, webview serializers, and daemon
- Shows first-time views (walkthrough, welcome page, release notes)
- Validates Java runtime on startup

#### `commands/` - Command Registration
- `commands/index.ts`: Registers all commands with telemetry instrumentation
- `commands/handler.ts`: Implements command logic (project creation, URL opening, extension recommendations)
- Pattern: Register in `package.json` → Implement handler → Add telemetry

#### `webviews/` - Rich UI Experiences
- Each webview has:
  - Backend: `index.ts` (serializer, message handler, HTML generation)
  - Frontend: `assets/index.tsx` (React entry point, components, styles)
  - Redux (where applicable): `assets/app/store.ts` + feature slices
- Message passing: Webview ↔ Extension Host using `webview.postMessage()`

#### `utils/` - Shared Services
- `webview.ts`: Helpers for encoding commands with telemetry
- `extension.ts`: Extension metadata (name, version)
- `jdt.ts`: Java project type detection (Maven, Gradle, unmanaged)
- `adoptiumApi.ts`: JDK download API integration
- `globalState.ts`: Persistent state keys

#### `daemon/` - Background Monitoring
- Monitors Java Language Server process health
- Collects LSP usage statistics for telemetry
- Watches for workspace changes

---

## 🚀 Core Principles

### 1. Extension Orchestration (Not Duplication)
**DO**: Check if bundled extensions are installed before providing features
```typescript
import { isExtensionInstalled } from "./utils";

if (!isExtensionInstalled("vscjava.vscode-maven")) {
  await recommendExtension("vscjava.vscode-maven", "Maven extension is required...");
  return;
}
```

**DON'T**: Implement language features, debugging, or build tools yourself

### 2. Webview Development Patterns
**Message Passing**: Always use the command URI pattern with telemetry
```typescript
import { encodeCommandUriWithTelemetry } from "./utils/webview";

const uri = encodeCommandUriWithTelemetry(
  "java.welcome",           // webview ID
  "createProject",          // telemetry identifier
  "maven.archetype.generate", // actual command
  []                        // command args
);
```

**State Management**: Use Redux Toolkit for complex webviews
```typescript
// store.ts
import { configureStore } from "@reduxjs/toolkit";
import settingsReducer from "./features/settings/settingsSlice";

export default configureStore({
  reducer: { settings: settingsReducer }
});
```

### 3. First-Time User Experience
- Respect `java.help.firstView` configuration
- Use `KEY_SHOW_WHEN_USING_JAVA` global state flag
- Schedule actions with `scheduleAction()` to avoid blocking activation
- Always provide escape hatches (close button, "Don't show again")

### 4. JDK Detection and Management
- Use `jdk-utils` npm package for JDK discovery: `findRuntimes()`, `getRuntime()`
- Never hardcode JDK paths—support Windows, macOS, Linux conventions
- Validate Java version compatibility before operations
- Provide UI for users to install JDKs via Adoptium API

---

## 🛠️ Development Workflow

### Setup
```bash
npm install           # Install dependencies
npm run compile       # Build once (dev mode)
npm run watch         # Watch mode for development
npm run build         # Production build (minified)
```

### Project Structure
- **Webpack Configuration**: `webpack.config.js` defines two builds:
  1. `assets`: Frontend bundles (React, TypeScript, SCSS)
  2. `extension`: Backend extension code (Node.js environment)

### Testing
- **Manual Testing**: Press F5 in VS Code to launch Extension Development Host
- **Checklist** (see Testing section below)

### Debugging
- Set breakpoints in TypeScript files
- Use `console.log()` in webviews (opens in DevTools: Cmd+Shift+I / Ctrl+Shift+I)
- Backend logs appear in "Extension Host" output channel

---

## 📝 Code Conventions

### TypeScript Style
```typescript
// ✅ Prefer const over let
const extensionName = "redhat.java";

// ✅ Use async/await over promises
async function checkExtension() {
  const isInstalled = await validateExtension();
  return isInstalled;
}

// ✅ Explicit return types for public APIs
export async function initialize(context: vscode.ExtensionContext): Promise<void> {
  // ...
}

// ✅ Destructure imports
import { sendInfo, instrumentOperation } from "vscode-extension-telemetry-wrapper";
```

### Naming Conventions
- **Commands**: Use `java.*` namespace (e.g., `java.welcome`, `java.runtime`)
- **Configuration**: Prefix with `java.help.*` (e.g., `java.help.firstView`)
- **Files**: `camelCase.ts` for modules, `PascalCase.tsx` for React components
- **Functions**: `verbNoun` pattern (e.g., `showWelcomeWebview`, `validateJavaRuntime`)

### Error Handling
```typescript
// ✅ Catch and show user-friendly messages
try {
  await vscode.workspace.getConfiguration("java").update("home", javaHome);
} catch (error) {
  vscode.window.showErrorMessage(`Failed to update Java home: ${(error as Error).message}`);
}

// ✅ Log errors for diagnostics
console.error("Failed to initialize daemon:", error);
```

### Telemetry Best Practices
- **Always instrument operations**: Use `instrumentOperation` wrapper
- **No PII**: Never send file paths, usernames, or code snippets
- **Use sendInfo for custom data**:
```typescript
import { sendInfo } from "vscode-extension-telemetry-wrapper";

sendInfo(operationId, {
  extName: extensionName,
  action: "install"
});
```

---

## 🔌 Integration Points

### Checking Bundled Extension Availability
```typescript
import { isExtensionInstalled } from "./utils";

// Check if extension is installed
if (isExtensionInstalled("redhat.java")) {
  const javaExt = vscode.extensions.getExtension("redhat.java");
  await javaExt?.activate();
}
```

### JDK Detection using `jdk-utils`
```typescript
import { findRuntimes, getRuntime, IJavaRuntime } from "jdk-utils";

// Find all JDK installations on the system
const runtimes: IJavaRuntime[] = await findRuntimes({ checkJavac: true });

// Validate a specific path
const runtime = await getRuntime(javaHomePath, { withVersion: true });
if (runtime && runtime.version.major >= 17) {
  // Use this JDK
}
```

### Maven/Gradle Project Detection
```typescript
import { getProjectType, ProjectType } from "./utils/webview";

const projectType = await getProjectType(projectUri);
if (projectType === ProjectType.Maven) {
  // Maven-specific logic
} else if (projectType === ProjectType.Gradle) {
  // Gradle-specific logic
}
```

### Command Execution with Validation
```typescript
import { validateAndRecommendExtension } from "./recommendation";

// Check extension before executing its commands
export async function createMavenProjectCmdHandler() {
  if (!await validateAndRecommendExtension(
    "vscjava.vscode-maven",
    "Maven extension is recommended...",
    true // force prompt
  )) {
    return; // User declined installation
  }
  
  await vscode.commands.executeCommand("maven.archetype.generate");
}
```

---

## 🎨 Webview Guidelines

### Custom Editor Pattern (Formatter Settings)
```typescript
// Provider registration
vscode.window.registerCustomEditorProvider(
  "java.formatterSettingsEditor",
  provider,
  { webviewOptions: { retainContextWhenHidden: true } }
);

// Custom editor provider
class FormatterSettingsEditorProvider implements vscode.CustomTextEditorProvider {
  async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    // Parse document (XML formatter config)
    // Render React UI with Redux store
    // Sync changes back to document
  }
}
```

### Redux State Management
```typescript
// Feature slice (Redux Toolkit)
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
  name: "formatterSettings",
  initialState: { profiles: [] },
  reducers: {
    setProfiles(state, action: PayloadAction<Profile[]>) {
      state.profiles = action.payload;
    }
  }
});
```

### Accessibility Requirements
- Use semantic HTML: `<button>`, `<nav>`, `<main>`
- Provide ARIA labels for icon-only buttons:
```tsx
<button aria-label="Install JDK">
  <Icon />
</button>
```
- Ensure keyboard navigation works (tab order, Enter/Space to activate)
- Use VS Code Webview UI Toolkit for native look and feel:
```tsx
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
```

### Message Passing Protocol
**Extension → Webview**:
```typescript
webviewPanel.webview.postMessage({
  command: "updateRuntimes",
  data: runtimeList
});
```

**Webview → Extension**:
```typescript
// In React component
const vscode = acquireVsCodeApi();
vscode.postMessage({
  command: "installJdk",
  jdkVersion: "17"
});
```

**Extension receives**:
```typescript
webviewPanel.webview.onDidReceiveMessage(async (message) => {
  switch (message.command) {
    case "installJdk":
      await installJdk(message.jdkVersion);
      break;
  }
});
```

---

## 💡 Common Scenarios

### Scenario 1: Adding a New Command

**Step 1**: Register in `package.json`
```json
{
  "contributes": {
    "commands": [
      {
        "command": "java.myNewCommand",
        "category": "Java",
        "title": "My New Feature"
      }
    ]
  },
  "activationEvents": [
    "onCommand:java.myNewCommand"
  ]
}
```

**Step 2**: Implement handler in `src/commands/handler.ts`
```typescript
export async function myNewCommandHandler(
  context: vscode.ExtensionContext,
  operationId: string,
  ...args: any[]
) {
  sendInfo(operationId, { action: "started" });
  
  try {
    // Implementation
    vscode.window.showInformationMessage("Success!");
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
}
```

**Step 3**: Register in `src/commands/index.ts`
```typescript
registerCommandHandler(context, "java.myNewCommand", myNewCommandHandler);
```

**Step 4**: Add telemetry and test

### Scenario 2: Creating a New Webview Page

**Step 1**: Create module structure
```
src/my-feature/
├── index.ts              # Backend (serializer, message handler)
├── types.ts              # Shared types
└── assets/
    ├── index.tsx         # React entry point
    ├── style.scss        # Styles
    └── components/       # React components
```

**Step 2**: Add entry to `webpack.config.js`
```javascript
entry: {
  // ... existing entries
  'my-feature': './src/my-feature/assets/index.tsx'
}
```

**Step 3**: Register serializer in `extension.ts`
```typescript
import { MyFeatureViewSerializer } from "./my-feature";

context.subscriptions.push(
  vscode.window.registerWebviewPanelSerializer(
    "java.myFeature",
    new MyFeatureViewSerializer()
  )
);
```

**Step 4**: Implement command to show webview

### Scenario 3: Integrating with External Extension

**Step 1**: Check availability
```typescript
if (!isExtensionInstalled("publisher.extension-id")) {
  await recommendExtension("publisher.extension-id", "This feature requires...");
  return;
}
```

**Step 2**: Get extension API (if exported)
```typescript
const ext = vscode.extensions.getExtension("publisher.extension-id");
await ext?.activate();
const api = ext?.exports;

if (api && typeof api.someMethod === "function") {
  await api.someMethod();
}
```

**Step 3**: Execute commands
```typescript
await vscode.commands.executeCommand("extensionId.command", arg1, arg2);
```

---

## ⚠️ Critical Gotchas

### 1. Extension Pack Load Order
- **Problem**: Bundled extensions may not be activated when this extension activates
- **Solution**: Check extension presence and activate explicitly:
```typescript
const javaExt = vscode.extensions.getExtension("redhat.java");
if (javaExt && !javaExt.isActive) {
  await javaExt.activate();
}
```

### 2. Webview Lifecycle and State Persistence
- **Problem**: Webviews are disposed when hidden (by default)
- **Solution**: Use `retainContextWhenHidden: true` for complex state:
```typescript
vscode.window.createWebviewPanel(viewType, title, column, {
  retainContextWhenHidden: true  // Keeps state when switched away
});
```
- **Trade-off**: Higher memory usage—only use for rich UIs with expensive state

### 3. JDK Path Handling (Cross-Platform)
- **Problem**: JDK paths differ across Windows, macOS, Linux
  - Windows: `C:\Program Files\Java\jdk-17`
  - macOS: `/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home`
  - Linux: `/usr/lib/jvm/java-17-openjdk`
- **Solution**: Always use `jdk-utils` for detection:
```typescript
import { findRuntimes } from "jdk-utils";
const runtimes = await findRuntimes({ checkJavac: true });
```
- **Never** hardcode paths or assume structure

### 4. Configuration Scope Hierarchy
- **Problem**: Settings can exist at User, Workspace, or Folder level
- **Solution**: Use appropriate `ConfigurationTarget`:
```typescript
// Global setting (User scope)
await vscode.workspace.getConfiguration("java")
  .update("home", javaHome, vscode.ConfigurationTarget.Global);

// Workspace setting
await vscode.workspace.getConfiguration("java")
  .update("home", javaHome, vscode.ConfigurationTarget.Workspace);
```
- **Read effective value**:
```typescript
const effectiveValue = vscode.workspace.getConfiguration("java").get("home");
```

### 5. Activation Event Specificity
- **Problem**: Too broad activation events slow down VS Code startup
- **Current strategy**: Activate on Java files OR Java project markers (`pom.xml`, `build.gradle`)
```json
"activationEvents": [
  "onLanguage:java",
  "workspaceContains:pom.xml",
  "workspaceContains:build.gradle"
]
```
- **Avoid**: `"*"` (activates on every window)

### 6. Telemetry PII Leakage
- **Problem**: Accidentally sending sensitive user data
- **Solution**: Use `TelemetryFilter` class and never send:
  - File paths (use hashed project IDs instead)
  - Usernames
  - Code snippets
  - Environment variables
```typescript
// ❌ DON'T
sendInfo(operationId, { filePath: document.uri.fsPath });

// ✅ DO
sendInfo(operationId, { projectType: "maven", fileExtension: ".java" });
```

---

## ⚡ Performance Best Practices

### 1. Lazy Loading
- **Defer heavy operations** until needed:
```typescript
// ✅ Don't load all JDK runtimes on activation
export async function activate(context: vscode.ExtensionContext) {
  // Register commands only
  registerCommands(context);
}

// Load JDKs when runtime UI is opened
async function showRuntimeUI() {
  const runtimes = await findRuntimes(); // Heavy operation
  // ...
}
```

### 2. Debouncing UI Events
- **Problem**: File watchers or text changes fire frequently
- **Solution**: Use lodash debounce or VS Code's built-in mechanisms:
```typescript
import * as _ from "lodash";

const debouncedSave = _.debounce(async (document: vscode.TextDocument) => {
  await saveSettings(document);
}, 500); // 500ms delay

vscode.workspace.onDidChangeTextDocument((e) => {
  debouncedSave(e.document);
});
```

### 3. Caching Expensive Operations
```typescript
// Cache JDK runtime list (invalidate on settings change)
let cachedRuntimes: IJavaRuntime[] | undefined;

async function getRuntimes(): Promise<IJavaRuntime[]> {
  if (!cachedRuntimes) {
    cachedRuntimes = await findRuntimes({ checkJavac: true });
  }
  return cachedRuntimes;
}

// Invalidate cache on settings change
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("java")) {
    cachedRuntimes = undefined;
  }
});
```

### 4. Proper Disposal
- **Always dispose resources** to prevent memory leaks:
```typescript
const disposable = vscode.workspace.onDidChangeConfiguration(() => {
  // Handler
});
context.subscriptions.push(disposable); // Auto-dispose on deactivation

// For webviews
webviewPanel.onDidDispose(() => {
  // Clean up resources
  webviewPanel = undefined;
});
```

---

## ✅ Testing Checklist

### Extension Activation
- [ ] Extension activates without errors on Java workspace
- [ ] Extension activates on Maven project (pom.xml present)
- [ ] Extension activates on Gradle project (build.gradle present)
- [ ] Extension does NOT activate on non-Java workspace
- [ ] No errors in "Extension Host" output channel

### Commands
- [ ] All `java.*` commands are registered and executable
- [ ] Commands show appropriate messages (info, warning, error)
- [ ] Commands validate prerequisites (check bundled extensions)
- [ ] Telemetry is sent for command execution

### Webviews
- [ ] Webviews render correctly (no console errors)
- [ ] Message passing works (extension ↔ webview)
- [ ] Redux state updates correctly (where applicable)
- [ ] Webview state persists when switching tabs (if `retainContextWhenHidden: true`)
- [ ] Links and buttons work with telemetry

### Integration with Bundled Extensions
- [ ] Works gracefully when bundled extensions are missing
- [ ] Recommends installation when features require missing extensions
- [ ] Can execute commands from bundled extensions

### JDK Management
- [ ] Detects installed JDKs correctly (Windows, macOS, Linux)
- [ ] Allows user to configure `java.home`
- [ ] Warns if no JDK is found
- [ ] Install JDK flow works (opens installer UI)

### Cross-Platform
- [ ] Test on Windows, macOS, Linux (or WSL)
- [ ] JDK path handling works on all platforms
- [ ] File path separators correct (`path.join()` used, not string concatenation)

---

## 🔒 Security Considerations

### No Arbitrary Code Execution
- **DON'T** use `eval()` or `Function()` constructor
- **DON'T** execute user-provided shell commands without validation
- **DO** use VS Code APIs for safe operations:
```typescript
// ✅ Safe
await vscode.commands.executeCommand("knownCommand", validatedArg);

// ❌ Unsafe
const userCommand = getUserInput();
exec(userCommand); // NEVER DO THIS
```

### HTML Sanitization in Webviews
- **Always sanitize** user-generated content before rendering:
```typescript
import * as he from "he"; // HTML entity encoder

// In webview HTML
const safeContent = he.escape(userContent);
webview.html = `<div>${safeContent}</div>`;
```
- Use VS Code's Content Security Policy (CSP) in webviews:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; script-src ${cspSource}; style-src ${cspSource};">
```

### Path Validation
- **Validate all file paths** before operations:
```typescript
import * as path from "path";
import * as fs from "fs";

function isValidJavaHome(javaHome: string): boolean {
  // Check if path is absolute
  if (!path.isAbsolute(javaHome)) {
    return false;
  }
  
  // Check if path exists
  if (!fs.existsSync(javaHome)) {
    return false;
  }
  
  // Check for required files (javac, java)
  const javacPath = path.join(javaHome, "bin", process.platform === "win32" ? "javac.exe" : "javac");
  return fs.existsSync(javacPath);
}
```

### Workspace Trust API
- **Respect workspace trust** for sensitive operations:
```typescript
if (!vscode.workspace.isTrusted) {
  vscode.window.showWarningMessage("This feature requires a trusted workspace.");
  return;
}

// Proceed with sensitive operation (e.g., executing build scripts)
```

---

## 🎓 Key Takeaways

1. **This is a UX extension**: Focus on developer experience, onboarding, and coordination—not core features
2. **Check before acting**: Always validate bundled extension availability
3. **Use jdk-utils**: Never implement JDK detection yourself
4. **Message passing with telemetry**: Use `encodeCommandUriWithTelemetry` for webview links
5. **Lazy load everything**: Defer heavy operations until explicitly needed
6. **No PII in telemetry**: Filter out paths, usernames, code snippets
7. **Cross-platform paths**: Use `path.join()` and `jdk-utils`, never hardcode
8. **Dispose resources**: Always clean up listeners, webviews, and subscriptions
9. **Respect configuration scopes**: Use appropriate `ConfigurationTarget`
10. **Security first**: Sanitize inputs, validate paths, respect workspace trust

---

## 📚 Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview UI Toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [jdk-utils Package](https://www.npmjs.com/package/jdk-utils)
- [Extension Pack Guidelines](https://code.visualstudio.com/api/references/extension-manifest#extension-packs)

---

**Remember**: When in doubt, prioritize user experience and extensibility. This extension should make Java development in VS Code delightful for beginners while staying out of the way for experts.
