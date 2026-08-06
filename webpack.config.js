import { fileURLToPath } from 'url';
import { dirname, resolve as _resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: './src/chip8.ts',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.build.json',
          },
        },
        exclude: [/node_modules/, /\.spec\.ts$/, /example\.ts$/],
      },
    ],
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    alias: {
      '@': _resolve(__dirname, 'src'),
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'chip8.js',
    path: _resolve(__dirname, 'dist'),
    clean: true,
    library: {
      type: 'module',
    },
  },
  plugins: [
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap('CopyTypesPlugin', () => {
          mkdirSync(_resolve(__dirname, 'dist'), { recursive: true });
          copyFileSync(
            _resolve(__dirname, 'types/chippy.d.ts'),
            _resolve(__dirname, 'dist/chip8.d.ts')
          );
        });
      },
    },
  ],
};
