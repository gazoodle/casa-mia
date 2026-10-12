// First, so each module's own rules (bundled after) refine the shared pills and chips.
import "./pills.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Asks } from "./confirm";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Asks />
  </StrictMode>,
);
