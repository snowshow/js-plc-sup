

module("PLC Variable Notation");


test("Parse bitaddresses", function () {

    equal(
	PLC.parse(""),
	null, "Parsing empty string.");

    equal(
        PLC.parse("something"),
        null, "Parsing some string.");

    equal(
        PLC.parse(123),
        null, "Parsing 123.");

    equal(
        PLC.parse("%MX0.16"),
        null, "Parsing wrong address.");

    deepEqual(
        PLC.parse("%MX0.0"), 
        { bitCount: 1, address: 0, high: 0, low: 0 }, "Parsing %MX0.0");

    deepEqual(
        PLC.parse("%MX0.5"),
        { bitCount: 1, address: 5, high: 0, low: 5 }, "Parsing %MX0.5");
   
    deepEqual(
        PLC.parse("%MX6.3"),
        { bitCount: 1, address: 99, high: 0, low: 99 }, "Parsing %MX6.3"); 

    deepEqual(
        PLC.parse("%MX10.0"),
        { bitCount: 1, address: 160, high: 0, low: 160 }, "Parsing %MX10.0" );

    deepEqual(
        PLC.parse("%MX20.4"),
        { bitCount: 1, address: 324, high: 1, low: 68 }, "Parsin %MX20.4" );
});

test("Parsing byteaddresses", function () {

    equal(
        PLC.parse("%MB0.0"),
        null, "Parsing wrong address.");

    deepEqual(
        PLC.parse("%MB0"),
 	{ bitCount: 8, address: 0, high: 0, low: 0 }, "Parsing %MB0" );

    deepEqual(
        PLC.parse("%MB5"),
        { bitCount: 8, address: 5, high: 0, low: 5 }, "Parsing %MB5" );

    deepEqual(
        PLC.parse("%MB125"),
        { bitCount: 8, address: 125, high: 0, low: 125 }, "Parsing %MB125" );

});

test("Parsing word addresses", function () {

    equal(
        PLC.parse("%MW0.0"),
	null, "Parsing wrong address.");

    deepEqual(PLC.parse("%MW0"),
        { bitCount: 16, address: 0, high: 0, low: 0 }, "Parsing %MW0" );

    deepEqual(PLC.parse("%MW66"),
        { bitCount: 16, address: 132, high: 0, low: 132 }, "Parsing %MW66" );

});

test("Parsing double word addresses", function () {

    equal(
	PLC.parse("%MD0.0"),
	null, "Parsing wrong address.");

    deepEqual(PLC.parse("%MD0"),
	{ bitCount: 32, address: 0, high: 0, low: 0 }, "Parsing %MD0" );

    deepEqual(PLC.parse("%MD22"),
        { bitCount: 32, address: 88, high: 0, low: 88 }, "Parsing %MD22" );

});

