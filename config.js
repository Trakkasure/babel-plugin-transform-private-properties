import path from 'path';
import webpack from 'webpack';
import cssImporter from 'node-sass-css-importer';

const ENV = process.env.NODE_ENV || 'production';
var currentDir = __dirname;
var constants = {};
try {
  constants = require('./build_constants.js');
} catch (e) {}

constants.sassPath = path.resolve(currentDir, path.join("css","sass"));


const config = (ppVals,cssExtract)=>{
  const cssLoader = [require.resolve("style-loader"),require.resolve("css-loader")+"?importLoaders=1"+"!"+require.resolve("sass-loader")+"!preprocess?"+JSON.stringify({ppOptions:{type:'css'},...ppVals})];
  const cssLoaderSourceMaps = [require.resolve("style-loader"),require.resolve("css-loader")+"?importLoaders=1"+"!"+require.resolve("sass-loader")+"?sourceMap"+"!preprocess?"+JSON.stringify({ppOptions:{type:'css'},...ppVals})];
	const config = {
    target: 'web'
  , resolve: {
      extensions: ['', '.js', '.jsx'],
      alias: {
        'sinon': 'sinon/pkg/sinon'
      }
    }
  , sassLoader: {
      includePaths: [constants.sassPath]
    , importer: [cssImporter({import_paths: [path.resolve(currentDir, "css")]})]
    }
  , module: {
      noParse: [
        /sinon/
      ]
      , preLoaders: [
        {
          test: /\.(jsx?|es6)$/
        , exclude: /node_modules/
        , loader: "eslint-loader"
        , query: {
            parser: 'babel-eslint'
          , rules: {
              'semi': ["error", "always", { "omitLastInOneLineBlock": true}]
            , 'no-this-before-super': ['error']
            // , 'no-useless-constructor': ['error']
            , 'constructor-super': ['error']
            , 'no-class-assign': ['error']
            , 'no-const-assign': ['error']
            , 'no-dupe-class-members': ['error']
            , 'no-new-symbol': ['error']
            , 'no-duplicate-imports': ['error']
            , 'no-useless-computed-key': ['error']
            // , 'no-useless-rename': ['error']
            , 'prefer-const': ['error']
            , 'prefer-rest-params': ['error']
            , 'babel/no-await-in-loop': ['error']
            , 'babel/object-curly-spacing': ['error']
            // , 'babel/new-cap': ['error']
            , 'react/prefer-stateless-function': ['error']
            }
          , plugins: [
              'babel'
            // , 'react'
            // , 'jsx-control-statements'
            ]
          , extends: [
              "eslint:recommended"
            // , "plugin:react/recommended"
            // , 'plugin:jsx-control-statements/recommended'
            ]
          , parserOptions: {
              ecmaVersion: 7
            , sourceType: 'module'
            // , ecmaFeatures: {
            //     'jsx': true
            //   }
            // }
          }
        }
      ].concat(ENV==='production'?[]:[
        {
          test: /\.js$/
        , exclude: /node_modules/
        , loader: "source-map-loader"
        }
      , {
          test: /\.(jsx?|es6)?$/
        , exclude: /node_modules/
        , loader: 'source-map'
        }
      ])
    , loaders: [
        {
          test: /\.jsx?$/
        , exclude: /node_modules\/(?!\@react-component)/
        , loader: 'babel?'+JSON.stringify({
            presets: [
                'es2015','stage-1'
              // , 'react'
            ]
          , plugins: [
              ["transform-replace-object-assign", "simple-assign"]
            , "transform-dev-warning"
            , "add-module-exports"
            , "transform-decorators-legacy"
            // , "jsx-control-statements"
            ]
          })+'!preprocess?'+JSON.stringify({ppOptions:{type:'js'},...ppVals})
        }
      , { test: /\.json$/, loaders: ["json-loader"]}
      // , {
      //     test: /\.(s[ac]ss|css)$/
      //   , loader: ENV==='production'?(cssExtract?cssExtract.extract(...cssLoader)
      //                                           :cssLoader.join("!"))
      //             :(cssExtract?cssExtract.extract(...cssLoaderSourceMaps)
      //                                           :cssLoaderSourceMaps.join("!"))
      //   }
      // , {
      //     test: /\.(jpg|png|gif)$/
      //   , loader: require.resolve("file-loader") + "?name=images/[name].[ext]"
      //   }
      // , {
      //     test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/
      //   , loader: require.resolve("file-loader") + "?name=fonts/[name].[ext]"
      //   }
      // , {
      //     test: /\.woff\d?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      //     loader: require.resolve("url-loader") + '?limit=100000'
      //   }
      ]
    }
  , stats: { colors: true }
};
let options={};
if (constants.noSetState) {
    options['react/no-set-state'] = ['error'];
}
return config;
};

export {config,constants};
