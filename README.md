# Extension Pack for Java

Extension Pack for Java is a collection of popular extensions that can help write, test and debug Java applications in Visual Studio Code. Check out [Java in VS Code](https://code.visualstudio.com/docs/languages/java) to get started.

## Extensions Included

By installing Extension Pack for Java, the following extensions are installed:

- [📦 Language Support for Java™ by Red Hat ](https://marketplace.visualstudio.com/items?itemName=redhat.java)
    - Code Navigation
    - Auto Completion
    - Refactoring
    - Code Snippets
- [📦 Debugger for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug)
    - Debugging
- [📦 Test Runner for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-test)
    - Run & Debug JUnit/TestNG Test Cases
- [📦 Maven for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)
    - Project Scaffolding
    - Custom Goals
- [📦 Gradle for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-gradle)
    - View Gradle tasks and project dependencies
    - Gradle file authoring
    - Import Gradle projects via [Gradle Build Server](https://github.com/microsoft/build-server-for-gradle)
- [📦 Project Manager for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-dependency)
    - Manage Java projects, referenced libraries, resource files, packages, classes, and class members

## Java Runtime Requirements

The JDK used to launch the Java language server is separate from the JDK used to compile and run your projects. The tooling minimum depends on the installed Language Support for Java extension: `redhat.java` 1.57.0 and newer requires JDK 25+, versions 1.39.0-1.56.x require JDK 21+, and earlier supported versions require JDK 17+. A compatible bundled runtime satisfies the tooling requirement; Java 27 project support does not require JDK 27 just to launch the language server.

Use **Java: Configure Java Runtime** to inspect the language-server runtime reported by `redhat.java` and configure project JDKs. If no result is available, Java Pack displays an informational message without treating it as a startup failure or blocking project configuration, and keeps explicit JDK browsing and installation available even when no projects are detected. Use **Refresh** after the language extension starts, or **Open Java Logs** for details. Runtime selection and startup diagnostics belong to `redhat.java`; Java Pack does not probe tooling candidates, activate the language extension to obtain runtime information, or automatically open runtime configuration based on its own checks. Locating a JDK explicitly saves your choice to `java.jdt.ls.java.home`. Older project targets remain supported through `java.configuration.runtimes` and your Maven or Gradle build configuration.

## Other Recommendations

You can do more with VS Code. Here are some more recommendations that could help.

### Spring

Spring Tools 4 (ST4) is also available in Visual Studio Code. It understands Spring so you can navigate Spring code at the level of beans, routes, etc. It can also show live information of the running Spring Boot applications. Check out [the ST4 website](https://spring.io/tools) to see a complete list of its features.

To use ST4, install [📦 Spring Boot Extension Pack](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack). Please also check out the [User Guide](https://github.com/spring-projects/sts4/wiki) to make the most of it.

### Eclipse MicroProfile

The [📦 Extension Pack for MicroProfile](https://marketplace.visualstudio.com/items?itemName=MicroProfile-Community.vscode-microprofile-pack) is a collection of extensions that can help develop your Java microservices using [Eclipse MicroProfile](https://microprofile.io/). You can quickly generate a MicroProfile project and utilize development tools for runtimes such as [Open Liberty](https://openliberty.io/) and [Quarkus](https://quarkus.io/).

### Quarkus

[📦 Quarkus Tools for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-quarkus) is a feature-packed extension tailored for Quarkus application
development within Visual Studio Code. You can quickly get started by using the extension's
project generation and project debugging feature. The extension also provides amazing
language features (completion, hover, validation etc.) for your project's application.properties file.

### Containers and Microservices

You can use [📦 Docker](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker) extension to build docker images and work with image registries.

[📦 Kubernetes](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools) extension provides an explorer view to manage clusters and the nodes inside. It also provides advanced syntax support for editing Kubernetes manifest files.

### Tomcat and Jetty

Both [📦 Tomcat](https://marketplace.visualstudio.com/items?itemName=adashen.vscode-tomcat) and [📦 Jetty](https://marketplace.visualstudio.com/items?itemName=SummerSun.vscode-jetty) extension are available. They provide dedicated views to help work with your favorite web servers.

### Linting
The [📦 SonarLint](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode) extension lets you detect bugs and vulnerabilities as you write code in VS Code. The extension will simply run in the background and highlight code that poses a quality or security concern.

At the same time, [📦 CheckStyle](https://marketplace.visualstudio.com/items?itemName=shengchen.vscode-checkstyle) is also available.

## Questions & Issues

Each extension mentioned above is a separate open-source project and has its own repository. To make things easier, simply [🙋 open an issue in this repository](https://github.com/Microsoft/vscode-java-pack/issues). The new issue will be triaged and redirected.

## Data/Telemetry

This extension collects telemetry data to help us improve the Java development experience in VS Code. It does not collect any personal information such as names, addresses, or file paths. For more details, see our [privacy statement](http://go.microsoft.com/fwlink/?LinkId=521839). You can disable telemetry collection at any time by changing the `telemetry.enableTelemetry` setting as described in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MIT](https://github.com/Microsoft/vscode-java-pack/blob/master/LICENSE.txt)

Happy Coding!
