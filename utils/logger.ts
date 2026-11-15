type Level = 'debug' | 'info' | 'warn' | 'error';

const WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const COLOUR: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as Level;
  return WEIGHT[configured] ?? WEIGHT.info;
}

export class Logger {
  constructor(private readonly scope: string) {}

  private write(level: Level, message: string, meta?: unknown): void {
    if (WEIGHT[level] < threshold()) return;
    const time = new Date().toISOString().slice(11, 23);
    const tag = level.toUpperCase().padEnd(5);
    const suffix = meta === undefined ? '' : ` ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
    // eslint-disable-next-line no-console
    console.log(`${COLOUR[level]}${time} ${tag}${RESET} [${this.scope}] ${message}${suffix}`);
  }

  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta);
  }
  info(message: string, meta?: unknown): void {
    this.write('info', message, meta);
  }
  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta);
  }
  error(message: string, meta?: unknown): void {
    this.write('error', message, meta);
  }
}

export const createLogger = (scope: string): Logger => new Logger(scope);
