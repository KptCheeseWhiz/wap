import { pspawn } from "./cp";

export const is_exempt = async () => {
  if (process.platform !== "win32") throw new Error("Only on windows");
  return await pspawn("powershell", [
    "-Command",
    `$r = CheckNetIsolation LoopbackExempt -s | Select-String "$((Get-AppxPackage -Name VideoLAN.VLC | Select -Property PackageFamilyName).PackageFamilyName)"; If ($r -eq $null) { exit 999 } Else { exit 0 }`,
  ])
    .then(() => true)
    .catch((code) => {
      if (code === 999) return false;
      throw new Error("unexpected error code " + code);
    });
};

export const exempt = async () => {
  if (process.platform !== "win32") throw new Error("Only on windows");
  return await pspawn("powershell", [
    "-Command",
    // FIX ME
    `iex ("Start-Process -Verb runAs 'CheckNetIsolation' 'LoopbackExempt -a -n="+(Get-AppxPackage -Name VideoLAN.VLC | Select -Property PackageFamilyName).PackageFamilyName+"'")`,
  ]);
};
