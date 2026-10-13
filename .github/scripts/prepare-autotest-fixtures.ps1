# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT license.

param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string] $Plan
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$project = switch ($Plan) {
    { $_ -in @("java-basic-editing", "java-debugger", "java-extension-pack", "java-new-file-snippet", "java-single-file", "java-single-no-workspace") } {
        "eclipse/simple-app"
        break
    }
    { $_ -in @("java-dependency-viewer", "java-maven", "java-webview-migration") } {
        "maven/salut"
        break
    }
    "java-maven-java25" { "maven/salut-java11"; break }
    "java-maven-multimodule" { "maven/multimodule"; break }
    default {
        Write-Host "$Plan does not require vscode-java test projects; skipping download."
        return
    }
}

$destination = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\..\vscode-java"))
if (Test-Path -LiteralPath $destination) {
    throw "Refusing to overwrite existing fixture directory: $destination"
}

$fixture = "test/resources/projects/$project"
Write-Host "Downloading vscode-java fixture: $fixture"
& git init --quiet $destination
if ($LASTEXITCODE -ne 0) { throw "Failed to initialize $destination (exit $LASTEXITCODE)." }
& git -C $destination remote add origin https://github.com/redhat-developer/vscode-java.git
if ($LASTEXITCODE -ne 0) { throw "Failed to configure fixture remote (exit $LASTEXITCODE)." }
& git -C $destination config remote.origin.promisor true
if ($LASTEXITCODE -ne 0) { throw "Failed to configure partial clone (exit $LASTEXITCODE)." }
& git -C $destination config remote.origin.partialclonefilter blob:none
if ($LASTEXITCODE -ne 0) { throw "Failed to configure blob filtering (exit $LASTEXITCODE)." }

# Non-cone mode avoids downloading unrelated files at the repository root.
& git -C $destination sparse-checkout set --no-cone "/$fixture/"
if ($LASTEXITCODE -ne 0) { throw "Failed to configure sparse checkout (exit $LASTEXITCODE)." }

for ($attempt = 1; $attempt -le 3; $attempt++) {
    & git -C $destination fetch --depth 1 --filter=blob:none origin HEAD
    $downloadExit = $LASTEXITCODE
    if ($downloadExit -eq 0) {
        & git -C $destination checkout --detach FETCH_HEAD
        $downloadExit = $LASTEXITCODE
    }
    if ($downloadExit -eq 0) {
        Write-Host "Downloaded $fixture to $destination."
        return
    }
    if ($attempt -lt 3) {
        Write-Warning "Fixture download attempt $attempt/3 failed (exit $downloadExit); retrying in 10 seconds."
        Start-Sleep -Seconds 10
    }
}

throw "Failed to download vscode-java fixture $fixture after 3 attempts (exit $downloadExit)."
