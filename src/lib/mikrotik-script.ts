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

  return `# ============================================
# MoonConnect - MikroTik Bootstrap Script
# ============================================

:if ([/ping 8.8.8.8 count=3] = 0) do={
    :error "No internet connection. Please check your router WAN and DNS.";
}

:do {
    :put "Downloading MoonConnect configuration...";
    /tool fetch url="${provisionUrl}&mode=config" mode=https dst-path=${configName};
    :delay 2s;

    :if ([:len [/file find name="${configName}"]] = 0) do={
        :error "MoonConnect configuration download failed.";
    }

    :put "Applying MoonConnect configuration...";
    /import ${configName};
    /file remove [find name="${configName}"];
    :put "MoonConnect configuration completed successfully.";
} on-error={
    :put "MoonConnect provisioning failed:";
    :put $error;
}

# Script file loaded and executed successfully
# Source bootstrap: ${scriptName}
`;
}
