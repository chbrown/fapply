var fs_1 = require('fs');
var path_1 = require('path');
var marked = require('marked');
var less_module = require('less');
function markdown(input, options, callback) {
    var input_string = input.toString('utf8');
    marked(input_string, options, function (error, output_string) {
        if (error)
            return callback(error);
        var output = new Buffer(output_string, 'utf8');
        callback(null, output);
    });
}
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
function less(input, options, callback) {
    var input_string = input.toString('utf8');
    less_module.render(input_string, options, function (error, result) {
        if (error)
            return callback(error);
        var output = new Buffer(result.css, 'utf8');
        callback(null, output);
    });
}
function identity(input, options, callback) {
    setImmediate(function () { return callback(null, input); });
}
/**
extensions is a mapping from input extensions to output extensions, based on the
applied applicators.

const applicators: {[index: string]: Applicator} = ...
*/
var applicators = {
    markdown: {
        transform: markdown,
        extension: function (ext) { return '.html'; },
    },
    wrap: {
        transform: wrap,
        extension: function (ext) { return ext; },
    },
    less: {
        transform: less,
        extension: function (ext) { return '.css'; },
    },
    identity: {
        transform: identity,
        extension: function (ext) { return ext; },
    },
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = applicators;
