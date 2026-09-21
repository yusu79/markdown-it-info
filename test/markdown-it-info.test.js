"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const MarkdownIt = require("markdown-it");
const markdownItInfo = require("../index");
const referenceStyleFiles = {
    default: "bordered-styles.css",
    qiita: "solid-styles.css",
    zenn: "pastel-styles.css"
};
const styleClassPrefixes = {
    default: "bordered",
    qiita: "solid",
    zenn: "pastel"
};

function render(source, options = {}, env = {}) {
    return new MarkdownIt().use(markdownItInfo, options).render(source, env);
}

function parse(source, options = {}, env = {}) {
    return new MarkdownIt().use(markdownItInfo, options).parse(source, env);
}

test("maps admonition content tokens to their document lines", () => {
    const tokens = parse([
        "# Before",
        "",
        ":::note info Title",
        "## Heading",
        "",
        "Paragraph",
        "",
        "- Item",
        ":::"
    ].join("\n"));
    const mappedTokens = tokens
        .filter(token => token.map && ["heading_open", "admonition_heading_open", "paragraph_open", "bullet_list_open"].includes(token.type))
        .map(token => [token.type, token.map]);

    assert.deepEqual(mappedTokens, [
        ["heading_open", [0, 1]],
        ["admonition_heading_open", [3, 4]],
        ["paragraph_open", [5, 6]],
        ["bullet_list_open", [7, 8]],
        ["paragraph_open", [7, 8]]
    ]);
});

test("maps nested admonition tokens to their document lines", () => {
    const tokens = parse([
        "# Before",
        "",
        ":::note info Outer",
        "Outer paragraph",
        "",
        ":::note question Inner",
        "## Inner heading",
        "",
        "Inner paragraph",
        ":::",
        ":::"
    ].join("\n"));
    const mappedTokens = tokens
        .filter(token => token.map && ["admonition_open", "heading_open", "admonition_heading_open", "paragraph_open"].includes(token.type))
        .map(token => [token.type, token.map]);

    assert.deepEqual(mappedTokens, [
        ["heading_open", [0, 1]],
        ["admonition_open", [2, 11]],
        ["paragraph_open", [3, 4]],
        ["admonition_open", [5, 10]],
        ["admonition_heading_open", [6, 7]],
        ["paragraph_open", [8, 9]]
    ]);
});

test("keeps admonition headings out of the document heading hierarchy", () => {
    const source = [
        "## Outside section",
        "",
        ":::note info",
        "## Inside level 2",
        "### Inside level 3",
        ":::",
        "",
        "### Outside child",
        "",
        "## Next outside section"
    ].join("\n");
    const tokens = parse(source);
    const documentHeadings = tokens
        .filter(token => token.type === "heading_open")
        .map(token => [token.tag, token.map]);
    const admonitionHeadings = tokens
        .filter(token => token.type === "admonition_heading_open")
        .map(token => [token.tag, token.attrGet("class"), token.map]);

    assert.deepEqual(documentHeadings, [
        ["h2", [0, 1]],
        ["h3", [7, 8]],
        ["h2", [9, 10]]
    ]);
    assert.deepEqual(admonitionHeadings, [
        ["div", "markdown-it-info-heading markdown-it-info-heading-level-2", [3, 4]],
        ["div", "markdown-it-info-heading markdown-it-info-heading-level-3", [4, 5]]
    ]);
});

test("renders all admonition heading levels as styled non-heading elements", () => {
    for (let level = 1; level <= 6; level++) {
        const source = `:::note info\n${"#".repeat(level)} Inside heading\n:::\n`;
        const referenceHtml = render(source);
        const embeddedHtml = render(source, { embedCss: true });

        assert.match(
            referenceHtml,
            new RegExp(`<div class="markdown-it-info-heading markdown-it-info-heading-level-${level}">Inside heading</div>`)
        );
        assert.doesNotMatch(referenceHtml, new RegExp(`<h${level}[ >]`));
        assert.match(
            embeddedHtml,
            new RegExp(`<div class="markdown-it-info-heading markdown-it-info-heading-level-${level}" style="[^"]*font-size:[^"]*font-weight:700[^"]*">Inside heading</div>`)
        );
        if (level <= 2) {
            assert.match(
                embeddedHtml,
                /padding-bottom:\.3em;border-bottom:1px solid var\(--vscode-editorWidget-border, rgba\(127, 127, 127, \.35\)\)/
            );
        } else {
            assert.doesNotMatch(embeddedHtml, /border-bottom:/);
        }
        assert.match(embeddedHtml, /markdown-it-info-titleless markdown-it-info-embedded/);
        assert.match(
            embeddedHtml,
            /class="markdown-it-info-icon"[^>]*top:\.925rem;left:1\.2rem/
        );
        assert.doesNotMatch(embeddedHtml, new RegExp(`<h${level}[ >]`));
    }
});

