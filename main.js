require("dotenv").config({ path: __dirname + "/.env" });
const puppeteer = require("puppeteer");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require(path.join(__dirname, "models/User"));
const Logs = require(path.join(__dirname, "models/Logs"));
const { app, BrowserWindow, Menu, ipcMain, remote, dialog, shell, session } = require("electron");
const config = require(path.join(__dirname, "./config/keys"));
const fs = require("fs");
const parse = require("csv-parse");
const parseSync = require("csv-parse/lib/sync");
const WindowsToaster = require("node-notifier").WindowsToaster;
const myFunc = require(path.join(__dirname, "./src/windowRenderer"));
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const stringify = require("csv-stringify");
const getmac = require("getmac");
const publicIp = require("public-ip");

//Enviroment
// process.env.NODE_ENV = "development";
process.env.NODE_ENV = "production";

let mainWindow, homeWindow, uploadWindow, importWindow, updateWindow, adminWindow;

let publicIPObj = {};

const db = process.env.NODE_ENV !== "development" ? config.mongoURI : config.localURI;

const csvFilePath = config.csvFilePath;
//const ip_address = config.ip_address;

//Send update status
function sendStatusToWindow(text) {
  //log.info(text);
  mainWindow.webContents.send("appUpdate", text);
}

//----------------------------------
// AUTO UPDATE
//----------------------------------
autoUpdater.on("checking-for-update", () => {
  updateWindow.webContents.send("msg-update", "Checking for update...");
});
autoUpdater.on("update-available", (info) => {
  updateWindow.webContents.send("msg-update", "Update available");
});
autoUpdater.on("update-not-available", (info) => {
  updateWindow.webContents.send("msg-update", "You are using the latest version");
  setTimeout(() => {
    createWindow();
    updateWindow.close();
  }, 1000);
});
autoUpdater.on("error", (err) => {
  updateWindow.webContents.send("msg-update", "Error in auto-updater. " + err);
});
autoUpdater.on("download-progress", (progressObj) => {
  updateWindow.webContents.send("msg-update", "Downloading update...");
  updateWindow.webContents.send("download-progress", Math.round(progressObj.percent));
});
autoUpdater.on("update-downloaded", (info) => {
  updateWindow.webContents.send("msg-update", "Update downloaded...Install in 3s");
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 3000);
});
// Create login window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  mainWindow.loadURL(path.join(__dirname, `./views/login.html#v${app.getVersion()}`));
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
  // Connect to MongoDB
  if (process.env.NODE_ENV !== "development") {
    connectDB(db);
  } else {
    setTimeout(() => {
      connectDB(db);
    }, 1000);
  }
  const ip_adds = (async () => {
    publicIPObj.ip = await publicIp.v4();
  })();
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

