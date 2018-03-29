const yaml = require('js-yaml')
const commands = require('probot-commands')
const Configuration = require('./lib/configuration')

module.exports = (robot) => {
  robot.on('push', syncConfigurations)

  async function syncConfigurations(context) {

    const content = await context.github.repos.getContent(context.repo({
      path: '.github/categorizer.yml'
    }))
    const config = yaml.safeLoad(Buffer.from(content.data.content, 'base64').toString())

    context.log(config)

    const configurationsModified = context.payload.commits.find(commit => {
      return commit.added.includes('.github/categorizer.yml') ||
        commit.modified.includes('.github/categorizer.yml')
    })

    if (configurationsModified) {
      return new Configuration(context.github, context.repo(), config).sync()
    }
  }
}