test("uses the body background when an embedded titleless box starts with a visual heading", () => {
    const html = render(
        ":::note info\n# Heading\nBody\n:::\n",
        {
            embedCss: true,
            colors: {
                background: "#112233",
                titleBackground: "#44ff44"
            }
        }
    );

    assert.match(
        html,
        /class="bordered-admonition info markdown-it-info-titleless markdown-it-info-embedded"[^>]*background-color:#112233/
    );
    assert.doesNotMatch(html, /background-color:#44ff44/);
    assert.match(html, /class="markdown-it-info-icon"[^>]*top:\.925rem;left:1\.2rem/);
});

test("uses the body background when an embedded titleless box starts with non-paragraph content", () => {
    const fence = "`".repeat(3);
    const sources = [
        `:::note info {css=true}\n${fence}js\nconst value = 1;\n${fence}\n:::\n`,
        ":::note info {css=true}\n> Quoted content\n:::\n"
    ];

    for (const source of sources) {
        const html = render(source, {
            colors: {
                background: "#112233",
                titleBackground: "#44ff44"
            }
        });

        assert.match(
            html,
            /class="bordered-admonition info markdown-it-info-titleless markdown-it-info-embedded"[^>]*background-color:#112233/
        );
    }
});

test("reference styles distinguish all visual admonition heading levels", () => {
    const fontSizes = ["1.5rem", "1.375rem", "1.25rem", "1.125rem", "1rem", ".875rem"];

    for (const style of ["default", "qiita", "zenn"]) {
        const css = fs.readFileSync(
            path.join(__dirname, "../reference-styles", referenceStyleFiles[style]),
            "utf8"
        );
        const classPrefix = styleClassPrefixes[style];

        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition .markdown-it-info-heading`)}\\s*\\{[^}]*font-weight:\\s*700;[^}]*line-height:\\s*2rem`, "s")
        );

        for (let level = 1; level <= 6; level++) {
            assert.match(
                css,
                new RegExp(`${escapeRegExp(`.${classPrefix}-admonition .markdown-it-info-heading-level-${level}`)}\\s*\\{[^}]*font-size:\\s*${escapeRegExp(fontSizes[level - 1])}`, "s")
            );
        }

        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition .markdown-it-info-heading-level-1`)}\\s*,\\s*${escapeRegExp(`.${classPrefix}-admonition .markdown-it-info-heading-level-2`)}\\s*\\{[^}]*padding-bottom:\\s*\\.3em;[^}]*border-bottom:\\s*1px solid var\\(--vscode-editorWidget-border, rgba\\(127, 127, 127, \\.35\\)\\)`, "s")
        );
        assert.doesNotMatch(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition .markdown-it-info-heading-level-3`)}\\s*\\{[^}]*border-bottom:`, "s")
        );
    }
});

test("uses the bordered class names when no style is specified", () => {
    const html = render(":::note info Title\nContent\n:::\n");

    assert.equal(
        html,
        '<div class="bordered-admonition info">\n<p class="bordered-admonition-title">Title</p>\n<p>Content</p>\n</div>\n'
    );
});

test("adds classes supplied as a space-separated string", () => {
    const html = render(
        ":::note info Title\nContent\n:::\n",
        { classes: "is-style-icon_info wp-block-paragraph" }
    );

    assert.match(
        html,
        /class="bordered-admonition info is-style-icon_info wp-block-paragraph"/
    );
});

test("adds unique classes supplied as an array", () => {
    const html = render(
        ":::note warn Title\nContent\n:::\n",
        { classes: ["custom-box", "custom-box", "wide box"] }
    );

    assert.match(html, /class="bordered-admonition warn custom-box wide box"/);
});

test("adds id and custom attributes with escaped values", () => {
    const html = render(
        ":::message question Title\nContent\n:::\n",
        {
            attributes: {
                id: "notice",
                role: "note",
                "data-source": "markdown",
                title: 'A "quoted" & labeled value'
            }
        }
    );

    assert.match(html, /id="notice"/);
    assert.match(html, /role="note"/);
    assert.match(html, /data-source="markdown"/);
    assert.match(html, /title="A &quot;quoted&quot; &amp; labeled value"/);
});

test("ignores class in attributes and invalid attribute names", () => {
    const html = render(
        ":::note alert Title\nContent\n:::\n",
        {
            classes: "valid-class",
            attributes: {
                class: "replacement-class",
                "invalid name": "value",
                "data-valid": "value"
            }
        }
    );

    assert.match(html, /class="bordered-admonition alert valid-class"/);
    assert.doesNotMatch(html, /replacement-class/);
    assert.doesNotMatch(html, /invalid name/);
    assert.match(html, /data-valid="value"/);
});

test("adds type-specific classes and overrides duplicate attributes in options", () => {
    const options = {
        classes: "common-class",
        attributes: {
            role: "note",
            "data-level": "common"
        },
        types: {
            info: {
                classes: "info-class",
                attributes: {
                    "data-level": "info",
                    "aria-label": "Information"
                }
            }
        }
    };

    const infoHtml = render(":::note info Title\nContent\n:::\n", options);
    const warnHtml = render(":::note warn Title\nContent\n:::\n", options);

    assert.match(infoHtml, /class="bordered-admonition info common-class info-class"/);
    assert.match(infoHtml, /role="note"/);
    assert.match(infoHtml, /data-level="info"/);
    assert.match(infoHtml, /aria-label="Information"/);

    assert.match(warnHtml, /class="bordered-admonition warn common-class"/);
    assert.match(warnHtml, /data-level="common"/);
});

test("reads common classes and attributes from env.frontmatter", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    classes: ["is-style-icon_info", "wp-block-paragraph"],
                    attributes: {
                        role: "note",
                        "data-source": "markdown"
                    }
                }
            }
        }
    };

    const html = render(":::note info Title\nContent\n:::\n", {}, env);

    assert.match(
        html,
        /class="bordered-admonition info is-style-icon_info wp-block-paragraph"/
    );
    assert.match(html, /role="note"/);
    assert.match(html, /data-source="markdown"/);
});

