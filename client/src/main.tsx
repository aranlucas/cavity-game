import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./styles.css";

const root = document.querySelector("#root");

if (!root) {
  throw new Error("The clinic root element is missing.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