// Create home window
function createHomeWindow() {
  homeWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    resizable: false,
    darkTheme: true,
    title: "Society Upload Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  homeWindow.removeMenu();
  homeWindow.loadURL(path.join(__dirname, "./views/home.html"));
  homeWindow.on("close", function () {
    homeWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

// Create update window
function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 400,
    height: 150,
    resizable: false,
    darkTheme: true,
    title: "Society Upload Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  updateWindow.removeMenu();
  updateWindow.loadURL(path.join(__dirname, "./views/checkUpdate.html"));
  updateWindow.on("close", function () {
    updateWindow = null;
  });
}

// Create upload window
function createUploadWindow() {
  uploadWindow = new BrowserWindow({
    width: 1024,
    height: 900,
    resizable: false,
    darkTheme: true,
    title: "Society Upload Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  uploadWindow.removeMenu();
  uploadWindow.loadURL(path.join(__dirname, "./views/upload.html"));
  uploadWindow.on("close", function () {
    uploadWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

// Create import acc window
function createImportWindow() {
  importWindow = new BrowserWindow({
    width: 600,
    height: 400,
    resizable: false,
    darkTheme: true,
    title: "Society Upload Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  importWindow.removeMenu();
  importWindow.loadURL(path.join(__dirname, "./views/import.html"));
  importWindow.on("close", function () {
    importWindow = null;
  });
}

// Create admin
function createAdminWindow() {
  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    darkTheme: true,
    title: "Society Tools - Admin Panel",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  // adminWindow.webContents.openDevTools();
  adminWindow.removeMenu();
  adminWindow.loadFile("./views/admin.html");
  adminWindow.on("close", function () {
    adminWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

// Create edit user
function createEditUserWindow() {
  editUserWindow = new BrowserWindow({
    width: 500,
    height: 580,
    resizable: false,
    darkTheme: true,
    title: "Society Upload Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    parent: adminWindow,
  });
  editUserWindow.removeMenu();
  editUserWindow.loadFile("./views/edituser.html");
  editUserWindow.on("close", function () {
    editUserWindow = null;
  });
}

function connectDB(db) {
  mongoose
    .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      mainWindow.webContents.send("db", "connected");
      console.log("MongoDB Connected");
    })
    .catch((err) => {
      log.error(err);
      mainWindow.webContents.send("db", "failed");
    });
}

//----------------------------------
// On ready
//----------------------------------
if (process.env.NODE_ENV === "development") {
  app.on("ready", createWindow);
} else {
  app.on("ready", createUpdateWindow);
}

app.on("ready", function () {
  autoUpdater.checkForUpdatesAndNotify();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

//Auth user
ipcMain.on("auth-form", function (e, item) {
  username = item["username"];
  password = item["password"];
  User.findOne({
    username: username,
  }).then((user) => {
    if (!user) {
      mainWindow.webContents.send("msg-login", "user-failed");
      return;
    }
    // Match password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) log.error(err);
      if (isMatch) {
        // createHomeWindow();
        // mainWindow.close();
        // const publicIp = require("public-ip");
        // const ip_adds = (async () => {
        //   const ip = await publicIp.v4();
        //   var ipLogs = {
        //     user: user.name,
        //     ip_address: ip,
        //   };
        //   const newLogs = new Logs(ipLogs);
        //   await newLogs.save();
        // })();

        if (user.username == "hadeptrai") {
          createAdminWindow();
          mainWindow.close();
        } else {
          if (typeof user.mac != "undefined") {
            let userMac = user.mac.toUpperCase().replaceAll("-", ":");
            if (getmac.default().toUpperCase() == userMac) {
              if (typeof user.ip1 != "undefined" || typeof user.ip2 != "undefined") {
                if (publicIPObj.ip == user.ip1 || publicIPObj.ip == user.ip2) {
                  session.defaultSession.cookies.set({
                    url: "http://localhost",
                    name: user.name,
                  });
                  createHomeWindow();
                  mainWindow.close();
                } else {
                  mainWindow.webContents.send("msg-login", "wrong-ip");
                  return;
                }
              }
            } else {
              mainWindow.webContents.send("msg-login", "wrong-mac");
              return;
            }
          } else {
            mainWindow.webContents.send("msg-login", "wrong-mac");
            return;
          }
        }
      } else {
        mainWindow.webContents.send("msg-login", "pass-failed");
        return;
      }
    });
  });
});

var arrAcc = {};
// Handle select button click
ipcMain.on("select-clicked", function (e, arrItems) {
  createUploadWindow();
  arrAcc = arrItems;
});

ipcMain.on("import-clicked", function (e, item) {
  createImportWindow();
});

ipcMain.on("import-success", function (e, item) {
  importWindow.close();
  homeWindow.webContents.send("reload-acc-info", "reload");
});

// Handle upload button click
ipcMain.on("upload-clicked", function (e, arrItems) {
  try {
    mainProcess(arrAcc, arrItems);
  } catch (error) {
    log.error(error);
  }
  uploadWindow.close();
});

//Handle Sync All button click
ipcMain.on("sync-clicked", function (e, arrItems) {
  try {
    syncAll();
  } catch (error) {
    log.error(error);
  }
});

//Handle Open Account
ipcMain.on("open-account", function (e, data) {
  try {
    openAccount(data);
  } catch (error) {
    log.error(error);
  }
});

ipcMain.on("edit-user", function (e, userInfo) {
  createEditUserWindow();
  setTimeout(() => {
    editUserWindow.webContents.send("data", userInfo);
  }, 1000);
});

ipcMain.on("delete-user", function (e, username) {
  User.findOneAndDelete({
    username: username,
  }).then((user) => {
    if (!user) {
      return;
    }
    adminWindow.webContents.send("user-modified", "true");
  });
});

ipcMain.on("data-modified", function (e, data) {
  User.findOneAndUpdate(
    {
      username: data.username,
    },
    { $set: data },
    {
      useFindAndModify: false,
    }
  ).then((user) => {
    if (!user) {
      return;
    }
    adminWindow.webContents.send("user-modified", "true");
  });
});

ipcMain.on("logout", function (e, item) {
  createWindow();
  if (item == "logoutAdmin") {
    adminWindow.close();
  } else if (item == "logout") {
    homeWindow.close();
  }
});

//Read file function
// function readTagsFile(arrItems,arrTags) {
//   return new Promise((resolve, reject) => {
//     var tagNameVal = arrItems[1].split(',');
//     var nicheVal = tagNameVal[0];
//     var subNicheVal = tagNameVal[1];
//     var nicheIndex = 0;
//     var nextNicheIndex = 0;
//     fs.readFile(path.join(__dirname, './tags.csv'), 'utf8', function (error, data) {
//       if (error) return reject(error);
//       parse(data, {columns: false, trim: true}, function(err, rows) {
//         //debugger;
//         if (err) {
//             throw err;
//         }
//         for (let index = 1; index < rows.length; index++) {
//             const element = rows[index];
//             if (element[0].trim() == nicheVal) {
//                 nicheIndex = index;
//                 continue;
//             }
//             if (element[0] != '' && index > nicheIndex && nicheIndex != 0) {
//                 nextNicheIndex = index;
//                 break;
//             }
//         }
//         //debugger;
//         for (let i = nicheIndex; i < nextNicheIndex; i++) {
//             const element = rows[i];
//             if (element[1].trim() == subNicheVal) {
//                 arrTags.push(element[2].trim());
//                 break;
//             }
//         }
//       });
//       resolve(arrTags);
//     })
//   });

// }

//----------------------------------
// MAIN PROCESS
//----------------------------------
async function mainProcess(arrAcc, arrItems) {
  try {
    const accUsername = arrAcc[0];
    const accPassword = arrAcc[1];
    const proxyIP = arrAcc[2];
    const proxyUser = arrAcc[3];
    const proxyPass = arrAcc[4];
    const arrImgPath = arrItems[0];
    const wallArtList = [];

    // Read product
    const productPath =
      process.env.NODE_ENV === "development"
        ? "./data/product.csv"
        : path.join(process.resourcesPath, "data/product.csv");
    fs.readFile(productPath, function (err, data) {
      if (err) {
        log.error(err);
      }
      parse(data, { columns: false, trim: true }, function (err, rows) {
        let elements = rows[0];
        elements.forEach((element) => {
          wallArtList.push(element);
        });
      });
    });

    // Read tag
    var tagListArr = [];
    var arrTags = [];

    var tagNameVal = arrItems[1].split(",");
    var nicheVal = tagNameVal[0].trim();
    var subNicheVal = tagNameVal[1].trim();
    var nicheIndex = 0;
    var nextNicheIndex = 0;
    const tagsPath =
      process.env.NODE_ENV === "development"
        ? "./data/tags.csv"
        : path.join(process.resourcesPath, "data/tags.csv");
    fs.readFile(tagsPath, "utf-8", function (err, data) {
      if (err) {
        log.error(err);
      }
      data = data.trim();
      parse(data, { columns: false, trim: true }, function (err, rows) {
        if (err) {
          log.error(err);
        }
        for (let index = 1; index < rows.length; index++) {
          const element = rows[index];
          if (element[0].trim() == nicheVal) {
            nicheIndex = index;
            continue;
          }
          if (element[0] != "" && index > nicheIndex && nicheIndex != 0) {
            nextNicheIndex = index;
            break;
          }
        }
        if (nextNicheIndex == 0 && nicheIndex != 0) {
          for (let index = 1; index < rows.length; index++) {
            const element = rows[index];
            if (element[1].trim() == subNicheVal) {
              arrTags.push(element[2].trim());
              break;
            }
          }
        } else {
          for (let i = nicheIndex; i < nextNicheIndex; i++) {
            const element = rows[i];
            if (element[1].trim() == subNicheVal) {
              arrTags.push(element[2].trim());
              break;
            }
          }
        }
      });
    });

    setTimeout(() => {
      if (typeof arrTags[0] != "undefined") {
        tagListArr = arrTags[0].split(" ");
      } else {
        tagListArr = [];
      }
    }, 12000);

    const { browser, page } = await openBrowser(proxyIP);
    if (proxyUser.trim() != "" && proxyPass.trim() != "") {
      await page.authenticate({
        username: proxyUser,
        password: proxyPass,
      });
    }
    await page.setViewport({ width: 1500, height: 900 });
    await page.setDefaultNavigationTimeout(0);

    //Login
    await page.goto(`https://society6.com/login`, {
      waitUntil: "networkidle2",
    });
    await page.type("#email", accUsername);
    await page.type("#password", accPassword);
    await page.keyboard.press("Enter");
    await myFunc.timeOutFunc(1000);
    await page.waitForSelector("#mn-logout");
    await myFunc.timeOutFunc(1000);
    await homeWindow.webContents.send("logs", "Login success");
    await homeWindow.webContents.send("logs", `Acc: ${accUsername}`);
    //Process
    if (arrImgPath.length > 0) {
      for (let index = 0; index < arrImgPath.length; index++) {
        //Get filename
        const regexStr = /([^\\]+)(?=\.\w+$)/;
        let imgPath = arrImgPath[index];
        let imgName = imgPath.replace(/^.*[\\\/]/, "");
        let imgDirname = path.dirname(imgPath);
        let artTitle = imgPath
          .match(regexStr)[0]
          .replace(/-/g, " ")
          .replace(/[^a-zA-Z ]/g, "")
          .trim();
        let img = [];
        img.push(imgPath);
        let artTitleSplit = artTitle.split(" ");
        artTitleSplit.forEach((element) => {
          if (tagListArr != "") {
            tagListArr.splice(0, 0, element);
          } else {
            tagListArr.push(element);
          }
        });
        // Upload img
        await page.goto(`https://society6.com/artist-studio`);
        await myFunc.timeOutFunc(2000);
        await page.waitForFunction(() => {
          let modal = document.querySelector("#modal").children[0];
          if (typeof modal == "undefined") {
            return true;
          }
          modal.children[0].children[0].click();
          return true;
        });
        await myFunc.timeOutFunc(500);
        await page.click('[qa-id="new_artwork_button"]');
        await page.type('[qa-id="artworkTitle"]', artTitle);
        await myFunc.timeOutFunc(1000);
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser(),
          page.click('[qa-id="dropZone"]'),
        ]).catch((error) => {
          log.error(error);
        });

        await fileChooser.accept(img);
        // Wait for button continue to enable
        await page.waitForFunction(
          () => {
            let arrClassname = document.querySelector(`[qa-id="continue"]`).className.split(" ");
            var result = true;
            arrClassname.forEach((ele) => {
              if (ele.includes("Disabled")) {
                result = false;
              }
            });
            return result;
          },
          { timeout: 0 }
        );
        await homeWindow.webContents.send("logs", `Upload Successed: ${imgName}`);
        // Copyright
        await myFunc.timeOutFunc(500);
        await page.click('[qa-id="continue"]');
        await myFunc.timeOutFunc(500);
        await page.click('[qa-id="copyrightApproved"]');
        await myFunc.timeOutFunc(500);
        await page.click('[qa-id="matureContentFalse"]');
        await myFunc.timeOutFunc(1000);
        await Promise.all([
          page.click('[qa-id="continue"]'),
          page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]).catch((error) => {
          log.error(error);
        });
        await myFunc.timeOutFunc(5000);
        await page.click('[qa-id="categoryDropdown"]');

        // //find dropdown selection

        //choose Category
        const selectionID = await page.evaluate(() => {
          let arrDiv = document.querySelectorAll("[id^='react-select']");
          let idSelect = "";
          arrDiv.forEach((ele) => {
            if (ele.textContent == "painting") {
              idSelect = ele.id;
            }
          });
          return idSelect;
        });
        await page.click("#" + selectionID);

        //check Category
        // await page.waitForFunction(() => {
        //   var categoryDropdownId = document.querySelector('[qa-id="categoryDropdown"]');
        //   var result = false;
        //   if (categoryDropdownId.innerText == 'painting' ||
        //     categoryDropdownId.innerText == 'drawing' ||
        //     categoryDropdownId.innerText == 'collage' ||
        //     categoryDropdownId.innerText == 'photography' ||
        //     categoryDropdownId.innerText == 'graphic design') {
        //     result = true;
        //   }
        //   return result;
        // });

        // Fill Tags
        for (let index = 0; index < tagListArr.length; index++) {
          const element = tagListArr[index];
          await page.type("#search-creatives", element);
          await myFunc.timeOutFunc(100);
          await page.keyboard.press("Enter");
          await myFunc.timeOutFunc(200);
        }

        // Wall art type
        await myFunc.timeOutFunc(1000);
        const arrWallArt = await page.evaluate((wallArtList) => {
          var arrCardFooter = document.querySelectorAll("[class^='cardFooter']");
          arrCardFooter = [...arrCardFooter];
          var result = {};
          var arrResult = [];
          if (arrCardFooter !== "undefined") {
            for (let index = 0; index < wallArtList.length; index++) {
              const element = wallArtList[index];
              const found = arrCardFooter.find((v, i) => {
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
                if (arrResult[index] !== "undefined") {
                  if (arrResult[index].children[1].className.includes("enableSwitch")) {
                    setTimeout(() => {
                      arrResult[index].children[1].click();
                    }, 1000);
                  }
                }
              }
            }

            for (let index = 0; index < arrCardFooter.length; index++) {
              if (arrCardFooter[index] !== "undefined") {
                if (arrCardFooter[index].children[1].className.includes("disableSwitch")) {
                  arrCardFooter[index].children[1].click();
                }
              }
            }
          }
          result = {
            arrWallArt: arrResult,
          };
          return result;
        }, wallArtList);

        //remove checkmark
        await page.waitForFunction(() => {
          let invalidTag = document.querySelector('div[class^="tagInvalid"]');
          let result = false;
          if (invalidTag == null || invalidTag === "undefined") {
            result = true;
          } else {
            invalidTag.children[1].click();
          }
          return result;
        });

        // Save and Publish
        await page.click('[qa-id="save"]');
        await myFunc.timeOutFunc(2000);
        await page.click('[name="newsletterSignup"]');
        await myFunc.timeOutFunc(700);
        await page.click('button[class^="button_publishStatus"]');
        await myFunc.timeOutFunc(500);
        await page.waitForFunction(
          () => {
            let selector = document.querySelectorAll('span[class^="status"]');
            var result = false;
            if (selector[0].innerHTML == "published") {
              result = true;
            }
            return result;
          },
          { timeout: 0 }
        );
        await homeWindow.webContents.send("logs", "Product published");
        let newPath = path.join(imgDirname, "./done");
        if (!fs.existsSync(newPath)) {
          fs.mkdirSync(newPath);
          await homeWindow.webContents.send("logs", `Folder done created`);
        }
        fs.rename(imgPath, path.join(newPath, "./" + imgName), (err) => {
          if (err) {
            log.error(err);
          }
          homeWindow.webContents.send("logs", `Move ${imgName} to done folder`);
        });
        artTitleSplit.forEach((element) => {
          tagListArr.splice(0, 1);
        });
      }
    }
    //Notification
    const notifier = new WindowsToaster({
      withFallback: false,
    });
    notifier.notify(
      {
        appName: "so6-upload-tool",
        title: "Society6 Upload Tool",
        message: "Upload Completed!",
        sound: true,
      },
      function (err, response) {
        // Response is response from notification
        //console.log("responded...");
      }
    );
    await closeBrowser(browser).catch((error) => {
      log.error(error);
    });
  } catch (error) {
    log.error(error);
  }
}

// Open browser
async function openBrowser(proxy) {
  ip = proxy.split(":")[0];
  var port = "";
  typeof proxy.split(":")[1] == "undefined" ? (port = "4444") : (port = proxy.split(":")[1]);

  const chromePath =
    process.env.NODE_ENV === "development"
      ? puppeteer.executablePath()
      : path.join(
          process.resourcesPath,
          "app.asar.unpacked/node_modules/puppeteer/.local-chromium/win64-782078/chrome-win/chrome.exe"
        );
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    args: [`--proxy-server=http://${ip}:${port}`, "--window-size=1500,900"],
    //--disable-web-security
  });
  console.log("Browser opened");
  await homeWindow.webContents.send("logs", "Browser openned");
  const page = await browser.newPage();
  let item = { browser: browser, page: page };
  return item;
}

// Close browser
async function closeBrowser(browser) {
  await browser.close();
  await homeWindow.webContents.send("logs", "Browser closed");
  console.log(`Browser closed!`);
}

//----------------------------------
// SYNC ALL PROCESS
//----------------------------------
async function syncAll() {
  const infoPath =
    process.env.NODE_ENV === "development"
      ? "./data/info.csv"
      : path.join(process.resourcesPath, "data/info.csv");

  let accJSON = fs.readFileSync(infoPath, "utf-8");
  let listAcc = parseSync(accJSON, {
    columns: true,
    skip_empty_lines: true,
  });
  // let data = [];
  const dataPath =
    process.env.NODE_ENV === "development"
      ? "./data" + getFormattedTime() + ".csv"
      : path.join(process.resourcesPath, "data" + getFormattedTime() + ".csv");
  await homeWindow.webContents.send("logs", "Sync All Process");
  if (listAcc != "") {
    for (let index = 0; index < listAcc.length; index++) {
      let fileType = 0;
      if (index == 0) {
        fileType = 1;
      }
      const element = listAcc[index];
      const accUsername = element.Account;
      const accPassword = element.Password;
      const proxyIP = element.Proxy;
      const proxyUser = element.ProxyUsername;
      const proxyPass = element.ProxyPassword;
      const { browser, page } = await openBrowser(proxyIP).catch((error) => {
        log.error(error);
      });
      if (proxyUser.trim() != "" && proxyPass.trim() != "") {
        await page.authenticate({
          username: proxyUser,
          password: proxyPass,
        });
      }
      try {
        await page.goto(`https://society6.com/login`, {
          waitUntil: "networkidle2",
        });
      } catch (error) {
        let data = [];
        log.error(error);
        homeWindow.webContents.send("logs", `Acc: ${accUsername}`);
        homeWindow.webContents.send("logs", "Proxy Error");
        let pendingData = {};
        pendingData.username = accUsername;
        pendingData.qty = 0;
        pendingData.earnings = "$0";
        pendingData.accstatus = "Unknown";
        pendingData.proxystatus = "DIE";
        data.push(pendingData);
        writeFileCsv(dataPath, data, fileType);
        await myFunc.timeOutFunc(1000);
        await closeBrowser(browser);
        continue;
      }
      await page.type("#email", accUsername);
      await page.type("#password", accPassword);
      await page.keyboard.press("Enter");
      await myFunc.timeOutFunc(1000);
      let data = [];
      try {
        await page.waitForSelector("#mn-logout", { timeout: 15000 });
      } catch (err) {
        let data = [];
        log.error(err);
        await homeWindow.webContents.send("logs", "Login error: ACC DIE");
        await homeWindow.webContents.send("logs", `Acc: ${accUsername}`);
        let pendingData = {};
        pendingData.username = accUsername;
        pendingData.qty = 0;
        pendingData.earnings = "$0";
        pendingData.accstatus = "DIE";
        pendingData.proxystatus = "LIVE";
        data.push(pendingData);
        writeFileCsv(dataPath, data, fileType);
        await myFunc.timeOutFunc(1000);
        await closeBrowser(browser);
        continue;
      }
      await homeWindow.webContents.send("logs", "Login SUCCESS");
      await homeWindow.webContents.send("logs", `Acc: ${accUsername}`);

      await page.goto("https://society6.com/account/earnings/overview", {
        waitUntil: "networkidle2",
      });
      try {
        await page.waitForSelector(".earnings-table", { timeout: 10000 });
      } catch (err) {
        let data = [];
        log.error(err);
        await homeWindow.webContents.send("logs", "NO SALES");
        let pendingData = {};
        pendingData.username = accUsername;
        pendingData.qty = 0;
        pendingData.earnings = "$0";
        pendingData.accstatus = "LIVE";
        pendingData.proxystatus = "LIVE";
        data.push(pendingData);
        writeFileCsv(dataPath, data, fileType);
        await myFunc.timeOutFunc(1000);
        await closeBrowser(browser);
        continue;
      }
      let pendingData = await page.evaluate(() => {
        const titles = document.querySelectorAll("td a");
        let data = {};
        for (let i = 0; i < titles.length; i++) {
          if (titles[i].textContent == "Pending") {
            data.qty = titles[i].parentElement.parentElement.children[1].textContent;
            data.earnings = titles[i].parentElement.parentElement.children[2].textContent;
            break;
          } else {
            data.qty = 0;
            data.earnings = "$0";
          }
        }
        return data;
      });
      pendingData.username = accUsername;
      pendingData.accstatus = "LIVE";
      pendingData.proxystatus = "LIVE";
      data.push(pendingData);
      writeFileCsv(dataPath, data, fileType);
      await myFunc.timeOutFunc(1000);
      await closeBrowser(browser);
    }
    if (process.env.NODE_ENV === "development") {
      shell.openExternal(path.join(__dirname, dataPath));
    } else {
      shell.openExternal(dataPath);
    }
  }
  await homeWindow.webContents.send("logs", "Sync All Done");
}
function getFormattedTime() {
  var today = new Date();
  var y = today.getFullYear();
  var m = today.getMonth() + 1;
  var d = today.getDate();
  var h = today.getHours();
  var mi = today.getMinutes();
  return y + "" + m + "" + d + "" + h + "" + mi;
}

function writeFileCsv(path, data, type) {
  let columns = {
    username: "Account",
    qty: "Qty",
    earnings: "Earnings",
    accstatus: "Acc Status",
    proxystatus: "Proxy Status",
  };

  let input = [];
  input.push(data[0].username);
  input.push(data[0].qty);
  input.push(data[0].earnings);
  input.push(data[0].accstatus);
  input.push(data[0].proxystatus);
  let ipData = [];
  ipData.push(input);
  if (type == 1) {
    //Create file
    stringify(ipData, { header: true, columns: columns }, function (err, output) {
      fs.writeFile(path, output, function (err) {
        if (err) {
          throw err;
        }
      });
    });
  } else if (type == 0) {
    //Append file
    stringify(ipData, function (err, output) {
      fs.writeFile(path, output, { flag: "a" }, function (err) {
        if (err) {
          throw err;
        }
      });
    });
  }
}
//----------------------------------
// OPEN ACCOUNT PROCESS
//----------------------------------
async function openAccount(userInfo) {
  const accUsername = userInfo[0];
  const accPassword = userInfo[1];
  const proxyIP = userInfo[2];
  const proxyUser = userInfo[3];
  const proxyPass = userInfo[4];
  const { browser, page } = await openBrowser(proxyIP);
  if (proxyUser.trim() != "" && proxyPass.trim() != "") {
    await page.authenticate({
      username: proxyUser,
      password: proxyPass,
    });
  }
  // await page.setViewport({ width: 1500, height: 900 });
  await page.setDefaultNavigationTimeout(0);

  //Login
  await page.goto(`https://society6.com/login`, {
    waitUntil: "networkidle2",
  });
  await page.type("#email", accUsername);
  await page.type("#password", accPassword);
  await page.keyboard.press("Enter");
  await myFunc.timeOutFunc(1000);
  try {
    await page.waitForSelector("#mn-logout", { timeout: 15000 });
  } catch (error) {
    await homeWindow.webContents.send("logs", "Login error: ACC DIE");
    await homeWindow.webContents.send("logs", `Acc: ${accUsername}`);
    log.error(error);
    return;
  }
  await myFunc.timeOutFunc(1000);
  await homeWindow.webContents.send("logs", "Login success");
  await homeWindow.webContents.send("logs", `Acc: ${accUsername}`);
}