test("adds type-specific YAML classes and overrides duplicate attributes", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    classes: ["yaml-common"],
                    attributes: {
                        role: "note",
                        "data-level": "common"
                    },
                    info: {
                        classes: ["yaml-info"],
                        attributes: {
                            "data-level": "info",
                            "aria-label": "Information"
                        }
                    }
                }
            }
        }
    };

    const html = render(
        ":::note info Title\nContent\n:::\n",
        { classes: "option-class" },
        env
    );

    assert.match(html, /class="bordered-admonition info option-class yaml-common yaml-info"/);
    assert.match(html, /role="note"/);
    assert.match(html, /data-level="info"/);
    assert.match(html, /aria-label="Information"/);
});

test("adds shared and type-specific YAML classes for each note type", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    classes: "wp-block-paragraph",
                    info: { classes: "is-style-icon_info" },
                    warn: { classes: "is-style-icon_warn" }
                }
            }
        }
    };

    const infoHtml = render(":::note info Title\nContent\n:::\n", {}, env);
    const warnHtml = render(":::note warn Title\nContent\n:::\n", {}, env);

    assert.match(infoHtml, /class="bordered-admonition info wp-block-paragraph is-style-icon_info"/);
    assert.match(warnHtml, /class="bordered-admonition warn wp-block-paragraph is-style-icon_warn"/);
});

test("combines classes and attributes across options, YAML, and the opening line", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    classes: "shared yaml-common",
                    attributes: { id: "yaml-id", "data-level": "yaml", "data-source": "frontmatter" },
                    info: {
                        classes: "shared yaml-info",
                        attributes: { id: "yaml-info-id", "data-level": "yaml-info" }
                    }
                }
            }
        }
    };
    const html = render(
        ":::note info Title {.shared .block-class #block-id data-level=block}\nContent\n:::\n",
        {
            classes: "shared option-class",
            attributes: { id: "option-id", role: "note", "data-level": "option", class: "ignored" },
            types: {
                info: {
                    classes: "shared option-info",
                    attributes: { id: "option-info-id", "data-level": "option-info", "aria-label": "Info" }
                }
            }
        },
        env
    );

    assert.match(html, /class="bordered-admonition info shared option-class option-info yaml-common yaml-info block-class"/);
    assert.match(html, /id="block-id"/);
    assert.match(html, /role="note"/);
    assert.match(html, /data-source="frontmatter"/);
    assert.match(html, /aria-label="Info"/);
    assert.match(html, /data-level="block"/);
    assert.doesNotMatch(html, /ignored/);
});

test("parses block classes, id, and custom attributes with highest priority", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    classes: "yaml-class",
                    attributes: {
                        id: "yaml-id",
                        "data-level": "yaml"
                    }
                }
            }
        }
    };
    const html = render(
        ':::note info {.block-class #block-id data-level=block aria-label="Block label"}\nContent\n:::\n',
        {
            classes: "option-class",
            attributes: {
                id: "option-id",
                "data-level": "option"
            }
        },
        env
    );

    assert.match(
        html,
        /class="bordered-admonition info markdown-it-info-has-content-start option-class yaml-class block-class"/
    );
    assert.match(html, /id="block-id"/);
    assert.match(html, /data-level="block"/);
    assert.match(html, /aria-label="Block label"/);
    assert.match(html, /<p class="markdown-it-info-content-start">Content<\/p>/);
});

test("keeps an invalid trailing attribute block in the title", () => {
    const html = render(":::note info A {not-an-attribute}\nContent\n:::\n");

    assert.match(html, />A \{not-an-attribute\}<\/p>/);
});

test("keeps attribute-like text titleless while editing a titleless opening line", () => {
    for (const attributeDraft of ["{}", "{css}", "{tag}", "{css=}"]) {
        const html = render(`:::note info ${attributeDraft}\nContent\n:::\n`);
        const embeddedHtml = render(
            `:::note info ${attributeDraft}\nContent\n:::\n`,
            { embedCss: true }
        );

        assert.match(html, /class="bordered-admonition info markdown-it-info-has-content-start"/);
        assert.match(html, /<p class="markdown-it-info-content-start">Content<\/p>/);
        assert.doesNotMatch(html, /bordered-admonition-title/);
        assert.doesNotMatch(html, new RegExp(escapeRegExp(attributeDraft)));
        assert.match(embeddedHtml, /class="bordered-admonition info markdown-it-info-embedded"/);
        assert.match(embeddedHtml, /class="markdown-it-info-icon"/);
        assert.doesNotMatch(embeddedHtml, /bordered-admonition-title/);
        assert.doesNotMatch(embeddedHtml, new RegExp(escapeRegExp(attributeDraft)));
    }
});

test("uses the reserved css control without rendering it as an HTML attribute", () => {
    const html = render(":::note info Title {.box css=true}\nContent\n:::\n");

    assert.match(html, /class="bordered-admonition info markdown-it-info-embedded box"/);
    assert.doesNotMatch(html, /css="true"/);
    assert.match(html, /<span class="markdown-it-info-icon" aria-hidden="true"/);
});

test("omits the title by default without requiring an attribute block", () => {
    const html = render(":::note info\nContent\n:::\n");

    assert.match(html, /class="bordered-admonition info markdown-it-info-has-content-start"/);
    assert.match(html, /<p class="markdown-it-info-content-start">Content<\/p>/);
    assert.doesNotMatch(html, /bordered-admonition-title/);
});

test("uses a configured defaultTitle string with or without block attributes", () => {
    const options = { defaultTitle: "Configured title" };
    const plainHtml = render(":::note info\nContent\n:::\n", options);
    const attributedHtml = render(":::note info {.box}\nContent\n:::\n", options);

    assert.match(plainHtml, /<p class="bordered-admonition-title">Configured title<\/p>/);
    assert.match(attributedHtml, /class="bordered-admonition info box"/);
    assert.match(attributedHtml, /<p class="bordered-admonition-title">Configured title<\/p>/);
});

