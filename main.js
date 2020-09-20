const puppeteer = require('puppeteer');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require(path.join(__dirname, 'models/User'));
const Logs = require(path.join(__dirname, 'models/Logs'));
const {app, BrowserWindow, Menu, ipcMain, remote} = require('electron');
const config = require(path.join(__dirname, './config/keys'));
const fs = require('fs');
const myFunc = require(path.join(__dirname, './src/windowRenderer'));
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
      nodeIntegration: true,
      enableRemoteModule: true
    }
  })

  mainWindow.loadURL(path.join(__dirname, './views/login.html'));
  mainWindow.on('closed', function () {
  mainWindow = null
  })
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
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
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });
  homeWindow.removeMenu();
  homeWindow.loadURL(path.join(__dirname, './views/home.html'));
  homeWindow.on('close', function(){
    homeWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
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
  username = item['username'];
  password = item['password'];
  User.findOne({
    username: username
  }).then(user => {
    if (!user) {
      mainWindow.webContents.send('msg-login','user-failed');
      return;
    }
    // Match password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        createHomeWindow();
        mainWindow.close();
        //mainProcess();
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
        mainWindow.webContents.send('msg-login','pass-failed');
        return;
      }
    });
  });
});

var arrAcc = {}
// Handle select button click
ipcMain.on('select-clicked', function (e, arrItems) {
  homeWindow.loadURL(path.join(__dirname, './views/upload.html'));
  arrAcc = arrItems;
//console.log(app.getAppPath())
  console.log(arrAcc)
})

// Handle upload button click
ipcMain.on('upload-clicked', function(e, arrItems) {
  mainProcess(arrAcc,arrItems);
})

//Main process function
async function mainProcess(arrAcc, arrItems){
  const accUsername = arrAcc[0];
  const accPassword = arrAcc[1];
  const arrImgPath = arrItems[0];
  console.log(arrImgPath);
  var wallArtList = ['Framed Mini Art Print','Mini Art Print','Art Print'];
  const tagName = "BLEACH";//arrItems[1];
  var tagListStr = 'Bleach Manga Anime Cartoon Kid Room Hero Epic Japan Japanese Otaku Movie Book Character';
  const tagListArr = tagListStr.split(' ');
  const {page} =  await openBrowser();
  await page.setViewport({width: 1500, height: 768})
  await page.setDefaultNavigationTimeout(0);
  await page.goto(`https://society6.com/login`, {waitUntil: 'networkidle2'});
  await myFunc.timeOutFunc(1000);
  await page.type('#email',accUsername);
  await page.type('#password',accPassword);
  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]).catch((error) => {console.log(error)});;

  //Testing
  await page.goto(`https://society6.com/artist-studio/artwork/16948131`, {waitUntil: 'networkidle2'});
  await myFunc.timeOutFunc(1000);
  const arrWallArt = await page.evaluate((wallArtList) => {
    var arrCardFooter = document.querySelectorAll("[class^='cardFooter']");
    arrCardFooter = [...arrCardFooter];
    var result = {};
    var arrResult = [];
    if (arrCardFooter !== 'undefined') {
      for (let index = 0; index < wallArtList.length; index++) {
        const element = wallArtList[index];
        const found = arrCardFooter.find((v,i) => {
          if (v.textContent.includes(element)) {
            arrCardFooter.splice(i, 1);
            return true;
          }
          return false;
        });
        arrResult.push(found);
      }
      if (arrResult.length > 0) {
        for (let index = 0; index < arrResult.length; index++) {
          if (arrResult[index] !== 'undefined') {
            if (arrResult[index].children[1].className.includes('enableSwitch')) {
              arrResult[index].children[1].click();
            }
          }
        }
      }

      for (let index = 0; index < arrCardFooter.length; index++) {
        if (arrCardFooter[index] !== 'undefined') {
          if (arrCardFooter[index].children[1].className.includes('disableSwitch')) {
            arrCardFooter[index].children[1].click();
          }
        }
      }
    }
    result = {
      arrWallArt: arrResult
    }
    return result;
  }, wallArtList);
  // if (arrWallArt.length > 0) {
  //   for (let index = 0; index < arrWallArt.length; index++) {
  //     const element = arrWallArt[index];
      
  //   }
  // }
  

  /*
  await page.goto(`https://society6.com/artist-studio`);
  await myFunc.timeOutFunc(3000);
  await page.click('[qa-id="new_artwork_button"]');
  await page.type('[qa-id="artworkTitle"]',tagName);
  await myFunc.timeOutFunc(3000);
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('[qa-id="dropZone"]')
  ]).catch((error) => {console.log(error)});

  await fileChooser.accept(arrImgPath);
  await page.waitForFunction(() => {
    let arrClassname = document.querySelector(`[qa-id="b  continue"]`).className.split(' ');
    var result = true;
    arrClassname.forEach(ele => {
      if (ele.includes('Disabled')) {
        result = false;
      }
    });
    return result;
  }, {timeout: 0});
  await myFunc.timeOutFunc(500);
  await page.click('[qa-id="continue"]');
  await myFunc.timeOutFunc(500);
  await page.click('[qa-id="copyrightApproved"]');
  await myFunc.timeOutFunc(500);
  await page.click('[qa-id="matureContentFalse"]');
  await myFunc.timeOutFunc(1000);
  await Promise.all([
    page.click('[qa-id="continue"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]).catch((error) => {console.log(error)});
  await page.waitFor(5000);
  await page.click('[qa-id="categoryDropdown"]');
  
  //const selectionID = ''; 
  //find dropdown selection
  
  const selectionID = await page.evaluate(() => {
    let arrDiv = document.querySelectorAll("[id^='react-select']");
    let idSelect = '';
    arrDiv.forEach(ele => {
      if (ele.textContent == 'painting') {
        idSelect = ele.id;
      }
    })
    return idSelect;
  });

  await page.click('#' + selectionID);
  for (let index = 0; index < tagListArr.length; index++) {
    const element = tagListArr[index];
    await page.type('#search-creatives', element);
    await myFunc.timeOutFunc(100);
    await page.keyboard.press('Enter');
    await myFunc.timeOutFunc(100);
  }
  */

}

// Open browser
async function openBrowser() {
  const browser = await puppeteer.launch({
    executablePath:`${process.cwd()}\\chrome\\chrome.exe`, 
    headless: false,
    ignoreHTTPSErrors: true,
    args: [`--window-size=1500,768`]
  });
  console.log('Browser opened');
  await homeWindow.webContents.send('log','Browser openned');
  const page = await browser.newPage();
  let item = {browser: browser,page: page}
  return item;
}

// Close browser
async function closeBrowser(browser) {
  await browser.close();
  await mainWindow.webContents.send('log','Browser closed!');
  console.log(`Browser closed!`);
}