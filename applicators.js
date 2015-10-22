var fs_1 = require('fs');
var path_1 = require('path');
var marked = require('marked');
function markdown(input, options, callback) {
    var input_string = input.toString('utf8');
    marked(input_string, options, function (error, output_string) {
        if (error)
            return callback(error);
        var output = new Buffer(output_string, 'utf8');
        callback(null, output);
    });
}
exports.markdown = markdown;
function wrap(input, options, callback) {
    var input_string = input.toString('utf8');
    var resolve_from = (options.__dirname !== undefined) ? options.__dirname : process.cwd();
    var filepath = path_1.resolve(resolve_from, options.filepath);
    fs_1.readFile(filepath, { encoding: 'utf8' }, function (error, wrapper_contents) {
        if (error)
            return callback(error);
        var output_string = wrapper_contents.replace(options.replace, input_string);
        var output = new Buffer(output_string, 'utf8');
        callback(null, output);
    });
}
exports.wrap = wrap;
