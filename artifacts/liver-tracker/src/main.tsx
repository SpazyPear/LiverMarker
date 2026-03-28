import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./error-boundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
