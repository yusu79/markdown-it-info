// 定数定義
const 
    MARKER = ':',
    MIN_MARKER_LEN = 3,
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
            defaultTitle: "Enter the title here"
        },
        config = { ...defaultOptions, ...options };

    md.block.ruler.after("fence", "admonition", admonition(config), {});
    md.renderer.rules["admonition_open"] = renderAdmonitionOpen(config);
    md.renderer.rules["admonition_title_open"] = renderAdmonitionTitleOpen(config);
    md.renderer.rules["admonition_title_close"] = renderToken;
    md.renderer.rules["admonition_close"] = renderToken;
}

// レンダリング関数
function renderAdmonitionOpen(config) {
    return(tokens, index, options, _env, self) => {
        const 
            token = tokens[index],
            stylePrefix = config.admonitionStyle === 'default' ? '' : `${config.admonitionStyle}-`;

        token.attrJoin("class", `${stylePrefix}admonition ${token.info}`);
        return self.renderToken(tokens, index, options);
    };
}

function renderAdmonitionTitleOpen(config) {
    return (tokens, index, options, _env, self) => {
        const stylePrefix = config.admonitionStyle === 'default' ? '' : `${config.admonitionStyle}-`;
        
        tokens[index].attrJoin("class", `${stylePrefix}admonition-title`);
        return self.renderToken(tokens, index, options);
    };
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
    
        // パラメータの解析
        const params = state.src.slice(startPos + markerCount, maxPos).trim().split(/\s+/);
        
        if (params[0] !== "note" && params[0] !== "message") return false;
        
        const type = VALID_TYPES.has(params[1]) ? params[1] : config.defaultType;
        let title = params[2] || config.defaultTitle;
        
        if (params.length == 2 && VALID_TYPES.has(params[1])) {
            title = config.defaultTitle;
        } else if (params.length == 2) {
            title = params[1];
        }

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
        createAdmonitionTokens(state, startLine, endLineInfo.endLine, type, title, markerCount);
    
        state.line = endLineInfo.nextLine;
        return true;
    }
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
function createAdmonitionTokens(state, startLine, endLine, type, title, markerCount) {

    const markup = MARKER.repeat(markerCount);

    // ボックスの開始トークン
    let token = state.push("admonition_open", "div", 1);
    token.markup = markup;
    token.block = true;
    token.info = type;
    token.map = [startLine, endLine + 1];

    // タイトルトークン
    token = state.push("admonition_title_open", "p", 1);
    token.markup = `${markup} ${type}`;
    token.map = [startLine, startLine + 1];

    token = state.push("inline", "", 0);
    token.content = title;
    token.map = [startLine, startLine + 1];
    token.children = [];

    token = state.push("admonition_title_close", "p", -1);
    token.markup = `${markup} ${type}`;

    // 本文の解析
    const 
        contentStart = startLine + 1,
        oldParentType = state.parentType;
    
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
    
    state.parentType = oldParentType;

    // ボックスの終了トークン
    token = state.push("admonition_close", "div", -1);
    token.markup = markup;
    token.block = true;
}
