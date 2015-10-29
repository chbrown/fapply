import {readFile} from 'fs';
import {resolve} from 'path';
var marked = require('marked');
var less_module = require('less');
var autoprefixer = require('autoprefixer');
var postcss = require('postcss');

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
  var input_string = input.toString('utf8');
  marked(input_string, options, (error: Error, output_string: string) => {
    if (error) return callback(error);
    var output = new Buffer(output_string, 'utf8');
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
  var input_string = input.toString('utf8');
  var resolve_from = (options.__dirname !== undefined) ? options.__dirname : process.cwd();
  var filepath = resolve(resolve_from, options.filepath);
  readFile(filepath, {encoding: 'utf8'}, (error: Error, wrapper_contents?: string) => {
    if (error) return callback(error);
    var output_string = wrapper_contents.replace(options.replace, input_string);
    var output = new Buffer(output_string, 'utf8');
    callback(null, output);
  });
}

interface LessRenderResult {
  css: string;
  imports: any;
  map?: any;
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
  var input_string = input.toString('utf8');
  less_module.render(input_string, options, (error: Error, result: LessRenderResult) => {
    if (error) return callback(error);

    var output = new Buffer(result.css, 'utf8');
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
  var regExp = new RegExp(options.pattern, 'g');
  var input_string = input.toString('utf8');
  setImmediate(() => {
    var output_string = input_string;
    try {
      var replacement = eval(options.js);
      output_string = input_string.replace(regExp, replacement);
    }
    catch (exc) {
      return callback(null, input);
    }
    var output = new Buffer(output_string, 'utf8');
    callback(null, output);
  });
}

interface AutoprefixOptions { }

function autoprefix(input: Buffer, options: AutoprefixOptions, callback: TransformCallback) {
  var input_string = input.toString('utf8');
  postcss([autoprefixer]).process(input_string).then(result => {
    result.warnings().forEach(warning => console.warn(warning.toString()));
    var output = new Buffer(result.css, 'utf8');
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
