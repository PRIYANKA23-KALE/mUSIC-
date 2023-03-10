

//////////////////////////////
//
// getReferenceRecords --
//

function getReferenceRecords(contents) {
	if (!contents) {
		contents = getTextFromEditor();
	}
	let lines = contents.split(/\r?\n/);
	let output = {};

	// @ markers for musedata-embededded reference records.
	let query1 = "^(?:!!!|@@@)([^\s]+):\s*(.*)\s*$";
	let regex1 = new RegExp(query1);
	let matches;

	let query2 = "^(?:!?!!|@?@@)title:\s*(.*)\s*";
	let regex2 = new RegExp(query2);

	for (i=lines.length-1; i>=0; i--) {
		if (!lines[i].match(/!|@/)) {
			continue;
		}
		if (matches = lines[i].match(regex1)) {
			let key   = matches[1];
			let value = matches[2];
			output[key] = value;
			if (matches = key.match(/(.*)@@(.*)/)) {
				output[matches[1]] = value;
			}
			if (matches = key.match(/(.*)@(.*)/)) {
				output[matches[1]] = value;
			}
		}
		if (matches = lines[i].match(query2)) {
			output["title"] = matches[1];
		}
	}

	if ((!output["title"]) || output["title"].match(/^\s*$/)) {
		output["title"] = FILEINFO["title-expansion"];
	}

	let counter = 0;
	let prefix = "";
	let postfix = "";
	let substitute;
	if (output["title"] && !output["title"].match(/^\s*$/)) {
		let pattern = output["title"];
		while (matches = pattern.match(/@\{([^\}]*)\}/)) {
			prefix = "";
			postfix = "";
			key = "";
			if (matches = pattern.match(/@\{([^\}]*)\}\{([^\}]*)\}\{([^\}]*)\}/)) {
				prefix = matches[1];
				key = matches[2];
				postfix = matches[3];
				pattern = pattern.replace(/@\{([^\}]*)\}\{([^\}]*)\}\{([^\}]*)\}/, "ZZZZZ");
			} else if (matches = pattern.match(/@\{([^\}]*)\}\{([^\}]*)\}/)) {
				prefix = matches[1];
				key = matches[2];
				postfix = "";
				pattern = pattern.replace(/@\{([^\}]*)\}\{([^\}]*)\}/, "ZZZZZ");
			} else if (matches = pattern.match(/@\{([^\}]*)\}/)) {
				prefix = "";
				key = matches[1];
				postfix = "";
				pattern = pattern.replace(/@\{([^\}]*)\}/, "ZZZZZ");
			}

			if (!key) {
				break;
			}
			if (key.match(/^\s*$/)) {
				break;
			}
			if (output[key]) {
				substitute = prefix + output[key] + postfix;
			} else {
				substitute = "";
			}
			pattern = pattern.replace(/ZZZZZ/, substitute);
			counter++;
			if (counter > 20) {
				// avoid infinite loop in case something goes wrong
				break;
			}
		}
		output["title"] = pattern;
	}

	return output;
}



//////////////////////////////
//
// getStaffCount -- Return the number of **kern or **mens spines in the data.
//

function getStaffCount(data) {
	let output = 0;
	let lines = data.split(/\r?\n/);
	for (let i=0; i<lines.length; i++) {
		if (!lines[i].match(/^\*\*/)) {
			continue;
		}
		let tokens = lines[i].split(/\t+/);
		let kcount = 0;
		let mcount = 0;
		for (let j=0; j<tokens.length; j++) {
			if (tokens[j] === "**kern") {
				kcount++;
			} else if (tokens[j] === "**mens") {
				mcount++;
			}
		}
		// **kern and **mens are currently mutually exclusive
		if (mcount > 0) {
			kcount = 0;
		}
		output = mcount + kcount;
		break;
	}
	return output;
}



//////////////////////////////
//
// diatonicToHumdrum --
//

function diatonicToHumdrum(pitch) {
	pitch = parseInt(pitch);
	let octave = parseInt(pitch / 7);
	let pc = pitch % 7;
	let pchar = "x";
	if      (pc == 0) { pchar = "c"; }
	else if (pc == 1) { pchar = "d"; }
	else if (pc == 2) { pchar = "e"; }
	else if (pc == 3) { pchar = "f"; }
	else if (pc == 4) { pchar = "g"; }
	else if (pc == 5) { pchar = "a"; }
	else if (pc == 6) { pchar = "b"; }

	let i;
	let count;
	let output = "";
	if (octave < 4) {
		pchar = pchar.toUpperCase();
		count = 4 - octave;
		for (i=0; i<count; i++) {
			output += pchar;
		}
	} else {
		count = octave - 3;
		for (i=0; i<count; i++) {
			output += pchar;
		}
	}

	return output;
}



