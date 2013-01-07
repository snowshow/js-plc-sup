/*global test, PLCSuPClient, equal, sinon, Uint8Array, ok */
"use strict";

module("PLC Subscription Protocol Client");

var WebSocket = function () { };
WebSocket.prototype.send = function () { };

test('setValue', function () {

    var ws = new WebSocket(),
        mockWs = sinon.mock(ws),
        client = new PLCSuPClient(ws),
        cb = sinon.spy(),
        first = new Uint8Array([128, 0, 3, 255]).buffer,
        secnd = new Uint8Array([64, 0, 2, 234]).buffer,
        third = new Uint8Array([32, 0, 8, 5, 20]).buffer,
        furth = new Uint8Array([16, 0, 20, 0, 19, 214, 48]).buffer;

    mockWs.expects("send").once().withArgs(first);
    client.setValue("%MX0.3", true, cb);
    ws.onmessage({ data: new Uint8Array([132, 0, 3]).buffer });

    mockWs.expects("send").once().withArgs(secnd);
    client.setValue("%MB2", 234, cb);
    ws.onmessage({ data: new Uint8Array([68, 0, 2]).buffer });

    mockWs.expects("send").once().withArgs(third);
    client.setValue("%MW4", 1300, cb);
    ws.onmessage({ data: new Uint8Array([36, 0, 8]).buffer });

    mockWs.expects("send").once().withArgs(furth);
    client.setValue("%MD5", 1300000, cb);
    ws.onmessage({ data: new Uint8Array([20, 0, 20]).buffer });

    mockWs.expects("send").once().withArgs(
        new Uint8Array([16, 35, 40, 1, 2, 3, 4]).buffer);
    client.setValue("%MD9000", 16909060, cb);
    ws.onmessage({ data: new Uint8Array([24, 1]).buffer });
    ok(cb.withArgs(
        null, { opCode: 0, errCode: 1, name: "InvalidAddress" }).calledOnce); 

    mockWs.expects("send").once().withArgs(
        new Uint8Array([64, 0, 0, 15]).buffer);
    client.setValue("%MB0", 15, cb);
    ws.onmessage({ data: new Uint8Array([40, 0]).buffer });
    ok(cb.withArgs(
        null, { opCode: 0 ,errCode: 0, name: "InvalidRequest" }).calledOnce);

    equal(cb.withArgs().callCount, 6);

    mockWs.verify();

});

test('getValue', function () {

    var ws = new WebSocket(),
        mockWs = sinon.mock(ws),
        cb = sinon.spy(),
        client = new PLCSuPClient(ws),
        first = new Uint8Array([129, 0, 6]).buffer,
        secnd = new Uint8Array([65, 0, 15]).buffer,
        third = new Uint8Array([33, 12, 11]).buffer,
        fourth = new Uint8Array([17, 1, 66]).buffer;

    mockWs.expects("send").once().withArgs(first);
    client.getValue("%MX0.6", cb);
    ws.onmessage({ data: new Uint8Array([129, 0, 6, 255]).buffer });
    ok(cb.withArgs(true).calledOnce);

    mockWs.expects("send").once().withArgs(secnd);
    client.getValue("%MB15", cb);
    ws.onmessage({ data: new Uint8Array([65, 0, 15, 13]).buffer });
    ok(cb.withArgs(13).calledOnce);

    mockWs.expects("send").once().withArgs(third);
    client.getValue("%MW3083", cb);
    ws.onmessage({ data: new Uint8Array([33, 12, 11, 88, 33]).buffer });
    ok(cb.withArgs(22561).calledOnce);

    mockWs.expects("send").once().withArgs(fourth);
    client.getValue("%MD322", cb);
    ws.onmessage({ data: new Uint8Array([17, 1, 66, 1, 2, 3, 4]).buffer });
    ok(cb.withArgs(16909060).calledOnce);

    mockWs.verify();

});

test("subscribe", function () {

    var ws = new WebSocket(),
        mockWs = sinon.mock(ws),
        client = new PLCSuPClient(ws),
        cb = sinon.spy(),
        msgOne = new Uint8Array([130, 0, 6]).buffer,
        msgTwo = new Uint8Array([130, 0, 6, 66, 1, 0, 34, 0, 50, 18, 0, 3]).buffer;

    mockWs.expects("send").once().withArgs(msgOne);
    client.subscribe("%MX0.6", cb);
    ws.onmessage({ data: new Uint8Array([6, 0, 1]).buffer });
    ok(cb.withArgs(1));

    mockWs.expects("send").once().withArgs(msgTwo);
    client.subscribe("%MX0.6", "%MB255", "%MW50", "%MD3", cb);
    ws.onmessage({ data: new Uint8Array([6, 0, 5]).buffer });
    ok(cb.withArgs(5));

    // nothing happens
    client.subscribe();

    mockWs.verify();

});

test("update", function () {

    var ws = new WebSocket(),
        mockWs = sinon.mock(ws),
        cb = sinon.spy(),
        client = new PLCSuPClient(ws),
        updateOne,   // two updates for bit addresses 
        updateTwo,   // one byte address and one word address
        updateThree; // a single double word update

    client.on('update', cb);

    updateOne = new Uint8Array([142, 0, 6, 255, 142, 0, 5, 0]);
    updateTwo = new Uint8Array([78, 1, 0, 132, 46, 0, 16, 1, 2]);
    updateThree = new Uint8Array([30, 0, 3, 1, 2, 3, 4]);

    ws.onmessage({ data: updateOne.buffer });
    ws.onmessage({ data: updateTwo.buffer });
    ws.onmessage({ data: updateThree.buffer });

    ok(cb.withArgs({ opCode: 2, resCode: 12, values: [
        { address: 6, plcAddr: "%MX0.6", value: true, bitCount: 128 },
        { address: 5, plcAddr: "%MX0.5", value: false, bitCount: 128 }]}).calledOnce);

    ok(cb.withArgs({ opCode: 2, resCode: 12, values: [
        { address: 256, plcAddr: "%MB256", value: 132, bitCount: 64 },
        { address: 16, plcAddr: "%MW16", value: 258, bitCount: 32 }]}).calledOnce);

    ok(cb.withArgs({ opCode: 2, resCode: 12, values: [
        { address: 3, plcAddr: "%MD3", value: 16909060, bitCount: 16 }]}).calledOnce);

});

test('process multiple messages', function () {

    var ws = new WebSocket(),
        mockWs = sinon.mock(ws),
        cb = sinon.spy(),
        client = new PLCSuPClient(ws),
        first = new Uint8Array([129, 0, 6]).buffer,
        secnd = new Uint8Array([65, 0, 15]).buffer,
        third = new Uint8Array([33, 12, 11]).buffer,
        fourth = new Uint8Array([17, 1, 66]).buffer;

    mockWs.expects("send").once().withArgs(first);
    mockWs.expects("send").once().withArgs(secnd);

    client.getValue("%MX0.6", cb);
    client.getValue("%MB15", cb);

    ws.onmessage({ data: new Uint8Array([129, 0, 6, 255]).buffer });
    ws.onmessage({ data: new Uint8Array([65, 0, 15, 13]).buffer });

    ok(cb.withArgs(true).calledOnce);
    ok(cb.withArgs(13).calledOnce);

    mockWs.verify();

});

