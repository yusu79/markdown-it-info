// 定数定義
const
    MARKER = ':',
    MIN_MARKER_LEN = 3,
    CONTENT_START_CLASS = "markdown-it-info-content-start",
    STYLE_ALIASES = {
        bordered: "default",
        default: "default",
        solid: "qiita",
        qiita: "qiita",
        pastel: "zenn",
        zenn: "zenn"
    },
    STYLE_CLASS_PREFIXES = {
        default: "bordered",
        qiita: "solid",
        zenn: "pastel"
    },
    COLOR_KEYS = new Set([
        "border",
        "background",
        "titleBackground",
        "titleBorder",
        "icon",
        "text"
    ]),
    ICONS = {
        info: "i",
        warn: "!",
        warning: "!",
        alert: "×",
        question: "?"
    },
    PRESET_COLORS = {
        default: {
            info: {
                border: "rgba(100, 221, 23, .8)",
                background: "rgba(255, 255, 255, 0.05)",
                titleBackground: "rgba(100, 221, 23, .1)",
                titleBorder: "rgba(100, 221, 23, .2)",
                icon: "rgba(100, 221, 23, 1)",
                text: "#24292f"
            },
            warn: {
                border: "rgba(255, 145, 0, .8)",
                background: "rgba(255, 255, 255, 0.05)",
                titleBackground: "rgba(255, 145, 0, .1)",
                titleBorder: "rgba(255, 145, 0, .2)",
                icon: "rgba(255, 145, 0, 1)",
                text: "#24292f"
            },
            alert: {
                border: "rgba(255, 23, 68, .8)",
                background: "rgba(255, 255, 255, 0.05)",
                titleBackground: "rgba(255, 23, 68, .1)",
                titleBorder: "rgba(255, 23, 68, .2)",
                icon: "rgba(255, 23, 68, 1)",
                text: "#24292f"
            },
            question: {
                border: "rgba(0, 184, 212, .8)",
                background: "rgba(255, 255, 255, 0.05)",
                titleBackground: "rgba(0, 184, 212, .1)",
                titleBorder: "rgba(0, 184, 212, .2)",
                icon: "rgba(0, 184, 212, 1)",
                text: "#24292f"
            }
        },
        qiita: {
            info: darkColors("rgb(42, 98, 0)", "rgb(102, 202, 27)"),
            warn: darkColors("rgb(105, 80, 3)", "rgb(254, 218, 87)"),
            alert: darkColors("rgb(109, 2, 2)", "rgb(254, 116, 117)"),
            question: darkColors("rgb(36, 99, 181)", "rgb(173, 206, 254)")
        },
        zenn: {
            info: lightColors("rgb(235, 255, 228)", "rgb(77, 179, 16)"),
            warn: lightColors("rgb(254, 247, 228)", "rgb(217, 132, 0)"),
            alert: lightColors("rgb(255, 238, 243)", "rgb(225, 70, 65)"),
            question: lightColors("rgb(228, 241, 255)", "rgb(49, 112, 214)")
        }
    },
    VALID_TYPES = new Set([
        "info",
        "warn",
        "warning",
        "alert",
        "question"
    ]);

// Markdown-itプラグインのメイン関数
module.exports = function MarkdownItInfo(md, options = {}) {
    const
        defaultOptions = {
            admonitionStyle: 'default',
            defaultType: "info",
            defaultTitle: null,
            embedCss: false,
            style: undefined,
            colors: {},
            classes: [],
            attributes: {},
            types: {}
        },
        config = normalizeConfig({ ...defaultOptions, ...options }),
        fenceRenderer = md.renderer.rules.fence;

    md.block.ruler.after("fence", "admonition", admonition(config), {});
    md.renderer.rules["admonition_open"] = renderAdmonitionOpen();
    md.renderer.rules["admonition_title_open"] = renderAdmonitionTitleOpen();
    md.renderer.rules["admonition_icon"] = renderAdmonitionIcon;
    md.renderer.rules["admonition_title_close"] = renderToken;
    md.renderer.rules["admonition_close"] = renderToken;
    md.renderer.rules.fence = renderEmbeddedFence(fenceRenderer);
    md.core.ruler.after("inline", "admonition_embedded_content", styleEmbeddedContent);
}

