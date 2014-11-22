//     telegram-mt-node
//     Copyright 2014 Enrico Stara 'enrico.stara@gmail.com'
//     Released under the MIT License
//     https://github.com/enricostara/telegram-mt-node

// Export functions
exports.rsaEncrypt = rsaEncrypt;
exports.aesDecrypt = aesDecrypt;
exports.aesEncrypt = aesEncrypt;

// Import dependencies
var BigInteger = require('jsbn');
var CryptoJS = require("node-cryptojs-aes").CryptoJS;
var getLogger = require('get-log');

// RSA encrypt function, param: { key: publicKey, message: messageBuffer }
function rsaEncrypt(param) {
    var logger = getLogger('security.cipher.rsaEncrypt');

    var publicKey = param.key;
    var messageBuffer = param.message;
    var messageLength = messageBuffer.length;
    if (!messageBuffer || messageLength > 255) {
        logger.warn('Message is undefined or exceeds 255 bytes length.');
        return;
    }
    if (messageLength < 255) {
        // Add random bytes as padding
        var paddingLength = 255 - messageLength;
        messageBuffer = Buffer.concat([messageBuffer, createRandomBuffer(paddingLength)]);
    }
    if (logger.isDebugEnabled()) logger.debug('Message to be encrypt (%s) = %s',
        messageBuffer.length, messageBuffer.toString('hex'));
    // Encrypt the message
    var modulus = new BigInteger(publicKey.getModulus(), 16);
    var exponent = new BigInteger(publicKey.getExponent(), 16);
    var message = new BigInteger(messageBuffer);
    var encryptedMessage = new Buffer(message.modPowInt(exponent, modulus).toByteArray());
    if (encryptedMessage.length > 256) {
        encryptedMessage = encryptedMessage.slice(encryptedMessage.length - 256);
    }
    if (logger.isDebugEnabled()) logger.debug('Encrypted message(%s) = %s', encryptedMessage.length, encryptedMessage.toString('hex'));
    return encryptedMessage;
}

// AES decrypt function
function aesDecrypt(msg, key, iv) {
    var logger = getLogger('security.cipher.aesDecrypt');
    var encryptedMsg = buffer2WordArray(msg);
    var keyWordArray = buffer2WordArray(key);
    var ivWordArray = buffer2WordArray(iv);
    if (logger.isDebugEnabled()) {
        logger.debug('encryptedMsg = %s', JSON.stringify(encryptedMsg));
        logger.debug('keyWordArray = %s', JSON.stringify(keyWordArray));
        logger.debug('ivWordArray = %s', JSON.stringify(ivWordArray));
    }
    var decryptedWordArray = CryptoJS.AES.decrypt({ciphertext: encryptedMsg}, keyWordArray, {
        iv: ivWordArray,
        padding: CryptoJS.pad.NoPadding,
        mode: CryptoJS.mode.IGE
    });
    if (logger.isDebugEnabled()) logger.debug('decryptedWordArray = %s', JSON.stringify(decryptedWordArray));
    return wordArray2Buffer(decryptedWordArray);
}

// AES encrypt function
function aesEncrypt(msg, key, iv) {
    var logger = getLogger('security.cipher.aesEncrypt');
    // Check if padding is needed
    var padding = msg.length % 16;
    if (padding > 0) {
        paddingBuffer = createRandomBuffer(16 - padding);
        msg = Buffer.concat([msg, paddingBuffer]);
    }
    // Convert buffers to wordArrays
    var plainMsg = buffer2WordArray(msg);
    var keyWordArray = buffer2WordArray(key);
    var ivWordArray = buffer2WordArray(iv);
    if (logger.isDebugEnabled()) {
        logger.debug('plainMsg = %s', JSON.stringify(plainMsg));
        logger.debug('keyWordArray = %s', JSON.stringify(keyWordArray));
        logger.debug('ivWordArray = %s', JSON.stringify(ivWordArray));
    }
    // Encrypt plain message
    var encryptedWordArray = CryptoJS.AES.encrypt(plainMsg, keyWordArray, {
        iv: ivWordArray,
        padding: CryptoJS.pad.NoPadding,
        mode: CryptoJS.mode.IGE
    }).ciphertext;
    if (logger.isDebugEnabled()) logger.debug('encryptedWordArray = %s', JSON.stringify(encryptedWordArray));
    // Return the encrypted buffer
    return wordArray2Buffer(encryptedWordArray);
}

function buffer2WordArray(buffer) {
    var length = buffer.length;
    var wordArray = [];
    for (var i = 0; i < length; i++) {
        wordArray[i >>> 2] |= buffer[i] << (24 - 8 * (i % 4));
    }
    return new CryptoJS.lib.WordArray.init(wordArray, length);
}

function wordArray2Buffer(wordArray) {
    var words = wordArray.words;
    var sigBytes = wordArray.sigBytes;
    var buffer = new Buffer(sigBytes);
    for (var i = 0; i < sigBytes; i++) {
        buffer.writeUInt8((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff, i);
    }
    return buffer;
}