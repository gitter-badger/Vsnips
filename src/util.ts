import { Logger } from "./logger";
import * as vscode from "vscode";

function longestMatchCharsFromStart(base: string, candidate: string) {
  const minLen = Math.min(base.length, candidate.length);
  const matchedChars = [];
  for (let i = 0; i < minLen; i++) {
    const c1 = base[i];
    const c2 = candidate[i];
    if (c1 === c2) {
      matchedChars.push(c1);
    } else {
      break;
    }
  }
  return matchedChars;
}

/**
 * VSCode在初始化是获得的文件后缀可能是错误的, 找不到VSCode相关的代码, 因此直接在
 * 程序中进行修正, 该函数仅处理VScode中解析git的错误, 示例如下:
 *
 * {
 *   "uri": {
 *     "$mid":1,
 *     "fsPath":"/home/corvo/Project/tornado/setup.py.git",
 *     "external":"gitfs:/home/corvo/Project/tornado/setup.py.git?path%3D%252Fhome%252Fcorvo%252FProject%252Ftornado%252Fsetup.py%26ref%3D",
 *     "path":"/home/corvo/Project/tornado/setup.py.git",
 *     "scheme":"gitfs",
 *     "query":"path=%2Fhome%2Fcorvo%2FProject%2Ftornado%2Fsetup.py&ref="
 *   },
 *   "fileName":"/home/corvo/Project/tornado/setup.py.git",
 *   "isUntitled":false,
 *   "languageId":"plaintext",
 *   "version":1,
 *   "isClosed":false,
 *   "isDirty":false,
 *   "eol":1,
 *   "lineCount":173
 *  }
 *
 *  此示例章languageId错误的解析成`plaintext`
 *
 * Refer to: https://code.visualstudio.com/docs/languages/identifiers
 *
 * doc (vscode.TextDocument): TODO
 * Returns: 真实的源码语言
 */
function checkLanguageId(doc: vscode.TextDocument): string {
  if (doc.languageId !== "plaintext") {
    // 已经存在的语言不做处理
    return doc.languageId;
  }

  if (doc.uri.scheme === "gitfs" || doc.uri.path.endsWith(".git")) {
    Logger.warn(`The ${doc.uri.path} didn't get the proper lauguageId, VSnips will try to find it.`);
  } else { // 其他情况不做处理
    Logger.info(`The ${doc.uri.path} didn't get lauguageId`);
    return doc.languageId;
  }

  // 截取自: vscode/extensions/search-result/syntaxes/generateTMLanguage.js
  // 已经做了相当多的修改
  // [文件名后缀, languageId, 正则]
  const mappings = [
    ["bat", "bat"],
    ["c", "c"],
    ["cc", "cpp"],
    ["clj", "clojure"],
    ["coffee", "coffeescript"],
    ["cpp", "cpp"],
    ["cs", "cs"],
    ["css", "css"],
    ["dart", "dart"],
    ["diff", "diff"],
    ["dockerfile", "dockerfile", "(?:dockerfile|Dockerfile)"],
    ["fs", "fsharp"],
    ["go", "go"],
    ["groovy", "groovy"],
    ["h", "objc"],
    ["hlsl", "hlsl"],
    ["hpp", "objcpp"],
    ["html", "html"],
    ["ini", "ini"],
    ["java", "java"],
    ["js", "javascript"],
    ["json", "jsonc"],
    ["jsx", "javascriptreact"],
    ["less", "less"],
    ["log", "log"],
    ["lua", "lua"],
    ["m", "objc"],
    ["makefile", "makefile", "(?:makefile|Makefile)(?:\\..*)?"],
    ["md", "markdown"],
    ["mm", "objcpp"],
    ["p6", "perl.6"],
    ["perl", "perl"],
    ["php", "php"],
    ["pl", "perl"],
    ["ps1", "powershell"],
    ["pug", "pug"],
    ["py", "python"],
    ["r", "r"],
    ["rb", "ruby"],
    ["rs", "rust"],
    ["scala", "scala"],
    ["scss", "scss"],
    ["sh", "shellscript"],
    ["sql", "sql"],
    ["swift", "swift"],
    ["ts", "typescript"],
    ["tsx", "typescriptreact"],
    ["vb", "vb"],
    ["xml", "xml"],
    ["yaml", "yaml"],
  ];

  let p = doc.uri.path;
  if (p.endsWith(".git")) { // remove '.git'
    p = p.substring(0, p.length - 4);
  }
  let languageId = doc.languageId;

  for (const [ext, langId, regexp] of mappings) {
    if (regexp) { // 如果有正则, 以正则匹配为准
      if (regexp.match(p)) {
        languageId = langId;
        break;
      }
    } else {
      if (p.endsWith(ext)) {
        languageId = langId;
        break;
      }
    }
  }

  return languageId;
}

/**
 * str (string): TODO
 * ch (string[]): TODO
 * Returns: TODO
 *
 * Copy from: https://stackoverflow.com/a/55292366
 *  trimAny('|hello|world   ', [ '|', ' ' ]); // => 'hello|world'
 *  because '.indexOf' is used, you could also pass a string for the 2nd parameter:
 *  trimAny('|hello| world  ', '| '); // => 'hello|world'
 */
function trim(str: string, ch: string[]) {
  if(str === undefined) return "";

  let start = 0;
  let end = str.length;

  while (start < end && ch.indexOf(str[start]) >= 0) {
    ++start;
  }

  while (end > start && ch.indexOf(str[end - 1]) >= 0) {
    --end;
  }

  return start > 0 || end < str.length ? str.substring(start, end) : str;
}

function trimLeft(str: string, ch: string[]) {
  if(str === undefined) return "";
  let start = 0;
  const end = str.length;
  while (start < end && ch.indexOf(str[start]) >= 0) {
    ++start;
  }

  return start > 0 || end < str.length ? str.substring(start, end) : str;
}

function trimRight(str: string, ch: string[]) {
  if(str === undefined) return "";
  const start = 0;
  let end = str.length;
  while (end > start && ch.indexOf(str[end - 1]) >= 0) {
    --end;
  }
  return start > 0 || end < str.length ? str.substring(start, end) : str;
}
/**
 * 转义字符串中的`\`
 *  例如原始的字符串为:
 *    `This is a slash \\!`
 *  将其引号转义之后得到的字符串为:
 *    `This is a slash \\\\!`
 */
function escapeReverseSlash(str: string): string {
  // 注意, 这里不能使用replaceAll, 因为替换过去的字符含有原字符, 会出现死循环
  return str.replace(/\\/g, '\\\\');
}

/**
 * 转义字符串中的`"`
 *  例如原始的字符串为:
 *    `Have you read, "The Jungle"?`
 *  将其引号转义之后得到的字符串为:
 *    `Have you read, \"The Jungle\"?`
 */
function escapeDoubleQuote(str: string): string {
  // 注意, 这里不能使用replaceAll, 因为替换过去的字符含有原字符, 会出现死循环
  return str.replace(/"/g, '\\"');
}

// string.replace函数调用一次只能替换一个, 需要全部替换
// Copy from: https://stackoverflow.com/a/55698996
function replaceAll(text: string, busca: string, reemplaza: string) {
  while (text.toString().indexOf(busca) !== -1) {
    text = text.toString().replace(busca, reemplaza);
  }
  return text;
}

export {
  longestMatchCharsFromStart,
  checkLanguageId,
  trim,
  trimLeft,
  escapeDoubleQuote,
  escapeReverseSlash,
  replaceAll,
  trimRight
};
