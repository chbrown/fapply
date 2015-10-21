import {readFile} from 'fs';
import {resolve} from 'path';
var marked = require('marked');

interface ApplicatorCallback {
  (error: Error, output?: string): void;
}

/**
each export in this module should implement the Applicator type
*/
interface Applicator {
  (input: string, options: any, callback: ApplicatorCallback): void;
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

export function markdown(input: string, options: MarkdownOptions, callback: ApplicatorCallback) {
  marked(input, options, (error: Error, output: string) => {
    if (error) return callback(error);

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

export function wrap(input: string, options: WrapOptions, callback: ApplicatorCallback) {
  var resolve_from = (options.__dirname !== undefined) ? options.__dirname : process.cwd();
  var filepath = resolve(resolve_from, options.filepath);
  readFile(filepath, {encoding: 'utf8'}, (error: Error, wrapper_contents?: string) => {
    if (error) return callback(error);
    var output = wrapper_contents.replace(options.replace, input);
    callback(null, output);
  });
}
