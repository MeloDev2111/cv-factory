import type { ResolvedResume } from "../domain/types.js";

export interface RenderOptions {
  template: string;
  outPath: string;
}

export interface Renderer {
  render(resume: ResolvedResume, options: RenderOptions): Promise<void>;
}
