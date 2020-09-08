const puppeteer = require('puppeteer');
const path = require('path');
const mongoose = require('mongoose');

const {app, BrowserWindow} = require('electron')

let mainWindow;

// DB Config
const db = require(path.join(__dirname, './config/keys')).mongoURI;

// Connect to MongoDB
mongoose
  .connect(
    db,
    { useNewUrlParser: true ,useUnifiedTopology: true}
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Create window
function createWindow () {

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 750,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadURL(path.join(__dirname, './views/login.html'));
//  mainWindow.loadURL('https://vnahomes.com')  //ADD THIS
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('resize', function(e,x,y){
  mainWindow.setSize(x, y);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})