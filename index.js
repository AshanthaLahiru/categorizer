const commands = require('probot-commands')
const Core = require('./lib/core')

module.exports = (robot) => {
  robot.on('push', Core.syncConfigurations)
  commands(robot, 'cat', Core.addCategory)
  robot.on(['issues.opened', 'pull_request.opened'], Core.guideComment)
}
