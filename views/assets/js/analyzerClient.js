'use strict';
let datas = [];
let drawnNodes = [];
let mouseText = {};
let mouseHovering;

let secondMaxSize = 0;

let desceleration = 0.25;
let acceleration = 0.5;
let baseDist = 50;
let maxNodeSize = 40;

// TESTS
function recursiveTree(depth, parentId) {
	if(depth==0) {
		return;
	}
	for(let i = 0; i<Math.random()*10; i++){
		let node = {
			id: datas.length-1,
			fsize: depth*5+3,
			children: [],
			x: width/2,
			y: height/2,
			dirx: 0,
			diry: 0,
			color:'rgb(203, 197, 45)',
			parent: parentId,
		};
		datas.push(node);
		datas[parentId].children.push(node.id);
		recursiveTree(depth-1, node.id);
	}
}
function recursiveExplode(n) {
	if(datas[n].exploded) {
		return;
	}	
	explodeNode(datas[n]);
	for(let i of datas[n].children) {
		recursiveExplode(i);
	}
}
////////////////////

function initAnalyzer() {
	
	/* datas.push({
		id: 0,
		fsize: 40,
		children: [1,2,3],
		x: width/2,
		y: height/2,
		dirx: 0,
		diry: 0,
		parent: -1,
	});
	recursiveTree(3, 0);
	drawnNodes.push(0);
	// recursiveExplode(0);*/
}

function drawTree() {
	mouseHovering = false;
	for(let i of drawnNodes) {
		drawNode(datas[i]);
	}
	// mouse text
	if(mouseHovering) {
		ctx.fillStyle = 'white';
		ctx.fillText(mouseText.folder, mouse.x+15, mouse.y);
		ctx.fillText(mouseText.size, mouse.x+15, mouse.y+15);
	}
	
}

function drawNode(node) {
	let color = node.color;
	// detect mouse event
	if(mouse.x > (node.x+offset.x-node.fsize/2)*offset.z
	&& mouse.x < (node.x+offset.x+node.fsize/2)*offset.z
	&& mouse.y < (node.y+offset.y+node.fsize/2)*offset.z
	&& mouse.y > (node.y+offset.y-node.fsize/2)*offset.z ) {
		color = 'red';
		mouseText.folder = node.folder;
		mouseText.size = node.ssize;
		mouseHovering = true;
		if(mouse.on && !node.exploded) {
			//click
			explodeNode(node);
		}
	}
	if(node.exploded) {
		// color='green';
	}
	//avoiding others
	for(let i of drawnNodes) {
		let otherNode = datas[i];
		avoidOthers(node, otherNode);
	}
	
	// descelerating
	descelerate(node);
	
	// move node
	node.x+=node.dirx;
	node.y+=node.diry;
    
	// draw line with parent
	if(node.parent >= 0) {
		let parent = datas[node.parent];
        // line to parent
        ctx.beginPath();
        ctx.strokeStyle = parent.color;
        ctx.moveTo((node.x+offset.x)*offset.z, (node.y+offset.y)*offset.z);
        ctx.lineTo((parent.x+offset.x)*offset.z, (parent.y+offset.y)*offset.z);
        ctx.stroke();
	}
    
    // draw node
    if(!isOutbound(node.x, node.y)) {
        particlesShowed++;
        ctx.beginPath();
        ctx.fillStyle=node.color;
        ctx.arc((node.x+offset.x)*offset.z, (node.y+offset.y)*offset.z, (node.fsize/2)*offset.z, 0, 2*Math.PI);
        ctx.fill();
        // if > max representation size : show size
        if(node.fsize >= maxNodeSize) {
            ctx.fillStyle = 'white';
            ctx.fillText(node.ssize, (node.x+offset.x)*offset.z, (node.y+offset.y)*offset.z);
        }
    }
    
}

function explodeNode(node) {
	node.exploded = true;
	
	for(let i of node.children) {
		// give positions and velocity
		let child = datas[i];
		let rand = Math.random()*2*Math.PI;
		child.x = node.x+Math.cos(rand) * baseDist;
		child.y = node.y+Math.sin(rand) * baseDist;
		child.dirx = rand;
		child.diry = rand;
		child.ssize = humanFileSize(child.size, false);
		if(child.children.length == 0) {
			child.color = 'rgb(185, 47, 47)';
		} else if(child.children.length < 100) {
			child.color = 'rgb(21, 124, 21)';
		} else {
            child.color = 'rgb(255, 165, 21)';
        }
		
		drawnNodes.push(i);
	}
}

function avoidOthers(node, otherNode) {
	if(otherNode.id != node.id && 
	dist(node.x, node.y, otherNode.x, otherNode.y) < baseDist ){
		if(node.x < otherNode.x) node.dirx -= acceleration;
		if(node.x > otherNode.x) node.dirx += acceleration;
		if(node.y < otherNode.y) node.diry -= acceleration;
		if(node.y > otherNode.y) node.diry += acceleration;
	}
	
}

function descelerate(node) {
	if(node.dirx > desceleration) node.dirx -= desceleration;
	else if(node.dirx < -desceleration) node.dirx += desceleration;
	else node.dirx = 0;
	if(node.diry > desceleration) node.diry -= desceleration;
	else if(node.diry < -desceleration) node.diry += desceleration;
	else node.diry = 0;
}

function receiveFinishData(data) {
	datas = data;
	console.log('final datas received: '+datas.length+' nodes.');
	// transforming data
	for(let i=1; i<datas.length; i++) {
		// max second size (for scale)
		if(secondMaxSize < datas[i].size) {
			secondMaxSize = datas[i].size;
		}
	}
	for(let i=1; i<datas.length; i++) {
		// fsize
		datas[i].fsize = constrain(map(datas[i].size, 0, secondMaxSize*0.5, 3, maxNodeSize), 6, maxNodeSize);
	}
	// first node
	datas[0].x = width/2;
	datas[0].y = height/2;
	datas[0].dirx = 0;
	datas[0].diry = 0;
	datas[0].parent = -1;
	datas[0].color = 'rgb(50,50,180)';
	datas[0].ssize = humanFileSize(datas[0].size, false);
	datas[0].fsize = maxNodeSize;
	
	console.log(JSON.stringify(datas[0]));
	
	drawnNodes = [];
	drawnNodes.push(0);
	console.log('data transformed.');
}

function humanFileSize(bytes, si) {
    let thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    let units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    let u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}


function resetAnalyzerGraph() {
    datas = [];
}

