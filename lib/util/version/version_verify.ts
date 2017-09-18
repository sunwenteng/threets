import Version = require('./version');

function eq(a:Version, b:Version):boolean {
    for (var i = 0; i < 3; i += 1) {
        if (b.v[i] !== -1 && a.v[i] !== b.v[i]) return false;
    }
    return true;
}

function g(a:Version, b:Version):boolean {
    for (var i = 0; i < 3; i += 1) {
        if (b.v[i] === -1) return false;
        if (a.v[i] < b.v[i]) return false;
        if (a.v[i] > b.v[i]) return true;
    }
    return false;
}

function ge(a:Version, b:Version):boolean {
    for (var i = 0; i < 3; i += 1) {
        if (b.v[i] === -1) return true;
        if (a.v[i] < b.v[i]) return false;
    }
    return true;
}

function l(a:Version, b:Version):boolean {
    for (var i = 0; i < 3; i += 1) {
        if (b.v[i] === -1) return false;
        if (a.v[i] > b.v[i]) return false;
        if (a.v[i] < b.v[i]) return true;
    }
    return false;
}

function le(a:Version, b:Version):boolean {
    for (var i = 0; i < 3; i += 1) {
        if (b.v[i] === -1) return true;
        if (a.v[i] > b.v[i]) return false;
    }
    return true;
}

class Expression {
    symbol:string = '';
    version:Version = new Version();

    public verify(version:Version):boolean {
        switch (this.symbol) {
            case '=':
                return eq(version, this.version);
            case '>':
                return g(version, this.version);
            case '<':
                return l(version, this.version);
            case '>=':
                return ge(version, this.version);
            case '<=':
                return le(version, this.version);
            default:
                return false;
        }
    }
}

class ExpressionGroup {
    expressions:Expression[] = [];
    public loadString(expressions:string):void {
        var expressList = expressions.split('&');
        var error:Error = null;
        expressList.forEach((strExpress) => {
            var expression = new Expression();
            try {
                switch (strExpress[0]) {
                    case '>':
                    case '<':
                        switch (strExpress[1]) {
                            case '=':
                                expression.symbol = strExpress.substr(0, 2);
                                expression.version.loadString(strExpress.substr(2));
                                break;
                            default:
                                expression.symbol = strExpress.substr(0, 1);
                                expression.version.loadString(strExpress.substr(1));
                                break;
                        }
                        break;
                    case '=':
                        expression.symbol = strExpress.substr(0, 1);
                        expression.version.loadString(strExpress.substr(1));
                        break;
                    default:
                        expression.symbol = '=';
                        expression.version.loadString(strExpress);
                        break;
                }

                this.expressions.push(expression);
            } catch (err) {
                if (!error) {
                    error = err;
                }
            }
        });
        if (error) {
            error.message = 'In Group [' + expressions + ']: ' + error.message;
            throw error;
        }

    }

    public verify(version:Version):boolean {
        return this.expressions.every((exp) => {
            return exp.verify(version);
        });
    }
}

class VersionVerify {
    groups:ExpressionGroup[] = [];
    hasError:boolean = false;

    constructor(expression?:string) {
        if (expression) {
            this.loadExpression(expression);
        }
    }

    public loadExpression(statement:string):void {
        var express = statement.replace(/\s+/g, '');
        var groupList = express.split('|');
        this.hasError = false;
        var error = null;
        groupList.forEach((strGroup) => {
            try {
                var group = new ExpressionGroup();
                group.loadString(strGroup);
                this.groups.push(group);
            } catch (err) {
                this.hasError = true;
                error = err;
            }
        });
        if (error) {
            throw error;
        }
    }

    public verify(strVersion:string):boolean {
        if (this.hasError) return false;
        var version = new Version(strVersion);
        return this.groups.some((group) => {
            return group.verify(version);
        });
    }
}

export = VersionVerify;