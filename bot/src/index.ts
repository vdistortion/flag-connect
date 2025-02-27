import { Telegraf } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { start } from './commands';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(TOKEN);

bot.command('start', start());

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== 'production' && development(bot);
