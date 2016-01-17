// Copyright 2016 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/* global gapi */


import metadata from 'javascript-api-utils/lib/metadata';
import * as types from './types';
import segments from '../segments';


export function updateMetricsDimensionsAndSortOptions() {
  return async function(dispatch, getState) {
    let {params} = getState();
    let {account, property, view} = getState().viewData;
    let {metrics, dimensions} = await getMetricsAndDimensionsOptions(
        account, property, view);

    let sort = getSortOptions(params, metrics, dimensions);

    dispatch(updateSelect2Options({metrics, dimensions, sort}));
  }
}


export function updateSortOptions() {
  return async function(dispatch, getState) {
    let {params, select2Options: {metrics, dimensions}} = getState();
    let sort = getSortOptions(params, metrics, dimensions);

    dispatch(updateSelect2Options({sort}));
  }
}


export function updateSegmentsOptions() {
  return async function(dispatch, getState) {
    let {params, settings} = getState();
    let {useDefinition} = settings;
    let segments = await getSegmentsOptions(useDefinition);

    dispatch(updateSelect2Options({segments}));
  }
}


function updateSelect2Options(select2Options) {
  return {type: types.UPDATE_SELECT2_OPTIONS, select2Options};
}


function getMetricsAndDimensionsOptions(account, property, view) {
  return Promise.all([
    getMetrics(account, property, view),
    getDimensions(account, property, view)
  ])
  .then(function(data) {
    let metrics = data[0].map(function(metric) {
      return {
        id: metric.id,
        name: metric.attributes.uiName,
        group: metric.attributes.group
      };
    });
    let dimensions = data[1].map(function(dimension) {
      return {
        id: dimension.id,
        name: dimension.attributes.uiName,
        group: dimension.attributes.group
      };
    });
    return {metrics, dimensions};
  });
}


function getSortOptions(params, metrics, dimensions) {

  let sortOptions = [];
  let metsAndDims = [...metrics, ...dimensions];
  let chosenMetsAndDims = [
    ...(params.metrics && params.metrics.split(',') || []),
    ...(params.dimensions && params.dimensions.split(',') || [])
  ];

  for (let choice of chosenMetsAndDims) {
    for (let option of metsAndDims) {
      if (choice == option.id) {

        let descending = {...option};
        descending.name += ' (descending)';
        descending.text += ' (descending)';
        descending.id = '-' + choice;

        let ascending = {...option};
        ascending.name += ' (ascending)';
        ascending.text += ' (ascending)';
        ascending.id = choice;

        sortOptions.push(descending);
        sortOptions.push(ascending);
      }
    }
  }
  return sortOptions;
}


function getSegmentsOptions(useDefinition) {
  return segments.get().then(function(results) {
    let segments = results.map(function(segment) {
      return {
        id: useDefinition ? segment.definition : segment.segmentId,
        name: segment.name,
        group: segment.type == 'BUILT_IN' ? 'Built in Segment' : 'Custom Segment'
      }
    });

    // Remove the 'All Sessions' segment when using definitions.
    if (useDefinition) segments = segments.slice(1);

    return segments;
  });
}


/**
 * Returns a promise that is resolved with an array of all public metrics.
 * @return {goog.Promise}
 */
function getMetrics(account, property, view) {
  return metadata.getAuthenticated(account, property, view).then(
         (columns) => columns.allMetrics('public'));
}


/**
 * Returns a promise that is resolved with an array of all public dimensions.
 * @return {goog.Promise}
 */
function getDimensions(account, property, view) {
  return metadata.getAuthenticated(account, property, view).then(
         (columns) => columns.allDimensions('public'));
}


