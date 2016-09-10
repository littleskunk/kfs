'use strict';

var os = require('os');
var path = require('path');
var utils = require('../lib/utils');
var Btable = require('../lib/b-table');
var expect = require('chai').expect;
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var constants = require('../lib/constants');
var crypto = require('crypto');
var sinon = require('sinon');

describe('Btable/Integration', function() {

  var TMP_DIR = path.join(os.tmpdir(), 'KFS_SANDBOX');
  var TABLE_PATH = path.join(TMP_DIR, 'testdb');
  var db = null;

  before(function(done) {
    if (utils.fileDoesExist(TMP_DIR)) {
      rimraf.sync(TMP_DIR);
    }
    mkdirp(TMP_DIR, function() {
      db = new Btable(TABLE_PATH);
      done();
    });
  });

  describe('#getSpaceAvailableForKey', function() {

    it('should callback with correct free space for key', function(done) {
      var key = utils.createReferenceId().toString('hex');
      db.getSpaceAvailableForKey(key, function(e, free) {
        expect(e).to.equal(null);
        expect(free).to.equal(constants.S);
        done();
      });
    });

    it('should callback with error if Sbucket#stat fails', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        null,
        { stat: sinon.stub().callsArgWith(0, new Error('Failed')) }
      );
      var key = utils.createReferenceId().toString('hex');
      db.getSpaceAvailableForKey(key, function(e) {
        _getSbucketForKey.restore();
        expect(e.message).to.equal('Failed');
        done();
      });

    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.getSpaceAvailableForKey('0000', function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  describe('#writeFile', function() {

    it('should write the file to the database', function(done) {
      var fileData = new Buffer('hello kfs!');
      var fileHash = crypto.createHash('sha1').update(fileData).digest('hex');
      db.writeFile(fileHash, fileData, function(err) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.writeFile('0000', Buffer([]), function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  describe('#createWriteStream', function() {

    it('should write the stream to the database', function(done) {
      var fileData = new Buffer('kfs hello!');
      var fileHash = crypto.createHash('sha1').update(fileData).digest('hex');
      db.createWriteStream(fileHash, function(err, writableStream) {
        expect(err).to.equal(null);
        writableStream.on('finish', done);
        writableStream.on('error', done);
        writableStream.write(fileData);
        writableStream.end();
      });
    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.createWriteStream('0000', function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  describe('#stat', function() {

    it('should return the stats fo all buckets', function(done) {
      db.stat(function(err, results) {
        expect(results).to.have.lengthOf(3);
        done();
      });
    });

    it('should bubble errors from _getSbucketForKey', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.stat(function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

    it('should bubble errors from Sbucket#stat', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        null,
        { stat: sinon.stub().callsArgWith(0, new Error('Failed')) }
      );
      db.stat(function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });

    });

  });

  describe('#readFile', function() {

    it('should read the file from the database', function(done) {
      var fileData = new Buffer('hello kfs!');
      var fileHash = crypto.createHash('sha1').update(fileData).digest('hex');
      db.readFile(fileHash, function(err, result) {
        expect(err).to.equal(null);
        expect(Buffer.compare(result, fileData)).to.equal(0);
        done();
      });
    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.readFile('0000', function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  describe('#createReadStream', function() {

    it('should write the stream to the database', function(done) {
      var fileData = new Buffer('kfs hello!');
      var fileHash = crypto.createHash('sha1').update(fileData).digest('hex');
      db.createReadStream(fileHash, function(err, readableStream) {
        expect(err).to.equal(null);
        var data = Buffer([]);
        readableStream.on('data', function(chunk) {
          data = Buffer.concat([data, chunk]);
        });
        readableStream.on('end', function() {
          expect(Buffer.compare(fileData, data)).to.equal(0);
          done();
        });
        readableStream.on('error', done);
      });
    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.createReadStream('0000', function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  describe('#exists', function() {

    it('should callback true for a existing key', function(done) {
      var fileData = new Buffer('hello kfs!');
      var fileHash = crypto.createHash('sha1').update(fileData).digest('hex');
      db.exists(fileHash, function(err, exists) {
        expect(exists).to.equal(true);
        done();
      });
    });

    it('should callback false for non-existent key', function(done) {
      var key = utils.createReferenceId().toString('hex');
      db.exists(key, function(err, exists) {
        expect(exists).to.equal(false);
        done();
      });
    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.exists('0000', function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  describe('#unlink', function() {

    it('should destroy the file from the database', function(done) {
      var fileData = new Buffer('hello kfs!');
      var fileHash = crypto.createHash('sha1').update(fileData).digest('hex');
      db.unlink(fileHash, function(err) {
        expect(err).to.equal(null);
        db.exists(fileHash, function(err, exists) {
          expect(exists).to.equal(false);
          done();
        });
      });
    });

    it('should callback with error if cannot get bucket', function(done) {
      var _getSbucketForKey = sinon.stub(db, '_getSbucketForKey').callsArgWith(
        1,
        new Error('Failed')
      );
      db.unlink('0000', function(err) {
        _getSbucketForKey.restore();
        expect(err.message).to.equal('Failed');
        done();
      });
    });

  });

  after(function() {
    rimraf.sync(TMP_DIR);
  });

});

