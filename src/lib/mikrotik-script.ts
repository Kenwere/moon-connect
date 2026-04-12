export function generateMikroTikScript(options: {
  provisionUrl: string;
  scriptName?: string;
  configName?: string;
}) {
  const {
    provisionUrl,
    scriptName = "moonconnect.rsc",
    configName = "moonconnect-config.rsc",
  } = options;

  function routerosQuote(value: string) {
    return `"${String(value).replace(/(["\\])/g, "\\$1")}"`;
  }

  return `# ============================================
# MoonConnect - MikroTik Bootstrap Script
# ============================================

:local provisionUrl ${routerosQuote(provisionUrl)}
:local configName ${routerosQuote(configName)}

:global version [/system package update get installed-version];
:local majorVersion 0;
:local minorVersion 0;
:local dotPos [:find $version "."];

:if ($dotPos != nil) do={
    :set majorVersion [:tonum [:pick $version 0 $dotPos]];
    :local remaining [:pick $version ($dotPos + 1) [:len $version]];
    :set dotPos [:find $remaining "."];
    :if ($dotPos != nil) do={
        :set minorVersion [:tonum [:pick $remaining 0 $dotPos]];
    }
}

:if ($majorVersion < 6 || ($majorVersion = 6 && $minorVersion < 49)) do={
    :put "RouterOS version 6.49 or higher is required.";
    :error "RouterOS version 6.49 or higher is required.";
}

:if ([/ping 8.8.8.8 count=3] = 0) do={
    :error "No internet connection. Please check your router WAN and DNS.";
}

:do {
    :put "Downloading MoonConnect configuration...";
    /tool fetch url=($provisionUrl . "&mode=config") mode=https dst-path=$configName;
    :delay 3s;

    :local fileId [/file find where name=$configName];
    :if ([:len $fileId] = 0) do={
        :put "Config file not found. Checking fetch status...";
        /file print;
        :error "MoonConnect configuration download failed - file not found after fetch.";
    };

    :put "Applying MoonConnect configuration...";
    :do {
        /import file-name=$configName verbose=yes;
    } on-error={
        :put "MoonConnect config import failed:";
        :put $error;
        :error $error;
    };
    /file remove $fileId;
    :put "MoonConnect configuration completed successfully.";
} on-error={
    :put "MoonConnect provisioning failed with error:";
    :put $error;
    :put "Current directory contents:";
    /file print;
}

# Script file loaded and executed successfully
# Source bootstrap: ${scriptName}
`;
}
