# markdown-it-info
![GitHub License](https://img.shields.io/github/license/yusu79/markdown-it-info)
![npm](https://img.shields.io/npm/v/markdown-it-info)
![npm](https://img.shields.io/npm/dm/markdown-it-info)

The [markdown-it](https://l.pg1x.com/G6nd) plugin that enables easy creation of  [Qiita](https://qiita.com/) and [Zenn](https://zenn.dev/)-style admonition boxes within Markdown documents.

<!-- omit in toc -->
- [Setup](#setup)
- [Features](#features)
- [Quick Usage](#quick-usage)
- [Usage](#usage)
- [Options](#options)
- [Reference-Styles](#reference-styles)
- [Extension](#extension)
- [Acknowledgments](#acknowledgments)

## Setup
Install via npm:

```bash
npm install markdown-it-info
```

Use with markdown-it:

```js
const 
    md = require('markdown-it')(),
    plugin = require("markdown-it-info");

md.use(plugin);
```

## Features
markdown-it-info's key features include:

- Add admonition boxes with Syntax like [Qiita](https://qiita.com/) and [Zenn](https://zenn.dev/)
- Support multiple box types (e.g. info, warn, alert, question)
- Enable Markdown syntax within boxes (lists, emphasis, strikethrough, code spans, links, images, code blocks)
- Supports nesting of boxes within each other

These features enhance the readability and visual appeal of technical documents and blog posts.

## Quick Usage
| Style       | Input                                      | Render                                                                                                   | Description                                                                                                                                                                                   |
| ----------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qiita-style | ```:::note type title```<br>```content```<br>```:::```     | ```<div class="admonition 'type'">```<br>```<p class="admonition-title">'title'</p>```<br>```<p>'content'</p>```<br>```</div>```   | [Qiita](https://qiita.com/) style syntax.<br> Add `note` right after `:::` and close with `:::` to create a box.<br> If type and title are omitted, default values will be automatically inserted.  |
| Zenn-style  | ```:::message type title```<br>```content```<br>```:::``` | ```<div class="admonition 'type'">```<br>```<p class="admonition-title">'title'</p>```<br>```<p>'content'</p>```<br>```</div>```   | [Zenn](https://zenn.dev/) style syntax.<br>Add `message` right after `:::` and close with `:::` to create a box. <br>If type and title are omitted, default values will be automatically inserted. |


## Usage
This is a markdown-it plugin that allows you to create Admonition Boxes in Markdown document using Qiita and Zenn styles.

You can create boxes using the respective syntax of each platform, but please note that there's a slight difference in the Qiita style. In Qiita, the next line automatically becomes the title, whereas in this plugin, you need to write `:::note type title` on the same line.

A significant feature of this plugin is the ability to nest boxes. For example:

```md:
<!-- Markdown -->
:::note info
TEXT

:::note warn
TEXT
:::

:::
```
```html:
<!-- Rendered HTML -->
<div class="admonition info">
    <p class="admonition-title">Enter the title here</p>
    <p>TEXT</p>
    <div class="admonition warn">
        <p class="admonition-title">Enter the title here</p>
        <p>TEXT</p>
    </div>
</div>
```

When written like this, a warn-type box is created inside the first info-type box. This is useful when you want to express complex information.

Types and titles can be omitted, in which case default values will be used. It's also possible to omit only the type and write just the title.


## Options
There are three options.
```js:
md.use(plugin, {
    admonitionStyle: "default",
    defaultType: "info",
    defaultTitle: "Enter the title here"
});
```

- `admonitionStyle` is an option that allows you to change the class name. The default is "default", and you can also choose "qiita" or "zenn".
- `defaultType` is an option that allows you to change the default type of the box. The default is "info", and you can select from "warn", "warning", "alert", or "question".
- `defaultTitle` is an option that allows you to change the default title of the box. The default is set to "Enter the title here".


## Reference-Styles
markdown-it-info is a tool that can render `:::note` and similar syntax as `<div class="admonition info">`.

By itself, this only adds a class, so we have prepared the corresponding CSS for styling in `./reference-styles/`.

By changing the `admonitionStyle` option to "qiita" or "zenn", you can modify the class to `<div class="qiita-admonition info">` or `<div class="zenn-admonition info">`, respectively. Please use the appropriate CSS for each style.


## Extension
I have created a VSCode extension called "[yusu79/vscode-markdown-info](https://github.com/yusu79/vscode-markdown-info)" that allows you to actually use the CSS prepared in `./reference-styles/`.

By installing this extension and writing `:::note info` in your Markdown, the CSS will be applied in the Markdown preview window.

## Acknowledgments
In developing this project, we referenced the following open source software. We would like to express our gratitude:

- [qjebbs/vscode-markdown-extended](https://github.com/qjebbs/vscode-markdown-extended)
