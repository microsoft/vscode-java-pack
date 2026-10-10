$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "prepare-vsix.ps1"
$testDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "java-pack-vsix-tests-$([guid]::NewGuid())"
$previousToken = $env:GITHUB_TOKEN
$previousArtifactToken = $env:VSCODE_JAVA_ARTIFACT_TOKEN
$platformIds = @("win32-x64", "linux-x64", "darwin-arm64")
$testState = @{
    restCalls = [System.Collections.Generic.List[object]]::new()
    webCalls = [System.Collections.Generic.List[object]]::new()
    restFailure = ""
    webFailure = ""
    caseCount = 0
}
$releaseUrl = "https://github.com/redhat-developer/vscode-java/releases/tag/v1.57.0"
$runUrl = "https://github.com/redhat-developer/vscode-java/actions/runs/123"
$testState.archiveFiles = @($platformIds | ForEach-Object { "java-$_-1.57.0.vsix" })
$testState.assets = @($testState.archiveFiles | ForEach-Object {
    [pscustomobject]@{ name = $_; browser_download_url = "https://downloads.example/$_" }
})
$testState.artifacts = @([pscustomobject]@{
    name = "vscode-java"
    expired = $false
    archive_download_url = "https://api.github.com/repos/redhat-developer/vscode-java/actions/artifacts/1/zip"
})

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) {
        throw $Message
    }
}

function Invoke-RestMethod {
    param([string] $Uri, [hashtable] $Headers, [switch] $UseBasicParsing)
    $testState.restCalls.Add([pscustomobject]@{ Uri = $Uri; Headers = $Headers })
    if ($testState.restFailure) {
        throw $testState.restFailure
    }
    if ($Uri -match '/releases/tags/') {
        Assert-True ($Headers.Authorization -eq "Bearer $env:GITHUB_TOKEN") "Release metadata must use GITHUB_TOKEN"
        return [pscustomobject]@{ assets = $testState.assets }
    }
    if ($Uri -match '/actions/runs/') {
        $token = if ($env:VSCODE_JAVA_ARTIFACT_TOKEN) { $env:VSCODE_JAVA_ARTIFACT_TOKEN } else { $env:GITHUB_TOKEN }
        Assert-True ($Headers.Authorization -eq "Bearer $token") "Actions metadata must use the artifact token or GITHUB_TOKEN"
        return [pscustomobject]@{ artifacts = $testState.artifacts }
    }
    throw "Unexpected metadata request"
}

function Invoke-WebRequest {
    param([uri] $Uri, [string] $OutFile, [hashtable] $Headers, [switch] $UseBasicParsing)
    $testState.webCalls.Add([pscustomobject]@{ Uri = $Uri; Headers = $Headers })
    if ($testState.webFailure) {
        throw $testState.webFailure
    }
    if ($Uri.Host -eq "api.github.com") {
        $token = if ($env:VSCODE_JAVA_ARTIFACT_TOKEN) { $env:VSCODE_JAVA_ARTIFACT_TOKEN } else { $env:GITHUB_TOKEN }
        Assert-True ($Headers.Authorization -eq "Bearer $token") "Actions archive must use the artifact token or GITHUB_TOKEN"
    } else {
        Assert-True (-not $Headers) "Direct/release downloads must not receive API credentials"
    }
    [System.IO.File]::WriteAllText($OutFile, "fixture")
}

function Expand-Archive {
    param([string] $LiteralPath, [string] $DestinationPath, [switch] $Force)
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    foreach ($name in $testState.archiveFiles) {
        [System.IO.File]::WriteAllText((Join-Path $DestinationPath $name), "fixture")
    }
}

function Invoke-TestPreparation {
    param([string] $Sources, [string] $ExpectedError = "")

    $testState.caseCount++
    $testState.restCalls.Clear()
    $testState.webCalls.Clear()
    $output = Join-Path $testDirectory "case-$($testState.caseCount)"
    try {
        & $scriptPath -Sources $Sources -OutputDirectory $output 6> $null
    } catch {
        if (-not $ExpectedError -or $_.Exception.Message -notlike "*$ExpectedError*") {
            throw
        }
        return $output
    }
    Assert-True (-not $ExpectedError) "Expected preparation failure: $ExpectedError"
    return $output
}

function Assert-PlatformFiles {
    param([string] $Directory, [switch] $Universal)
    foreach ($platformId in $platformIds) {
        $files = @(Get-ChildItem -LiteralPath (Join-Path $Directory $platformId) -File)
        $expected = if ($Universal) { "extension-1.0.vsix" } else { "java-$platformId-1.57.0.vsix" }
        Assert-True ($files.Count -eq 1 -and $files[0].Name -eq $expected) "Wrong bits for $platformId"
    }
}

