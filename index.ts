import {readFile, writeFile} from 'fs';
import {dirname} from 'path';
import {Transform, TransformOptions} from 'stream';
import {Logger} from 'loge';
import WalkStream, {FilesystemNode} from 'walk-stream';

import * as applicators from './applicators';

var mkdirp = require('mkdirp');
export const logger = new Logger(process.stderr);

function extend(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
}

interface ApplicatorInstruction {
  /** The applicator name, like "markdown" or "wrap" */
  apply: string;
  /** Other applicator-specific options */
  [index: string]: any;
}

/** returns a list of

I'm ignoring the extension and just grabbing whatever I can from the first line.
*/
function parseApplicatorInstructions(line: string): ApplicatorInstruction[] {
  var html_comment_match = line.match(/^<!--\s*(.+)\s*-->$/);
  if (html_comment_match) {
    return JSON.parse(html_comment_match[1]);
  }

  // otherwise, match a line starting with # or // or ---
  var common_comment_match = line.match(/^(?:#|\/\/|---)\s*(.+)\s*$/);
  if (common_comment_match) {
    return JSON.parse(common_comment_match[1]);
  }
}

interface GlobalTransformOptions {
  __dirname?: string;
}

/**
The global_options object will be passed along to all the applicators,
extending the options specified in each file's "applicator instructions"
options object. Most often, global_options will only contain a single
field: `__dirname`.
*/
export function transformString(input: string,
                                global_options: GlobalTransformOptions,
                                callback: (error: Error, result?: string) => void) {
  // TODO: maybe allow multiline applicator instructions?
  var first_linebreak_index = input.indexOf('\n');
  var first_line = input.slice(0, first_linebreak_index);

  var applicator_instructions = parseApplicatorInstructions(first_line);
  if (applicator_instructions === undefined) {
    // if we didn't find instructions, use the default of none,
    // meaning the file contents simply pass through
    applicator_instructions = [];
  }
  else {
    // if we did find instructions, slice them off
    input = input.slice(first_linebreak_index + 1);
  }

  /**
  loop() is a IIFE that simply provides the functionality of a sort of mutable
  version of async.waterfall.
  */
  (function loop() {
    if (applicator_instructions.length === 0) {
      // okay, we're done
      return callback(null, input);
    }

    var applicator_instruction = applicator_instructions.shift();
    var applicator_name = applicator_instruction.apply;
    delete applicator_instruction.apply;
    var applicator = applicators[applicator_name];

    var options = extend(applicator_instruction, global_options);
    logger.debug(`fapply:${applicator_name}(${JSON.stringify(options)})`);

    applicator(input, options, (error, output) => {
      if (error) return callback(error);
      input = output;
      loop();
    });
  })();
}

/**
Much like plain transformString(...), only transforms one document at a time,
but it handles reading and writing files at the given filepaths.
*/
export function transformFile(input_filepath: string,
                              output_filepath: string,
                              callback: (error?: Error) => void) {
  logger.debug('transformFile(%s -> %s)', input_filepath, output_filepath);
  readFile(input_filepath, {encoding: 'utf8'}, (error: Error, input: string) => {
    if (error) return callback(error);

    // changing the working directory to the same as the current file would
    // be easier than passing around a relative directory, but if the calling
    // script depends on process.cwd, it might get lost.
    var options = {__dirname: dirname(input_filepath)};

    transformString(input, options, (error: Error, output: string) => {
      if (error) return callback(error);

      writeFile(output_filepath, output, {encoding: 'utf8'}, callback);
    });
  });
}

/**
WalkStreamTransformer takes an input stream of FilesystemNode objects,
transforms each one, and writes a log line to its output.
*/
class WalkStreamTransformer extends Transform {
  constructor(private input_dirpath: string,
              private output_dirpath: string,
              options: TransformOptions = {objectMode: true}) {
    super(options);
  }
  _transform(node: FilesystemNode, encoding, callback) {
    var input_filepath = node.path;
    var output_filepath = input_filepath.replace(this.input_dirpath, this.output_dirpath);
    mkdirp.sync(dirname(output_filepath))

    if (node.stats.isFile()) {
      // only change filenames for .md and .html
      // TODO: parameterize this rename somehow
      if (input_filepath.match(/(.md|.html)$/)) {
        output_filepath = output_filepath.replace('.md', '.html');
      }
      transformFile(input_filepath, output_filepath, (error) => {
        callback(error, `${input_filepath} -> ${output_filepath}\n`);
      });
    }
    else {
      callback(null, `ignoring ${input_filepath}\n`);
    }
  }
}

export function transformDirectory(input_dirpath: string,
                                   output_dirpath: string,
                                   callback: (error?: Error) => void) {
  new WalkStream(input_dirpath)
  .pipe(new WalkStreamTransformer(input_dirpath, output_dirpath))
  .pipe(process.stderr);
}