test("uses the first content paragraph as the visual title when the title is omitted", () => {
    const html = render(":::note info {.box}\nContent\n:::\n");

    assert.match(
        html,
        /class="bordered-admonition info markdown-it-info-has-content-start box"/
    );
    assert.match(
        html,
        /<p class="markdown-it-info-content-start">Content<\/p>/
    );
    assert.doesNotMatch(html, /markdown-it-info-icon/);
});

test("keeps an explicit title before an attribute block", () => {
    const html = render(":::note info Explicit title {.box}\nContent\n:::\n");

    assert.match(
        html,
        /<p class="bordered-admonition-title">Explicit title<\/p>/
    );
});

test("supports null defaultTitle in common and type-specific options", () => {
    const commonHtml = render(
        ":::note warn\nContent\n:::\n",
        { defaultTitle: null }
    );
    const typeHtml = render(
        ":::note info\nContent\n:::\n",
        {
            defaultTitle: "Common option title",
            types: {
                info: { defaultTitle: null }
            }
        }
    );
    const explicitHtml = render(
        ":::note info Explicit title\nContent\n:::\n",
        { defaultTitle: null }
    );

    assert.match(commonHtml, /<p class="markdown-it-info-content-start">Content<\/p>/);
    assert.match(typeHtml, /<p class="markdown-it-info-content-start">Content<\/p>/);
    assert.match(explicitHtml, />Explicit title<\/p>/);
});

test("resolves YAML defaultTitle from common to type-specific settings", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    defaultTitle: "Common YAML title",
                    info: {
                        defaultTitle: null
                    }
                }
            }
        }
    };

    const infoHtml = render(":::note info\nContent\n:::\n", {}, env);
    const warnHtml = render(":::note warn\nContent\n:::\n", {}, env);

    assert.match(infoHtml, /<p class="markdown-it-info-content-start">Content<\/p>/);
    assert.match(warnHtml, />Common YAML title<\/p>/);
});

test("reference styles keep a pseudo icon fallback for non-paragraph titleless content", () => {
    for (const style of ["default", "qiita", "zenn"]) {
        const css = fs.readFileSync(
            path.join(__dirname, "../reference-styles", referenceStyleFiles[style]),
            "utf8"
        );
        const classPrefix = styleClassPrefixes[style];
        const titlelessSelector = `.${classPrefix}-admonition.markdown-it-info-titleless`;

        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition.markdown-it-info-has-content-start`)}\\s*,\\s*${escapeRegExp(titlelessSelector)}\\s*\\{[^}]*padding-left:\\s*3\\.6rem`, "s")
        );
        assert.match(
            css,
            new RegExp(`${escapeRegExp(titlelessSelector)}:before\\s*\\{[^}]*top:\\s*0\\.65rem`, "s")
        );
        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition.info.markdown-it-info-titleless:before`)}\\s*\\{[^}]*color:`, "s")
        );
        assert.match(css, /--markdown-it-info-icon-color/);
        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition.markdown-it-info-titleless.markdown-it-info-embedded`)}:before,[^}]*content:\\s*none`, "s")
        );
    }
});

test("reference styles retain their original non-code body rules", () => {
    for (const style of ["default", "qiita", "zenn"]) {
        const css = fs.readFileSync(
            path.join(__dirname, "../reference-styles", referenceStyleFiles[style]),
            "utf8"
        );
        const classPrefix = styleClassPrefixes[style];

        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition>.${classPrefix}-admonition-title`)}\\s*\\{[^}]*font-weight:\\s*700`, "s")
        );
        assert.doesNotMatch(css, new RegExp(`${escapeRegExp(`.${classPrefix}-admonition code`)}\\s*\\{`));
        assert.doesNotMatch(css, new RegExp(`${escapeRegExp(`.${classPrefix}-admonition>.markdown-it-info-content-start`)}\\s*\\{`));
    }
});

test("reference and embedded styles use the same block content margins", () => {
    const fence = "`".repeat(3);

    for (const style of ["default", "qiita", "zenn"]) {
        const css = fs.readFileSync(
            path.join(__dirname, "../reference-styles", referenceStyleFiles[style]),
            "utf8"
        );
        const classPrefix = styleClassPrefixes[style];

        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition:not(.markdown-it-info-embedded) pre`)}\\s*\\{[^}]*margin:\\s*\\.8rem 0`, "s")
        );
        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.${classPrefix}-admonition:not(.markdown-it-info-embedded) blockquote`)}\\s*\\{[^}]*margin:\\s*\\.8rem 0`, "s")
        );

        for (const title of ["", " Title"]) {
            const codeHtml = render(
                `:::note info${title} {css=true}\n${fence}js\nconst value = 1;\n${fence}\n:::\n`,
                { style }
            );
            const quoteHtml = render(
                `:::note info${title} {css=true}\n> Quoted content\n:::\n`,
                { style }
            );

            assert.match(codeHtml, /<pre style="[^"]*margin:\.8rem 0/);
            assert.match(quoteHtml, /<blockquote style="[^"]*margin:\.8rem 0/);
        }
    }
});

