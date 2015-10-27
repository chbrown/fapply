var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fs_1 = require('fs');
var path_1 = require('path');
var stream_1 = require('stream');
var loge_1 = require('loge');
var walk_stream_1 = require('walk-stream');
var applicators_1 = require('./applicators');
var mkdirp = require('mkdirp');
exports.logger = new loge_1.Logger(process.stderr);
function extend(target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
}
/** returns a list of

I'm ignoring the extension and just grabbing whatever I can from the first line.
*/
function parseApplicatorInstructions(line) {
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
/**
The global_options object will be passed along to all the applicators,
extending the options specified in each file's "applicator instructions"
options object. Most often, global_options will only contain a single
field: `__dirname`.
*/
function transformBuffer(input, input_extension, global_options, callback) {
    // TODO: maybe allow multiline applicator instructions?
    var header_fragment = input.slice(0, 1024).toString('utf8');
    var first_linebreak_index = header_fragment.indexOf('\n');
    var first_line = header_fragment.slice(0, first_linebreak_index);
    var applicator_instructions = parseApplicatorInstructions(first_line);
    if (applicator_instructions === undefined) {
        // if we didn't find instructions, use the default of none,
        // meaning the file contents simply pass through
        applicator_instructions = [];
    }
    else {
        // if we did find instructions, slice them off
        var first_line_byteLength = Buffer.byteLength(first_line, 'utf8');
        input = input.slice(first_line_byteLength + 1);
    }
    /**
    loop() is a IIFE that simply provides the functionality of a sort of mutable
    version of async.waterfall.
    */
    (function loop() {
        if (applicator_instructions.length === 0) {
            // okay, we're done
            return callback(null, input, input_extension);
        }
        var applicator_instruction = applicator_instructions.shift();
        var applicator_name = applicator_instruction.apply;
        delete applicator_instruction.apply;
        var applicator = applicators_1.default[applicator_name];
        var options = extend(applicator_instruction, global_options);
        exports.logger.debug("fapply:" + applicator_name + "(" + JSON.stringify(options) + ")");
        if (applicator === undefined) {
            exports.logger.warning("Could not find applicator \"" + applicator_name + "\"; skipping");
            applicator = applicators_1.default.identity;
        }
        applicator.transform(input, options, function (error, output) {
            if (error)
                return callback(error);
            input = output;
            input_extension = applicator.extension(input_extension);
            loop();
        });
    })();
}
exports.transformBuffer = transformBuffer;
/**
Much like plain transformString(...), only transforms one document at a time,
but it handles reading and writing files at the given filepaths.
*/
function transformFile(input_filepath, output_filepath, callback) {
    fs_1.readFile(input_filepath, function (error, input) {
        if (error)
            return callback(error);
        // changing the working directory to the same as the current file would
        // be easier than passing around a relative directory, but if the calling
        // script depends on process.cwd, it might get lost.
        var options = { __dirname: path_1.dirname(input_filepath) };
        var input_extension = path_1.extname(input_filepath);
        transformBuffer(input, input_extension, options, function (error, output, output_extension) {
            if (error)
                return callback(error);
            output_filepath = output_filepath.replace(new RegExp(input_extension + '$'), output_extension);
            exports.logger.debug('transformFile(%s -> %s)', input_filepath, output_filepath);
            fs_1.writeFile(output_filepath, output, callback);
        });
    });
}
exports.transformFile = transformFile;
/**
WalkStreamTransformer takes an input stream of FilesystemNode objects,
transforms each one, and writes a log line to its output.
*/
var WalkStreamTransformer = (function (_super) {
    __extends(WalkStreamTransformer, _super);
    function WalkStreamTransformer(input_dirpath, output_dirpath, options) {
        if (options === void 0) { options = { objectMode: true }; }
        _super.call(this, options);
        this.input_dirpath = input_dirpath;
        this.output_dirpath = output_dirpath;
    }
    WalkStreamTransformer.prototype._transform = function (node, encoding, callback) {
        var input_filepath = node.path;
        var output_filepath = input_filepath.replace(this.input_dirpath, this.output_dirpath);
        mkdirp.sync(path_1.dirname(output_filepath));
        if (node.stats.isFile()) {
            transformFile(input_filepath, output_filepath, function (error) {
                callback(error, input_filepath + " -> " + output_filepath + "\n");
            });
        }
        else {
            callback(null, "ignoring " + input_filepath + "\n");
        }
    };
    return WalkStreamTransformer;
})(stream_1.Transform);
function transformDirectory(input_dirpath, output_dirpath, callback) {
    new walk_stream_1.default(input_dirpath)
        .pipe(new WalkStreamTransformer(input_dirpath, output_dirpath))
        .pipe(process.stderr);
}
exports.transformDirectory = transformDirectory;