// レンダリング関数
function renderAdmonitionOpen() {
    return (tokens, index, options, _env, self) => {
        const
            token = tokens[index],
            attributes = token.meta.markdownItInfo,
            stylePrefix = STYLE_CLASS_PREFIXES[attributes.style] || attributes.style,
            hasVisualTitle = attributes.hasTitle || attributes.hasContentTitle,
            plainContentStart = (attributes.style === "default" || attributes.style === "qiita" || attributes.style === "zenn")
                && attributes.hasContentTitle
                && !attributes.hasTitle;

        token.attrJoin("class", `${stylePrefix}-admonition ${token.info}`);

        if (!hasVisualTitle) {
            token.attrJoin("class", "markdown-it-info-titleless");
        } else if (attributes.hasContentTitle && !attributes.embedCss) {
            token.attrJoin("class", "markdown-it-info-has-content-start");
        }

        if (attributes.embedCss) {
            token.attrJoin("class", "markdown-it-info-embedded");
        }

        for (const className of attributes.classes) {
            token.attrJoin("class", className);
        }

        const generatedStyle = attributes.embedCss
            ? createContainerStyle(
                attributes.design,
                attributes.style,
                hasVisualTitle,
                plainContentStart,
                attributes.colors.text !== undefined
            )
            : createColorOverrideStyle(attributes.colors);

        for (const [name, value] of Object.entries(attributes.values)) {
            if (name === "style") continue;
            token.attrSet(name, value);
        }

        const combinedStyle = combineStyles(generatedStyle, attributes.values.style);
        if (combinedStyle) token.attrSet("style", combinedStyle);

        return self.renderToken(tokens, index, options);
    };
}

function renderAdmonitionTitleOpen() {
    return (tokens, index, options, _env, self) => {
        const settings = tokens[index].meta.markdownItInfo;

        if (!settings.embedCss) {
            tokens[index].attrJoin("class", `${STYLE_CLASS_PREFIXES[settings.style] || settings.style}-admonition-title`);
        }
        const titleStyle = settings.embedCss
            ? createTitleStyle(
                settings.design,
                settings.style,
                settings.colors.text !== undefined
            )
            : createTitleColorOverrideStyle(settings.colors);
        if (titleStyle) tokens[index].attrSet("style", titleStyle);
        return self.renderToken(tokens, index, options);
    };
}

function renderAdmonitionIcon(tokens, index, _options, _env, self) {
    const token = tokens[index];
    return `<span${self.renderAttrs(token)}>${token.content}</span>`;
}

function renderEmbeddedFence(originalRenderer) {
    return (tokens, index, options, env, self) => {
        const
            token = tokens[index],
            html = originalRenderer(tokens, index, options, env, self),
            embeddedStyle = token.meta && token.meta.markdownItInfoEmbeddedStyle;

        if (!embeddedStyle) return html;

        return addStyleToFirstTag(
            addStyleToFirstTag(html, "pre", embeddedStyle.pre, embeddedStyle.preferGenerated),
            "code",
            embeddedStyle.code,
            embeddedStyle.preferGenerated
        );
    };
}

