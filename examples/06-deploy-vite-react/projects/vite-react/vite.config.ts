import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 注意：通配符写法是 .scalebox.dev（以点开头），不是 *.scalebox.dev
    // 部署时会自动添加具体的沙盒 host
    allowedHosts: ["localhost", ".local", "0.0.0.0", ".scalebox.dev"],
  },
});
