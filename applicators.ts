import {readFile} from 'fs';
import {resolve} from 'path';
import * as marked from 'marked';
import * as less_module from 'less';
import * as postcss from 'postcss';
// @types/autoprefixer@6.7.3 is not compatible with postcss@6.0.15,
// but the preceding major versions of those packages (& their corresponding @types)
// work great together.
import * as autoprefixer from 'autoprefixer';

export interface TransformCallback {
  (error: Error, output?: Buffer): void;
}

/**
each export in this module should implement the Applicator type
*/
export interface Transform {
  (input: Buffer, options: any, callback: TransformCallback): void;
}

interface MarkdownOptions {
  gfm?: boolean; // default: true
  tables?: boolean; // default: true
  breaks?: boolean; // default: false
  pedantic?: boolean; // default: false
  sanitize?: boolean; // default: true
  smartLists?: boolean; // default: true
  smartypants?: boolean; // default: false
}

function markdown(input: Buffer, options: MarkdownOptions, callback: TransformCallback) {
  const input_string = input.toString('utf8');
  marked(input_string, options, (error: Error, output_string: string) => {
    if (error) return callback(error);
    const output = new Buffer(output_string, 'utf8');
    callback(null, output);
  });
}

interface WrapOptions {
  /** the path to the layout file */
  filepath: string;
  /** the pattern within the layout file to replace with the transformed file */
  replace: string;
  /** if set, resolve `filepath` relative to __dirname.
  Otherwise, resolve `filepath` relative to the current working directory. */
  __dirname: string;
}

function wrap(input: Buffer, options: WrapOptions, callback: TransformCallback) {
  const input_string = input.toString('utf8');
  const resolve_from = (options.__dirname !== undefined) ? options.__dirname : process.cwd();
  const filepath = resolve(resolve_from, options.filepath);
  readFile(filepath, {encoding: 'utf8'}, (error: Error, wrapper_contents?: string) => {
    if (error) return callback(error);
    const output_string = wrapper_contents.replace(options.replace, input_string);
    const output = new Buffer(output_string, 'utf8');
    callback(null, output);
  });
}

interface LessOptions {
  filename: any;
  plugins: any;
  rootFileInfo: any;
  // context options
  /** option - unmodified - paths to search for imports on */
  paths: string | string[];
  /** option - whether to adjust URL's to be relative */
  relativeUrls: boolean;
  /** option - rootpath to append to URL's */
  rootpath: string;
  /** option - ??? */
  strictImports: any;
  /** option - whether to allow imports from insecure ssl hosts */
  insecure: boolean;
  /** option - whether to dump line numbers */
  dumpLineNumbers: boolean;
  /** option - whether to compress */
  compress: boolean;
  /** option - whether to import synchronously */
  syncImport: boolean;
  /** option - whether to chunk input. more performant but causes parse issues. */
  chunkInput: any;
  /** browser only - mime type for sheet import */
  mime: any;
  /** browser only - whether to use the per file session cache */
  useFileCache: any;
  /** option & context - whether to process imports. if false then imports will
  not be imported. Used by the import manager to stop multiple import visitors being created. */
  processImports: boolean;
  /** Used to indicate that the contents are imported by reference */
  reference: any;
  /** Used as the plugin manager for the session */
  pluginManager: any;
}

function less(input: Buffer, options: LessOptions, callback: TransformCallback) {
  const input_string = input.toString('utf8');
  less_module.render(input_string, options, (less_error, less_output) => {
    if (less_error) {
      const error = new Error(less_error.message)
      Object.assign(error, less_error)
      return callback(error);
    }

    const output = new Buffer(less_output.css, 'utf8');
    callback(null, output);
  });
}

interface IdentityOptions { }

function identity(input: Buffer, options: IdentityOptions, callback: TransformCallback) {
  setImmediate(() => callback(null, input));
}

interface InterpolateOptions {
  /** the regular expression pattern to replace */
  pattern: string;
  /** the code to eval, the result of which will replace pattern */
  js: string;
}

function interpolate(input: Buffer, options: InterpolateOptions, callback: TransformCallback) {
  const regExp = new RegExp(options.pattern, 'g');
  const input_string = input.toString('utf8');
  setImmediate(() => {
    let output_string = input_string;
    try {
      const replacement = eval(options.js);
      output_string = input_string.replace(regExp, replacement);
    }
    catch (exc) {
      return callback(null, input);
    }
    const output = new Buffer(output_string, 'utf8');
    callback(null, output);
  });
}

interface AutoprefixOptions { }

function autoprefix(input: Buffer, options: AutoprefixOptions, callback: TransformCallback) {
  const input_string = input.toString('utf8');
  postcss([autoprefixer]).process(input_string).then(result => {
    result.warnings().forEach(warning => console.warn(warning.toString()));
    const output = new Buffer(result.css, 'utf8');
    callback(null, output);
  }, error => callback(error));
}


/**
extensions is a mapping from input extensions to output extensions, based on the
applied applicators.

const applicators: {[index: string]: Applicator} = ...
*/
const applicators = {
  markdown: {
    transform: markdown,
    extension: (ext: string) => '.html',
  },
  wrap: {
    transform: wrap,
    extension: (ext: string) => ext,
  },
  less: {
    transform: less,
    extension: (ext: string) => '.css',
  },
  identity: {
    transform: identity,
    extension: (ext: string) => ext,
  },
  interpolate: {
    transform: interpolate,
    extension: (ext: string) => ext,
  },
  autoprefix: {
    transform: autoprefix,
    extension: (ext: string) => ext,
  },
};

export default applicators;
