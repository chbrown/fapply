/*jslint node: true */
var fs = require('fs');
var marked = require('marked');

/**
each export in this module should be have the type:

    function(input: string, opts: Options, callback: (error: Error, output: string)

interface Options { }

interface MarkdownOptions extends Options {
  gfm?: boolean; // default: true
  tables?: boolean; // default: true
  breaks?: boolean; // default: false
  pedantic?: boolean; // default: false
  sanitize?: boolean; // default: true
  smartLists?: boolean; // default: true
  smartypants?: boolean; // default: false
}

interface WrapOptions extends Options {
  filepath: string;
  replace: string;
}
*/

exports.markdown = function(input, opts, callback) {
  marked(input, opts, function(err, output) {
    if (err) return callback(err);
    callback(null, output);
  });
};

exports.wrap = function(input, opts, callback) {
  // the working directory should already have been set by process.cwd
  fs.readFile(opts.filepath, {encoding: 'utf8'}, function(err, wrapper_contents) {
    if (err) return callback(err);
    var output = wrapper_contents.replace(opts.replace, input);
    callback(null, output);
  });
};
