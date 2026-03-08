import fs from 'fs';
import path from 'path';

type BotConfig = {
  blocks: string[];
};

const DEFAULT_CONFIG: BotConfig = { blocks: [] };
const CONFIG_PATH = path.join(process.cwd(), 'config-bot.json');

function ensureConfigFile(): void {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

export function loadConfig(): BotConfig {
  ensureConfigFile();
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BotConfig>;
    return { blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [] };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: BotConfig): void {
  ensureConfigFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
