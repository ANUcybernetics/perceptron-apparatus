import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/training/index.ts"],
  format: "esm",
  dts: true,
  clean: true,
});