test("default embedded code uses a dark backdrop without changing text color", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/bordered-styles.css"),
        "utf8"
    );
    const source = ":::note info Title\n`inline`\n\n```js\nconst value = 1;\n```\n:::\n";
    const embedded = render(source, { embedCss: true });
    const reference = render(source);
    const indented = render(":::note info Title {css=true}\n    const value = 1;\n:::\n");

    const referencePreStyle = css.match(/\.bordered-admonition:not\(\.markdown-it-info-embedded\) pre\s*\{([^}]*)\}/)[1];
    const referenceCodeStyle = css.match(/\.bordered-admonition:not\(\.markdown-it-info-embedded\) pre code\s*\{([^}]*)\}/)[1];
    assert.match(referencePreStyle, /background-color:\s*#202020 !important/);
    assert.match(referenceCodeStyle, /background-color:\s*transparent !important/);
    assert.doesNotMatch(referencePreStyle, /(?:^|;)\s*color\s*:/);
    assert.doesNotMatch(referenceCodeStyle, /(?:^|;)\s*color\s*:/);
    assert.match(embedded, /<pre style="[^"]*background-color:#202020/);
    assert.match(embedded, /<code[^>]*style="[^"]*background-color:transparent/);
    const preStyle = embedded.match(/<pre style="([^"]*)"/)[1];
    assert.doesNotMatch(preStyle, /(?:^|;)color:|mix-blend-mode:/);
    assert.doesNotMatch(embedded, /<code[^>]*style="[^"]*color:#000000/);
    assert.match(embedded, /<code style="[^"]*background-color:rgba\(127, 127, 127, \.14\)/);
    assert.doesNotMatch(reference, /<pre style=/);
    assert.match(indented, /<pre style="[^"]*background-color:#202020/);
});

test("default embedded code keeps syntax colors while overriding a highlighter background", () => {
    const md = new MarkdownIt({
        highlight() {
            return '<pre class="shiki" style="background-color:#111111;color:#eeeeee"><code><span style="color:#66D9EF">const</span></code></pre>';
        }
    }).use(markdownItInfo, { embedCss: true });
    const html = md.render(":::note info Title\n```js\nconst answer = 42;\n```\n:::\n");

    assert.match(html, /<pre class="shiki" style="background-color:#111111;color:#eeeeee;background-color:#202020/);
    assert.match(html, /<span style="color:#66D9EF">const<\/span>/);
});

test("pastel reference and embedded code use the default dark background without changing syntax colors", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/pastel-styles.css"),
        "utf8"
    );
    const html = render(
        ":::note info Title {css=true}\n```js\nconst value = 1;\n```\n:::\n",
        { style: "pastel" }
    );
    const indented = render(":::note info Title {css=true}\n    const value = 1;\n:::\n", { style: "pastel" });
    const highlighted = new MarkdownIt({
        highlight() {
            return '<pre class="shiki" style="background-color:#111111;color:#eeeeee"><code style="background-color:#111111"><span style="color:#66D9EF">const</span></code></pre>';
        }
    }).use(markdownItInfo, { style: "pastel", embedCss: true }).render(":::note info Title\n```js\nconst value = 1;\n```\n:::\n");

    assert.match(css, /\.pastel-admonition:not\(\.markdown-it-info-embedded\) pre\s*\{[^}]*background-color:\s*#202020 !important/s);
    assert.match(css, /\.pastel-admonition:not\(\.markdown-it-info-embedded\) pre code\s*\{[^}]*background-color:\s*transparent !important/s);
    assert.match(html, /<pre style="[^"]*background-color:#202020 !important/);
    assert.match(html, /<code[^>]*style="[^"]*background-color:transparent !important/);
    assert.match(indented, /<pre style="[^"]*background-color:#202020/);
    assert.match(highlighted, /<pre class="shiki" style="[^"]*background-color:#202020 !important;[^"]*background-color:#111111;color:#eeeeee/);
    assert.match(highlighted, /<code style="[^"]*background-color:transparent !important;[^"]*background-color:#111111/);
    assert.match(highlighted, /<span style="color:#66D9EF">const<\/span>/);
});

test("solid reference and embedded code use the default dark background without changing syntax colors", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/solid-styles.css"),
        "utf8"
    );
    const html = render(":::note info Title {css=true}\n```js\nconst value = 1;\n```\n:::\n", { style: "solid" });
    const indented = render(":::note info Title {css=true}\n    const value = 1;\n:::\n", { style: "solid" });
    const highlighted = new MarkdownIt({
        highlight() {
            return '<pre class="shiki" style="background-color:#111111;color:#eeeeee"><code style="background-color:#111111"><span style="color:#66D9EF">const</span></code></pre>';
        }
    }).use(markdownItInfo, { style: "solid", embedCss: true }).render(":::note info Title\n```js\nconst value = 1;\n```\n:::\n");

    assert.match(css, /\.solid-admonition:not\(\.markdown-it-info-embedded\) pre\s*\{[^}]*background-color:\s*#202020 !important/s);
    assert.match(css, /\.solid-admonition:not\(\.markdown-it-info-embedded\) pre code\s*\{[^}]*background-color:\s*transparent !important/s);
    assert.match(html, /<pre style="[^"]*background-color:#202020 !important/);
    assert.match(html, /<code[^>]*style="[^"]*background-color:transparent !important/);
    assert.match(indented, /<pre style="[^"]*background-color:#202020/);
    assert.match(highlighted, /<pre class="shiki" style="[^"]*background-color:#202020 !important;[^"]*background-color:#111111;color:#eeeeee/);
    assert.match(highlighted, /<code style="[^"]*background-color:transparent !important;[^"]*background-color:#111111/);
    assert.match(highlighted, /<span style="color:#66D9EF">const<\/span>/);
});

