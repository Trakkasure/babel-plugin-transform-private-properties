import path from 'path';
import webpack from 'webpack';
import {config,constants} from './config.js';

const cssExtract = new ExtractTextPlugin('cybs-ui.css')

import pack from './package.json';

const ENV = process.env.NODE_ENV || 'production';

var ppVals = {pack,constants};

delete ppVals.pack.scripts;
delete ppVals.pack.peerDependencies;
delete ppVals.pack.devDependencies;
delete ppVals.pack.dependencies;
const baseConf = config(ppVals,cssExtract);
/* Remove noisy items from package. Only simple items should be passed to preprocessor during build */

console.log("Building with build constants: ",ppVals);

const localConfig = {
    entry: {
      'index': ['./index.js']
    }
  , output: {
      path: "./dist"
    , pathInfo: '.'
    , libraryTarget: 'umd'
    , umdNamedDefine: true
    , library: 'pprops'
    , filename: '[name].js'
    }
  , plugins: [
      // Make a simple definition so we can debug code.
      new webpack.DefinePlugin({
        '_isDevelopmentMode': ENV !== 'production'
      }),
      // Move common libraries into external file.
      // new webpack.optimize.CommonsChunkPlugin('vendor','common.js'),
      new webpack.NoErrorsPlugin(),
      new webpack.optimize.DedupePlugin(),
      cssExtract
    ].concat(!constants._isDevelopmentMode?[]:[
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          properties: true,
          sequences: true,
          dead_code: true,
          conditionals: true,
          comparisons: true,
          evaluate: true,
          booleans: true,
          unused: true,
          loops: true,
          hoist_funs: true,
          cascade: true,
          if_return: true,
          join_vars: true,
          //drop_console: true,
          drop_debugger: true,
          negate_iife: true,
          unsafe: true,
          hoist_vars: true,
          //side_effects: true
        },
        output: {
          comments: false
        }
        //sourceMap: true,
      })
    ])
  , devtool: ENV==='production' ? 'source-map' : 'inline-source-map'
  , devServer: {
      port: process.env.PORT || 8888,
      host: '0.0.0.0',
      colors: true,
      publicPath: '/',
      contentBase: '.',
      historyApiFallback: true,
      proxy: [
        // OPTIONAL: proxy configuration:
        // {
        //  path: '/optional-prefix/**',
        //  target: 'http://target-host.com',
        //  rewrite: req => { req.url = req.url.replace(/^\/[^\/]+\//, ''); }   // strip first path segment
        // }
      ]
    }
};

module.exports={...localConfig,...baseConf};
