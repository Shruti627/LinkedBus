// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
// 💡 CRITICAL: Import BrowserRouter here!
import { BrowserRouter } from 'react-router-dom'; 
import App from "./App.jsx";
import "./index.css"; 

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* 💡 CRITICAL: Wrap App with BrowserRouter! */}
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>
);