"use strict";
// vim: ts=2 sw=2 sts=2 et:
/*
 *=======================================================================
 *    Filename: funcToken
 *
 *     Version: 1.0
 *  Created on: August 15, 2019
 *
 *      Author: corvofeng
 *=======================================================================
 */

import { Logger } from "../logger";

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
  var start = 0,
    end = str.length;

  while (start < end && ch.indexOf(str[start]) >= 0)
    ++start;

  while (end > start && ch.indexOf(str[end - 1]) >= 0)
    --end;

  return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}

class FuncArg {
  argName: string;
  argType: string;
  argDefault: string;

  constructor(argName: string, argType: string = '', argDefault: string = '') {
    this.argName = argName;
    this.argType = argType;
    this.argDefault = trim(argDefault, ['"', "'"]);
  }
  isSameArgs(args: FuncArg): boolean {
    if (this.argName !== args.argName || this.argType !== args.argType || this.argDefault !== args.argDefault) {
      return false;
    }
    return true
  }
}

class FuncToken {
  static NORMAL = 0x1;
  static DOXYGEN = 0x2;
  static SPHINX = 0x3;
  static GOOGLE = 0x4;
  static NUMPY = 0x5;
  static JEDI = 0x6;

  funcName: string;
  funcArgs: Array<FuncArg>;
  funcRets: Array<FuncArg>;

  constructor(
    funcName: string,
    funcArgs: Array<FuncArg>,
    funcRets: Array<FuncArg>,
  ) {
    this.funcName = funcName;
    this.funcArgs = funcArgs;
    this.funcRets = funcRets;
  }

  static constructRetFromTokens(tokens: Array<string>): Array<FuncArg> {
    let retList: Array<FuncArg> = [];
    if (tokens.length === 0) {
      return retList;
    }
    let retType = tokens[0];

    if (tokens.length > 1) {
      Logger.warn("The ts return type length is bigger than 1: ", tokens);
    }
    if (retType === '') {
      return retList;
    }

    retList.push(new FuncArg('', retType));

    return retList;
  }

  static format_arg(arg: FuncArg, style: number, prefix: string = '') {
    let rlt = '';
    switch (style) {
      case FuncToken.DOXYGEN:
        rlt = `${prefix}@param ${arg.argName} TODO`;
        break;

      case FuncToken.SPHINX:
        rlt = `${prefix}:param ${arg.argName}: TODO`;
        if (arg.argType) {
          rlt += `${prefix}\n`
          rlt += `${prefix}:type ${arg.argName}: ${arg.argType}`;
        }
        break;

      case FuncToken.GOOGLE:
        rlt = `${prefix}${arg.argName} (${arg.argType || "TODO"}): TODO`;
        break;
      case FuncToken.JEDI:
        rlt = `${prefix}:type ${arg.argName}: TODO`;
        break;

      case FuncToken.NUMPY:
        rlt = `${prefix}${arg.argName} : TODO`
        break;

      default:
        break;
    }
    return rlt;
  }

  static format_return(style: number, prefix: string = '') {
    let rlt = '';
    switch (style) {
      case PyFuncToken.DOXYGEN:
        rlt = `${prefix}@return: TODO`;
        break;

      case PyFuncToken.NORMAL:
      case PyFuncToken.SPHINX:
      case PyFuncToken.JEDI:
        rlt = `${prefix}:returns: TODO`;
        break;

      case PyFuncToken.GOOGLE:
        rlt = `${prefix}Returns: TODO`;
        break;

      default:
        break;
    }
    return rlt;
  }

  // 比较两个token是不是一个
  isSameToken(token: FuncToken): boolean {
    if (this.funcName !== token.funcName) {
      return false;
    }

    function isContainsA1(a1: Array<FuncArg>, a2: Array<FuncArg>): boolean {
      // 判断A1的每个数据是不是在A2中
      let isInA2 = true;
      a1.forEach((a1Arg: FuncArg) => {
        if (!isInA2 == false) return;

        let tmpIS = false; // 检查其中的某个元素是不是在A2
        a2.forEach((a2Arg: FuncArg) => {
          if (a1Arg.isSameArgs(a2Arg)) {
            tmpIS = true;
          }
        });

        if (!tmpIS) {
          isInA2 = false;
        }
      });

      return isInA2;
    }
    function isSameArgs(a1: Array<FuncArg>, a2: Array<FuncArg>): boolean {
      if (a1.length !== a2.length) {
        return false;
      }
      // a1 全部包含在 a2 并且 a2 全部包含在 a1
      if (!isContainsA1(a1, a2) || !isContainsA1(a2, a1)) {
        return false;
      }

      return true;
    }

    if (!isSameArgs(this.funcArgs, token.funcArgs) ||
      !isSameArgs(this.funcRets, token.funcRets)
    ) {
      return false
    }

    return true;
  }
}

class ClassToken {
  className: string;
  superClasses: Array<string>;
  constructor(
    className: string,
    superClasses: Array<string>,
  ) {
    this.className = className;
    this.superClasses = superClasses;
  }
}

class PyFuncToken extends FuncToken {

  /**
   * 根据tokens构建参数列表
   * @param tokens 
   */
  static constructArgFromTokens(tokens: Array<string>): Array<FuncArg> {
    let argList: Array<FuncArg> = [];
    tokens.forEach((tok) => {
      const tokPattern = /^(\**\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/;
      let [_, argName, argType, argDefault] = tokPattern.exec(tok) as RegExpExecArray;

      argList.push(new FuncArg(argName, argType, argDefault));
    });
    return argList;
  }

  getSnip(style: number) {
    let doc = '';
    this.funcArgs.forEach((arg) => {
      if (arg.argName == 'self') {
        return;
      }
      doc += FuncToken.format_arg(arg, style) + '\n';
    });
    doc += FuncToken.format_return(style);
    return doc;
  }
}


class TsFuncToken extends FuncToken {
  /**
   * 根据tokens构建参数列表
   * @param tokens 
   */
  static constructArgFromTokens(tokens: Array<string>): Array<FuncArg> {
    let argList: Array<FuncArg> = [];
    tokens.forEach((tok) => {
      const tokPattern = /^((?:\.\.\.)?\w+\??)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/;
      let [_, argName, argType, argDefault] = tokPattern.exec(tok) as RegExpExecArray;

      if (argName.startsWith('...')) { // 以'...'开头的参数, 说明是不定参数
        if (argType === undefined) { // 如果TS中没有指定argType, 我们给定一个
          argType = 'object[]'
        }
        argName = argName.substr(3);
      }

      argList.push(new FuncArg(argName, argType, argDefault));
    });
    return argList;
  }

  getSnip(style: number) {
    let doc = '';
    this.funcArgs.forEach((arg) => {
      if (arg.argName == 'self') {
        return;
      }
      doc += FuncToken.format_arg(arg, style, ' * ') + '\n';
    });
    doc += FuncToken.format_return(style, ' * ');
    return doc;
  }
}

class PyClassToken extends ClassToken {

}

export { FuncArg, PyFuncToken, PyClassToken, TsFuncToken };