test("qiita reference style uses white text and accent-only blockquotes when CSS is not embedded", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/solid-styles.css"),
        "utf8"
    );

    assert.match(css, /\.solid-admonition:not\(\.markdown-it-info-embedded\)\s*\{[^}]*color:\s*#ffffff/s);
    assert.match(css, /\.solid-admonition:not\(\.markdown-it-info-embedded\) p\s*\{[^}]*color:\s*inherit/s);
    assert.match(css, /\.solid-admonition:not\(\.markdown-it-info-embedded\) blockquote\s*\{[^}]*border-left:\s*4px solid;[^}]*background-color:\s*transparent;[^}]*color:\s*inherit/s);
    for (const type of ["info", "alert", "question"]) {
        assert.match(
            css,
            new RegExp(`${escapeRegExp(`.solid-admonition.${type}:not(.markdown-it-info-embedded) blockquote`)}\\s*\\{[^}]*border-left-color:\\s*var\\(--markdown-it-info-icon-color`, "s")
        );
    }
    assert.match(css, /\.solid-admonition\.warn:not\(\.markdown-it-info-embedded\) blockquote,\s*\.solid-admonition\.warning:not\(\.markdown-it-info-embedded\) blockquote\s*\{[^}]*border-left-color:\s*var\(--markdown-it-info-icon-color/s);
});

test("pastel reference style uses transparent blockquotes with inherited text when CSS is not embedded", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/pastel-styles.css"),
        "utf8"
    );

    assert.match(css, /\.pastel-admonition:not\(\.markdown-it-info-embedded\) blockquote\s*\{[^}]*border-left:\s*4px solid rgba\(76, 73, 68, \.35\);[^}]*background-color:\s*transparent;[^}]*color:\s*inherit/s);
});

test("qiita question reference background matches the embedded background", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/solid-styles.css"),
        "utf8"
    );
    const embeddedHtml = render(":::note question Title {css=true}\nContent\n:::\n", { style: "solid" });

    assert.match(css, /\.solid-admonition\.info\s*\{[^}]*border-left:\s*\.4rem solid/s);
    assert.match(css, /\.solid-admonition\.question\s*\{[^}]*border-left:\s*\.4rem solid rgb\(36, 99, 181\);[^}]*background-color:\s*rgb\(36, 99, 181\)/s);
    assert.match(css, /\.solid-admonition\.question>\.solid-admonition-title\s*\{[^}]*background-color:\s*rgb\(36, 99, 181\)/s);
    assert.match(embeddedHtml, /class="solid-admonition question markdown-it-info-embedded"[^>]*background-color:rgb\(36, 99, 181\)/);
});

test("bordered reference and embedded blockquotes inherit surrounding text color", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/bordered-styles.css"),
        "utf8"
    );
    const titledHtml = render(
        ":::note info Title {css=true}\n> Quoted content\n:::\n"
    );
    const titlelessHtml = render(
        ":::note info {css=true}\n> Quoted content\n:::\n"
    );

    assert.doesNotMatch(css, /\.bordered-admonition blockquote\s*\{/);
    for (const html of [titledHtml, titlelessHtml]) {
        assert.match(
            html,
            /<blockquote style="[^"]*border-left:4px solid rgba\(76, 73, 68, \.35\)[^"]*background-color:transparent;?color:inherit[^"]*">/
        );
    }
});

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("pastel reference styles use a distinct icon for each type", () => {
    const css = fs.readFileSync(
        path.join(__dirname, "../reference-styles/pastel-styles.css"),
        "utf8"
    );

    for (const declaration of [
        'content: "\\e88e"',
        'content: "\\e002"',
        'content: "\\e14c"',
        'content: "\\e887"'
    ]) {
        assert.ok(css.includes(declaration));
    }
});

test("embeds portable styles for titles, links, and code", () => {
    const source = [
        ":::note info Embedded title",
        "Text with [a link](https://example.com) and `inline code`.",
        "",
        "```js",
        "const value = 1;",
        "```",
        ":::"
    ].join("\n");
    const html = render(source, { embedCss: true, style: "solid" });

    assert.match(html, /class="solid-admonition info markdown-it-info-embedded"/);
    assert.match(html, /<span class="markdown-it-info-icon" aria-hidden="true"/);
    assert.match(html, /<a href="https:\/\/example\.com" style="[^"]*color:#ffffff/);
    assert.match(html, /<pre style="[^"]*background-color:#202020 !important/);
    assert.match(html, /<code[^>]*style="[^"]*background-color:transparent !important/);
    assert.match(html, /language-js/);
    assert.doesNotMatch(html, /<style/);
});

test("embeds a real icon and promotes the first paragraph when the title is omitted", () => {
    const html = render(
        ":::note question {.portable}\nContent\n:::\n",
        { embedCss: true, style: "pastel" }
    );

    assert.match(
        html,
        /class="pastel-admonition question markdown-it-info-embedded portable"/
    );
    assert.match(html, /<span class="markdown-it-info-icon" aria-hidden="true"[^>]*>\?<\/span>/);
    assert.match(html, /<p class="markdown-it-info-content-start" style="[^"]*padding:\.8rem 1\.2rem \.8rem 3\.6rem[^"]*font-weight:400[^"]*">Content<\/p>/);
    assert.doesNotMatch(html, /class="pastel-admonition-title"/);
    assert.doesNotMatch(html, /markdown-it-info-titleless/);
});

