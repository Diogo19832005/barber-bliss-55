import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply stored theme immediately to prevent flash
const storedTheme = localStorage.getItem("app-theme") || "dark";
document.documentElement.classList.add(storedTheme);

createRoot(document.getElementById("root")!).render(<App />);
