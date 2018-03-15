// @ignoreDep typescript - used only for type information
import * as ts from 'typescript';
import { readTsconfig } from '../utilities/read-tsconfig';
import { requireProjectModule } from '../utilities/require-project-module';
const webpackMerge = require('webpack-merge');
import { CliConfig } from './config';
import { BuildOptions } from './build-options';
import {
  getBrowserConfig,
  getCommonConfig,
  getStylesConfig,
  getServerConfig,
  getNonAotConfig,
  getAotConfig
} from './webpack-configs';
import * as path from 'path';

export interface WebpackConfigOptions<T extends BuildOptions = BuildOptions> {
  projectRoot: string;
  buildOptions: T;
  appConfig: any;
  tsConfig: any;
  supportES2015: boolean;
}

export class NgCliWebpackConfig<T extends BuildOptions = BuildOptions> {
  public config: any;
  public wco: WebpackConfigOptions<T>;
  constructor(buildOptions: T, appConfig: any) {

    this.validateBuildOptions(buildOptions);

    const configPath = CliConfig.configFilePath();
    const projectRoot = path.dirname(configPath);

    appConfig = this.addAppConfigDefaults(appConfig);
    buildOptions = this.addTargetDefaults(buildOptions);
    buildOptions = this.mergeConfigs(buildOptions, appConfig, projectRoot);

    const tsconfigPath = path.resolve(projectRoot, appConfig.root, appConfig.tsconfig);
    const tsConfig = readTsconfig(tsconfigPath);

    const projectTs = requireProjectModule(projectRoot, 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
                        && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

    this.wco = { projectRoot, buildOptions, appConfig, tsConfig, supportES2015 };
  }

  public buildConfig() {
    let customConfig = {};
    try {
      customConfig = require('../../../../webpack.config');
    } catch (error) {
      console.info('No custom webpack config specified.');
    }

    const platformConfig = this.wco.appConfig.platform === 'server' ?
      getServerConfig(this.wco) : getBrowserConfig(this.wco);

    let webpackConfigs = [
      getCommonConfig(this.wco),
      platformConfig,
      getStylesConfig(this.wco),
      customConfig
    ];

    if (this.wco.appConfig.main || this.wco.appConfig.polyfills) {
      const typescriptConfigPartial = this.wco.buildOptions.aot
        ? getAotConfig(this.wco)
        : getNonAotConfig(this.wco);
      webpackConfigs.push(typescriptConfigPartial);
    }

    this.config = webpackMerge(webpackConfigs);
    return this.config;
  }

  // Validate build options
  public validateBuildOptions(buildOptions: BuildOptions) {
    buildOptions.target = buildOptions.target || 'development';
    if (buildOptions.target !== 'development' && buildOptions.target !== 'production') {
      throw new Error("Invalid build target. Only 'development' and 'production' are available.");
    }

    if (buildOptions.buildOptimizer
      && !(buildOptions.aot || buildOptions.target === 'production')) {
      throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
    }
  }

  // Fill in defaults for build targets
  public addTargetDefaults(buildOptions: T): T {
    const targetDefaults: { [target: string]: Partial<BuildOptions> } = {
      development: {
        environment: 'dev',
        outputHashing: 'media',
        sourcemaps: true,
        extractCss: false,
        namedChunks: true,
        aot: false,
        vendorChunk: true,
        buildOptimizer: false,
      },
      production: {
        environment: 'prod',
        outputHashing: 'all',
        sourcemaps: false,
        extractCss: true,
        namedChunks: false,
        aot: true,
        extractLicenses: true,
        vendorChunk: false,
        buildOptimizer: buildOptions.aot !== false,
      }
    };

    return Object.assign({}, targetDefaults[buildOptions.target], buildOptions);
  }

  // Fill in defaults from .angular-cli.json
  public mergeConfigs(buildOptions: T, appConfig: any, projectRoot: string): T {
    const mergeableOptions: Partial<BuildOptions> = {
      outputPath: path.resolve(projectRoot, appConfig.outDir),
      deployUrl: appConfig.deployUrl,
      baseHref: appConfig.baseHref
    };

    return Object.assign({}, mergeableOptions, buildOptions);
  }

  public addAppConfigDefaults(appConfig: any) {
    const appConfigDefaults: any = {
      testTsconfig: appConfig.tsconfig,
      scripts: [],
      styles: []
    };

    // can't use Object.assign here because appConfig has a lot of getters/setters
    for (let key of Object.keys(appConfigDefaults)) {
      appConfig[key] = appConfig[key] || appConfigDefaults[key];
    }

    return appConfig;
  }
}