//////////////////////////////
//
// humdrumToDiatonic -- Does not like rests, null tokens.
//

function humdrumToDiatonic(pitch) {
	let len = pitch.length;
	let octave = 0;
	let firstchar = pitch.charAt(0);
	let firstlow = firstchar.toLowerCase();
	if (firstchar === firstlow) {
		octave = 3 + len;
	} else {
		octave = 4 - len;
	}
	let diatonic = 0;
	if      (firstlow === "d") { diatonic = 1; }
	else if (firstlow === "e") { diatonic = 2; }
	else if (firstlow === "f") { diatonic = 3; }
	else if (firstlow === "g") { diatonic = 4; }
	else if (firstlow === "a") { diatonic = 5; }
	else if (firstlow === "b") { diatonic = 6; }
	return 7 * octave + diatonic;
}



//////////////////////////////
//
// transposeDiatonic --
//

function transposeDiatonic(pitch, amount) {
	let len = pitch.length;
	amount = parseInt(amount);
	if (len == 0) {
		return "";
	}
	let pitchnum = humdrumToDiatonic(pitch);
	pitchnum += amount;

	if (pitchnum < 1) {
		// to low to process or mean anything
		return pitch;
	}
	if (pitchnum >= 70) {
		// to high to process or mean anything
		return pitch;
	}
	return diatonicToHumdrum(pitchnum);
}



//////////////////////////////
//
// getFieldAndSubtoken -- Return the data token and subtoken position
//    of the item at the given column on the line (column is index from 0),
//    but token and subtoken are indexed from 1.
//

function getFieldAndSubtoken(text, column) {
	// column++; // needed for some reason?
	let output = {field: -1, subspine: -1};
	if (text.match(/^[*!=]/)) {
		return output;
	}
	if (text == "") {
		return output;
	}

	let field = 0;
	let subspine = 0;
	let i;
	for (i=0; i<column; i++) {
		// deal with tab at start of line?
		if ((i > 0) && (text[i] == '\t') && (text[i-1] != '\t')) {
			field++;
			subspine = 0;
		} else if (text[i] == ' ') {
			subspine++;
		}
	}

	let subtok = false;
	// check if the field contains subtokens.  If so, set the
	if (subspine > 0) {
		subtok = true;
	} else {
		for (i=column; i<text.length; i++) {
			if (text[i] == " ") {
				subtok = true;
				break;
			} else if (text[i] == '\t') {
				break;
			}
		}
	}
	if (subtok) {
		subspine++;
	}
	field++;

	output.field = field;
	output.subspine = subspine;
	return output;
}



//////////////////////////////
//
// insertMarkedNoteRdf -- If not present, insert marked note
//     RDF marker in data; otherwise returns what chatacters should represent
//     a marked note.
//

function insertMarkedNoteRdf() {
	let limit = 20; // search only first and last 20 lines of data for RDF entries.
	let editchar = "";
	let matches;
	let i;
	let size = EDITOR.session.getLength();
	for (i=size-1; i>=0; i--) {
		if (size - i > limit) {
			break;
		}
		let line = EDITOR.session.getLine(i);
		if (matches = line.match(/^!!!RDF\*\*kern:\s+([^\s])\s*=.*mark.*\s+note/)) {
			editchar = matches[1];
		}
		if (editchar !== "") {
			break;
		}
	}

	if (editchar === "") {
		for (i=0; i<size; i++) {
			if (i > limit) {
				break;
			}
			let line = EDITOR.session.getLine(i);
			if (matches = line.match(/^\!\!\!RDF\*\*kern:\s+([^\s])\s*=.*mark.*\s+note/)) {
				editchar = matches[1];
			}
			if (editchar !== "") {
				break;
			}
		}
	}

	if (editchar !== "") {
		return editchar;
	}

	let text  = "";

	if (editchar === "") {
		text     +=  "!!!RDF**kern: @ = marked note";
		editchar = "@";
	} else {
		text     +=  "!!!RDF**kern: " + editchar + " = marked note";
	}

	// append markers to end of file.
	let freezeBackup = FreezeRendering;
	if (FreezeRendering == false) {
		FreezeRendering = true;
	}
	EDITOR.session.insert({
			row: EDITOR.session.getLength(),
			column: 0
		},
		"\n" + text);
	FreezeRendering = freezeBackup;

	return editchar;
}