function addStyleToFirstTag(html, tagName, generatedStyle, preferGenerated = false) {
    const tagPattern = new RegExp(`<${tagName}\\b([^>]*)>`, "i");

    return html.replace(tagPattern, (tag, attributes) => {
        const stylePattern = /\sstyle=(['"])(.*?)\1/i;
        const styleMatch = attributes.match(stylePattern);

        if (styleMatch) {
            const combined = preferGenerated
                ? combineStyles(styleMatch[2], escapeAttribute(generatedStyle))
                : combineStyles(escapeAttribute(generatedStyle), styleMatch[2]);
            return tag.replace(stylePattern, ` style=${styleMatch[1]}${combined}${styleMatch[1]}`);
        }

        return `<${tagName}${attributes} style="${escapeAttribute(generatedStyle)}">`;
    });
}

function escapeAttribute(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function renderToken(tokens, index, options, _env, self) {
    return self.renderToken(tokens, index, options);
}

// ボックスの解析関数
function admonition(config) {
    return (state, startLine, endLine, silent) => {
        const
            startPos = state.bMarks[startLine] + state.tShift[startLine],
            maxPos = state.eMarks[startLine];

        // マーカーの検証
        if (state.src.charAt(startPos) !== MARKER) return false;
        const markerCount = countConsecutiveChars(state.src, startPos, MARKER);
        if (markerCount < MIN_MARKER_LEN) return false;

        // パラメータとブロック属性の解析
        const openingLine = state.src.slice(startPos + markerCount, maxPos).trim();
        const extracted = extractTrailingAttributes(openingLine);
        const params = extracted.params.split(/\s+/);

        if (params[0] !== "note" && params[0] !== "message") return false;

        let type, explicitTitle;

        if (VALID_TYPES.has(params[1])) {
            type = params[1];
            explicitTitle = params.slice(2).join(' ');
        } else {
            type = config.defaultType;
            explicitTitle = params.slice(1).join(' ');
        }

        const title = explicitTitle || resolveDefaultTitle(config, type, state.env);

        // ブロックの終了位置を検索
        const endLineInfo = findAdmonitionEnd(state, startLine + 1, endLine);
        if (!endLineInfo) {
            if (!silent) {
                state.pending += state.src.slice(startPos, maxPos);
                state.line = startLine + 1;
            }
            return true;
        }

        // バリデーションモードの場合はここで終了
        if (silent) return true;

        // トークンの生成
        createAdmonitionTokens(
            state,
            startLine,
            endLineInfo.endLine,
            type,
            title,
            markerCount,
            resolveSettings(config, type, state.env, extracted.attributes)
        );

        state.line = endLineInfo.nextLine;
        return true;
    }
}

function normalizeConfig(config) {
    const types = {};

    for (const type of VALID_TYPES) {
        const typeConfig = config.types && config.types[type];
        if (!typeConfig || typeof typeConfig !== "object" || Array.isArray(typeConfig)) continue;

        types[type] = {
            classes: typeConfig.classes === undefined
                ? undefined
                : normalizeClasses(typeConfig.classes),
            attributes: normalizeAttributes(typeConfig.attributes),
            defaultTitle: typeConfig.defaultTitle === undefined
                ? undefined
                : normalizeDefaultTitle(typeConfig.defaultTitle, undefined),
            embedCss: normalizeBoolean(typeConfig.embedCss),
            style: typeConfig.style === undefined
                ? undefined
                : normalizeStyle(typeConfig.style, undefined),
            colors: normalizeColors(typeConfig.colors)
        };
    }

    return {
        ...config,
        classes: normalizeClasses(config.classes),
        attributes: normalizeAttributes(config.attributes),
        defaultTitle: normalizeDefaultTitle(config.defaultTitle, null),
        embedCss: normalizeBoolean(config.embedCss) ?? false,
        style: normalizeStyle(config.style, normalizeStyle(config.admonitionStyle, "default")),
        colors: normalizeColors(config.colors),
        types
    };
}

function resolveDefaultTitle(config, type, env) {
    const optionTypeConfig = config.types[type];
    let defaultTitle = optionTypeConfig && optionTypeConfig.defaultTitle !== undefined
        ? optionTypeConfig.defaultTitle
        : config.defaultTitle;
    const noteConfig = getFrontmatterNoteConfig(env);

    if (!noteConfig) return defaultTitle;

    defaultTitle = normalizeDefaultTitle(noteConfig.defaultTitle, defaultTitle);

    const typeConfig = noteConfig[type];
    if (isConfigObject(typeConfig)) {
        defaultTitle = normalizeDefaultTitle(typeConfig.defaultTitle, defaultTitle);
    }

    return defaultTitle;
}

function normalizeDefaultTitle(value, fallback) {
    if (value === null || value === false) return null;
    return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value) {
    return typeof value === "boolean" ? value : undefined;
}

function normalizeStyle(value, fallback) {
    if (typeof value !== "string" || !value.trim()) return fallback;
    const normalized = value.trim().toLowerCase();
    return STYLE_ALIASES[normalized] || normalized;
}

function normalizeColors(value) {
    if (!isConfigObject(value)) return {};

    const colors = {};

    for (const [name, color] of Object.entries(value)) {
        if (COLOR_KEYS.has(name) && typeof color === "string" && color.trim()) {
            colors[name] = color.trim();
        }
    }

    return colors;
}

function resolveTypeAttributes(config, type) {
    const typeConfig = config.types[type];

    if (!typeConfig) {
        return {
            classes: config.classes,
            values: config.attributes
        };
    }

    return {
        classes: [...config.classes, ...(typeConfig.classes || [])],
        values: { ...config.attributes, ...typeConfig.attributes }
    };
}

function resolveSettings(config, type, env, blockAttributes) {
    const
        optionAttributes = resolveTypeAttributes(config, type),
        frontmatter = resolveFrontmatterAttributes(env, type),
        optionTypeConfig = config.types[type],
        noteConfig = getFrontmatterNoteConfig(env),
        frontmatterTypeConfig = noteConfig && isConfigObject(noteConfig[type])
            ? noteConfig[type]
            : null;

    let style = optionTypeConfig && optionTypeConfig.style !== undefined
        ? optionTypeConfig.style
        : config.style;
    let embedCss = optionTypeConfig && optionTypeConfig.embedCss !== undefined
        ? optionTypeConfig.embedCss
        : config.embedCss;
    let colors = {
        ...config.colors,
        ...(optionTypeConfig ? optionTypeConfig.colors : {})
    };

    if (noteConfig) {
        style = normalizeStyle(noteConfig.style, style);
        embedCss = normalizeBoolean(noteConfig.embedCss) ?? embedCss;
        colors = { ...colors, ...normalizeColors(noteConfig.colors) };
    }

    if (frontmatterTypeConfig) {
        style = normalizeStyle(frontmatterTypeConfig.style, style);
        embedCss = normalizeBoolean(frontmatterTypeConfig.embedCss) ?? embedCss;
        colors = { ...colors, ...normalizeColors(frontmatterTypeConfig.colors) };
    }

    embedCss = blockAttributes.controls.css ?? embedCss;

    return {
        classes: unique([
            ...optionAttributes.classes,
            ...frontmatter.classes,
            ...blockAttributes.classes
        ]),
        values: {
            ...optionAttributes.values,
            ...frontmatter.values,
            ...blockAttributes.values
        },
        embedCss,
        style,
        colors,
        design: createDesign(style, type, colors)
    };
}

function resolveFrontmatterAttributes(env, type) {
    const noteConfig = getFrontmatterNoteConfig(env);

    if (!noteConfig) {
        return emptyParsedAttributes();
    }

    const typeConfig = noteConfig[type];
    const hasTypeConfig = isConfigObject(typeConfig);

    return {
        classes: [
            ...normalizeClasses(noteConfig.classes),
            ...normalizeClasses(hasTypeConfig ? typeConfig.classes : undefined)
        ],
        values: {
            ...normalizeAttributes(noteConfig.attributes),
            ...normalizeAttributes(hasTypeConfig ? typeConfig.attributes : undefined)
        },
        controls: {}
    };
}

function getFrontmatterNoteConfig(env) {
    const noteConfig = env
        && env.frontmatter
        && env.frontmatter.markdown
        && env.frontmatter.markdown.note;

    return isConfigObject(noteConfig) ? noteConfig : null;
}

function isConfigObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractTrailingAttributes(value) {
    if (!value.endsWith("}")) {
        return {
            params: value,
            attributes: emptyParsedAttributes(),
            hasAttributes: false
        };
    }

    const openingIndex = findTrailingAttributeOpening(value);
    if (openingIndex < 0) {
        return {
            params: value,
            attributes: emptyParsedAttributes(),
            hasAttributes: false
        };
    }

    const attributes = parseBlockAttributes(value.slice(openingIndex + 1, -1));
    if (!attributes) {
        return {
            params: value,
            attributes: emptyParsedAttributes(),
            hasAttributes: false
        };
    }

    return {
        params: value.slice(0, openingIndex).trimEnd(),
        attributes,
        hasAttributes: true
    };
}

function findTrailingAttributeOpening(value) {
    let quote = null;
    let escaped = false;
    let depth = 0;
    let openingIndex = -1;

    for (let index = 0; index < value.length; index++) {
        const character = value[index];

        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === quote) {
                quote = null;
            }
            continue;
        }

        if (character === '"' || character === "'") {
            quote = character;
        } else if (character === "{") {
            if (depth === 0) openingIndex = index;
            depth++;
        } else if (character === "}") {
            depth--;
            if (depth < 0 || (depth === 0 && index !== value.length - 1)) {
                openingIndex = -1;
            }
        }
    }

    return !quote && depth === 0 ? openingIndex : -1;
}

function parseBlockAttributes(source) {
    const tokens = tokenizeAttributes(source);
    if (!tokens || tokens.length === 0) return null;

    const result = emptyParsedAttributes();

    for (const token of tokens) {
        if (token.startsWith(".") && token.length > 1) {
            result.classes.push(...normalizeClasses(token.slice(1)));
            continue;
        }

        if (token.startsWith("#") && token.length > 1) {
            result.values.id = token.slice(1);
            continue;
        }

        const separatorIndex = token.indexOf("=");
        if (separatorIndex <= 0) return null;

        const
            name = token.slice(0, separatorIndex),
            rawValue = token.slice(separatorIndex + 1);

        if (!isValidAttributeName(name)) return null;

        const value = unquoteAttributeValue(rawValue);
        if (value === null) return null;

        if (name === "class") {
            result.classes.push(...normalizeClasses(value));
        } else if (name === "css") {
            if (value === "true" || value === "false") {
                result.controls.css = value === "true";
            }
        } else {
            result.values[name] = value;
        }
    }

    result.classes = unique(result.classes);
    return result;
}

function tokenizeAttributes(source) {
    const tokens = [];
    let current = "";
    let quote = null;
    let escaped = false;

    for (const character of source.trim()) {
        if (quote) {
            current += character;
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === quote) {
                quote = null;
            }
        } else if (character === '"' || character === "'") {
            quote = character;
            current += character;
        } else if (/\s/.test(character)) {
            if (current) {
                tokens.push(current);
                current = "";
            }
        } else {
            current += character;
        }
    }

    if (quote) return null;
    if (current) tokens.push(current);
    return tokens;
}

