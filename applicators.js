/*jslint node: true */
var fs = require('fs');
var path = require('path');
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

exports.markdown = function(input, options, callback) {
  marked(input, options, function(err, output) {
    if (err) return callback(err);
    callback(null, output);
  });
};

exports.wrap = function(input, options, callback) {
  /** If options.__dirname has been set, use it to relativize the wrapping filename's path.
  */
  var filepath = options.__dirname ? path.resolve(options.__dirname, options.filepath) : options.filepath;
  fs.readFile(filepath, {encoding: 'utf8'}, function(err, wrapper_contents) {
    if (err) return callback(err);
    var output = wrapper_contents.replace(options.replace, input);
    callback(null, output);
  });
};
