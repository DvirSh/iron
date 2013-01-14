// Load modules

var Crypto = require('crypto');
var Chai = require('chai');
var Hoek = require('hoek');
var Iron = process.env.TEST_COV ? require('../lib-cov') : require('../lib');
var Cryptiles = require('cryptiles');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Iron', function () {

    var obj = {
        a: 1,
        b: 2,
        c: [3, 4, 5],
        d: {
            e: 'f'
        }
    };

    var password = 'some_not_random_password';

    it('turns object into a ticket than parses the ticket successfully', function (done) {

        Iron.seal(obj, { id: '1', secret: password }, Iron.defaults, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { '1': password }, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });
    });

    it('fails to parse a sealed object when password not found', function (done) {

        Iron.seal(obj, { id: '1', secret: password }, Iron.defaults, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { '2': password }, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Cannot find password: 1');
                done();
            });
        });
    });

    describe('#generateKey', function () {

        it('returns an error when password is missing', function (done) {

            Iron.generateKey(null, null, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('returns an error when options are missing', function (done) {

            Iron.generateKey('password', null, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Bad options');
                done();
            });
        });

        it('returns an error when an unknown algorithm is specified', function (done) {

            Iron.generateKey('password', { algorithm: 'unknown' }, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Unknown algorithm: unknown');
                done();
            });
        });

        it('returns an error when no salt or salt bits are provided', function (done) {

            var options = {
                algorithm: 'sha256',
                iterations: 2
            };

            Iron.generateKey('password', options, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Missing salt or saltBits options');
                done();
            });
        });

        it('returns an error when invalid salt bits are provided', function (done) {

            var options = {
                saltBits: 99999999999999999999,
                algorithm: 'sha256',
                iterations: 2
            };

            Iron.generateKey('password', options, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Failed generating random bits: Argument #1 must be number > 0');
                done();
            });
        });

        it('returns an error when Cryptiles.randomBits fails', function (done) {

            var orig = Cryptiles.randomBits;
            Cryptiles.randomBits = function (bits) {

                return new Error('fake');
            };

            var options = Hoek.clone(Iron.defaults.encryptionKey);
            options.salt = 'abcdefg';
            Iron.generateKey('password', options, function (err, result) {

                Cryptiles.randomBits = orig;
                expect(err).to.exist;
                expect(err.message).to.equal('fake');
                done();
            });
        });

        it('returns an error when Crypto.pbkdf2 fails', function (done) {

            var orig = Crypto.pbkdf2;
            Crypto.pbkdf2 = function (v1, v2, v3, v4, callback) {

                return callback(new Error('fake'));
            };

            Iron.generateKey('password', Iron.defaults.encryptionKey, function (err, result) {

                Crypto.pbkdf2 = orig;
                expect(err).to.exist;
                expect(err.message).to.equal('fake');
                done();
            });
        });
    });

    describe('#encrypt', function () {

        it('returns an error when password is missing', function (done) {

            Iron.encrypt(null, null, 'data', function (err, encrypted, key) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });
    });

    describe('#decrypt', function () {

        it('returns an error when password is missing', function (done) {

            Iron.decrypt(null, null, 'data', function (err, encrypted, key) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });
    });

    describe('#hmacWithPassword ', function () {

        it('returns an error when password is missing', function (done) {

            Iron.hmacWithPassword(null, null, 'data', function (err, result) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });
    });

    describe('#seal', function () {

        it('returns an error when password is missing', function (done) {

            Iron.seal('data', null, {}, function (err, sealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('returns an error when integrityKey options are missing', function (done) {

            var options = {
                encryptionKey: {
                    saltBits: 256,
                    algorithm: 'aes-256-cbc',
                    iterations: 1
                },
                integrityKey: {}
            };

            Iron.seal('data', 'password', options, function (err, sealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Unknown algorithm: undefined');
                done();
            });
        });
    });

    describe('#unseal', function () {

        it('unseals a ticket', function (done) {

            var ticket = 'Fe26.1::2bf1acf8622851cb8d57eb5e5d4c16f88fab29250b10c700ad39810798674959:3GV1tOKCvuLuHEPMlMPFOA:nLuYfC1mMsYth7DWrWwQS3cJHtxthhXxFfstYd2CCsPIHqoKq8Aw0HPoeVmHwmTS:83c5ec4ec07f0c8f108dd2c198a18e2f360f00d6be18ecb630ab8afba9396987:zvQKQkPEeDTTDnx7cJ62QxCgkxH910j_HMsnHyTXOY4';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });

        it('returns an error when number of sealed components is wrong', function (done) {

            var ticket = 'x:Fe26.1::2bf1acf8622851cb8d57eb5e5d4c16f88fab29250b10c700ad39810798674959:3GV1tOKCvuLuHEPMlMPFOA:nLuYfC1mMsYth7DWrWwQS3cJHtxthhXxFfstYd2CCsPIHqoKq8Aw0HPoeVmHwmTS:83c5ec4ec07f0c8f108dd2c198a18e2f360f00d6be18ecb630ab8afba9396987:zvQKQkPEeDTTDnx7cJ62QxCgkxH910j_HMsnHyTXOY4';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Incorrect number of sealed components');
                done();
            });
        });

        it('returns an error when password is missing', function (done) {

            var ticket = 'Fe26.1::2bf1acf8622851cb8d57eb5e5d4c16f88fab29250b10c700ad39810798674959:3GV1tOKCvuLuHEPMlMPFOA:nLuYfC1mMsYth7DWrWwQS3cJHtxthhXxFfstYd2CCsPIHqoKq8Aw0HPoeVmHwmTS:83c5ec4ec07f0c8f108dd2c198a18e2f360f00d6be18ecb630ab8afba9396987:zvQKQkPEeDTTDnx7cJ62QxCgkxH910j_HMsnHyTXOY4';
            Iron.unseal(ticket, null, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('returns an error when mac prefix is wrong', function (done) {

            var ticket = 'Fe27.1::2bf1acf8622851cb8d57eb5e5d4c16f88fab29250b10c700ad39810798674959:3GV1tOKCvuLuHEPMlMPFOA:nLuYfC1mMsYth7DWrWwQS3cJHtxthhXxFfstYd2CCsPIHqoKq8Aw0HPoeVmHwmTS:83c5ec4ec07f0c8f108dd2c198a18e2f360f00d6be18ecb630ab8afba9396987:zvQKQkPEeDTTDnx7cJ62QxCgkxH910j_HMsnHyTXOY4';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Wrong mac prefix');
                done();
            });
        });

        it('returns an error when integrity check fails', function (done) {

            var ticket = 'Fe26.1::2bf1acf8622851cb8d57eb5e5d4c16f88fab29250b10c700ad39810798674959:3GV1tOKCvuLuHEPMlMPFOA:nLuYfC1mMsYth7DWrWwQS3cJHtxthhXxFfstYd2CCsPIHqoKq8Aw0HPoeVmHwmTS:83c5ec4ec07f0c8f108dd2c198a18e2f360f00d6be18ecb630ab8afba9396987X:zvQKQkPEeDTTDnx7cJ62QxCgkxH910j_HMsnHyTXOY4';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Bad hmac value');
                done();
            });
        });

        it('returns an error when decryption fails', function (done) {

            var macBaseString = 'Fe26.1::2bf1acf8622851cb8d57eb5e5d4c16f88fab29250b10c700ad39810798674959:3GV1tOKCvuLuHEPMlMPFOA:nLuYfC1mMsYth7DWrWwQS3cJHtxthhXxFfstYd2CCsPIHqoKq8Aw0HPoeVmHwmTS??';
            var options = Hoek.clone(Iron.defaults.integrityKey);
            options.salt = 'zvQKQkPEeDTTDnx7cJ62QxCgkxH910j_HMsnHyTXOY4';
            Iron.hmacWithPassword(password, options, macBaseString, function (err, mac) {

                var ticket = macBaseString + ':' + mac.salt + ':' + mac.digest;
                Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('Invalid character');
                    done();
                });
            });
        });

        it('returns an error when decrypted object is invalid', function (done) {

            var badJson = '{asdasd';
            Iron.encrypt(password, Iron.defaults.encryptionKey, badJson, function (err, encrypted, key) {

                var encryptedB64 = Hoek.base64urlEncode(encrypted);
                var iv = Hoek.base64urlEncode(key.iv);
                var macBaseString = Iron.macPrefix + '::' + key.salt + ':' + iv + ':' + encryptedB64;
                Iron.hmacWithPassword(password, Iron.defaults.integrityKey, macBaseString, function (err, mac) {

                    var ticket = macBaseString + ':' + mac.salt + ':' + mac.digest;
                    Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                        expect(err).to.exist;
                        expect(err.message).to.equal('Failed parsing sealed object JSON: Unexpected token a');
                        done();
                    });
                });
            });
        });
    });
});