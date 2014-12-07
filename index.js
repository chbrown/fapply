/*jslint node: true */
var fs = require('fs');
var path = require('path');
var applicators = require('./applicators');

function extend(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
}

function getApplicatorInstructions(line) {
  /** returns a list of { apply: "applicator name", ...opts }

  I'm ignoring the extension and just grabbing whatever I can from the first line.
  */
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

var fapply = module.exports = function(input, global_options, callback) {
  /** export function(input: string,
                      global_options: { __dirname?: string },
                      callback: (error: Error, result: string))

  The global_options object will be passed along to all the applicators,
  extending the options specified in each file's "applicator instructions"
  options object. Most often, global_options will only contain a single
  field: `__dirname`.
  */
  // TODO: maybe allow multiline applicator instructions?
  var first_linebreak_index = input.indexOf('\n');
  var first_line = input.slice(0, first_linebreak_index);

  var applicator_instructions = getApplicatorInstructions(first_line);
  if (applicator_instructions === undefined) {
    // if we didn't find instructions, use the default of none,
    // meaning the file contents simply pass through
    applicator_instructions = [];
  }
  else {
    // if we did find instructions, slice them off
    input = input.slice(first_linebreak_index + 1);
  }

  (function loop() {
    var applicator_instruction = applicator_instructions.shift();
    if (applicator_instruction) {
      var applicator = applicators[applicator_instruction.apply];

      var options = extend(applicator_instruction, global_options);
      delete options.apply;

      applicator(input, options, function(err, output) {
        if (err) return callback(err);
        input = output;
        loop();
      });
    }
    else {
      return callback(null, input);
    }
  })();
};

fapply.files = function(input_filepath, output_filepath, callback) {
  /** export function(input_filepath: string,
                      output_filepath: string,
                      callback: (error: Error, result: string))

  Like plain fapply(...), but handle reading and writing files by the given filepaths.
  */
  fs.readFile(input_filepath, {encoding: 'utf8'}, function(err, input) {
    if (err) return callback(err);

    // changing the working directory to the same as the current file would
    // be easier than passing around a relative directory, but if the calling
    // script depends on process.cwd, it might get lost.
    var options = {
      __dirname: path.dirname(input_filepath)
    };

    fapply(input, options, function(err, output) {
      if (err) return callback(err);

      fs.writeFile(output_filepath, output, {encoding: 'utf8'}, callback);
    });
  });
};
