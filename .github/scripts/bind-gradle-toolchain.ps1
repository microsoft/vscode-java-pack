[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("java-gradle", "java-gradle-java25")]
    [string] $PlanName
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$release = if ($PlanName -eq "java-gradle-java25") { "25" } else { "21" }
$gradleVersion = if ($release -eq "25") { "9.8.1" } else { "8.5" }
$javaHome = [Environment]::GetEnvironmentVariable("JAVA${release}_HOME")
if (-not $javaHome -or -not [System.IO.Path]::IsPathFullyQualified($javaHome) -or
    -not (Test-Path -LiteralPath $javaHome -PathType Container)) {
    throw "JAVA${release}_HOME must identify the installed project JDK"
}

$logDirectory = Join-Path (Get-Location).Path "test-results/toolchains/$PlanName"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$node = (& node -p "process.execPath" | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not [System.IO.Path]::IsPathFullyQualified($node)) {
    throw "Could not resolve the setup-selected Node executable"
}
$gradle = (Get-Command gradle -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$env:JAVA_HOME = $javaHome

$nodeVersion = (& $node --version 2>&1 | Out-String).Trim()
$nodeExitCode = $LASTEXITCODE
Set-Content (Join-Path $logDirectory "ci-node-version.log") $nodeVersion
if ($nodeExitCode -ne 0 -or $nodeVersion -notmatch '^v22\.') {
    throw "Expected setup-selected Node 22 at ${node}, got: $nodeVersion"
}
$gradleInfo = (& $gradle --version 2>&1 | Out-String).Trim()
$gradleExitCode = $LASTEXITCODE
Set-Content (Join-Path $logDirectory "ci-gradle-version.log") $gradleInfo
if ($gradleExitCode -ne 0 -or $gradleInfo -notmatch "(?m)^Gradle $([regex]::Escape($gradleVersion))\r?$") {
    throw "Expected Gradle $gradleVersion at ${gradle}, got: $gradleInfo"
}

$quoteReplacement = if ($IsWindows) { "''" } else { "'" + '"' + "'" + '"' + "'" }
$arguments = @($node, "verify.mjs", $release, $gradleVersion, $gradle, $javaHome, $logDirectory)
$terminalCommand = ($arguments | ForEach-Object { "'" + $_.Replace("'", $quoteReplacement) + "'" }) -join " "
if ($IsWindows) {
    $terminalCommand = "& $terminalCommand"
}
$action = "executeVSCodeCommand workbench.action.terminal.sendSequence " +
    (@{ text = $terminalCommand + "`r" } | ConvertTo-Json -Compress)
$originalAction = 'executeVSCodeCommand workbench.action.terminal.sendSequence {"text":"node verify.mjs ' +
    "$release $gradleVersion" + '\u000d"}'
$planFile = Join-Path "test-plans" "$PlanName.yaml"
$content = Get-Content -LiteralPath $planFile -Raw
$originalValue = "'" + $originalAction + "'"
if (-not $content.Contains($originalValue)) {
    throw "Could not find the expected build helper command in $planFile"
}
# Escape YAML independently of the terminal shell and its JSON command arguments.
$boundValue = "'" + $action.Replace("'", "''") + "'"
Set-Content -LiteralPath $planFile -Value $content.Replace($originalValue, $boundValue)

@{
    node = $node
    nodeVersion = $nodeVersion
    gradle = $gradle
    gradleVersion = $gradleVersion
    javaHome = $javaHome
    javaRelease = $release
    terminalCommand = $terminalCommand
} | ConvertTo-Json | Set-Content (Join-Path $logDirectory "ci-toolchain.json")
Write-Host "Bound Node $nodeVersion at $node"
Write-Host "Bound Gradle $gradleVersion at $gradle with JDK $release at $javaHome"
Write-Host "Toolchain diagnostics: $logDirectory"