function unquoteAttributeValue(value) {
    if (!value.startsWith('"') && !value.startsWith("'")) return value;
    if (value.length < 2 || value.at(-1) !== value[0]) return null;

    const quote = value[0];
    return value
        .slice(1, -1)
        .replace(new RegExp(`\\\\${quote}`, "g"), quote)
        .replace(/\\\\\\\\/g, "\\");
}

function emptyParsedAttributes() {
    return {
        classes: [],
        values: {},
        controls: {}
    };
}

function darkColors(background, icon) {
    return {
        border: background,
        background,
        titleBackground: background,
        titleBorder: background,
        icon,
        text: "#ffffff"
    };
}

function lightColors(background, icon) {
    return {
        border: background,
        background,
        titleBackground: background,
        titleBorder: background,
        icon,
        text: "rgb(76, 73, 68)"
    };
}

function createDesign(style, type, colors) {
    const
        presetName = PRESET_COLORS[style] ? style : "default",
        typeName = type === "warning" ? "warn" : type,
        preset = PRESET_COLORS[presetName][typeName] || PRESET_COLORS.default.info,
        resolvedColors = { ...preset, ...colors },
        isSolid = presetName === "qiita";

    return {
        ...resolvedColors,
        borderRadius: presetName === "qiita" ? "8px" : presetName === "zenn" ? "4px" : ".2rem",
        link: isSolid ? resolvedColors.text : "#0969da",
        codeBackground: isSolid ? "rgba(0, 0, 0, .28)" : "rgba(127, 127, 127, .14)",
        blockCodeBackground: "#202020",
        blockCodeText: presetName === "default" ? undefined : resolvedColors.text,
        codeText: resolvedColors.text,
        quoteBorder: presetName === "default" || presetName === "zenn"
            ? "rgba(76, 73, 68, .35)"
            : resolvedColors.icon
    };
}

