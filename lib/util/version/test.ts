import VersionVerify = require('./version_verify');

var verify = new VersionVerify();
try {
    verify.loadExpression('>= 1.2.0 & <1.4.0|1.6.x');
} catch (err) {
    console.log(err.message);
}

console.log(verify.verify('1.7.1'));
console.log(verify.verify('1.6.12'));
console.log(verify.verify('1.6.0'));
console.log(verify.verify('1.5.0'));
console.log(verify.verify('1.4.0'));
console.log(verify.verify('1.3.0'));
console.log(verify.verify('1.2.2'));
console.log(verify.verify('1.1.0'));