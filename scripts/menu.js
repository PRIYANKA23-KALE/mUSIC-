//
// menu.js -- functions to interface with the top menu.
//


//////////////////////////////
//
// loadRepertory --
//

function loadRepertory(repertory) {
	console.log("GOING TO LOAD REPERTORY", repertory);
	loadKernScoresFile(
		{
			file: repertory,
			next: true,
			previous: true
		}
	);
}



//////////////////////////////
//
// saveTextEditorContents --
//

function saveTextEditorContents() {
	var event = {};
	event.keyCode = SKey;
	event.altKey = true;
	processInterfaceKeyCommand(event);
}



//////////////////////////////
//
// applyFilter --
//

function applyFilter(text) {
	var contents = EDITOR.getValue().replace(/^\s+|\s+$/g, "");
	var options = humdrumToSvgOptions();
	var data = contents + "\n!!!filter: " + text + "\n";

	vrv.filterData(options, data, "humdrum")
	.then(function(newdata) {
		newdata = newdata.replace(/\s+$/m, "");
		var lines = newdata.match(/[^\r\n]+/g);
		for (var i=lines.length-1; i>=0; i--) {
			if (lines[i].match(/^!!!Xfilter:/)) {
				lines[i] = "";
				break;
			}
		}
		newdata = lines.join("\n").replace(/\s+$/g, "");
		EDITOR.setValue(newdata, -1);
	});
}



//////////////////////////////
//
// toggleDataDisplay --
//

function toggleDataDisplay() {
	var event = {};
	event.keyCode = YKey;
	event.altKey = true;
	processInterfaceKeyCommand(event);
}



//////////////////////////////
//
// increaseTabSize --
//

function increaseTabSize() {
	var event = {};
	event.keyCode = DotKey;
	event.altKey = true;
	event.shiftKey = true;
	processInterfaceKeyCommand(event);
}



//////////////////////////////
//
// decreaseTabSize --
//

function decreaseTabSize() {
	var event = {};
	event.keyCode = CommaKey;
	event.altKey = true;
	event.shiftKey = true;
	processInterfaceKeyCommand(event);
}


//////////////////////////////
//
// fitTabSizeToData -- Not perfect since not using an equal-sized character font.
//

function fitTabSizeToData() {
	var lines = EDITOR.getValue().match(/[^\r\n]+/g);
	var max = 4;
	for (var i=0; i<lines.length; i++) {
		if (lines[i].match(/^\s*$/)) {
			continue;
		}
		if (lines[i].match(/^!/)) {
			// not keeping track of local comments which can be long
			// due to embedded layout commands.
			continue;
		}
		var line = lines[i].split("\t");
		for (var j=0; j<line.length; j++) {
			if (line[j].length > 25) {
				// ignore very long tokens
				continue;
			}
			if (line[j].length > max) {
				max = line[j].length + 2;
			}
		}
	}
	// ignore strangely long cases:
	if (max > 25) {
		max = 25;
	}
	TABSIZE = max;
	EDITOR.getSession().setTabSize(TABSIZE);
}



//////////////////////////////
//
// openURL -- opens in a new tab.
//

function openUrl(url) {
	window.open(url, "_blank");
}



