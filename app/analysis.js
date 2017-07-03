'use strict';

const fs = require('fs');
const superVision = require('./supervision');

let folderQueue;
let folderInfos;

function start(req, callback) {
	let params = {
		folder: 'C:/dev/tools/diskanalyzer/diskanalyzer',
	};
	
	getParamsFromRequest(req, params);
	
	folderQueue = [{
		folder:params.folder, 
		parent:0
	}];
	folderInfos = [];
	
	console.log('Analysis started with params: '+JSON.stringify(params, null ,4));
	
	callback({
		message:'Command stared OK',
		params: params,
	});
	
	recursiveBrowse(() => {
		console.log(folderInfos.length+' folders analyzed.');
		console.log('ditributing tree size...');
		buildTree();
		console.log('root size : '+folderInfos[0].size);
		console.log('Operation finished.');
		superVision.cleanEvents(folderInfos);
	});
}


function recursiveBrowse(callback) {
	if(folderQueue.length == 0) {
		// end
		callback();
		return;
	}
	let currentFolder = folderQueue.pop();
	let currentParent = folderInfos.length -1;
	
	fs.readdir(currentFolder.folder, (err, files) => {
		let folderInfo = {
			folder: currentFolder.folder,
			size: 0,
			children: [],
			parent: currentFolder.parent,
			id: folderInfos.length,
			level: 1,
		}
		
		for(let file of files) {
			analyseFile(currentFolder.folder+'/'+file, folderInfo, folderInfo.id);
		}
		if(currentFolder.parent>0) {
			folderInfo.level = folderInfos[currentFolder.parent].level+1;
		}
		folderInfos.push(folderInfo);
		
		// send event to supervision
		superVision.addEvent({
			name: folderInfo.folder,
			size: folderInfo.size,
			success: true,
		});
		
		// give child to parent
		if(folderInfo.id != 0) {
			folderInfos[folderInfo.parent].children.push(folderInfo.id);
		}
		
		// call recursion
		recursiveBrowse(callback);
	});
}


function analyseFile(file, folderInfo, parentId) {
	let stats = fs.statSync(file);
	
	if(stats.isDirectory()) {
		// directory
		// add directory to queue
		folderQueue.push({
			folder: file,
			parent: parentId,
		});
		
	} else {
		// file
		folderInfo.size += stats.size;
	}
	
}


function buildTree() {
	if(folderInfos.length == 0) {
		return;
	}
	let levels = [];
	
	// set levels in arrays
	for(let o of folderInfos) {
		if(!levels[o.level]) {
			levels[o.level] = [];
		}
		levels[o.level].push(o.id);
	}
	// distribute size
	for(let i = levels.length-1; i>0; i--) {
		if(levels[i]) {
			for(let o of levels[i]) {
				let fi = folderInfos[o];
				folderInfos[fi.parent].size += fi.size;
			}
		}
	}
}


function getParamsFromRequest(req, params) {
	if(!req.query) {
		return;
	}
	for(let key in params) {
		if(params.hasOwnProperty(key)) {
			if(req.query[key]) {
				// set on request
				params[key] = req.query[key];
			}	
		}
	}
}


module.exports = {
	start,
};


