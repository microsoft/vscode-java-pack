# Change Log

## 0.25.7
### Added
- Add IBM Semeru Runtimes to Other JDKs list. [#1113](https://github.com/microsoft/vscode-java-pack/pull/1092)

## 0.25.6
### Fixed
- Webviews are not correctly rendered with VS Code 1.73.0. [#1102](https://github.com/microsoft/vscode-java-pack/issues/1102)

## 0.25.5
### Fixed
- Fix vulnerabilities in dependencies.

## 0.25.4
### Fixed
- Engineering: Aggregate typical buildship warnings. [#1092](https://github.com/microsoft/vscode-java-pack/pull/1092)

## 0.25.3
### Fixed
- Bug: No response on clicking button `install A New JDK`. [#1068](https://github.com/microsoft/vscode-java-pack/pull/1068)

## 0.25.2
### Fixed
- Stop spamming the console with useless error messages. [#1063](https://github.com/microsoft/vscode-java-pack/pull/1063)

## 0.25.1
### Changed
- Update activation events. [#1036](https://github.com/microsoft/vscode-java-pack/pull/1036)

## 0.25.0
### Changed
- Simplify the "clean cache" notification buttons. [#1025](https://github.com/microsoft/vscode-java-pack/pull/1025)

## 0.24.0
### Added
- Notify to clean cache if a corrupted workspace cache is detected. [#1011](https://github.com/microsoft/vscode-java-pack/pull/1011)

### Changed
- Update required tooling JRE to 17. [#1009](https://github.com/microsoft/vscode-java-pack/pull/1009)

## 0.23.0
### Changed
- Polish "Explore more Java resources" step in walkthrough. [#1002](https://github.com/microsoft/vscode-java-pack/pull/1002)

## 0.22.4
### Fixed
- Fix: Cannot read properties of undefined (reading 'startsWith') [#968](https://github.com/microsoft/vscode-java-pack/pull/968)
- Retire outdated tour page. [#978](https://github.com/microsoft/vscode-java-pack/pull/978)

## 0.22.3
### Changed
- Use new setting `java.help.collectErrorLog` to control whether to collect detailed diagnostic information.

## 0.22.2
### Fixed
- Improve colletion of diagnostic information.

## 0.22.1
### Added
- Can detect JDKs installed by asdf-vm in `Configure Java Runtime` page.

## 0.22.0
### Added
- Add new setting `java.help.shareDiagnostics` control whether to collect detailed diagnostic information.

### Fixed
- Fix vulnerabilities. [#907](https://github.com/microsoft/vscode-java-pack/pull/907) [#912](https://github.com/microsoft/vscode-java-pack/pull/912)


## 0.21.0
### Added
- Support toggling AWT development in help center. [#886](https://github.com/microsoft/vscode-java-pack/pull/886)

### Fixed
- Update dependencies to fix vulnerabilities. [#867](https://github.com/microsoft/vscode-java-pack/pull/867) [#873](https://github.com/microsoft/vscode-java-pack/pull/873) [#884](https://github.com/microsoft/vscode-java-pack/pull/884) [#892](https://github.com/microsoft/vscode-java-pack/pull/892)

## 0.20.0
### Changed
- Simplify steps of getting started walkthrough. [#679](https://github.com/microsoft/vscode-java-pack/issues/679)
- Update mechanism to validate required Java runtimes. [#851](https://github.com/microsoft/vscode-java-pack/pull/851)

## 0.19.0
### Added
- New command to `Install New JDK`. [#803](https://github.com/microsoft/vscode-java-pack/pull/803)

### Changed
- New UX of `Configure Java Runtime` page. [#791](https://github.com/microsoft/vscode-java-pack/pull/791)
- Refine `Java: Getting Started` page
  - Renamed as `Java: Tips for Beginners` to avoid confusion. [#809](https://github.com/microsoft/vscode-java-pack/issues/809)
  - Adopted same styling with VS Code. [#831](https://github.com/microsoft/vscode-java-pack/pull/831)

### Fixed
- Cover more paths when searching for installed Java runtimes. [#596](https://github.com/microsoft/vscode-java-pack/issues/596)

## 0.18.7
### Fixed
- Support to detect macOS with ARM chips.
- Get correct project type.

## 0.18.6
### Changed
- Adopt Adoptium API v3 to download JDK 17. [#765](https://github.com/microsoft/vscode-java-pack/pull/765)

## 0.18.5
### Fixed
- Fix broken link: "Check out our blogs to see what's new". [#734](https://github.com/microsoft/vscode-java-pack/issues/734)
- Fix bug: getting started page was wrongly presented in Codespaces. [#753](https://github.com/microsoft/vscode-java-pack/pull/753)
- Normalize extension naming. [#738](https://github.com/microsoft/vscode-java-pack/pull/738) [#741](https://github.com/microsoft/vscode-java-pack/pull/741)

## 0.18.4
### Changed
- Rename extension to `Extension Pack for Java`. [#721](https://github.com/microsoft/vscode-java-pack/pull/721)

### Fixed
- Fix experiment on getting started experience. [#727](https://github.com/microsoft/vscode-java-pack/pull/727)

## 0.18.3
### Fixed
- `Java: Help Center` page could open to wrong side. [#723](https://github.com/microsoft/vscode-java-pack/pull/723)

## 0.18.2
### Fixed
- Checkbox state was wrong in `Java: Help Center` page. [#712](https://github.com/microsoft/vscode-java-pack/pull/712)
- Opening "Take a Tour" from `Java: Help Center` page was slow. [#711](https://github.com/microsoft/vscode-java-pack/pull/711)
- Feature tour page was not shown when activating extension for the first time. [#713](https://github.com/microsoft/vscode-java-pack/pull/713)

## 0.18.1
### Changed
- Rename command `Java: Welcome` to `Java: Help Center`.

## 0.18.0
### Added
- Provide code action to configure classpath. [#684](https://github.com/microsoft/vscode-java-pack/pull/684)

### Changed
- Improve getting started experience with walkthrough. [#692](https://github.com/microsoft/vscode-java-pack/issues/692)

## 0.17.0
### Changed
- Clean up completed experiments. [#670](https://github.com/microsoft/vscode-java-pack/pull/670) [#672](https://github.com/microsoft/vscode-java-pack/pull/672)
- Update description and categories in metadata. [#669](https://github.com/microsoft/vscode-java-pack/pull/669) [#677](https://github.com/microsoft/vscode-java-pack/pull/677)
- Update getting started walkthrough. [#671](https://github.com/microsoft/vscode-java-pack/pull/671)

## 0.16.0
### Added
- Add formatter setting editor. [#604](https://github.com/microsoft/vscode-java-pack/issues/604)

## 0.15.0
### Added
- Add setup-focused getting started walkthrough. [#608](https://github.com/microsoft/vscode-java-pack/pull/608)

### Changed
- Refine wording in webview pages. [#606](https://github.com/microsoft/vscode-java-pack/pull/606) [#619](https://github.com/microsoft/vscode-java-pack/pull/619) [#631](https://github.com/microsoft/vscode-java-pack/pull/631)

## 0.14.0
### Added
- Add classpath configuration page for unmanaged folder. [#567](https://github.com/microsoft/vscode-java-pack/pull/567), [#578](https://github.com/microsoft/vscode-java-pack/pull/578)

### Changed
- Remove `ⓘ` button from status bar. [#573](https://github.com/microsoft/vscode-java-pack/pull/573)

### Fixed
- Wrong project type was displayed in `Configure Java Runtime` page for some projects. [#583](https://github.com/microsoft/vscode-java-pack/issues/583)
- Unicode characters in project name were not correctly displayed. [#576](https://github.com/microsoft/vscode-java-pack/pull/576)
- Checkbox `Show welcome page when using Java` was always checked. [#597](https://github.com/microsoft/vscode-java-pack/pull/597)
- Webview content was not correctly displayed after reloading. [#581](https://github.com/microsoft/vscode-java-pack/issues/581)

## 0.13.0
### Added
- New UX for welcome page. [#540](https://github.com/microsoft/vscode-java-pack/issues/540)

### Changed
- By default, show overview page only on Desktop and not in Web. [#536](https://github.com/microsoft/vscode-java-pack/pull/536)
- Use new extension icons. [#552](https://github.com/microsoft/vscode-java-pack/pull/552)

### Fixed
- Re-enable restoring webview pages after reloading window. [#549](https://github.com/microsoft/vscode-java-pack/pull/549)

## 0.12.1
- Fixed error `Cannot read property 'onDidClasspathUpdate' of undefined` on opening `Configure Java Runtime` page. [#521](https://github.com/microsoft/vscode-java-pack/issues/521)

## 0.12.0
- Added settings to reduce popups. [#473](https://github.com/microsoft/vscode-java-pack/pull/473)
- Refined `Configure Java Runtime` page to show project/unmanaged folder section on demand. [#517](https://github.com/microsoft/vscode-java-pack/pull/517)

## 0.11.0
- Fixed: Clicking the blank place in Overview page would trigger a command. [#491](https://github.com/microsoft/vscode-java-pack/pull/491)
- Added `Learn` and `Configuration` sections to the `Overview` page. [#490](https://github.com/microsoft/vscode-java-pack/pull/490),[#492](https://github.com/microsoft/vscode-java-pack/pull/492)
- Re-designed `Configure Java Runtime` page for easy configuration of JDKs. [#493](https://github.com/microsoft/vscode-java-pack/pull/493)

## 0.10.0
- Added extension guide to help discover Java extensions

## 0.9.1
- Updated dependencies to fix vulnerability and telemetry issues

## 0.9.0
- Added SonarLint to the recommendation list

## 0.8.1
- [#250] Added Quarkus recommendation
- [#251] Fixed typos
- [#258] Added SapMachine as JDK option

## 0.8.0
- Added Getting Started view [#183](https://github.com/Microsoft/vscode-java-pack/issues/183) [#184](https://github.com/Microsoft/vscode-java-pack/issues/184) [#185](https://github.com/Microsoft/vscode-java-pack/issues/185) [#186](https://github.com/Microsoft/vscode-java-pack/issues/186) [#189](https://github.com/Microsoft/vscode-java-pack/issues/189) [#190](https://github.com/Microsoft/vscode-java-pack/issues/190) [#191](https://github.com/Microsoft/vscode-java-pack/issues/191) [#192](https://github.com/Microsoft/vscode-java-pack/issues/192) [#193](https://github.com/Microsoft/vscode-java-pack/issues/193)
- Changed to presenting JDK Acquisition Guide using dedicated view [#172](https://github.com/Microsoft/vscode-java-pack/issues/172) [#173](https://github.com/Microsoft/vscode-java-pack/issues/173) [#175](https://github.com/Microsoft/vscode-java-pack/issues/175) [#176](https://github.com/Microsoft/vscode-java-pack/issues/176) [#179](https://github.com/Microsoft/vscode-java-pack/issues/179)

## 0.7.1
- Fixed [#143](https://github.com/Microsoft/vscode-java-pack/issues/143) with [#144](https://github.com/Microsoft/vscode-java-pack/pull/144) - Correctly recognize vernsion 11 and 12 runtimes

## 0.7.0
- Added *JDK Acquisition Guide* to the overview page [#119](https://github.com/Microsoft/vscode-java-pack/pull/119)

## 0.6.0
- Added [Visual Studio IntelliCode](https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode) to Extension Pack for Java

## 0.4.0
- Added Overview page to help users get started
- Use extensionPack instead of extensionDependencies
- Updated README to provide more info to developers
- Added telemetry

## 0.3.0
- Added Java Test Runner and Maven Package Explorer to the pack

## 0.2.0
- Update the links for open source

## 0.1.0
- Initial release
