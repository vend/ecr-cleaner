'use strict';

var Promise = require('bluebird');
var lib = require('./lib');

// Lambda Handler
module.exports.handler = function(event, context) {

  // Check event for dry run, which prevents actual deletion
  // check logs to see what would have been deleted
  console.log(event);
  if(event.dryRun){
    process.env.DRY_RUN = true;
  } else {
    process.env.DRY_RUN = false;
  }

  if(!process.env.AWS_ACCOUNT_ID){
    console.warn('WARN: NO AWS_ACCOUNT_ID, defaulting to current account');
    process.env.AWS_ACCOUNT_ID = context.invoked_function_arn.split(':')[4];
  }

  if(!process.env.REPO_REGION){
    console.warn('WARN: NO REPO_REGION, defaulting to us-east-1');
    process.env.AWS_REGION = 'us-east-1';
  }

  if(!process.env.ECS_REGION){
    console.warn('WARN: NO ECS_REGION, defaulting to us-east-1');
    process.env.AWS_REGION = 'us-east-1';
  }

  if(!process.env.REPO_AGE_THRESHOLD){
    console.warn('WARN: NO REPO_AGE_THRESHOLD, defaulting to 90 days');
    process.env.AWS_REGION = 90;
  }

  if(!process.env.REPO_TO_CLEAN){
    console.error('WARN: NO REPO_TO_CLEAN, defaulting to us-east-1');
    return context.fail(new Error('Must set REPO_TO_CLEAN'));
  }

  var toClean = process.env.REPO_TO_CLEAN.split(',');

  Promise.map(toClean, function (repo) {
    return lib.getRepoImages({ repositoryName: repo })
      .then(lib.filterImagesByDateThreshold)
      .then(lib.filterOutActiveImages)
      .then(lib.deleteImages);
  })
    .then(function (results) {
      return context.succeed(results.reduce(lib.mergeResults));
    })
    .catch(context.fail);
};
