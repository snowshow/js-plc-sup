/*global WebSocket, PLC, Uint8Array, DataView, PLCSuPClient, window */
"use strict";

(function () {

    var flags = {
            opCode : {
                MASK : 3,
                SET  : 0,
                GET  : 1, 
                SUB  : 2,
                UNS  : 3
            },
            resCode : {
                MASK   : 12,
                REQ    : 0,
                OK     : 4,
                ERROR  : 8,
                UPDATE : 12
            },
            bitCount : {
                MASK : 240,
                BIT  : 128,
                BYTE : 64,
                WORD : 32,
                DWORD : 16
            }
        };        

    var Client = function (ws) {

        if (!ws) {
            return false;
        }

        if (!(ws instanceof WebSocket)) {
            return false;
        }

        if (!(this instanceof Client)) {
            return new Client(ws);
        }

        this.ws = ws;
        this.ws.binaryType = 'arraybuffer';
        this.isConnected = false;

        this.handler = {};

        this.ws.onopen = this.onopen();
        this.ws.onclose = this.onclose();
        this.ws.onerror = this.onerror();
        this.ws.onmessage = this.onmessage();

        this.pkgQueue = [];

        var that = this, api;

        api = {

            /*
             *  Register event listener for open, close, error
             *  and update events.
             */
            on: function (eventName, cb) {

                var eN = eventName.toLowerCase();

                if (eN === 'open') {
                    that.handler.onopen = cb;
                } else if (eN === 'close') {
                    that.handler.onclose = cb;
                } else if (eN === 'error') {
                    that.handler.onerror = cb;
                } else if (eN === 'update') {
                    that.updateCallback = cb;
                }

            },

            /*
             *  Set a specific register like %MX0.0, %MB1,
             *  %MW2, %MD33
             *
             *  Example: setValue("%MX0.0", true)
             *           setValue("%MW34, 1022)
             *
             *  You can get a response if the request was 
             *  successfull by passing a callback function
             *
             *  Example: setValue("%MX0.0", true, function (dummy, err) { ... });
             *
             */
            setValue: function (plcVar, value, cb) {
                return that.setValue(plcVar, value, cb);
            },

            /*
             *  Get a specific register value.
             *
             *  Example: getValue("MB6", function (value, err) { ... });
             *
             */ 
            getValue: function (plcVar, cb) {
                that.getValue(plcVar, cb);
            },

            /*
             *  Subscribe for a set of register. A callback function
             *  will be called when the request was successfull or not.
             *
             *  Example: subscribe("%MX0.0", "%MB6", function (dummy, e) { ... })
             *
             */
            subscribe: function (plcVars) {

                if (!arguments) {
                    return;
                }

                var args = Array.prototype.slice.call(arguments),
                    vars, 
                    cb, 
                    len = arguments.length;

                if (arguments.length >= 1) {

                    if (typeof args[len-1] === 'function') {

                        if (len === 1) {
                            return;
                        }

                        vars = args.slice(0, len - 1);
                        cb = args[len - 1];  

                        that.subscribe(vars, cb);

                    } else {

                        that.subscribe(vars, function () { } );

                    }

                    return;
                }
            },

            /*
             * Not implemented yet.
             */
            unsubscribe: function (plcVars) {
            }

        };

        return api;

    };

    var proto = Client.prototype;

    proto.onopen = function () {

        var that = this;
        return function () {

            that.isConnected = true;
            if (that.handler.onopen) {
                that.handler.onopen();
            }
        };
    };

    proto.onclose = function () {

        var that = this;
        return function () {
            that.isConnected = false;
            if (that.handler.onclose) {
                that.handler.onclose();
            }
        };
    };

    proto.onerror = function () {

        var that = this;
        return function () {
            if (that.handler.onerror) {
                that.handler.onerror();
            }
        };
    };

    /*
     *  handle incoming messages
     */
    proto.onmessage = function () {

        var that = this;
        return function (msg) {

    	    // parse the incoming message data
	        // this could be a response to a previous
	        // request or multiple update messages.
            var args = that.parseMessage(msg.data), cb;

	        // in case we deal with a update message
	        if (args.resCode === flags.resCode.UPDATE) {

	            // if there is a common error, call the error handler
       	        if (that.handler.onerror && args.error) {
                    that.handler.onerror(args);
                }

	            // if no update callback is defined quit
                if (!that.updateCallback) {
                    return;
                }

                that.updateCallback(args);

	            // flush the next packet in the packet queue
                that.flush();

		        return;
	        }

            // for the case that we have a callback function 
	        // in the pipe we are expecting an answert to a 
	        // request.
            cb = that.currentCallback;

            // in case of an error the first an only
            // object in args contains an errCode property
            if (args.hasOwnProperty("errCode")) {
                cb(null, args);
            } else {

                if (args.opCode === flags.opCode.GET) {
                    cb(args.value);
                }

                if (args.opCode === flags.opCode.SET) {
                    cb();
                }

                if (args.opCode === flags.opCode.SUB) {
                    cb(args.numberOfSubs);
                }

            }

	        // clear the current callback
            that.currentCallback = null;

	        // flush the next packet in the 
	        // packet queue
            that.flush();

            return;


        };
    };

    proto.parseError = function (data) {

        var dv = new DataView(data),
            opByte,  // first byte
            opCode,  // operation code
            resCode, // response code
            errCode, // error code
            res;     // response
        
        // get operation byte
        opByte = dv.getUint8(0);

        // get operation code and response code
        opCode = flags.opCode.MASK & opByte;
        resCode = flags.resCode.MASK & opByte;

        // check if response indicates an error
        if (resCode !== flags.resCode.ERROR) {
            return null;
        }

        // the response code indicates an error, read
        // the error code and prepare a response
        errCode = dv.getUint8(1);

        res = { };

        res.opCode = opCode;
        res.errCode = errCode;
        
        if (errCode === 0) {
            res.name = "InvalidRequest";
        }

        if (errCode === 1) {
            res.name = "InvalidAddress";
        }

        if (errCode === 2) {
            res.name = "OutOfSubscriptions";
        }

        return res;

    };

    proto.getAddress = function (bitCount, address) {

        var high,
            low;

        if (bitCount === flags.bitCount.BIT) {
            high = (address - (address % 16)) / 16;
            low = address - high;
            return  "%MX" + high + "." + low;
        }

        if (bitCount === flags.bitCount.BYTE) {
            return "%MB" + address;
        }

        if (bitCount === flags.bitCount.WORD) {
            return "%MW" + address;
        }

        if (bitCount === flags.bitCount.DWORD) {
            return "%MD" + address;
        }

    };

    proto.parsePacket = function (data) {

        var dv = new DataView(data),
            opByte,   // first byte
            high,     // address high part
            low,      // address low part
            address,  // address
            value,    // value
            res,      // response
            offset,   // helper variable
    	    bLs = { 1: 4, 8: 4, 16: 5, 32: 7 };

        // get operation byte
        opByte = dv.getUint8(0);

        res = {};

        // get operation code and response code
        res.opCode = flags.opCode.MASK & opByte;
        res.resCode = flags.resCode.MASK & opByte;

        // check if response code indicates an error
        if (res.resCode === flags.resCode.ERROR) {
            return null;
        }

        if (res.opcode === flags.opCode.SET) {

            // get the bitCount
            res.bitCount = flags.bitCount.MASK & opByte;
            res.address = dv.getUint16(1);
            res.plcAddr = this.getAddresse(res.bitCount, res.address);

        }
 
        // if message indicates a get opcode get the value
        // according to the bitCount 
        if (res.opCode === flags.opCode.GET) {

            // get the bitCount
            res.bitCount = flags.bitCount.MASK & opByte;
            res.address = dv.getUint16(1);
            res.plcAddr = this.getAddress(res.bitCount, res.address);
           
            if (res.bitCount === flags.bitCount.BIT) {

                value = dv.getUint8(3);

                // value 255 means true, 0 means false
                if (value === 255) {
                    res.value = true;
                } else if (value === 0) {
                    res.value = false;
                } else {
                    return { 
                        error: "Unknow bit value!=255(true) and value!=0(false)"
                    }
                }

            }

            if (res.bitCount === flags.bitCount.BYTE) {
                res.value = dv.getUint8(3);
            }

            if (res.bitCount === flags.bitCount.WORD) {
                res.value = dv.getUint16(3);
            }

            if (res.bitCount === flags.bitCount.DWORD) {
                res.value = dv.getUint32(3);
            }


        }

        // if opCode indicates a subscription package
        // check if it is a response to a subscription request
        // or if it is a update message
        if (res.opCode === flags.opCode.SUB) {

            // simply extract the number of subs
            if (res.resCode === flags.resCode.OK) {
                res.numberOfSubs = dv.getUint16(1);
            }

            // do a while loop over the values
            if (res.resCode === flags.resCode.UPDATE) {

                res.values = [];
                offset = 0;

                while (offset < dv.byteLength) {

		            var t = {
                        address: null,
                        plcAddr: null,
                        bitCount: null,
                        value: null };

                    t.address = dv.getUint16(offset + 1);
		            t.bitCount = dv.getUint8(offset) & flags.bitCount.MASK;
                    t.plcAddr = this.getAddress(t.bitCount, t.address);

                    if (t.bitCount === flags.bitCount.BIT) {


                        value = dv.getUint8(offset + 3);

                        // value 255 means true, 0 means false
                        if (value === 255) {
                            t.value = true;
                        } else if (value === 0) {
                            t.value = false;
                        } else {
                            return { 
                                error: "Unknow bit value!=255(true) and value!=0(false)"
                            }
                        }

                        offset += 4;

                    }

                    if (t.bitCount === flags.bitCount.BYTE) {
 
                        t.value = dv.getUint8(offset + 3);
                        offset += 4;

                    }

                    if (t.bitCount === flags.bitCount.WORD) {

                        t.value = dv.getUint16(offset + 3);
                        offset += 5;

                    }

                    if (t.bitCount === flags.bitCount.DWORD) {

                        t.value = dv.getUint32(offset + 3);
                        offset += 7;

                    }

		            res.values.push(t);


                }

            }

        }
       
        return res;
        

    };

    proto.parseMessage = function (data) {

        var dv = new DataView(data),
            error;

        error = this.parseError(data);

        if (error) {
            return error;
        }

        return this.parsePacket(data);

        

    };

    proto.setValue = function (plcVar, value, cb) {

        var addr = PLC.parse(plcVar), pkt, dv;

        if (!addr) {
            cb(null, { errCode: 4, name: "Error parsing address." });
            return;
        }

        // prepare packet
        if (addr.bitCount === 1) {
            pkt = new Uint8Array(4);
            dv = new DataView(pkt.buffer);
            dv.setUint8(0, 128);
            dv.setUint8(3, value ? 255 : 0);
        }

        if (addr.bitCount === 8) {
            pkt = new Uint8Array(4);
            dv = new DataView(pkt.buffer);
            dv.setUint8(0, 64);
            dv.setUint8(3, value);
        }

        if (addr.bitCount === 16) {
            pkt = new Uint8Array(5);
            dv = new DataView(pkt.buffer);
	        dv.setUint8(0, 32);
	        dv.setUint16(3, value);
	    }

	    if (addr.bitCount === 32) {
	        pkt = new Uint8Array(7);
	        dv = new DataView(pkt.buffer);
	        dv.setUint8(0, 16);
	        dv.setUint32(3, value);
	    }

	    dv.setUint16(1, addr.address);

        this.pkgQueue.push(
            { packet: pkt, callback: cb, type: flags.opCode.SET });
        this.flush();

    };

    proto.getValue = function (plcVar, cb) {

        var addr = PLC.parse(plcVar), pkt, dv,
            codes = { 1: 129, 8: 65, 16: 33, 32: 17 };

        if (!addr) {
            return
        }

        pkt = new Uint8Array(3);
        dv = new DataView(pkt.buffer);
        dv.setUint8(0, codes[addr.bitCount]);

	    dv.setUint16(1, addr.address);

        this.pkgQueue.push(
            { packet: pkt, callback: cb, type: flags.opCode.GET });

        this.flush();
        
    };

    proto.subscribe = function (plcVars, cb) {

        var pkt = new Uint8Array(plcVars.length * 3),
            dv = new DataView(pkt.buffer),
            i,          // counter
            adr,        // plc notation object
            offset = 0, // buffer offset
            codes = { 1: 130, 8: 66, 16: 34, 32: 18 };

        for (i = 0; i < plcVars.length; i += 1) {

            adr = PLC.parse(plcVars[i]);

            dv.setUint8(offset, codes[adr.bitCount]);
            dv.setUint16(offset + 1, adr.address);

            offset += 3;

        }

        this.pkgQueue.push(
            { packet: pkt, callback: cb, type: flags.opCode.SUB });
        this.flush();

    };

    proto.flush = function () {

        if (this.pkgQueue.length === 0) {
            return;
        }

        // waiting for a callback, no new messages
        // will be send
        if (this.currentCallback) {
            return;
        }

        var pkt = this.pkgQueue.shift();

        this.currentCallback = pkt.callback;

        this.ws.send(pkt.packet.buffer);
            
    };

    window.PLCSuPClient = Client;

})();
