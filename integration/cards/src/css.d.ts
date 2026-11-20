// A stylesheet imported as its text (Vite's ?inline): pills.ts.
declare module "*.css?inline" {
  const text: string;
  export default text;
}

// casa-mia-tablet-layout.js's version, as the marker tools/component_versions.py stamps
// (vite.tablet-layout.config.ts): alone.ts.
declare const __CM_STAMP__: string;
