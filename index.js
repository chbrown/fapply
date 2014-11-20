/*jslint node: true */
var fs = require('fs');
var path = require('path');
var applicators = require('./applicators');

function getApplicatorInstructions(line, extension) {
  /** returns a list of { apply: "applicator name", ...opts } */
  if (extension == '.html' || extension == '.md') {
    var html_comment_match = line.match(/^<!--\s*(.+)\s*-->$/);
    return JSON.parse(html_comment_match[1]);
  }
  else {
    // otherwise, match a line starting with // or # or ---
    var common_comment_match = line.match(/^(#|\/\/|---)\s*(.+)\s*$/);
    return JSON.parse(common_comment_match[2]);
  }
}

// function(filepath: string, callback: (error: Error, result: string))
module.exports = function(filepath, callback) {
  var working_dirpath = path.dirname(filepath);
  var extension = path.extname(filepath); // returns the dot, too
  fs.readFile(filepath, {encoding: 'utf8'}, function(err, file_contents) {
    if (err) return callback(err);

    process.chdir(working_dirpath);

    // TODO: maybe allow multiline applicator instructions?
    var linebreak_match = file_contents.match(/\n/);
    var instructions_line = file_contents.slice(0, linebreak_match.index);

    var applicator_instructions = getApplicatorInstructions(instructions_line, extension);

    var input = file_contents.slice(linebreak_match.index + linebreak_match[0].length);

    (function loop() {
      var applicator_instruction = applicator_instructions.shift();
      if (applicator_instruction) {
        var applicator = applicators[applicator_instruction.apply];
        var options = applicator_instruction;
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
  });
};
