#!/usr/bin/env node
const webpack = require('webpack');
const configFactory = require('./webpack.config.js');

const isProd = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

const config = configFactory({ production: isProd });
const compiler = webpack(config);

if (isWatch) {
  compiler.watch({}, (err, stats) => {
    if (err) { console.error(err); return; }
    console.log(stats.toString({ colors: true, modules: false }));
  });
} else {
  compiler.run((err, stats) => {
    if (err) { console.error(err); process.exit(1); }
    console.log(stats.toString({ colors: true, modules: false }));
    if (stats.hasErrors()) process.exit(1);
    compiler.close(() => {});
  });
}
