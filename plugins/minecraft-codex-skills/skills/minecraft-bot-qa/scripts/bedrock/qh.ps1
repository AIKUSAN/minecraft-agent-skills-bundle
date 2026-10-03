# helper: . .\qh.ps1 ; Q '[{"c":"form","i":0}]'
function Q($j){
  $c=[uri]::EscapeDataString($j)
  $r = Invoke-RestMethod "http://127.0.0.1:8777/do?c=$c" -TimeoutSec 90
  foreach($e in $r.results){ if($e.error -or $e.r.error){ "ERR $($e.c): $($e.error)$($e.r.error)" } }
  foreach($_ in $r.events){
    if($_.type -eq 'form'){ "FORM[$($_.title)] $($_.content) => " + ($_.buttons -join ' | ') + $(if($_.b1){" (yes=$($_.b1) no=$($_.b2))"}) }
    elseif($_.type -in 'chat','title','toast','error'){ "$($_.type): $($_.text)$($_.message)$($_.msg)" }
    elseif($_.type -eq 'inventory'){ "inventory: " + (($_.items | ForEach-Object { "$($_.name)x$($_.count)" }) -join ', ') }
    elseif($_.type -eq 'slot'){ "slot $($_.slot): $($_.name) x$($_.count)" }
  }
}
function S(){ Invoke-RestMethod 'http://127.0.0.1:8777/state' | ForEach-Object { "pos=$($_.pos.x),$($_.pos.y),$($_.pos.z) held=$($_.heldItem) inv=" + (($_.inv | ForEach-Object { "$($_.slot):$($_.name)x$($_.count)" }) -join ', ') } }
function CP(){ $n=(Invoke-RestMethod 'http://127.0.0.1:8777/do?c=nearby%208').results[0].r | Where-Object { $_.kind -eq 'player' } | Select-Object -First 1; if(-not $n){ 'no player NPC nearby'; return }; Q ('[{"c":"click","q":"' + $n.rid + '"},{"c":"sleep","ms":3000}]') }
function TALK(){ CP; for($i=0;$i -lt 14;$i++){ $o = Q '[{"c":"form","i":0},{"c":"sleep","ms":3500}]'; $o; if(-not ($o -match 'FORM\[')){ break }; '---' } }
function QF($f){ Q $f | Where-Object { $_ -notmatch 'geyseropt' } }
function NPC($iter=5, $pick=0){ Start-Sleep 2; $n=(Invoke-RestMethod 'http://127.0.0.1:8777/do?c=nearby%208' -TimeoutSec 10).results[0].r | Where-Object { $_.kind -eq 'player' } | Select-Object -First 1; if(-not $n){ 'no player NPC nearby'; return }; "npc rid $($n.rid) d=$($n.d)"; Q ('[{"c":"click","q":"' + $n.rid + '"},{"c":"sleep","ms":2500}]') | Where-Object { $_ -notmatch 'geyseropt' }; for($i=0;$i -lt $iter;$i++){ $o = Q ('[{"c":"form","i":' + $pick + '},{"c":"sleep","ms":2500}]') | Where-Object { $_ -notmatch 'geyseropt' }; $o; if(-not ($o -match 'FORM\[')){ break }; '---' }; S }