try {
    New-Item -ItemType Directory -Path $testDirectory | Out-Null
    $env:GITHUB_TOKEN = "test-github-token"
    $env:VSCODE_JAVA_ARTIFACT_TOKEN = "test-artifact-token"

    $testState.assets += [pscustomobject]@{ name = "java-linux-arm64-1.57.0.vsix"; browser_download_url = "https://downloads.example/wrong.vsix" }
    $testState.assets += [pscustomobject]@{ name = "extension-1.0.vsix"; browser_download_url = "https://downloads.example/extension-1.0.vsix" }
    $output = Invoke-TestPreparation "$releaseUrl, $releaseUrl"
    Assert-PlatformFiles $output
    Assert-True ($testState.restCalls.Count -eq 1 -and $testState.webCalls.Count -eq 3) "Release must resolve once and download only the three required platform assets"

    $testState.assets = @([pscustomobject]@{ name = "extension-1.0.vsix"; browser_download_url = "https://downloads.example/extension-1.0.vsix" })
    $output = Invoke-TestPreparation $releaseUrl
    Assert-PlatformFiles $output -Universal
    Assert-True ($testState.restCalls.Count -eq 1 -and $testState.webCalls.Count -eq 1) "Universal release must download once"

    $output = Invoke-TestPreparation "$runUrl,123"
    Assert-PlatformFiles $output
    Assert-True ($testState.restCalls.Count -eq 1 -and $testState.webCalls.Count -eq 1) "Run URL and numeric alias must share one metadata/archive download"

    $env:VSCODE_JAVA_ARTIFACT_TOKEN = $null
    $output = Invoke-TestPreparation $runUrl
    Assert-PlatformFiles $output
    Assert-True ($testState.restCalls.Count -eq 1 -and $testState.webCalls.Count -eq 1) "Actions fallback token must retain single-download behavior"

    $testState.artifacts[0].name = "sole-artifact"
    $testState.archiveFiles = @("extension-1.0.vsix")
    $output = Invoke-TestPreparation $runUrl
    Assert-PlatformFiles $output -Universal

    $env:GITHUB_TOKEN = $null
    $output = Invoke-TestPreparation " https://downloads.example/extension-1.0.vsix?download=1,https://downloads.example/extension-1.0.vsix?download=1 "
    Assert-PlatformFiles $output -Universal
    Assert-True ($testState.restCalls.Count -eq 0 -and $testState.webCalls.Count -eq 1) "Direct URLs must download once without API authentication"

    Invoke-TestPreparation $releaseUrl "GitHub API requests require" | Out-Null
    Assert-True ($testState.restCalls.Count -eq 0) "Missing token must fail before calling the release API"
    $env:GITHUB_TOKEN = "test-github-token"

    $testState.assets = @([pscustomobject]@{ name = "java-win32-x64-1.57.0.vsix"; browser_download_url = "https://downloads.example/java-win32-x64-1.57.0.vsix" })
    Invoke-TestPreparation $releaseUrl "No matching VSIX found for platform linux-x64" | Out-Null
    $testState.assets = @()
    Invoke-TestPreparation $releaseUrl "No matching VSIX found" | Out-Null

    $testState.restFailure = "rate limit exceeded"
    Invoke-TestPreparation $releaseUrl "rate limit exceeded" | Out-Null
    Assert-True ($testState.webCalls.Count -eq 0) "Metadata failure must not fall back to other bits"
    $testState.restFailure = ""

    $testState.artifacts[0].expired = $true
    Invoke-TestPreparation $runUrl "No non-expired artifacts" | Out-Null
    $testState.artifacts[0].expired = $false
    $testState.artifacts[0].archive_download_url = "https://downloads.example/archive.zip"
    Invoke-TestPreparation $runUrl "archive URL must use https://api.github.com" | Out-Null
    Assert-True ($testState.webCalls.Count -eq 0) "Archive credentials must not be sent to an external host"
    $testState.artifacts[0].archive_download_url = "https://api.github.com/repos/redhat-developer/vscode-java/actions/artifacts/1/zip"

    $testState.archiveFiles = @()
    Invoke-TestPreparation $runUrl "does not contain VSIX files" | Out-Null
    $testState.webFailure = "forbidden"
    Invoke-TestPreparation $runUrl "Cross-repo downloads may require VSCODE_JAVA_ARTIFACT_TOKEN" | Out-Null
    $testState.webFailure = ""

    Invoke-TestPreparation "https://downloads.example/file.zip" "must name a .vsix file" | Out-Null
    Invoke-TestPreparation " , " "No VSIX sources supplied" | Out-Null
    Write-Host "Passed $($testState.caseCount) VSIX preparation tests."
} finally {
    $env:GITHUB_TOKEN = $previousToken
    $env:VSCODE_JAVA_ARTIFACT_TOKEN = $previousArtifactToken
    Remove-Item -LiteralPath $testDirectory -Recurse -Force
}
