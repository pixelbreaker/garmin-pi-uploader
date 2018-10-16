const _ = require('lodash')
const config = require('./config.json')
const usbDetect = require('usb-detection')
const fs = require('fs')
const path = require('path')
const Dropbox = require('dropbox').Dropbox
const fetch = require('node-fetch')
const dbx = new Dropbox({ accessToken: config.env.DROPBOX_ACCESS_TOKEN, fetch: fetch })
const strava = require('strava-v3')
const totemize = require('totemize')

const totemConfig = {
  adjectives: ['succulent', 'moist', 'dreary', 'squelchy', 'dusty', 'shitty', 'cacky', 'slippery', 'skiddy', 'sketchy', 'wobbly'],
  nouns:      ['bush', 'ditch', 'track', 'glade', 'dell', 'singletrack', 'gravel'],
  separator:  ' '
}

_.extend(process.env, config.env);

checkFoldersMounted = ({ folders }) => {
  let mounted = true
  folders.forEach(folder => {
    if (!fs.existsSync(path.join(config.mountPoint, folder))) mounted = false
  })

  return mounted
}

dropboxUpload = (filePath, file) => {
  const contents = fs.readFileSync(filePath)

  return dbx.filesUpload({
    contents,
    path: `/${file}`,
    autorename: true
  })
}

stravaUpload = (file, cb) => {
  const ext = file.match(/(?!\.)([0-9a-z]){3}$/i)[0]
  return strava.uploads.post({
    data_type: ext,
    file: file,
    name: totemize(totemConfig)
    // statusCallback: (err, payload) => {
    //   if (err) console.error(err)
    // }
  }, cb)
}

scanFolders = device => {
  let folderCount = device.folders.length
  device.folders.forEach(folder => {
    const currPath = path.join(config.mountPoint, folder)
    const activities = fs.readdirSync(path.join(config.mountPoint, folder));
    const files = _.filter(activities, fn => /^[^\.].+\.(fit|gpx|tcx)$/.test(fn))
    let fileCount = files.length
    console.log(files)
    files.forEach(file => {
      const fullPath = path.join(currPath, file)
      stravaUpload(fullPath, (err, stravaPayload) => {
        if (err) console.error(err)

        // if (stravaPayload.activity_id !== null) { // Uploaded
        console.log(stravaPayload)
        dropboxUpload(fullPath, file).then(dropboxRes => {
          console.log(dropboxRes)
          if (--fileCount === 0) {
            if (--folderCount === 0) {
              console.log('All saved')
            }
          }
        }, err => console.error(err))
        // }
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
