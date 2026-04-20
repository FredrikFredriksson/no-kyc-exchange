import { execSync } from "child_process";
import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";

const STATIC_ROUTES = [
  "/perp",
  "/markets",
  "/portfolio",
  "/portfolio/positions",
  "/portfolio/orders",
  "/portfolio/fee",
  "/portfolio/api-key",
  "/portfolio/setting",
  "/leaderboard",
  "/rewards",
  "/rewards/affiliate",
  "/swap",
  "/points",
];

function loadConfigValue(key: string, fallback: string): string {
  try {
    const configPath = path.join(__dirname, "public/config.js");
    const configText = readFileSync(configPath, "utf-8");
    const match = configText.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
}

function loadBrokerName(): string {
  return loadConfigValue("VITE_ORDERLY_BROKER_NAME", "Orderly Network");
}

function loadSiteUrl(): string {
  return loadConfigValue("VITE_SEO_SITE_URL", "");
}

const ROUTE_TITLES: Record<string, string> = {
  "/perp": "Trade",
  "/markets": "Markets",
  "/portfolio": "Portfolio",
  "/portfolio/positions": "Positions",
  "/portfolio/orders": "Orders",
  "/portfolio/fee": "Fee",
  "/portfolio/api-key": "API Key",
  "/portfolio/setting": "Settings",
  "/leaderboard": "Leaderboard",
  "/rewards": "Rewards",
  "/rewards/affiliate": "Affiliate Rewards",
  "/swap": "Swap",
  "/points": "Points",
};

interface SymbolInfo {
  symbol: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    rows: SymbolInfo[];
  };
}

async function fetchSymbols(): Promise<string[]> {
  try {
    const response = await fetch("https://api.orderly.org/v1/public/info");
    const data = (await response.json()) as ApiResponse;
    return data.data.rows.map((row) => row.symbol);
  } catch (error) {
    console.error("Error fetching symbols:", error);
    return [];
  }
}

async function copyIndexToPath(
  indexPath: string,
  targetPath: string,
  title?: string,
  canonicalUrl?: string,
) {
  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    if (title || canonicalUrl) {
      let html = await fs.readFile(indexPath, "utf-8");
      if (title) {
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      }
      if (canonicalUrl) {
        html = html.replace(
          /<link rel="canonical" href="[^"]*" \/>/,
          `<link rel="canonical" href="${canonicalUrl}" />`,
        );
      }
      await fs.writeFile(targetPath, html);
    } else {
      await fs.copyFile(indexPath, targetPath);
    }
    console.log(`Created: ${targetPath}`);
  } catch (error) {
    console.error(`Error copying to ${targetPath}:`, error);
  }
}

async function clearDirectory(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    console.log(`Cleared directory: ${dir}`);
  } catch (error) {
    console.error(`Error clearing directory ${dir}:`, error);
  }
}

async function main() {
  const buildDir = "./build/client";

  // Get the base path from environment variable or default to '/'
  const basePath = process.env.PUBLIC_PATH || "/";
  console.log(`Using base path: ${basePath}`);

  // Step 1: Clear build directory
  console.log("Clearing build directory...");
  await clearDirectory(buildDir);

  // Step 2: Run the regular build
  console.log("\nRunning regular build...");
  execSync("yarn build", { stdio: "inherit" });

  const indexPath = path.join(buildDir, "index.html");

  // Step 3: Create HTML files for static routes with unique titles
  const brokerName = loadBrokerName();
  const siteUrl = loadSiteUrl();
  console.log(`\nCreating static route files (broker: ${brokerName})...`);
  for (const route of STATIC_ROUTES) {
    const targetPath = path.join(buildDir, route, "index.html");
    const routeLabel = ROUTE_TITLES[route];
    const pageTitle = routeLabel ? `${routeLabel} | ${brokerName}` : undefined;
    const canonicalUrl = siteUrl ? `${siteUrl}${route}` : undefined;
    await copyIndexToPath(indexPath, targetPath, pageTitle, canonicalUrl);
  }

  // Step 4: Fetch symbols and create perp route files
  console.log("\nFetching symbols and creating perp route files...");
  const symbols = await fetchSymbols();
  console.log(symbols);

  for (const symbol of symbols) {
    const targetPath = path.join(buildDir, "perp", symbol, "index.html");
    const readableSymbol = symbol
      .replace("PERP_", "")
      .replace("_USDC", "/USDC");
    const pageTitle = `${readableSymbol} | ${brokerName}`;
    const canonicalUrl = siteUrl ? `${siteUrl}/perp/${symbol}` : undefined;
    await copyIndexToPath(indexPath, targetPath, pageTitle, canonicalUrl);
  }

  // Step 5: Create 404.html for GitHub Pages fallback routing
  console.log("\nCreating 404.html for GitHub Pages fallback...");
  const fallbackPath = path.join(buildDir, "404.html");
  await copyIndexToPath(indexPath, fallbackPath);

  console.log("\nBuild completed successfully!");
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
