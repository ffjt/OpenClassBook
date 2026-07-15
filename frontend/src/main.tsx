import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

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
          <Toaster position="top-right" richColors />
        </TemplateProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
