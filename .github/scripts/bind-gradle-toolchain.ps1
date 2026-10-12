[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("java-gradle", "java-gradle-java25", "java-gradle-java27")]
    [string] $PlanName
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$release = switch ($PlanName) {
    "java-gradle" { "21" }
    "java-gradle-java25" { "25" }
    "java-gradle-java27" { "27" }
}
$gradleVersion = if ($release -eq "21") { "8.5" } else { "9.8.1" }
$javaHome = [Environment]::GetEnvironmentVariable("JAVA${release}_HOME")
if (-not $javaHome -or -not [System.IO.Path]::IsPathFullyQualified($javaHome) -or
    -not (Test-Path -LiteralPath $javaHome -PathType Container)) {
    throw "JAVA${release}_HOME must identify the installed project JDK"
}

if (-not $env:AUTOTEST_STAGING_DIR -or
    -not [System.IO.Path]::IsPathFullyQualified($env:AUTOTEST_STAGING_DIR)) {
    throw "AUTOTEST_STAGING_DIR must identify the case's external diagnostic staging directory"
}
if ($env:GITHUB_ACTIONS -eq "true" -and -not $env:GITHUB_ENV) {
    throw "GITHUB_ENV is required to share the bound toolchain with VS Code and Gradle"
}
$logDirectory = Join-Path $env:AUTOTEST_STAGING_DIR "terminal"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$node = (& node -p "process.execPath" | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not [System.IO.Path]::IsPathFullyQualified($node)) {
    throw "Could not resolve the setup-selected Node executable"
}
$gradle = (Get-Command gradle -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$gradleHome = Split-Path (Split-Path $gradle -Parent) -Parent
if (-not (Test-Path -LiteralPath (Join-Path $gradleHome "lib") -PathType Container)) {
    throw "The selected Gradle executable must belong to a Gradle installation: $gradle"
}
$env:JAVA_HOME = $javaHome

$nodeVersion = (& $node --version 2>&1 | Out-String).Trim()
$nodeExitCode = $LASTEXITCODE
Set-Content (Join-Path $env:AUTOTEST_STAGING_DIR "node-version.log") $nodeVersion
if ($nodeExitCode -ne 0 -or $nodeVersion -notmatch '^v22\.') {
    throw "Expected setup-selected Node 22 at ${node}, got: $nodeVersion"
}
$gradleInfo = (& $gradle --version 2>&1 | Out-String).Trim()
$gradleExitCode = $LASTEXITCODE
Set-Content (Join-Path $env:AUTOTEST_STAGING_DIR "gradle-version.log") "Command: $gradle --version`n$gradleInfo"
if ($gradleExitCode -ne 0 -or $gradleInfo -notmatch "(?m)^Gradle $([regex]::Escape($gradleVersion))\r?$") {
    throw "Expected Gradle $gradleVersion at ${gradle}, got: $gradleInfo"
}

$quoteReplacement = if ($IsWindows) { "''" } else { "'" + '"' + "'" + '"' + "'" }
$helperArguments = if ($release -eq "27") { "gradle project" } else { "$release $gradleVersion" }
$arguments = @($node, "verify.mjs") + $helperArguments.Split(" ")
if ($release -ne "27") {
    $arguments += @($gradle, $javaHome, $logDirectory)
}
$terminalCommand = ($arguments | ForEach-Object { "'" + $_.Replace("'", $quoteReplacement) + "'" }) -join " "
if ($IsWindows) {
    $terminalCommand = "& $terminalCommand"
}
$action = "executeVSCodeCommand workbench.action.terminal.sendSequence " +
    (@{ text = $terminalCommand + "`r" } | ConvertTo-Json -Compress)
$originalAction = 'executeVSCodeCommand workbench.action.terminal.sendSequence {"text":"node verify.mjs ' +
    $helperArguments + '\u000d"}'
$planFile = Join-Path "test-plans" "$PlanName.yaml"
$content = Get-Content -LiteralPath $planFile -Raw
$versionSetting = '    java.import.gradle.version: "' + $gradleVersion + '"'
if (-not $content.Contains($versionSetting)) {
    throw "Could not find the expected Gradle version setting in $planFile"
}
$content = $content.Replace($versionSetting,
    $versionSetting + "`n    java.import.gradle.home: " + ($gradleHome | ConvertTo-Json -Compress))
$originalValue = "'" + $originalAction + "'"
if (-not $content.Contains($originalValue)) {
    throw "Could not find the expected build helper command in $planFile"
}
# Escape YAML independently of the terminal shell and its JSON command arguments.
$boundValue = "'" + $action.Replace("'", "''") + "'"
Set-Content -LiteralPath $planFile -Value $content.Replace($originalValue, $boundValue)

if ($env:GITHUB_ACTIONS -eq "true") {
    "GRADLE_CI_JAVA_HOME=$javaHome" >> $env:GITHUB_ENV
    "GRADLE_CI_GRADLE=$gradle" >> $env:GITHUB_ENV
    if ($release -eq "27") {
        "JAVA27_CI_GRADLE=$gradle" >> $env:GITHUB_ENV
    } else {
        "ORG_GRADLE_PROJECT_javaRelease=$release" >> $env:GITHUB_ENV
    }
}

Write-Host "Bound Node $nodeVersion at $node"
Write-Host "Bound Gradle $gradleVersion at $gradle with JDK $release at $javaHome"
Write-Host "Bound IDE Gradle home: $gradleHome"
Write-Host "Toolchain diagnostics: $logDirectory"
