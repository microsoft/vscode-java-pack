# Classpath Settings

There are several settings that can help configure the classpath components of your unmanaged folder.
> Note: For project with build tools, like Maven and Gradle, please configure the related entries in the [pom.xml](https://maven.apache.org/pom.html#directories) or [build.gradle](https://docs.gradle.org/current/userguide/java_plugin.html#source_sets) file.

* `java.project.sourcePaths`: Relative paths to the workspace where stores the source files. 
  > Note: The setting is `Only` effective in the `WORKSPACE` scope, and it will `NOT` affect Maven or Gradle project.

* `java.project.outputPath`: A relative path to the workspace where stores the compiled output.
  > Note: The setting is `Only` effective in the `WORKSPACE` scope, and it will `NOT` affect Maven or Gradle project.

* `java.configuration.runtimes`: Map Java Execution Environments to local JDKs.
  > Note: This setting is only available in the `USER` scope.

* `java.project.referencedLibraries`: Configure glob patterns for referencing local libraries to a Java project.