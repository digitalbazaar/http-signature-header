/*!
 * This implementation was based in part on
 * https://github.com/joyent/node-http-signature
 * Copyright 2012 Joyent, Inc.  All rights reserved.
 *
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const chai = require('chai');
const http = require('http');
const httpSignatureHeader = require('..');
const should = chai.should();
const uuid = require('uuid/v4');

let commonOptions = null;
let server = null;
let socket = null;

describe('parseRequest API', () => {
  before(() => {
    socket = '/tmp/.' + uuid();
    commonOptions = {
      socketPath: socket,
      path: '/',
      headers: {}
    };

    server = http.createServer((req, res) => server.tester(req, res));

    server.listen(socket);
  });

  after(() => {
    server.close();
  });

  it('no authorization', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal(
          'no authorization header present in the request');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('bad scheme', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('scheme was not "Signature"');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization = 'Basic blahBlahBlah';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('no key id', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('keyId was not specified');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization = 'Signature foo';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('key id no value', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('keyId was not specified');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization = 'Signature keyId=';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('key id no quotes', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('bad param format');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId=foo,algorithm=hmac-sha1,signature=aabbcc';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('key id param quotes', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('bad param format');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization = 'Signature "keyId"="key"';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('param name with space', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('bad param format');
      }

      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization = 'Signature key Id="key"';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('no signature', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('signature was not specified');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization = 'Signature keyId="foo",algorithm="foo"';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('no date header', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('date was not in the request');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('valid default headers', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        should.not.exist(err);
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
    options.headers.Date = new Date().toUTCString();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('valid expires header', done => {
    server.tester = (req, res) => {
      const options = {
        headers: ['expires']
      };

      try {
        httpSignatureHeader.parseRequest(req, options);
      } catch(err) {
        should.not.exist(err);
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="foo",algorithm="rsa-sha256",' +
      'headers="expires",signature="aaabbbbcccc"';
    options.headers.Expires = new Date(Date.now() + 600000).toUTCString();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('explicit headers missing', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(req);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('digest was not in the request');
      }

      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="foo",algorithm="rsa-sha256",' +
      'headers="date digest",signature="aaabbbbcccc"';
    options.headers.Date = new Date().toUTCString();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('valid explicit headers request-target', done => {
    server.tester = (req, res) => {
      const parsed = httpSignatureHeader.parseRequest(req);
      res.writeHead(200);
      res.write(JSON.stringify(parsed, null, 2));
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="fo,o",algorithm="RSA-sha256",' +
      'headers="dAtE dIgEsT (request-target)",' +
      'extensions="blah blah",signature="digitalSignature"';
    options.headers.Date = new Date().toUTCString();
    options.headers.digest = uuid();

    http.get(options, res => {
      res.statusCode.should.equal(200);

      let body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', () => {
        const parsed = JSON.parse(body);
        should.exist(parsed);
        parsed.scheme.should.equal('Signature');
        should.exist(parsed.params);
        parsed.params.keyId.should.equal('fo,o');
        parsed.params.algorithm.should.equal('rsa-sha256');
        parsed.params.extensions.should.equal('blah blah');
        should.exist(parsed.params.headers);
        parsed.params.headers.length.should.equal(3);
        parsed.params.headers[0].should.equal('date');
        parsed.params.headers[1].should.equal('digest');
        parsed.params.headers[2].should.equal('(request-target)');
        parsed.params.signature.should.equal('digitalSignature');
        should.exist(parsed.signingString);
        parsed.signingString.should.equal(
          'date: ' + options.headers.Date + '\n' +
          'digest: ' + options.headers['digest'] + '\n' +
          '(request-target): get /');
        parsed.params.keyId.should.equal(parsed.keyId);
        parsed.params.algorithm.toUpperCase().should.equal(parsed.algorithm);
        done();
      });
    });
  });
  it('valid custom headers with multiple values', done => {
    server.tester = (req, res) => {
      const parsed = httpSignatureHeader.parseRequest(req);
      res.writeHead(200);
      res.write(JSON.stringify(parsed, null, 2));
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="fo,o",algorithm="RSA-sha256",' +
      'headers="x-custom dAtE dIgEsT (request-target)",' +
      'extensions="blah blah",signature="digitalSignature"';
    options.headers.Date = new Date().toUTCString();
    options.headers.digest = uuid();
    options.headers['x-custom'] = ['val1', 'val2'];

    http.get(options, res => {
      res.statusCode.should.equal(200);

      let body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', () => {
        const parsed = JSON.parse(body);
        should.exist(parsed);
        parsed.scheme.should.equal('Signature');
        should.exist(parsed.params);
        parsed.params.keyId.should.equal('fo,o');
        parsed.params.algorithm.should.equal('rsa-sha256');
        parsed.params.extensions.should.equal('blah blah');
        should.exist(parsed.params.headers);
        parsed.params.headers.length.should.equal(4);
        parsed.params.headers[0].should.equal('x-custom');
        parsed.params.headers[1].should.equal('date');
        parsed.params.headers[2].should.equal('digest');
        parsed.params.headers[3].should.equal('(request-target)');
        parsed.params.signature.should.equal('digitalSignature');
        should.exist(parsed.signingString);
        parsed.signingString.should.equal(
          'x-custom: ' + options.headers['x-custom'].join(', ') + '\n' +
          'date: ' + options.headers.Date + '\n' +
          'digest: ' + options.headers['digest'] + '\n' +
          '(request-target): get /');
        parsed.params.keyId.should.equal(parsed.keyId);
        parsed.params.algorithm.toUpperCase().should.equal(parsed.algorithm);
        done();
      });
    });
  });
  it('expired via clock skew', done => {
    server.tester = (req, res) => {
      const options = {
        clockSkew: 1,
        headers: ['date']
      };

      setTimeout(() => {
        try {
          httpSignatureHeader.parseRequest(req, options);
        } catch(err) {
          err.name.should.equal('ConstraintError');
          err.message.should.match(
            /Clock skew of \d\.\d+s was greater than 1s/);
        }
        res.writeHead(200);
        res.end();
      }, 1200);
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="f,oo",algorithm="RSA-sha256",' +
      'headers="dAtE dIgEsT",signature="digitalSignature"';
    options.headers.Date = new Date().toUTCString();
    options.headers.digest = uuid();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('expired via "Expires" header', done => {
    server.tester = (req, res) => {
      const options = {
        headers: ['expires']
      };

      setTimeout(() => {
        try {
          httpSignatureHeader.parseRequest(req, options);
        } catch(err) {
          err.name.should.equal('ConstraintError');
          err.message.should.equal('The request has expired.');
        }
        res.writeHead(200);
        res.end();
      }, 1200);
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="f,oo",algorithm="RSA-sha256",' +
      'headers="exPiRes dIgEsT",signature="digitalSignature"';
    options.headers.Expires = new Date().toUTCString();
    options.headers.digest = uuid();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('missing required header', done => {
    server.tester = (req, res) => {
      const options = {
        clockSkew: 1,
        headers: ['date', 'x-unit-test']
      };
      try {
        httpSignatureHeader.parseRequest(req, options);
      } catch(err) {
        err.name.should.equal('SyntaxError');
        err.message.should.equal('x-unit-test was not a signed header');
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="f,oo",algorithm="RSA-sha256",' +
      'headers="dAtE cOntEnt-MD5",signature="digitalSignature"';
    options.headers.Date = new Date().toUTCString();
    options.headers['content-md5'] = uuid();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('valid mixed case headers', done => {
    server.tester = (req, res) => {
      const options = {
        clockSkew: 1,
        headers: ['Date', 'Content-MD5']
      };
      try {
        httpSignatureHeader.parseRequest(req, options);
      } catch(err) {
        should.not.exist(err);
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers.Authorization =
      'Signature keyId="f,oo",algorithm="RSA-sha256",' +
      'headers="dAtE cOntEnt-MD5",signature="digitalSignature"';
    options.headers.Date = new Date().toUTCString();
    options.headers['content-md5'] = uuid();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
  it('valid custom authorizationHeaderName', done => {
    server.tester = (req, res) => {
      try {
        httpSignatureHeader.parseRequest(
          req, {authorizationHeaderName: 'x-auth'});
      } catch(err) {
        should.not.exist(err);
      }
      res.writeHead(200);
      res.end();
    };

    const options = {...commonOptions};
    options.headers = {};
    options.headers['x-auth'] =
      'Signature keyId="foo",algorithm="rsa-sha256",signature="aaabbbbcccc"';
    options.headers.Date = new Date().toUTCString();

    http.get(options, res => {
      res.statusCode.should.equal(200);
      done();
    });
  });
});
