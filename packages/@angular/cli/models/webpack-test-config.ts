const webpackMerge = require('webpack-merge');

import { BuildOptions } from './build-options';
import { NgCliWebpackConfig } from './webpack-config';
import {
  getCommonConfig,
  getStylesConfig,
  getNonAotTestConfig,
  getTestConfig
} from './webpack-configs';

export interface WebpackTestOptions extends BuildOptions {
  codeCoverage?: boolean;
}
export class WebpackTestConfig extends NgCliWebpackConfig<WebpackTestOptions> {
  constructor(testOptions: WebpackTestOptions, appConfig: any) {
    super(testOptions, appConfig);
  }

  public buildConfig() {
    let customConfig = {};
    try {
      customConfig = require('../../../../webpack.config');
    } catch (error) {
      console.info('No custom webpack config specified.');
    }

    const webpackConfigs = [
      getCommonConfig(this.wco),
      getStylesConfig(this.wco),
      getNonAotTestConfig(this.wco),
      getTestConfig(this.wco),
      customConfig
    ];

    this.config = webpackMerge(webpackConfigs);

    return this.config;
  }
}
