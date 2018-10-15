const _ = require('lodash')
const config = require('./config.json')
const usbDetect = require('usb-detection')
const fs = require('fs')
const path = require('path')
const Dropbox = require('dropbox').Dropbox
const fetch = require('node-fetch')
const dbx = new Dropbox({ accessToken: config.env.DROPBOX_ACCESS_TOKEN, fetch: fetch });

checkFoldersMounted = ({ folders }) => {
  let mounted = true
  folders.forEach(folder => {
    if (!fs.existsSync(path.join(config.mountPoint, folder))) mounted = false
  })

  return mounted
}

scanFolders = device => {
  device.folders.forEach(folder => {
    const currPath = path.join(config.mountPoint, folder)
    var activities = fs.readdirSync(path.join(config.mountPoint, folder));
    var files = _.filter(activities, fn => /^[^\.].+\.(fit|gpx|tcx)$/.test(fn))
    console.log(files)
    files.forEach(file => {
      fs.readFile(path.join(currPath, file), (err, contents) => {
        if (err) console.error(err)
        dbx.filesUpload({
          contents,
          path: `/${file}`,
          autorename: true
        }).then(data => {
          console.log(data)
        }, err => {
          console.error(err)
        })
      })
    })
    // dbx.filesUpload
  })
}

usbDetect.startMonitoring();
usbDetect.on('add', device => {
  console.log('change', device)

  let waitTimer
  const insertedDevice = _.find(config.devices, ['serialNumber', device.serialNumber])
  if (insertedDevice) {
    waitTimer = setInterval(() => {
      if (checkFoldersMounted(insertedDevice)) {
        console.log('all folders mounted')
        scanFolders(insertedDevice)
        clearInterval(waitTimer)
      }
    }, 500)
    console.log(insertedDevice)
  }
})
