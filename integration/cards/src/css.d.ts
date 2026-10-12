// A stylesheet imported as its text (Vite's ?inline): pills.ts.
declare module "*.css?inline" {
  const text: string;
  export default text;
}