function createContainerStyle(design, style, hasTitle, plainContentStart, hasTextOverride) {
    return declarationsToStyle({
        position: "relative",
        margin: "1.5625em 0",
        padding: hasTitle && !plainContentStart ? "0 1.2rem" : "0 1.2rem 0 3.6rem",
        "border-left": `.4rem solid ${design.border}`,
        "border-radius": design.borderRadius,
        "background-color": hasTitle ? design.background : design.titleBackground,
        color: style === "default" && !hasTextOverride ? "inherit" : design.text,
        overflow: "auto",
        "box-sizing": "border-box"
    });
}

function createTitleStyle(design, style, hasTextOverride) {
    return declarationsToStyle({
        margin: "0 -1.2rem",
        padding: ".8rem 1.2rem .8rem 3.6rem",
        "border-bottom": `1px solid ${design.titleBorder}`,
        "background-color": design.titleBackground,
        color: style === "default" && !hasTextOverride ? "inherit" : design.text,
        "font-weight": "700"
    });
}

function createContentStartStyle(design, style) {
    return declarationsToStyle({
        margin: style === "qiita" || style === "zenn" ? "0 -1.2rem 0 -3.6rem" : "0 -1.2rem",
        padding: ".8rem 1.2rem .8rem 3.6rem",
        "border-bottom": `1px solid ${design.titleBorder}`,
        "background-color": design.titleBackground,
        color: design.text,
        "font-weight": "400"
    });
}

