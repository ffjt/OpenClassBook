import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { TemplateProvider } from "@/context/TemplateContext";
import { ThemeProvider } from "@/context/ThemeContext";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <TemplateProvider>
          <App />
        </TemplateProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
