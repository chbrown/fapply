# fapply

Some files look fine alone, but could look better with a little bit of preprocessing.

For example, you have some Markdown documentation that should look nice when viewed on GitHub, but you also want to render a static site with custom styles and layout.

In the latter case, the files themselves should optionally specify the best way to preprocess them.

### extensions

The file extension determines how to parse the applicator format from the file header.

* `.html`: Should have a `<!-- [ { "apply": "layout", ... }, ... ] -->` as the very first line.
* `.md`: Same as `.html`.

In all cases, when the file is read through `fapply`, the applicator instructions line is stripped before processing.


### Built-in applicators

* `markdown`: Render markdown to html. `fapply` uses [`marked`](https://github.com/chjj/marked), and so the options offered are a subset of the options of `marked`:
  - `gfm`: Enable GitHub flavored markdown (default: `true`)
  - `tables`: Enable GFM tables, when `gfm: true` (default: `true`)
  - `breaks`: Enable GFM line breaks, when `gfm: true` (default: `true`)
  - `sanitize`: Sanitize the output by ignoring all raw HTML (default: `false`)
  - `smartLists`: Use smarter list behavior than the original markdown (default: `true`)
  - `smartypants`: Use "smart" typographic punctuation for things like quotes and dashes (default: `false`)
* `wrap`: Write another file, replacing all instances of the "replacement" in that file with this one.
  - `filepath`: The path, relative to the file, of the wrapper file (like an html layout) (required)
  - `replace`: The string in the wrapper file to replace with the contents of this file.


## Installation

    npm -g install fapply


## License

Copyright ©2014 Christopher Brown. [MIT Licensed](http://opensource.org/licenses/MIT).
