const path = require('path');

module.exports = (env = {}) => ({
  entry: './src/main.ts',
  output: {
    filename: 'chatbot.js',
    path: path.resolve(__dirname, '../../dist/apps/widget'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  mode: env.production ? 'production' : 'development',
  devtool: env.production ? false : 'source-map',
  optimization: {
    minimize: !!env.production,
  },
  context: path.resolve(__dirname),
});
