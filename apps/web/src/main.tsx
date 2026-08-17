import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";

const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("App root element was not found");

createRoot(app).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
