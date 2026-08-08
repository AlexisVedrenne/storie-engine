const { defineCapacitorConfig } = require('@quasar/app-vite/capacitor')

// appId/appName here are just the scaffold defaults (@quasar/app-vite's own
// `quasar mode add capacitor` would normally prompt for these once, same
// shape as electron's static appId in ../quasar.config.js). Per-project
// values (game.js's productName etc.) aren't wired through here yet — same
// "not customized per export" gap electron's static appId already has.
module.exports = defineCapacitorConfig({
  appId: 'com.storieengine.game',
  appName: 'Storie Game',
})
