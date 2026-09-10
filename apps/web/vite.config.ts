import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()], server: { port: 3000, proxy: {'/api':'http://127.0.0.1:8787','/health':'http://127.0.0.1:8787','/oauth':'http://127.0.0.1:8787','/.well-known':'http://127.0.0.1:8787','/mcp':'http://127.0.0.1:8787'} } });
