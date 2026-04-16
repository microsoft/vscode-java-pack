# vscode-java-pack (Extension Pack for Java)

VS Code Java 元扩展，捆绑并协调 Java 开发完整体验。

## 项目定位

- **仓库**: https://github.com/microsoft/vscode-java-pack
- **Extension ID**: vscjava.vscode-java-pack
- **构建工具**: npm + Webpack + React/Redux
- **入口**: `out/extension`

## 捆绑的扩展

1. **redhat.java** — Language Support for Java
2. **vscjava.vscode-java-debug** — Debugger for Java
3. **vscjava.vscode-java-test** — Test Runner for Java
4. **vscjava.vscode-maven** — Maven for Java
5. **vscjava.vscode-gradle** — Gradle for Java
6. **vscjava.vscode-java-dependency** — Project Manager for Java

## 关键功能

- 引导式入门向导 (walkthrough)
- 集中化 Java 配置
- JDK 发现和安装引导
- 帮助中心和发行说明
- 格式化器设置编辑器 (React UI)
- Java 运行时配置

## 技术栈

- TypeScript + React + Redux + Bootstrap (UI 页面)
- Webpack 捆绑
- Axios (HTTP 请求)

## 依赖关系

**依赖**: 上述 6 个扩展
**独立**: 不被其他项目依赖
