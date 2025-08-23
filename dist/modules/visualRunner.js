import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { firefox } from "playwright-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createChildLogger } from "../shared/logger.js";
import { loadConfig } from "../shared/config.js";
export class VisualRunner {
    repoRoot;
    log = createChildLogger("visual-runner");
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }
    async runOnce(url, name) {
        const cfg = loadConfig(this.repoRoot);
        const baselinePath = resolve(cfg.cvBaselineDir, `${name}.png`);
        const outputPath = resolve(cfg.cvOutputDir, `${name}.png`);
        const diffPath = resolve(cfg.cvOutputDir, `${name}.diff.png`);
        await mkdir(dirname(outputPath), { recursive: true });
        await mkdir(dirname(baselinePath), { recursive: true });
        let buffer;
        let browser;
        try {
            browser = await firefox.launch();
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: "networkidle" });
            buffer = await page.screenshot({ fullPage: true });
        }
        finally {
            if (browser) {
                try {
                    await browser.close();
                }
                catch { }
            }
        }
        await writeFile(outputPath, buffer);
        let diffPixels = 0;
        let width = 0;
        let height = 0;
        if (!existsSync(baselinePath)) {
            await writeFile(baselinePath, buffer);
            const png = PNG.sync.read(buffer);
            width = png.width;
            height = png.height;
        }
        else {
            const baselineBuf = await readFile(baselinePath);
            const baseline = PNG.sync.read(baselineBuf);
            const current = PNG.sync.read(buffer);
            width = Math.min(baseline.width, current.width);
            height = Math.min(baseline.height, current.height);
            const diff = new PNG({ width, height });
            diffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, { threshold: 0.1 });
            await writeFile(diffPath, PNG.sync.write(diff));
        }
        this.log.info({ url, diffPixels }, "Visual comparison complete");
        return { url, baselinePath, outputPath, diffPath, diffPixels, width, height };
    }
}
//# sourceMappingURL=visualRunner.js.map