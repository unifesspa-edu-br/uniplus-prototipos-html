#!/usr/bin/env node
/**
 * start.js — sobe o servidor estático do protótipo e imprime um banner com
 * as URLs úteis para testar os diferentes modos. Funciona offline, sem
 * dependências NPM (usa python3 do sistema).
 *
 * Uso:
 *   npm start                  # porta 8765 default
 *   PORT=4000 npm start        # porta customizada
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const DEFAULT_PORT = 8765;
const requestedPort = Number(process.env.PORT) || DEFAULT_PORT;

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

/**
 * Tenta usar a porta solicitada; se ocupada, busca a próxima livre acima.
 */
async function findAvailablePort(start) {
  for (let p = start; p < start + 50; p++) {
    if (await isFree(p)) return p;
  }
  throw new Error(`Nenhuma porta livre entre ${start} e ${start + 50}`);
}

function isFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

function banner(port) {
  const base = `http://localhost:${port}`;
  const line = '═'.repeat(70);

  console.log('');
  console.log(`${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.cyan} 🎨  Protótipo Uni+ — Portal do Candidato (primeiro acesso)${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}`);
  console.log('');
  console.log(`${c.bold} Servidor:${c.reset} ${c.green}${base}${c.reset}`);
  console.log('');
  console.log(`${c.bold}${c.yellow} URLs úteis para testar:${c.reset}`);
  console.log('');
  console.log(`  ${c.bold}Bancada de inspeção${c.reset} (com toggles do Inspector)`);
  console.log(`  ${c.cyan}${base}/${c.reset}`);
  console.log('');
  console.log(`  ${c.bold}Modo demo limpo${c.reset} (sem Inspector — para apresentação)`);
  console.log(`  ${c.cyan}${base}/?clean=1${c.reset}`);
  console.log('');
  console.log(`${c.bold}${c.yellow} Cenários sugeridos:${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}1.${c.reset} Abra a URL principal e alterne ${c.bold}"Figma original" ↔ "Briefing aplicado"${c.reset}`);
  console.log(`     no Inspector — observe a mudança de tipografia, espaçamento e cinza`);
  console.log('');
  console.log(`  ${c.dim}2.${c.reset} Ative ${c.bold}"Alto contraste"${c.reset}, depois ${c.bold}"Tema escuro"${c.reset}, depois ${c.bold}"Fonte legível"${c.reset}`);
  console.log(`     na barra de Acessibilidade — combine entre si`);
  console.log('');
  console.log(`  ${c.dim}3.${c.reset} Abra o ${c.bold}DevTools (F12)${c.reset} → Toggle device toolbar (Ctrl+Shift+M)`);
  console.log(`     → escolha ${c.magenta}iPhone SE / Pixel 5${c.reset} → veja hamburger e popover de acessibilidade`);
  console.log('');
  console.log(`  ${c.dim}4.${c.reset} No mobile simulado: clique no ${c.bold}♿ Acessibilidade${c.reset} e no ${c.bold}☰${c.reset}`);
  console.log(`     → teste fechar com ${c.bold}Escape${c.reset} e clicando no backdrop`);
  console.log('');
  console.log(`${c.cyan}${line}${c.reset}`);
  console.log(`${c.dim} Ctrl+C para parar${c.reset}`);
  console.log('');
}

async function main() {
  const port = await findAvailablePort(requestedPort);

  if (port !== requestedPort) {
    console.log(`${c.yellow}⚠  Porta ${requestedPort} ocupada — usando ${port}${c.reset}`);
  }

  banner(port);

  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Filtra logs do python3 (mostra erros, ignora os 200 OK ruidosos)
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    text.split('\n').forEach((line) => {
      if (!line.trim()) return;
      if (line.includes('"GET ') && line.includes('200')) {
        // log silencioso
        return;
      }
      if (line.includes('404')) {
        console.log(`${c.yellow}  404${c.reset} ${line.split('"')[1] || ''}`);
        return;
      }
      console.log(`${c.dim}  ${line}${c.reset}`);
    });
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.log(`${c.dim}  ${text}${c.reset}`);
  });

  const shutdown = () => {
    console.log('');
    console.log(`${c.yellow}↓ Parando servidor…${c.reset}`);
    child.kill('SIGINT');
    setTimeout(() => process.exit(0), 200);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${c.yellow}Servidor encerrou com código ${code}${c.reset}`);
    }
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(`${c.yellow}Erro:${c.reset}`, err.message);
  process.exit(1);
});
