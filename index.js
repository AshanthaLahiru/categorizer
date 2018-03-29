const yaml = require('js-yaml')
const commands = require('probot-commands')
const Configuration = require('./lib/configuration')

module.exports = (robot) => {
  robot.on('push', syncConfigurations)
  commands(robot, 'category', addCategory)
  robot.on(['issues.opened', 'pull_request.opened'], guideComment)

  async function syncConfigurations (context) {
    const config = await getConfiguration(context)

    const configurationsModified = context.payload.commits.find(commit => {
      return commit.added.includes('.github/categorizer.yml') ||
        commit.modified.includes('.github/categorizer.yml')
    })

    if (configurationsModified) {
      return new Configuration(context.github, context.repo(), config).sync()
    }
  }

  async function addCategory (context, command) {
    let asyncActivities = []

    const config = await getConfiguration(context)

    let subCategory = config.categories.find(category => {
      return category.keyword === command.arguments.split('-')[1]
    })

    asyncActivities.push(await context.github.issues.deleteComment(context.issue({id: context.payload.comment.id})))

    if (subCategory) {
      asyncActivities.push(await context.github.issues.addLabels(context.issue({labels: [subCategory.label.name]})))
    } else {
      let bodyMsg = 'There is no such a category :worried:, please use a following category. <br/><br/>'

      for (let x = 0; x < config.categories.length; x++) {
        bodyMsg = bodyMsg.concat('`/concat-' + config.categories[x].keyword + '-` : ' + config.categories[x].label.description + '<br/>')
      }

      asyncActivities.push(await context.github.issues.createComment(context.issue({body: bodyMsg})))
    }

    Promise.all(asyncActivities)
  }

  async function guideComment (context) {
    const config = await getConfiguration(context)

    let bodyMsg = 'It would be helpful if you can give a category from following categories for this issue. <br/><br/>'

    for (let x = 0; x < config.categories.length; x++) {
      bodyMsg = bodyMsg.concat('`/category-' + config.categories[x].keyword + '-` : ' + config.categories[x].label.description + '<br/>')
    }

    await context.github.issues.createComment(context.issue({body: bodyMsg}))
  }

  async function getConfiguration (context) {
    const content = await context.github.repos.getContent(context.repo({
      path: '.github/categorizer.yml'
    }))

    return yaml.safeLoad(Buffer.from(content.data.content, 'base64').toString())
  }
}
