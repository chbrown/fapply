var fs_1 = require('fs');
var path_1 = require('path');
var marked = require('marked');
var less_module = require('less');
var autoprefixer = require('autoprefixer');
var postcss = require('postcss');
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
function interpolate(input, options, callback) {
    var regExp = new RegExp(options.pattern, 'g');
    var input_string = input.toString('utf8');
    setImmediate(function () {
        var output_string = input_string;
        try {
            var replacement = eval(options.js);
            output_string = input_string.replace(regExp, replacement);
        }
        catch (exc) {
            return callback(null, input);
        }
        var output = new Buffer(output_string, 'utf8');
        callback(null, output);
    });
}
function autoprefix(input, options, callback) {
    var input_string = input.toString('utf8');
    postcss([autoprefixer]).process(input_string).then(function (result) {
        result.warnings().forEach(function (warning) { return console.warn(warning.toString()); });
        var output = new Buffer(result.css, 'utf8');
        callback(null, output);
    }, function (error) { return callback(error); });
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
    interpolate: {
        transform: interpolate,
        extension: function (ext) { return ext; },
    },
    autoprefix: {
        transform: autoprefix,
        extension: function (ext) { return ext; },
    },
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = applicators;
