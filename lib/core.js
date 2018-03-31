const Configuration = require('./configuration')

module.exports = {
  async syncConfigurations (context) {
    const config = await Configuration.getConfiguration(context)

    const configurationsModified = context.payload.commits.find(commit => {
      return commit.added.includes('.github/categorizer.yml') ||
        commit.modified.includes('.github/categorizer.yml')
    })

    if (configurationsModified) {
      return new Configuration(context.github, context.repo(), config).sync()
    }
  },

  async addCategory (context, command) {
    let asyncActivities = []

    const config = await Configuration.getConfiguration(context)

    let subCategory = config.categories.find(category => {
      return category.keyword === command.arguments.split('-')[1]
    })

    asyncActivities.push(await context.github.issues.deleteComment(context.issue({ id: context.payload.comment.id })))

    if (subCategory) {
      asyncActivities.push(await context.github.issues.addLabels(context.issue({ labels: [subCategory.label.name] })))
    } else {
      
      let bodyMsg
      if (config.errorComment) {
        bodyMsg = config.errorComment + '<br/><br/>'
      } else {
        bodyMsg = 'There is no such a category :worried:, please use a following category. <br/><br/>'
      }

      for (let x = 0; x < config.categories.length; x++) {
        bodyMsg = bodyMsg.concat('- `/cat-' + config.categories[x].keyword + '-` : ' + config.categories[x].label.description + '<br/>')
      }

      asyncActivities.push(await context.github.issues.createComment(context.issue({ body: bodyMsg })))
    }

    Promise.all(asyncActivities)
  },

  async guideComment (context) {
    const config = await Configuration.getConfiguration(context)

    let eventType = context.event === 'issues' ? 'issue' : 'pull request'

    let bodyMsg
    if (config.guideComment) {
      bodyMsg = config.guideComment + '<br/><br/>'
    } else {
      bodyMsg = 'Hello there, it would be helpful if you can categorize this ' + eventType + ' under following categories . <br/><br/>'
    }

    for (let x = 0; x < config.categories.length; x++) {
      bodyMsg = bodyMsg.concat('- `/cat-' + config.categories[x].keyword + '-` : ' + config.categories[x].label.description + '<br/>')
    }

    await context.github.issues.createComment(context.issue({ body: bodyMsg }))
  }
}
