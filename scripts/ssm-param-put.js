/**
 * SSM parameter create script.
 *
 * Creates a SSM parameter.
 *
 * @example $ NODE_ENV=local node scripts/ssm-param-put.js
 */

const profiles = require('../configs/profiles');

process.env.AWS_PROFILE = profiles[process.env.NODE_ENV] || 'default';

const inquirer = require('inquirer');
const chalk = require('chalk');
const AWS = require('aws-sdk');
const ora = require('ora');

const package = require('../package.json');

(async () => {
  console.log(`\n${chalk.cyan.bold('Insert AWS Systems Manager Parameter Script')}\n`);
  console.log(`${chalk.bold('Group:   ')} ${package.group.title}`);

  await require('../utils/stage-select')(true); // Set proper stage ENV

  AWS.config.update({
    region: 'us-east-1',
    apiVersions: {
      ssm: '2014-11-06'
    }
  });

  const ssm = new AWS.SSM();

  try {
    const questions = [
      {
        name: 'Description',
        type: 'input',
        message: `Description ${chalk.reset.gray('(without group name)')}`,
        filter: val => val && `${package.group.title} ${val}.`,
        validate: val => val && val.length > package.group.title.length + 2
      },
      {
        name: 'Type',
        type: 'list',
        choices: ['String', 'SecureString', 'StringList'],
        default: 'String',
        message: 'Type'
      },
      {
        name: 'Name',
        type: 'input',
        message: `Name ${chalk.reset.gray('(without path)')}`,
        filter: name => `/${package.group.name}/${process.env.NODE_ENV}/${name}`
      },
      {
        name: 'Value',
        type: 'input',
        message: 'Value'
      },
      {
        name: 'Overwrite',
        type: 'confirm',
        message: 'Overwrite if exists?'
      },
      {
        name: 'confirm',
        type: 'confirm',
        message: 'Confirm values?'
      }
    ];

    const answers = await inquirer.prompt(questions);

    if (!answers.confirm) {
      console.log(chalk.bold.yellow('\nCanceled\n'));
      process.exit(1);
    }

    delete answers.confirm;

    const spinner = ora('Creating/updating parameter...').start();

    ssm.putParameter(answers, (err, data) => {
      if (err) {
        spinner.fail(err.message);
        process.exit(1);
      }

      if (data.Version > 1) {
        spinner.succeed(`Parameter updated to version ${data.Version}!`);
      } else {
        spinner.succeed(`Parameter created!`);
      }

      process.exit(0);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
