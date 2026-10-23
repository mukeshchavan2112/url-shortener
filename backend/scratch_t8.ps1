$exp = (Get-Date).ToUniversalTime().AddSeconds(3).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$body = @{
    longUrl = "https://example.com/expired-target"
    alias = "exp-curl-410"
    expiresAt = $exp
} | ConvertTo-Json

& curl.exe -s -X POST http://localhost:5000/api/shorten -H "Content-Type: application/json" -d "$body"
Start-Sleep -Milliseconds 3500
& curl.exe -s -i http://localhost:5000/exp-curl-410
