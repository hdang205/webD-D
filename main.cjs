const { app, BrowserWindow } = require('electron')
const path = require('path')

// Tự động kích hoạt server Express chạy ngầm cho API (nếu dự án cần API gọi backend)
if (app.isPackaged) {
  try {
    require(path.join(__dirname, 'dist/server.cjs'));
  } catch (err) {
    console.error("Không thể khởi động server Express ngầm:", err);
  }
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Cửa Hàng Thời Trang D&D",
    autoHideMenuBar: true, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // ĐỌC TRỰC TIẾP FILE TĨNH (Bỏ qua localhost chặn trắng trang)
  win.loadFile(path.join(__dirname, 'dist/index.html'))

  // Mở công cụ kiểm tra lỗi (DevTools) ngầm để chúng ta xem tệp tin bị lỗi gì nếu vẫn trắng màn hình
  // win.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
