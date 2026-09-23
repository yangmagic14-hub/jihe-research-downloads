const list = document.querySelector('#download-list');
const versionLabel = document.querySelector('#version');

const fallback = {
  version: '0.1.1',
  files: {
    windows: { label: 'Windows 10/11 x64', description: '便携版，下载后直接打开，无需安装 Node.js。', url: 'https://github.com/yangmagic14-hub/jihe-research-downloads/releases/latest/download/jihe-research-desktop-win-x64.exe' },
    macArm: { label: 'macOS Apple Silicon', description: 'M 系列芯片 DMG 安装包。', url: 'https://github.com/yangmagic14-hub/jihe-research-downloads/releases/latest/download/jihe-research-desktop-arm64.dmg' },
    macIntel: { label: 'macOS Intel', description: 'Intel 芯片 DMG 安装包。', url: 'https://github.com/yangmagic14-hub/jihe-research-downloads/releases/latest/download/jihe-research-desktop-x64.dmg' }
  }
};

function render(manifest) {
  const items = [manifest.files.windows, manifest.files.macArm, manifest.files.macIntel].filter(Boolean);
  list.innerHTML = `<div class="download-grid">${items.map((item) => `<article class="download-card"><h3>${item.label}</h3><p>${item.description || ''}</p><a class="${item.url ? '' : 'disabled'}" href="${item.url || '#'}" download>${item.url ? '下载' : '暂未发布'}</a></article>`).join('')}</div>`;
  versionLabel.textContent = manifest.version ? `当前版本：${manifest.version}` : '发布页已就绪；将安装包放入 downloads/ 后即可下载。';
}

fetch('assets.json', { cache: 'no-store' }).then((response) => response.ok ? response.json() : fallback).catch(() => fallback).then(render);