test("matches the default titleless background and inherited text with embedded CSS", () => {
    const referenceCss = fs.readFileSync(
        path.join(__dirname, "../reference-styles/bordered-styles.css"),
        "utf8"
    );
    const html = render(":::note info {css=true}\nContent\n:::\n");
    const withoutCss = render(":::note info\nContent\n:::\n");
    const inlineCode = render(":::note info {css=true}\n`code` and text\n:::\n");

    assert.match(
        html,
        /<div class="bordered-admonition info markdown-it-info-embedded"[^>]*padding:0 1\.2rem 0 3\.6rem[^>]*background-color:rgba\(255, 255, 255, 0\.05\);color:inherit/
    );
    assert.match(
        html,
        /<span class="markdown-it-info-icon"[^>]*color:rgba\(100, 221, 23, 1\)/
    );
    assert.match(
        html,
        /<p class="markdown-it-info-content-start" style="margin-top:\.8rem">Content<\/p>/
    );
    assert.doesNotMatch(html, /class="bordered-admonition-title"/);
    assert.match(withoutCss, /<p class="markdown-it-info-content-start">Content<\/p>/);
    assert.match(inlineCode, /<code style="color:inherit;/);
    assert.match(
        referenceCss,
        /\.bordered-admonition\s*\{[^}]*background-color:\s*rgba\(255, 255, 255, 0\.05\)/s
    );
    assert.doesNotMatch(referenceCss, /\.bordered-admonition code\s*\{/);
});

test("keeps explicit text color overrides for default titleless embedded boxes", () => {
    const html = render(
        ":::note info {css=true}\nContent\n:::\n",
        { colors: { text: "#123456" } }
    );

    assert.match(html, /<div[^>]*color:#123456/);
});

test("inherits surrounding text in titled default embedded titles, bodies, and quotes", () => {
    const html = render(
        ":::note info Title {css=true}\nBody text\n\n> Quoted text\n:::\n"
    );
    const overridden = render(
        ":::note info Title {css=true}\nBody text\n\n> Quoted text\n:::\n",
        { colors: { text: "#123456" } }
    );

    assert.match(html, /<div class="bordered-admonition info markdown-it-info-embedded"[^>]*color:inherit/);
    assert.match(html, /<p style="[^"]*color:inherit[^"]*font-weight:700[^"]*">[\s\S]*?Title<\/p>/);
    assert.match(html, /<p style="margin-top:\.8rem">Body text<\/p>/);
    assert.match(html, /<blockquote style="[^"]*color:inherit[^"]*">/);
    assert.match(overridden, /<div[^>]*color:#123456/);
    assert.match(overridden, /<p style="[^"]*color:#123456[^"]*font-weight:700[^"]*">[\s\S]*?Title<\/p>/);
    assert.match(overridden, /<blockquote style="[^"]*color:inherit[^"]*">/);
});

test("titled default embedded body code inherits body text without changing title code", () => {
    const source = ":::note info Title `title code` {css=true}\nBody `body code`\n:::\n";
    const html = render(source);
    const overridden = render(source, { colors: { text: "#123456" } });

    assert.match(html, /Title <code style="color:#24292f;[^"]*">title code<\/code>/);
    assert.match(html, /Body <code style="color:inherit;[^"]*">body code<\/code>/);
    assert.match(overridden, /Body <code style="color:inherit;[^"]*">body code<\/code>/);
});

test("normalizes only direct paragraph top margins in embedded output", () => {
    const source = [
        ":::note info Title {.portable}",
        "Direct content",
        "",
        "> Nested content",
        ":::"
    ].join("\n");
    const html = render(source, { embedCss: true });

    assert.match(html, /<p style="margin-top:\.8rem">Direct content<\/p>/);
    assert.match(html, /<blockquote[^>]*>\s*<p>Nested content<\/p>/);
});

test("uses plain content styling for default titleless boxes and keeps embedded blockquotes", () => {
    const titlelessHtml = render(
        ":::note info {.portable}\nContent\n:::\n",
        { embedCss: true, style: "bordered" }
    );
    const quoteHtml = render(
        ":::note info Title\n> Quoted content\n:::\n",
        { embedCss: true, style: "pastel" }
    );

    assert.match(
        titlelessHtml,
        /<p class="markdown-it-info-content-start" style="margin-top:\.8rem">Content<\/p>/
    );
    assert.doesNotMatch(titlelessHtml, /class="bordered-admonition-title"/);
    assert.match(titlelessHtml, /<div[^>]*color:inherit/);
    assert.match(
        quoteHtml,
        /<blockquote style="[^"]*border-left:4px solid rgba\(76, 73, 68, \.35\)[^"]*background-color:transparent;color:rgb\(76, 73, 68\)"/
    );
});

test("aligns solid titleless embedded body with its first line", () => {
    const source = ":::note info {css=true}\nFirst line\n\n> Quoted text\n\n```js\nconst value = 1;\n```\n:::";
    const titleless = render(source, { style: "solid" });
    const titled = render(":::note info Title {css=true}\nBody\n:::", { style: "solid" });

    assert.match(titleless, /<div class="solid-admonition info markdown-it-info-embedded"[^>]*padding:0 1\.2rem 0 3\.6rem/);
    assert.match(titleless, /<p class="markdown-it-info-content-start" style="margin:0 -1\.2rem 0 -3\.6rem;padding:\.8rem 1\.2rem \.8rem 3\.6rem/);
    assert.match(titleless, /<blockquote style="margin:\.8rem 0;/);
    assert.match(titleless, /<pre style=/);
    assert.match(titled, /<div class="solid-admonition info markdown-it-info-embedded"[^>]*padding:0 1\.2rem;/);
});

test("aligns pastel titleless embedded body with its first line", () => {
    const source = ":::note info {css=true}\nFirst line\n\n> Quoted text\n\n```js\nconst value = 1;\n```\n:::";
    const titleless = render(source, { style: "pastel" });
    const titled = render(":::note info Title {css=true}\nBody\n:::", { style: "pastel" });

    assert.match(titleless, /<div class="pastel-admonition info markdown-it-info-embedded"[^>]*padding:0 1\.2rem 0 3\.6rem/);
    assert.match(titleless, /<p class="markdown-it-info-content-start" style="margin:0 -1\.2rem 0 -3\.6rem;padding:\.8rem 1\.2rem \.8rem 3\.6rem/);
    assert.match(titleless, /<blockquote style="margin:\.8rem 0;/);
    assert.match(titleless, /<pre style=/);
    assert.match(titled, /<div class="pastel-admonition info markdown-it-info-embedded"[^>]*padding:0 1\.2rem;/);
});

test("lets css block controls override the embedCss option", () => {
    const enabledHtml = render(
        ":::note info Title {css=true}\nContent\n:::\n",
        { embedCss: false }
    );
    const disabledHtml = render(
        ":::note info Title {css=false}\nContent\n:::\n",
        { embedCss: true }
    );

    assert.match(enabledHtml, /markdown-it-info-embedded/);
    assert.doesNotMatch(enabledHtml, /css="true"/);
    assert.doesNotMatch(disabledHtml, /markdown-it-info-embedded/);
    assert.doesNotMatch(disabledHtml, /markdown-it-info-icon/);
    assert.doesNotMatch(disabledHtml, /css="false"/);
});

test("resolves YAML style, colors, and embedCss by type", () => {
    const env = {
        frontmatter: {
            markdown: {
                note: {
                    embedCss: false,
                    style: "pastel",
                    colors: {
                        background: "#eeeeee",
                        text: "#333333"
                    },
                    info: {
                        embedCss: true,
                        style: "bordered",
                        colors: {
                            icon: "#123456",
                            text: "#234567"
                        }
                    }
                }
            }
        }
    };
    const html = render(
        ":::note info Title\nContent\n:::\n",
        {
            embedCss: false,
            style: "solid",
            colors: {
                border: "#abcdef",
                background: "#dddddd"
            }
        },
        env
    );

    assert.match(html, /class="bordered-admonition info markdown-it-info-embedded"/);
    assert.match(html, /border-left:\.4rem solid #abcdef/);
    assert.match(html, /background-color:#eeeeee/);
    assert.match(html, /color:#234567/);
    assert.match(html, /class="markdown-it-info-icon"[^>]*color:#123456/);
});

test("maps canonical and compatibility style names to existing classes", () => {
    const pairs = [
        ["bordered", "bordered"],
        ["default", "bordered"],
        ["solid", "solid"],
        ["qiita", "solid"],
        ["pastel", "pastel"],
        ["zenn", "pastel"]
    ];

    for (const [style, classPrefix] of pairs) {
        const html = render(
            ":::note info Title\nContent\n:::\n",
            { style }
        );
        assert.match(html, new RegExp(`class="${classPrefix}-admonition info"`));
    }

    const legacyOptionHtml = render(
        ":::note info Title\nContent\n:::\n",
        { admonitionStyle: "qiita" }
    );
    assert.match(legacyOptionHtml, /class="solid-admonition info"/);
});

test("supports type-specific style, colors, and embedCss options", () => {
    const html = render(
        ":::note info Title\nContent\n:::\n",
        {
            embedCss: false,
            style: "bordered",
            types: {
                info: {
                    embedCss: true,
                    style: "solid",
                    colors: {
                        background: "#123400",
                        text: "#ffffff"
                    }
                }
            }
        }
    );

    assert.match(html, /class="solid-admonition info markdown-it-info-embedded"/);
    assert.match(html, /background-color:#123400/);
    assert.match(html, /color:#ffffff/);
});

test("outputs explicit colors even when CSS embedding is disabled", () => {
    const html = render(
        ":::note alert Title\nContent\n:::\n",
        {
            colors: {
                border: "#111111",
                background: "#222222",
                titleBackground: "#333333",
                titleBorder: "#444444",
                icon: "#555555",
                text: "#eeeeee"
            }
        }
    );

    assert.doesNotMatch(html, /markdown-it-info-embedded/);
    assert.doesNotMatch(html, /<span class="markdown-it-info-icon"/);
    assert.match(html, /border-left-color:#111111/);
    assert.match(html, /background-color:#222222/);
    assert.match(html, /color:#eeeeee/);
    assert.match(html, /--markdown-it-info-icon-color:#555555/);
    assert.match(html, /background-color:#333333/);
    assert.match(html, /border-bottom-color:#444444/);
});

test("appends a custom style attribute after generated styles", () => {
    const html = render(
        ":::note info Title\nContent\n:::\n",
        {
            embedCss: true,
            attributes: {
                style: "color:hotpink;padding:99px"
            }
        }
    );

    assert.match(html, /style="position:relative;[^"]*;color:hotpink;padding:99px"/);
});

test("keeps embedded code styles when a highlighter returns pre HTML", () => {
    const tick = String.fromCharCode(96);
    const source = [
        ":::note info Title",
        tick.repeat(3) + "js",
        "const value = 1;",
        tick.repeat(3),
        ":::"
    ].join("\n");
    const md = new MarkdownIt({
        highlight() {
            return '<pre class="highlight"><code><span>highlighted</span></code></pre>';
        }
    }).use(markdownItInfo, { embedCss: true });
    const html = md.render(source);

    assert.match(html, /<pre class="highlight" style="[^"]*background-color:/);
    assert.match(html, /<code style="[^"]*background-color:/);
    assert.match(html, /<span>highlighted<\/span>/);
});