function createIconStyle(design) {
    return declarationsToStyle({
        position: "absolute",
        top: ".925rem",
        left: "1.2rem",
        display: "inline-block",
        width: "1.3rem",
        height: "1.3rem",
        border: `2px solid ${design.icon}`,
        "border-radius": "50%",
        "box-sizing": "border-box",
        color: design.icon,
        "font-family": "Arial, sans-serif",
        "font-size": ".9rem",
        "font-style": "normal",
        "font-weight": "700",
        "line-height": "1rem",
        "text-align": "center"
    });
}

function createColorOverrideStyle(colors) {
    return declarationsToStyle({
        "border-left-color": colors.border,
        "background-color": colors.background,
        color: colors.text,
        "--markdown-it-info-icon-color": colors.icon
    });
}

function createTitleColorOverrideStyle(colors) {
    return declarationsToStyle({
        "background-color": colors.titleBackground,
        "border-bottom-color": colors.titleBorder
    });
}

function createLinkStyle(design) {
    return declarationsToStyle({
        color: design.link,
        "text-decoration": "underline"
    });
}

function createInlineCodeStyle(design, inheritText = false) {
    return declarationsToStyle({
        color: inheritText ? "inherit" : design.codeText,
        "background-color": design.codeBackground,
        padding: ".15em .35em",
        "border-radius": ".2rem"
    });
}

function createBlockCodeStyle(design) {
    return declarationsToStyle({
        display: "block",
        color: design.blockCodeText,
        "background-color": design.blockCodeBackground,
        padding: ".8rem",
        "border-radius": ".2rem",
        overflow: "auto",
        "white-space": "pre"
    });
}

