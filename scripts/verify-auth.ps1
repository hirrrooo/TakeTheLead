$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5173'

# 1) Sign up a brand-new user (proves additionalFields don't break signup)
$signupBody = @{
    name  = 'Probe User'
    email = "probe_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@takethelead.dev"
    password = 'probe_password123!'
} | ConvertTo-Json

$signup = Invoke-RestMethod -Uri "$base/api/auth/sign-up/email" -Method Post -ContentType 'application/json' -Body $signupBody -SessionVariable sess
Write-Output ("SIGNUP_OK user_id=" + $signup.user.id + " isModerator=" + $signup.user.isModerator)

# 2) Log in as the seeded moderator
$loginBody = @{ email = 'seed_mod@takethelead.dev'; password = 'password123!' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/auth/sign-in/email" -Method Post -ContentType 'application/json' -Body $loginBody -SessionVariable modSess
Write-Output ("LOGIN_OK user_id=" + $login.user.id + " isModerator=" + $login.user.isModerator)

# 3) Session check with the moderator cookie
$session = Invoke-RestMethod -Uri "$base/api/auth/get-session" -Method Get -WebSession $modSess
Write-Output ("SESSION_OK email=" + $session.user.email)

# 4) Wrong password must fail
try {
    $bad = @{ email = 'seed_mod@takethelead.dev'; password = 'wrong' } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/auth/sign-in/email" -Method Post -ContentType 'application/json' -Body $bad | Out-Null
    Write-Output 'BAD_LOGIN_UNEXPECTEDLY_SUCCEEDED'
} catch {
    Write-Output 'BAD_LOGIN_REJECTED'
}
