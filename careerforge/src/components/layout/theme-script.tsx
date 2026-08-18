/**
 * Applies the stored theme before first paint so a light-theme user never sees
 * a dark flash. Inline by necessity — anything async is already too late.
 */
export function ThemeScript() {
  const script = `try{if(localStorage.getItem("cf-theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
