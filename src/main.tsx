import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
//@ts-ignore
import "@fontsource/caveat-brush";

// import "@fontsource/jost"; // Defaults to weight 400
// import "@fontsource/jost/400.css"; // Specify weight
// import "@fontsource/jost/400-italic.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
