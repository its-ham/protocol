const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { override, addWebpackPlugin } = require('customize-cra');

module.exports = {
  webpack: override(
    addWebpackPlugin(
      new CopyWebpackPlugin({
        patterns: [
          { from: path.resolve(__dirname, '../MANIFESTO.md'), to: 'public/' }
        ],
      })
    )
  )
};
