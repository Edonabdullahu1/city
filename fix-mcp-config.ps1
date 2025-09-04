# Read the current configuration
$configPath = "C:\Users\Edon\.claude.json"
$config = Get-Content $configPath | ConvertFrom-Json

# Check if the city project exists (Windows path format)
$projectKey = 'C:\git\city'
if ($config.projects.$projectKey.mcpServers) {
    $servers = $config.projects.$projectKey.mcpServers
    
    # Fix postgres
    if ($servers.postgres -and $servers.postgres.command -eq 'npx') {
        $servers.postgres.command = 'cmd'
        $servers.postgres.args = @('/c', 'npx') + $servers.postgres.args
        Write-Host "Fixed postgres server configuration"
    }
    
    # Fix sequential-thinking
    if ($servers.'sequential-thinking' -and $servers.'sequential-thinking'.command -eq 'npx') {
        $servers.'sequential-thinking'.command = 'cmd'
        $servers.'sequential-thinking'.args = @('/c', 'npx') + $servers.'sequential-thinking'.args
        Write-Host "Fixed sequential-thinking server configuration"
    }
    
    # Fix puppeteer
    if ($servers.puppeteer -and $servers.puppeteer.command -eq 'npx') {
        $servers.puppeteer.command = 'cmd'
        $servers.puppeteer.args = @('/c', 'npx') + $servers.puppeteer.args
        Write-Host "Fixed puppeteer server configuration"
    }
    
    # Fix github
    if ($servers.github -and $servers.github.command -eq 'npx') {
        $servers.github.command = 'cmd'
        $servers.github.args = @('/c', 'npx') + $servers.github.args
        Write-Host "Fixed github server configuration"
    }
    
    # Fix memory
    if ($servers.memory -and $servers.memory.command -eq 'npx') {
        $servers.memory.command = 'cmd'
        $servers.memory.args = @('/c', 'npx') + $servers.memory.args
        Write-Host "Fixed memory server configuration"
    }
    
    # Fix filesystem
    if ($servers.filesystem -and $servers.filesystem.command -eq 'npx') {
        $servers.filesystem.command = 'cmd'
        $servers.filesystem.args = @('/c', 'npx') + $servers.filesystem.args
        Write-Host "Fixed filesystem server configuration"
    }
    
    # Fix magic
    if ($servers.magic -and $servers.magic.command -eq 'npx') {
        $servers.magic.command = 'cmd'
        $servers.magic.args = @('/c', 'npx') + $servers.magic.args
        Write-Host "Fixed magic server configuration"
    }
    
    # Fix ide
    if ($servers.ide -and $servers.ide.command -eq 'npx') {
        $servers.ide.command = 'cmd'
        $servers.ide.args = @('/c', 'npx') + $servers.ide.args
        Write-Host "Fixed ide server configuration"
    }
    
    # Write the updated configuration back
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
    Write-Host "`nConfiguration updated successfully!"
    Write-Host "Please restart Claude Code for the changes to take effect."
} else {
    Write-Host "Checking available projects..."
    $config.projects | Get-Member -MemberType NoteProperty | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }
    Write-Host "`nNo MCP servers found for project: $projectKey"
}