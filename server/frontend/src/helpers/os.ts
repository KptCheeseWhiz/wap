let _os: "Android" | "iOS" | "Windows" | "Linux" | "unknown" | null = null;
const os = (): "Android" | "iOS" | "Windows" | "Linux" | "unknown" => {
  if (_os) return _os;
  if (window.navigator.userAgent.indexOf("Android") !== -1)
    return (_os = "Android");
  if (window.navigator.userAgent.indexOf("Mac") !== -1) return (_os = "iOS");
  if (window.navigator.userAgent.indexOf("Windows") !== -1)
    return (_os = "Windows");
  if (window.navigator.userAgent.indexOf("X11") !== -1) return (_os = "Linux");
  if (window.navigator.userAgent.indexOf("Linux") !== -1)
    return (_os = "Linux");
  return (_os = "unknown");
};

export default os;
