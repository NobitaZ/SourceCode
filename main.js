const puppeteer = require('puppeteer');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require(path.join(__dirname, 'models/User'));
const Logs = require(path.join(__dirname, 'models/Logs'));
const http = require('http');
const {app, BrowserWindow, Menu, ipcMain} = require('electron')
const config = require(path.join(__dirname, './config/keys'));

//Enviroment
process.env.NODE_ENV = 'development';
//process.env.NODE_ENV = 'production';

let mainWindow;

// Config
const db = config.mongoURI;
const ip_address = config.ip_address;
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
    width: 1024,
    height: 800,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadURL(path.join(__dirname, './views/login.html'));
  mainWindow.on('closed', function () {
  mainWindow = null
  })
  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
};

app.on('ready', createWindow)
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

//Auth user
ipcMain.on('auth-form',function(e, item) {
  console.log(item);
  username = item['username'];
  password = item['password'];
  User.findOne({
    username: username
  }).then(user => {
    if (!user) {
      console.log('user incorrect')
      mainWindow.webContents.send('msg-login','user-failed');
      return;
    }
    // Match password
    bcrypt.compare(password, user.password, async (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        mainWindow.loadURL(path.join(__dirname, './views/home.html'));
        // const ses = mainWindow.webContents.session
        // console.log(ses)
        ipLogs = {
          ip_address: ip_address
        }
        console.log(ipLogs);
        const newLogs = new Logs(ipLogs);
        await newLogs.save();
      } else {
        console.log('pass incorrect')
        mainWindow.webContents.send('msg-login','pass-failed');
        return;
      }
    });
  });
});



//Timeout 
function PromiseTimeout(delayms) {
  return new Promise(function (resolve, reject) {
      setTimeout(resolve, delayms);
  });
}

// Create menu template
const mainMenuTemplate =  [
  // Each object is a dropdown
  {
    label: 'File',
    submenu:[
      {
        label: 'Quit',
        accelerator:process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click(){
          app.quit();
        }
      }
    ]
  }
];
// If OSX, add empty object to menu
if(process.platform == 'darwin'){
  mainMenuTemplate.unshift({});
}

// Add developer tools option if in dev
if(process.env.NODE_ENV !== 'production'){
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu:[
      {
        role: 'reload'
      },
      {
        label: 'Toggle DevTools',
        accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow){
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}