function createPreStyle(design, style) {
    return declarationsToStyle({
        color: design.blockCodeText,
        "background-color": style === "default" ? design.blockCodeBackground : `${design.blockCodeBackground} !important`,
        margin: ".8rem 0",
        "border-radius": ".2rem",
        overflow: "auto"
    });
}

function createFenceCodeStyle(design, style) {
    return declarationsToStyle({
        display: "block",
        color: design.blockCodeText,
        "background-color": style === "default" ? "transparent" : "transparent !important",
        padding: ".8rem",
        "border-radius": ".2rem",
        overflow: "auto",
        "white-space": "pre"
    });
}

function createParagraphStyle() {
    return declarationsToStyle({
        "margin-top": ".8rem"
    });
}

function createBlockquoteStyle(design, style) {
    return declarationsToStyle({
        margin: ".8rem 0",
        padding: "0 0 0 1rem",
        "border-left": `4px solid ${design.quoteBorder}`,
        "background-color": "transparent",
        color: style === "default" ? "inherit" : design.text
    });
}

function declarationsToStyle(declarations) {
    return Object.entries(declarations)
        .filter(([, value]) => value !== undefined)
        .map(([name, value]) => `${name}:${value}`)
        .join(";");
}

function combineStyles(generated, custom) {
    return [generated, custom]
        .filter(value => typeof value === "string" && value.trim())
        .map(value => value.trim().replace(/;+$/, ""))
        .join(";");
}

function applyTokenStyle(token, style) {
    if (!style) return;
    token.attrSet("style", combineStyles(style, token.attrGet("style")));
}

function styleEmbeddedContent(state) {
    const settingsStack = [];

    for (const token of state.tokens) {
        if (token.type === "admonition_open") {
            settingsStack.push({
                settings: token.meta.markdownItInfo,
                depth: 0
            });
            continue;
        }

        if (token.type === "admonition_close") {
            settingsStack.pop();
            continue;
        }

        const context = settingsStack.at(-1);
        if (!context || !context.settings.embedCss) continue;

        if (token.nesting === -1) {
            context.depth = Math.max(0, context.depth - 1);
        }

        const settings = context.settings;

        if (
            token.type === "paragraph_open"
            && context.depth === 0
            && !(token.meta && token.meta.markdownItInfoContentTitle)
        ) {
            applyTokenStyle(token, createParagraphStyle());
        }

        if (token.type === "blockquote_open") {
            applyTokenStyle(token, createBlockquoteStyle(settings.design, settings.style));
        }

        if (token.type === "code_block") {
            applyTokenStyle(token, createBlockCodeStyle(settings.design));
        } else if (token.type === "fence") {
            token.meta = {
                ...token.meta,
                markdownItInfoEmbeddedStyle: {
                    pre: createPreStyle(settings.design, settings.style),
                    code: createFenceCodeStyle(settings.design, settings.style),
                    preferGenerated: settings.style === "default"
                }
            };
        }

        if (token.nesting === 1) {
            context.depth += 1;
        }

        if (token.type !== "inline" || !token.children) continue;

        for (const child of token.children) {
            if (child.type === "link_open") {
                applyTokenStyle(child, createLinkStyle(settings.design));
            } else if (child.type === "code_inline") {
                const inheritCodeText = settings.style === "default" && (
                    (settings.hasTitle && !(token.meta && token.meta.markdownItInfoTitle))
                    || (settings.hasContentTitle
                        && !settings.hasTitle
                        && settings.colors.text === undefined)
                );
                applyTokenStyle(child, createInlineCodeStyle(settings.design, inheritCodeText));
            }
        }

    }
}

function normalizeClasses(value) {
    if (Array.isArray(value)) {
        return unique(value.flatMap(normalizeClasses));
    }

    if (typeof value !== "string") return [];
    return unique(value.trim().split(/\s+/).filter(Boolean));
}

function normalizeAttributes(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    const attributes = Object.create(null);

    for (const [name, attributeValue] of Object.entries(value)) {
        if (
            name === "class"
            || !isValidAttributeName(name)
            || attributeValue === null
            || attributeValue === undefined
        ) {
            continue;
        }

        attributes[name] = String(attributeValue);
    }

    return attributes;
}

