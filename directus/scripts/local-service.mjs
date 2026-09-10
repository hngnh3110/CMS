import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createConnection } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '../..');
const label = 'vn.gov.vtv.cms.local';
const domain = `gui/${process.getuid()}`;
const target = `${domain}/${label}`;
const url = 'http://localhost:8055/admin/vtv-cms';
const agentDir = resolve(homedir(), 'Library/LaunchAgents');
const plist = resolve(agentDir, `${label}.plist`);
const logs = resolve(root, '.runtime/logs');
const node = resolve(root, '.runtime/node22/bin/node');
const command = process.argv[2] || 'status';

const ctl = (...args) => spawnSync('/bin/launchctl', args, { encoding: 'utf8' });
const job = () => ctl('print', target);
const xml = (value) => value.replace(/[<>&"']/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[c]);
function checked(...args) {
  const result = ctl(...args);
  if (result.status !== 0) throw new Error(result.stderr?.trim() || result.error?.message || 'Lỗi dịch vụ macOS.');
}
async function health() {
  try {
    const response = await fetch('http://127.0.0.1:8055/server/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body.status === 'ok';
  } catch { return false; }
}
async function portOccupied() {
  return new Promise((done) => {
    const socket = createConnection({ host: '127.0.0.1', port: 8055 });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      done(value);
    };
    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}
function install() {
  for (const file of [node, resolve(root, '.env'), resolve(root, '.runtime/data.db'), resolve(root, '.runtime/directus/node_modules/directus/cli.js')]) {
    if (!existsSync(file)) throw new Error(`Thiếu tệp cần thiết: ${file}. Xem docs/HUONG_DAN_SU_DUNG.md.`);
  }
  mkdirSync(agentDir, { recursive: true });
  mkdirSync(logs, { recursive: true, mode: 0o700 });
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array>
    <string>${xml(node)}</string>
    <string>${xml(resolve(root, 'directus/scripts/run-local.mjs'))}</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(root)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Background</string>
  <key>Umask</key><integer>63</integer>
  <key>StandardOutPath</key><string>${xml(resolve(logs, 'cms.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(resolve(logs, 'cms-error.log'))}</string>
</dict></plist>
`;
  writeFileSync(plist, content, { mode: 0o600 });
}
function stop() {
  if (job().status === 0) checked('bootout', target);
}
async function start() {
  if (job().status !== 0) {
    if (await portOccupied()) throw new Error('Cổng 8055 đang được một tiến trình khác sử dụng. Không tự dừng tiến trình đó; hãy kiểm tra trước khi mở CMS.');
    install();
    checked('enable', target);
    checked('bootstrap', domain, plist);
  }
  process.stdout.write('Đang kiểm tra CMS');
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await health()) {
      console.log(`\nCMS đã sẵn sàng: ${url}`);
      console.log('Dịch vụ chạy nền và tự mở khi đăng nhập máy Mac. Có thể đóng cửa sổ này.');
      if (process.argv.includes('--open')) spawnSync('/usr/bin/open', [url]);
      return;
    }
    process.stdout.write('.');
    await delay(1000);
  }
  throw new Error(`CMS chưa sẵn sàng sau 45 giây. Xem nhật ký tại ${logs}.`);
}

try {
  if (process.platform !== 'darwin') throw new Error('Công cụ này dành cho macOS. Máy chủ khác dùng Docker Compose theo README.');
  if (command === 'stop') {
    stop();
    // Wait for the previous process group to release the port before reporting completion.
    for (let i = 0; i < 20 && await portOccupied(); i++) await delay(500);
    if (await portOccupied()) throw new Error('Đã yêu cầu dừng nhưng cổng 8055 vẫn đang được sử dụng. Xem nhật ký để kiểm tra.');
    console.log('CMS đã dừng. Bấm “Mo CMS.command” để mở lại. Dịch vụ cũng tự mở ở lần đăng nhập Mac tiếp theo.');
  } else if (command === 'start' || command === 'restart') {
    if (command === 'restart') {
      stop();
      for (let i = 0; i < 20 && await portOccupied(); i++) await delay(500);
    }
    await start();
  } else if (command === 'status') {
    const service = job();
    const ready = await health();
    console.log(`Dịch vụ nền: ${service.status === 0 ? 'đã nạp' : 'đã dừng'}`);
    console.log(`Cổng 8055: ${ready ? 'CMS phản hồi bình thường' : 'CMS chưa phản hồi'}`);
    console.log(`Địa chỉ: ${url}\nNhật ký: ${logs}`);
    process.exitCode = ready && service.status === 0 ? 0 : 1;
  } else throw new Error('Lệnh hợp lệ: start, stop, restart, status.');
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
