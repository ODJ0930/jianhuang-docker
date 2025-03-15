const { parentPort } = require('worker_threads');
const http = require('http');
const https = require('https');
const { URL } = require('url');

parentPort.on('message', ({ url, id }) => {
  try {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    let running = true;

    function download() {
      if (!running) return;
      const req = lib.get(url, (res) => {
        // 获取并上报远程IP信息
        const remoteIP = res.socket && res.socket.remoteAddress ? res.socket.remoteAddress : '';
        if (remoteIP) {
          parentPort.postMessage({ type: 'ip', ip: remoteIP });
        }
        res.on('data', (chunk) => {
          parentPort.postMessage({ type: 'progress', bytes: chunk.length });
        });
        res.on('end', () => {
          if (running) setImmediate(download);
        });
      });
      req.on('error', (err) => {
        console.error(`Worker ${id} 请求错误: ${err.message}`);
        if (running) setTimeout(download, 1000);
      });
    }

    // 启动下载循环
    download();

    // 监听停用信号
    parentPort.on('message', (msg) => {
      if (msg.type === 'stop') {
        running = false;
      }
    });
  } catch (error) {
    console.error(`Worker ${id} 初始化错误: ${error.message}`);
  }
});
