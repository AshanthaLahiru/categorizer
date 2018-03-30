const yaml = require('js-yaml')

module.exports = class Configuration {
  constructor (github, repo, config) {
    this.github = github
    this.repo = repo
    this.config = config

    config.categories.forEach(category => {
      if (category.label.color) {
        category.label.color = String(category.label.color)
      }
    })
  }

  sync () {
    this.github.issues.getLabels(this.repo)
      .then(res => {
        let labels = res.data

        let syncActivities = []
        this.config.categories.forEach(category => {
          let existing = labels.find(label => {
            return this.comparator(label, category.label)
          })

          if (!existing) {
            syncActivities.push(this.add(category.label))
          } else if (this.changed(existing, category.label)) {
            syncActivities.push(this.update(existing, category.label))
          }

          return Promise.all(syncActivities)
        })
      })
  }

  static getConfiguration (context) {
    return context.github.repos.getContent(context.repo({
      path: '.github/categorizer.yml'
    }))
      .then(content => {
        return yaml.safeLoad(Buffer.from(content.data.content, 'base64').toString())
      })
  }

  comparator (existing, config) {
    return existing.name === config.name
  }

  changed (existing, config) {
    return existing.color !== config.color || existing.description !== config.description
  }

  update (existing, config) {
    config.oldname = config.oldname || config.name
    return this.github.issues.updateLabel(Object.assign({}, this.repo, config))
  }

  add (config) {
    return this.github.issues.createLabel(Object.assign({}, this.repo, config))
  }
}
