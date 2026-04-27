# ============================================================
# upload-release.ps1  —  Micro-Earth GitHub Release 上传脚本
# 用法: .\scripts\upload-release.ps1 -Token "ghp_xxxx"
# ============================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$owner   = "KDTikkly"
$repo    = "micro-earth"
$tag     = "v11.1.0"
$exePath = "c:/Users/KDVON/CodeBuddy/20260427160025/micro-earth/dist-electron/win-unpacked/Micro-Earth-Digital-Twin.exe"
$exeName = "Micro-Earth-Digital-Twin-v11.1.0-win-portable.exe"

$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept"        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Host "`n[1/3] 检查/创建 Release tag $tag ..." -ForegroundColor Cyan

# 先检查 tag 是否已有 Release
$checkUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$tag"
try {
    $existing = Invoke-RestMethod -Uri $checkUrl -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "  ✓ Release 已存在，ID=$($existing.id)" -ForegroundColor Green
    $releaseId = $existing.id
    $uploadUrl = $existing.upload_url -replace '\{.*\}',''
} catch {
    # 不存在，创建新 Release
    Write-Host "  创建新 Release..." -ForegroundColor Yellow
    $body = @{
        tag_name   = $tag
        name       = "v11.1.0 — React 18 Stable + Electron Desktop"
        body       = "## Micro-Earth Digital Twin v11.1.0`n`n### 本版本更新`n- React 18.3.1 稳定化，根除 3D 地球 useRef 崩溃`n- 粉白科幻实验室 UI（AgentTerminal 白底粉字）`n- GBK 编码乱码全面修复`n- Vite 8 构建验证通过（984 modules）`n- Lyria 粉色主题 App 图标 (#FF69B4)`n`n### 下载说明`n- **Windows 便携版（推荐）**: 无需安装，双击运行`n- 前端已内嵌，无需额外依赖`n- Python 后端需单独启动（或等待完整安装包版本）`n`n---`n*「哼，终于打包好了。双击那个 .exe，世界末日就装进你的电脑里了。才不是特地做的……只是刚好做了而已。」—— Lyria Reverie*"
        draft      = $false
        prerelease = $false
    } | ConvertTo-Json
    $createUrl = "https://api.github.com/repos/$owner/$repo/releases"
    $release = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $body -ContentType "application/json"
    $releaseId = $release.id
    $uploadUrl = $release.upload_url -replace '\{.*\}',''
    Write-Host "  ✓ Release 创建成功，ID=$releaseId" -ForegroundColor Green
}

Write-Host "`n[2/3] 上传 exe 到 Release (172MB，请稍候)..." -ForegroundColor Cyan
$fileBytes   = [System.IO.File]::ReadAllBytes($exePath)
$uploadFull  = "$($uploadUrl)?name=$exeName&label=Windows+便携版+v11.1.0"
$uploadHeaders = $headers + @{ "Content-Type" = "application/octet-stream" }

$resp = Invoke-RestMethod -Uri $uploadFull -Headers $uploadHeaders -Method Post -Body $fileBytes
Write-Host "  ✓ 上传成功：$($resp.browser_download_url)" -ForegroundColor Green

Write-Host "`n[3/3] 下载链接：" -ForegroundColor Cyan
Write-Host "  $($resp.browser_download_url)" -ForegroundColor Magenta
Write-Host "`n完成！可将此链接写入 README 的 Download 区域。`n" -ForegroundColor Green

# 返回下载链接供后续使用
$resp.browser_download_url