//////////////////////////////
//
// insertDirectionRdfs -- If not present, insert above/below RDF markers
//     in data; otherwise returns what chatacters should represent "above"
//     and "below".  Typically ">" means "above" and "<" means "below".
//     also can be used to check if "<" or ">" are already used for
//     something else.
//

function insertDirectionRdfs() {
	let limit = 20; // search only first and last 20 lines of data for RDF entries.
	let abovechar = "";
	let belowchar = "";
	let matches;
	let i;
	let size = EDITOR.session.getLength();
	for (i=size-1; i>=0; i--) {
		if (size - i > limit) {
			break;
		}
		let line = EDITOR.session.getLine(i);
		if (matches = line.match(/^!!!RDF\*\*kern:\s+([^\s])\s*=.*above/)) {
			abovechar = matches[1];
		} else if (matches = line.match(/^!!!RDF\*\*kern:\s+([^\s])\s*=.*below/)) {
			belowchar = matches[1];
		}
		if ((abovechar !== "") && (belowchar !== "")) {
			break;
		}
	}

	if ((abovechar === "") || (belowchar === "")) {
		for (i=0; i<size; i++) {
			if (i > limit) {
				break;
			}
			let line = EDITOR.session.getLine(i);
			if (matches = line.match(/^\!\!\!RDF\*\*kern:\s+([^\s])\s*=.*above/)) {
				abovechar = matches[1];
			} else if (matches = line.match(/^\!\!\!RDF\*\*kern:\s+([^\s])\s*=.*below/)) {
				belowchar = matches[1];
			}
			if ((abovechar !== "") && (belowchar !== "")) {
				break;
			}
		}
	}

	if ((abovechar !== "") && (belowchar !== "")) {
		return [abovechar, belowchar];
	}

	let text  = "";

	if (abovechar === "") {
		text     +=  "!!!RDF**kern: > = above\n";
		abovechar = ">";
	} else {
		text     +=  "!!!RDF**kern: " + abovechar + " = above\n";
	}

	if (belowchar === "") {
		text     +=  "!!!RDF**kern: < = below";
		belowchar = "<";
	} else {
		text     +=  "!!!RDF**kern: " + belowchar + " = below";
	}

	// append markers to end of file.
	let freezeBackup = FreezeRendering;
	if (FreezeRendering == false) {
		FreezeRendering = true;
	}
	EDITOR.session.insert({
			row: EDITOR.session.getLength(),
			column: 0
		},
		"\n" + text);
	FreezeRendering = freezeBackup;

	return [abovechar, belowchar];
}



//////////////////////////////
//
// insertEditorialAccidentalRdf -- If not present, insert editorial accidental
//     RDF marker in data; otherwise returns what chatacters should represent
//     an editorial accidental.
//

function insertEditorialAccidentalRdf() {
	let limit = 20; // search only first and last 20 lines of data for RDF entries.
	let editchar = "";
	let matches;
	let i;
	let size = EDITOR.session.getLength();
	for (i=size-1; i>=0; i--) {
		if (size - i > limit) {
			break;
		}
		let line = EDITOR.session.getLine(i);
		if (matches = line.match(/^!!!RDF\*\*kern:\s+([^\s])\s*=.*edit.*\s+acc/)) {
			editchar = matches[1];
		}
		if (editchar !== "") {
			break;
		}
	}

	if (editchar === "") {
		for (i=0; i<size; i++) {
			if (i > limit) {
				break;
			}
			let line = EDITOR.session.getLine(i);
			if (matches = line.match(/^\!\!\!RDF\*\*kern:\s+([^\s])\s*=.*edit.*\s+acc/)) {
				editchar = matches[1];
			}
			if (editchar !== "") {
				break;
			}
		}
	}

	if (editchar !== "") {
		return editchar;
	}

	let text  = "";

	if (editchar === "") {
		text     +=  "!!!RDF**kern: i = editorial accidental\n";
		editchar = "i";
	} else {
		text     +=  "!!!RDF**kern: " + editchar + " = editorial accidental\n";
	}

	// append markers to end of file.
	let freezeBackup = FreezeRendering;
	if (FreezeRendering == false) {
		FreezeRendering = true;
	}
	EDITOR.session.insert({
			row: EDITOR.session.getLength(),
			column: 0
		},
		"\n" + text);
	FreezeRendering = freezeBackup;

	return editchar;
}
