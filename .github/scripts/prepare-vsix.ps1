[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $Sources,
    [Parameter(Mandatory = $true)]
    [string] $OutputDirectory
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$platformIds = @("win32-x64", "linux-x64", "darwin-arm64")
$urls = @($Sources -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" } | Select-Object -Unique)
if ($urls.Count -eq 0) {
    throw "No VSIX sources supplied"
}
if (Test-Path -LiteralPath $OutputDirectory) {
    throw "VSIX output directory already exists: $OutputDirectory"
}

$downloadCache = [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
$runCache = @{}
$cacheDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "java-pack-vsix-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $cacheDirectory | Out-Null

function Get-GitHubHeaders {
    param([switch] $Actions)

    $token = if ($Actions -and $env:VSCODE_JAVA_ARTIFACT_TOKEN) { $env:VSCODE_JAVA_ARTIFACT_TOKEN } else { $env:GITHUB_TOKEN }
    if (-not $token) {
        throw "GitHub API requests require GITHUB_TOKEN or, for Actions artifacts, VSCODE_JAVA_ARTIFACT_TOKEN"
    }
    return @{
        Accept = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
        "User-Agent" = "vscode-java-pack-autotest"
        Authorization = "Bearer $token"
    }
}

function Select-VsixForPlatform {
    param(
        [AllowEmptyCollection()]
        [object[]] $VsixFiles,
        [string] $PlatformId
    )

    $platformVsix = $VsixFiles | Where-Object { $_.Name -like "*-$PlatformId-*" } | Sort-Object Name | Select-Object -First 1
    if ($platformVsix) {
        return $platformVsix
    }
    $universalVsix = $VsixFiles | Where-Object { $_.Name -notmatch '-(darwin|linux|win32)-' } | Sort-Object Name | Select-Object -First 1
    if ($universalVsix) {
        return $universalVsix
    }
    throw "No matching VSIX found for platform $PlatformId. Available VSIX files: $($VsixFiles.Name -join ', ')"
}

function Get-DownloadedVsix {
    param([string] $Url)

    if (-not $downloadCache.ContainsKey($Url)) {
        $uri = [uri] $Url
        if (-not $uri.IsAbsoluteUri -or $uri.Scheme -notin @("https", "http")) {
            throw "VSIX downloads require an absolute HTTP(S) URL"
        }
        $fileName = [System.IO.Path]::GetFileName([uri]::UnescapeDataString($uri.AbsolutePath))
        if (-not $fileName.EndsWith(".vsix", [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "VSIX download URL must name a .vsix file"
        }
        $directory = Join-Path $cacheDirectory "download-$($downloadCache.Count)"
        New-Item -ItemType Directory -Path $directory | Out-Null
        $filePath = Join-Path $directory $fileName
        Write-Host "Downloading VSIX: $fileName"
        # Direct and release-asset URLs must not receive GitHub API credentials.
        Invoke-WebRequest -Uri $uri -OutFile $filePath -UseBasicParsing | Out-Null
        $downloadCache.Add($Url, $filePath)
    }
    return Get-Item -LiteralPath $downloadCache[$Url]
}

function Get-GitHubActionsRunVsix {
    param([string] $Owner, [string] $Repo, [string] $RunId)

    $key = "$Owner/$Repo/$RunId"
    if (-not $runCache.ContainsKey($key)) {
        Write-Host "Resolving GitHub Actions run: $Owner/$Repo#$RunId"
        $headers = Get-GitHubHeaders -Actions
        $artifactsUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runs/$RunId/artifacts?per_page=100"
        $artifacts = @((Invoke-RestMethod -Uri $artifactsUrl -Headers $headers -UseBasicParsing).artifacts | Where-Object { -not $_.expired })
        if ($artifacts.Count -eq 0) {
            throw "No non-expired artifacts found for GitHub Actions run $Owner/$Repo#$RunId"
        }
        $artifact = $artifacts | Where-Object { $_.name -eq "vscode-java" } | Select-Object -First 1
        if (-not $artifact -and $artifacts.Count -eq 1) {
            $artifact = $artifacts[0]
        }
        if (-not $artifact) {
            throw "No vscode-java artifact found for GitHub Actions run $Owner/$Repo#$RunId. Available artifacts: $($artifacts.name -join ', ')"
        }
        $archiveUri = [uri] $artifact.archive_download_url
        if ($archiveUri.Scheme -ne "https" -or $archiveUri.Host -ne "api.github.com") {
            throw "GitHub artifact archive URL must use https://api.github.com"
        }
        $directory = Join-Path $cacheDirectory "run-$($runCache.Count)"
        $zipPath = "$directory.zip"
        Write-Host "Downloading Actions artifact: $($artifact.name)"
        try {
            Invoke-WebRequest -Uri $archiveUri -OutFile $zipPath -Headers $headers -UseBasicParsing | Out-Null
        } catch {
            throw "Failed to download artifact $($artifact.name) from $Owner/$Repo#$RunId. Cross-repo downloads may require VSCODE_JAVA_ARTIFACT_TOKEN with actions:read access. $($_.Exception.Message)"
        }
        Expand-Archive -LiteralPath $zipPath -DestinationPath $directory -Force
        $files = @(Get-ChildItem -LiteralPath $directory -Recurse -File -Filter "*.vsix")
        if ($files.Count -eq 0) {
            throw "Artifact $($artifact.name) from $Owner/$Repo#$RunId does not contain VSIX files"
        }
        $runCache[$key] = $files
    }
    return $runCache[$key]
}

try {
    foreach ($platformId in $platformIds) {
        New-Item -ItemType Directory -Path (Join-Path $OutputDirectory $platformId) -Force | Out-Null
    }
    foreach ($url in $urls) {
        if ($url -match '^https://github\.com/([^/]+)/([^/]+)/releases/tag/(.+)$') {
            $owner = $Matches[1]; $repo = $Matches[2]; $tag = $Matches[3]
            Write-Host "Resolving GitHub release: $owner/$repo@$tag"
            $apiUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$tag"
            $release = Invoke-RestMethod -Uri $apiUrl -Headers (Get-GitHubHeaders) -UseBasicParsing
            $assets = @($release.assets | Where-Object { $_.name -like "*.vsix" })
            foreach ($platformId in $platformIds) {
                $asset = Select-VsixForPlatform -VsixFiles $assets -PlatformId $platformId
                $file = Get-DownloadedVsix -Url $asset.browser_download_url
                Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $OutputDirectory "$platformId/$($file.Name)") -Force
            }
        } elseif ($url -match '^https://github\.com/([^/]+)/([^/]+)/actions/runs/(\d+)') {
            $files = @(Get-GitHubActionsRunVsix -Owner $Matches[1] -Repo $Matches[2] -RunId $Matches[3])
            foreach ($platformId in $platformIds) {
                $file = Select-VsixForPlatform -VsixFiles $files -PlatformId $platformId
                Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $OutputDirectory "$platformId/$($file.Name)") -Force
            }
        } elseif ($url -match '^\d+$') {
            $files = @(Get-GitHubActionsRunVsix -Owner "redhat-developer" -Repo "vscode-java" -RunId $url)
            foreach ($platformId in $platformIds) {
                $file = Select-VsixForPlatform -VsixFiles $files -PlatformId $platformId
                Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $OutputDirectory "$platformId/$($file.Name)") -Force
            }
        } else {
            $file = Get-DownloadedVsix -Url $url
            foreach ($platformId in $platformIds) {
                Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $OutputDirectory "$platformId/$($file.Name)") -Force
            }
        }
    }
    Get-ChildItem -LiteralPath $OutputDirectory -Recurse -File -Filter "*.vsix" | ForEach-Object {
        Write-Host "Prepared $($_.Directory.Name): $($_.Name) ($([math]::Round($_.Length / 1MB, 1)) MB)"
    }
} finally {
    Remove-Item -LiteralPath $cacheDirectory -Recurse -Force
}
