var fs = require('fs');
var path = require('path');
var marked = require('marked');
var logger = require('loge');

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

exports.markdown = function markdown(input, options, callback) {
  logger.debug('fapply:markdown');
  marked(input, options, function(err, output) {
    if (err) return callback(err);
    callback(null, output);
  });
};

/**
If options.__dirname is set, resolve the filename as relative to that path.
Otherwise, resolve
*/
exports.wrap = function wrap(input, options, callback) {
  var resolve_from_path = (options.__dirname !== undefined) ? options.__dirname : process.cwd();
  var filepath = path.resolve(resolve_from_path, options.filepath);
  logger.debug('fapply:wrap(filepath="%s")', filepath);
  fs.readFile(filepath, {encoding: 'utf8'}, function(err, wrapper_contents) {
    if (err) return callback(err);
    var output = wrapper_contents.replace(options.replace, input);
    callback(null, output);
  });
};