function isValidAttributeName(name) {
    return typeof name === "string" && name.length > 0 && !/[\s"'<>/=]/.test(name);
}

function unique(values) {
    return [...new Set(values)];
}

// 連続する文字数をカウント
function countConsecutiveChars(str, start, char) {
    let count = 0;
    while (str.charAt(start + count) === char) count++;
    return count;
}

// Admonitionブロックの終了位置を検索
function findAdmonitionEnd(state, startLine, endLine) {
    let
        nextLine = startLine,
        nestLevel = 1;

    for (; nextLine < endLine; nextLine++) {
        const
            lineStart = state.bMarks[nextLine] + state.tShift[nextLine],
            lineEnd = state.eMarks[nextLine],
            lineContent = state.src.slice(lineStart, lineEnd).trim();

        if (lineContent.startsWith(':::')) {
            if (lineContent === ':::') {
                nestLevel--;
                if (nestLevel === 0) {
                    return { endLine: nextLine, nextLine: nextLine + 1 };
                }
            } else {
                nestLevel++;
            }
        }
    }

    // 終了マーカーが見つからない場合
    return null;
}

// Admonitionトークンの生成
function createAdmonitionTokens(state, startLine, endLine, type, title, markerCount, settings) {
    const markup = MARKER.repeat(markerCount);

    // ボックスの開始トークン
    let token = state.push("admonition_open", "div", 1);
    token.markup = markup;
    token.block = true;
    token.info = type;
    token.map = [startLine, endLine + 1];
    token.meta = {
        markdownItInfo: {
            ...settings,
            hasTitle: title !== null
        }
    };

    const resolvedSettings = token.meta.markdownItInfo;

    if (title !== null) {
        // タイトルトークン
        token = state.push("admonition_title_open", "p", 1);
        token.markup = `${markup} ${type}`;
        token.map = [startLine, startLine + 1];
        token.meta = { markdownItInfo: resolvedSettings };

        if (settings.embedCss) {
            createAdmonitionIconToken(state, type, settings.design);
        }

        token = state.push("inline", "", 0);
        token.content = title;
        token.map = [startLine, startLine + 1];
        token.children = [];
        token.meta = { markdownItInfoTitle: true };

        token = state.push("admonition_title_close", "p", -1);
        token.markup = `${markup} ${type}`;
    } else if (settings.embedCss) {
        createAdmonitionIconToken(state, type, settings.design);
    }

    // 本文の解析
    const
        contentStart = startLine + 1,
        oldParentType = state.parentType,
        contentTokenStart = state.tokens.length;

    state.parentType = "admonition";

    state.md.block.parse(
        state.src.slice(
            state.bMarks[contentStart],
            state.eMarks[endLine - 1]
        ),
        state.md,
        state.env,
        state.tokens
    );

    if (title === null) {
        const contentTitleToken = state.tokens[contentTokenStart];

        if (contentTitleToken && contentTitleToken.type === "paragraph_open") {
            contentTitleToken.attrJoin("class", CONTENT_START_CLASS);
            contentTitleToken.meta = {
                ...contentTitleToken.meta,
                markdownItInfoContentTitle: true
            };
            resolvedSettings.hasContentTitle = true;

            if (settings.embedCss) {
                applyTokenStyle(
                    contentTitleToken,
                    settings.style === "default"
                        ? createParagraphStyle()
                        : createContentStartStyle(settings.design, settings.style)
                );
            }
        }
    }

    state.parentType = oldParentType;

    // ボックスの終了トークン
    token = state.push("admonition_close", "div", -1);
    token.markup = markup;
    token.block = true;
}

function createAdmonitionIconToken(state, type, design) {
    const token = state.push("admonition_icon", "span", 0);
    token.content = ICONS[type] || ICONS.info;
    token.attrSet("class", "markdown-it-info-icon");
    token.attrSet("aria-hidden", "true");
    token.attrSet("style", createIconStyle(design));
}
