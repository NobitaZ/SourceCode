const puppeteer = require('puppeteer');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require(path.join(__dirname, 'models/User'));
const Logs = require(path.join(__dirname, 'models/Logs'));
const {app, BrowserWindow, Menu, ipcMain} = require('electron');
const config = require(path.join(__dirname, './config/keys'));
const fs = require('fs');
//const $ = jQuery = require('jquery');
var parse = require('csv-parse');

//Enviroment
process.env.NODE_ENV = 'development';
//process.env.NODE_ENV = 'production';

let mainWindow,homeWindow;

// Config
const db = config.mongoURI;
const csvFilePath = config.csvFilePath;
//const ip_address = config.ip_address;

// Connect to MongoDB
mongoose
  .connect(
    db,
    { useNewUrlParser: true ,useUnifiedTopology: true}
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Create login window
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadURL(path.join(__dirname, './views/login.html'));
  mainWindow.on('closed', function () {
  mainWindow = null
  })
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);
};

// Create home window
function createHomeWindow(){
  homeWindow = new BrowserWindow({
    width: 1024,
    height:800,
    resizable: false,
    darkTheme: true,
    title:'Society Upload Tool',
    webPreferences: {
      nodeIntegration: true
    }
  });
  homeWindow.removeMenu();
  homeWindow.loadURL(path.join(__dirname, './views/home.html'));
  homeWindow.on('close', function(){
    homeWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);
}

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
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        createHomeWindow();
        mainWindow.close();
        mainProcess();
        // const publicIp = require('public-ip');
        // const ip_adds = (async () => {
        //     const ip =  await publicIp.v4();
        //     var ipLogs = {
        //       user: user.name,
        //       ip_address:ip
        //     }
            // const newLogs = new Logs(ipLogs);
            // await newLogs.save();
        // })();
        
      } else {
        console.log('pass incorrect')
        mainWindow.webContents.send('msg-login','pass-failed');
        return;
      }
    });
  });
});

// Handle upload button clicked
ipcMain.on('upload-clicked', function (e, arrItems) {
  console.log(arrItems);
})

//Main process function
function mainProcess(){
  
}

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