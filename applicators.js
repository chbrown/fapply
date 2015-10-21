var fs_1 = require('fs');
var path_1 = require('path');
var marked = require('marked');
function markdown(input, options, callback) {
    marked(input, options, function (error, output) {
        if (error)
            return callback(error);
        callback(null, output);
    });
}
exports.markdown = markdown;
function wrap(input, options, callback) {
    var resolve_from = (options.__dirname !== undefined) ? options.__dirname : process.cwd();
    var filepath = path_1.resolve(resolve_from, options.filepath);
    fs_1.readFile(filepath, { encoding: 'utf8' }, function (error, wrapper_contents) {
        if (error)
            return callback(error);
        var output = wrapper_contents.replace(options.replace, input);
        callback(null, output);
    });
}
exports.wrap = wrap;
