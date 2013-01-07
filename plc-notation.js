
(function () {

    PLC = {

        parse: function (adr) {

	    if (typeof adr !== "string")
	        return null;

	    var validBitAdr = /^%MX([0-9]|[1-9][0-9]).([0-9]|1[0-5])$/,
                i = 3, byteAdr = 0, bitAdr = 0, tmpStr = '',
		high = 0, low = 0, plcAdr;
	    
	    // test if it is a bit address
	    if (adr.match(validBitAdr)) {

                // get byte address

                while (adr[i] !== '.') {
	            tmpStr += adr[i]; i += 1;
	        }
	        byteAdr = parseInt(tmpStr);

                // get bit address
	        i += 1;
	        tmpStr = '';
                while (i < adr.length) {
	            tmpStr += adr[i]; i += 1;
	        }

                bitAdr = parseInt(tmpStr);

		plcAdr = byteAdr * 16 + bitAdr;
		high = (plcAdr >> 8);
		low = ((plcAdr << 24) >>> 24);

	        return { bitCount: 1, address: plcAdr, high: high, low: low };

            }

	    var validMultiByteAdr = /^%M[D|W|B]([0-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9])$/

	    // test if it is a byte address
	    if (adr.match(validMultiByteAdr)) {
	
                // get byte address
                tmpStr = adr.substr(3);
		byteAdr = parseInt(tmpStr);

		tmpStr = adr[2];

		if (tmpStr === 'W') {
  		    plcAdr = byteAdr * 2;
		    high = (plcAdr >> 8);
		    low = ((plcAdr << 24) >>> 24);

	            return { bitCount: 16, address: plcAdr, high: high, low: low };

		}

		if (tmpStr === 'B') {
  		    plcAdr = byteAdr;
		    high = (plcAdr >> 8);
		    low = ((plcAdr << 24) >>> 24);

	            return { bitCount: 8, address: plcAdr, high: high, low: low };
		}

		if (tmpStr === 'D') {
  		    plcAdr = byteAdr * 4;
		    high = (plcAdr >> 8);
		    low = ((plcAdr << 24) >>> 24);

	            return { bitCount: 32, address: plcAdr, high: high, low: low };

		}
	    }

	    return null;

	}

    };

})();
