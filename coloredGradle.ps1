$isError = $False
$isRunning = $False
$stackTraceLine = 0
$color = "";
ForEach ($row in $input) {
    if ($row -match "^\S+\s\S+\sERROR") {
        $isError = $True
        $stackTraceLine = 0
    }
    else {
        if ($row -match "^\S+\s\[\S+\]\s") {
            $isError = $False
        }
        else {
            if ($isError -and $row -match "^\s+at\s") {
                $stackTraceLine++
            }
        }
    }
    if ($row.Contains("Started SubAppRunner")) {
        $color = "Yellow"
        $isRunning = $True
    }
    else {
        if ($row.Contains("MessageBrokerPublisher")) {
            $color = "Cyan"
        }
        else {
            $color = "Gray"
        }
    }
    if ($isError) {
        if ($stackTraceLine -lt 5) {
            Write-Host -ForegroundColor "Red" $row
        }
    }
    else {
        if ($isRunning) {
            Write-Host -ForegroundColor "Yellow" -NoNewline "| "
            Write-Host -ForegroundColor $color $row
        }
        else {
            Write-Host -ForegroundColor $color $row
        }
    }
}
