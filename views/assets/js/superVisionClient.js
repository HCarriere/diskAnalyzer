'use strict';

let canvas;
let ctx;
let width;
let height;
let currentFrame;
let lastCalledTime;// for frequency

let lastFpp;
let particles = [];
let particlesQueue = [];
let obsoleteParticles = [];
let mainParticle;
let stats = {
    frequency: 0,
    received: -1,
    absorbed: 0,
	fpp:0, // frame per package
};
let mouse = {
	x: 0,
	y: 0,
	on: false,
};
let offset = {
	x: 0,
	y: 0,
	z: 1,
	xstart: 0,
	ystart: 0,
};

let maxParticlesOnScreen = 2000;
let attraction = 0.2;
let appearFrequency = 1; // a particle appear every X frames at max


$(document).ready(function() {
    let socket = io();

    socket.on('events', (data)=>{
        receiveEvent(data);
	});
	socket.on('finish', (data)=>{
        receiveFinishData(data); // from analyzerClient.js
	});
    initCanvas();

    // TEST - FIXME
    /* setInterval(() => {
        let array = [];
        for(let i=0; i<500; i++) {
            array.push({
                name: 'coucou',
                size: Math.random()*200000,});
        }
        receiveEvent(array);
    }, 1000); */
});

/**
 * init canvas
 */
function initCanvas() {
    canvas = document.getElementById('superVision');
    ctx = canvas.getContext('2d');
    // vars
    currentFrame = 0;
	
    // window events
    window.onresize = resizeCanvas;
	window.addEventListener('mousedown', mousePressed);
	window.addEventListener('mouseup', mouseReleased);
	window.addEventListener('mousemove', mouseDragged);
	window.addEventListener('keypress', keyPressed);
	// IE9, Chrome, Safari, Opera
	window.addEventListener("mousewheel", mouseWheel, false);
	// Firefox
	window.addEventListener("DOMMouseScroll", mouseWheel, false);
	
    // canvas size
	width = canvas.width = (window.innerWidth) - 100;
	height = canvas.height = (window.innerHeight) - 100;
    resizeCanvas();

    mainParticle = {
        x: width/2,
        y: height/2,
        dirx: 0,
        diry: 0,
        color: '#126544',
        size: 10,
    };
    addParticle(mainParticle);

	initAnalyzer();
    draw();
}

/**
 * main loop
 */
function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.fillText(
        width+':'+height+', '+
        particlesQueue.length+', '+
        particles.length+', '+
        JSON.stringify(stats)+', '+
        currentFrame, 50, 50);


	if(particlesQueue.length > 0) {
		for(let i=0; i<min(stats.frequency/stats.fpp,particlesQueue.length-1); i++) {
			if(particles.length < maxParticlesOnScreen) {
				particles.push(particlesQueue.shift());
			}
		}
	}
	
	// move plan with mouse
	if(mouse.on){
		if(offset.xstart){
			let dx = offset.xstart;
			let dy = offset.ystart;
			offset.xstart = mouse.x;
			offset.ystart = mouse.y;
			offset.x += (offset.xstart - dx) / offset.z;
			offset.y += (offset.ystart - dy) / offset.z;
		} else {
			offset.xstart = mouse.x;
			offset.ystart = mouse.y;
		}
	} else {
		offset.xstart = 0;
		offset.ystart = 0;
	}
	
	drawTree(); // from analyzerClient.js
	
    updateParticles();
	
	drawFrame();
	
    currentFrame++;
    requestAnimationFrame(draw);
}

/**
 * Draw and update particles
 */
function updateParticles() {
    for(let i=particles.length-1; i>=0; i--) {
        let d = 1;
        // update
		let destination = {
			x: mouse.x,
			y: mouse.y,
		};
       /* if(particles[i].destination) {
			destination = particles[i].destination;
		}*/
		
		// if particle has a destination, change trajectory
		/* particles[i].dirx+=constrain(particles[i].destination.x-
			particles[i].x, -1, 1);
		particles[i].diry+=constrain(particles[i].destination.y-
			particles[i].y, -1, 1);*/
		d = dist(
			destination.x,
			destination.y,
			particles[i].x,
			particles[i].y
		);
		if(d < 10) {
			absorbEvent(i);
		}
		/* particles[i].dirx += map(d, 500, 0,
			particles[i].destination.x - particles[i].x, 0);
		particles[i].diry += map(d, 500, 0,
			particles[i].destination.y - particles[i].y, 0);*/
		particles[i].dirx += constrain(
			destination.x - particles[i].x,
			-attraction, attraction);
		particles[i].diry += constrain(
			destination.y - particles[i].y,
			-attraction, attraction);
        
		
        // max speed
        let maxSpeed = map(d, 200, 0, 7, 0.5);
        let mag = particles[i].dirx * particles[i].dirx
            + particles[i].diry * particles[i].diry;
        if(mag > maxSpeed * maxSpeed) {
            // normalizing vector
            mag = Math.sqrt(mag);
            particles[i].dirx /= mag;
            particles[i].diry /= mag;
            // multiply by max speed
            particles[i].dirx *= maxSpeed;
            particles[i].diry *= maxSpeed;
        }
        // move
        particles[i].x+=particles[i].dirx;
        particles[i].y+=particles[i].diry;

        // draw
       /* ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].size,
            0, 2 * Math.PI);
        ctx.fillStyle = particles[i].color;
        ctx.fill(); */
		ctx.beginPath();
		ctx.fillStyle = particles[i].color;
		ctx.fillRect((particles[i].x+offset.x)*offset.z, 
					 (particles[i].y+offset.y)*offset.z, 
					 particles[i].size*offset.z,particles[i].size*offset.z);
		ctx.fill();
		
    }
    // delete obsolete particles
    for(let i of obsoleteParticles) {
        particles.splice(i, 1);
    }
    obsoleteParticles = [];
}

function drawFrame() {
	ctx.beginPath();
	ctx.strokeStyle = 'white';
	ctx.moveTo(offset.x*offset.z, offset.y*offset.z);
	ctx.lineTo((offset.x+width)*offset.z, offset.y*offset.z);
	ctx.lineTo((offset.x+width)*offset.z, (offset.y+height)*offset.z);
	ctx.lineTo(offset.x*offset.z, (offset.y+height)*offset.z);
	ctx.lineTo(offset.x*offset.z, offset.y*offset.z);
	ctx.stroke();
}

/**
 * When a particle touch the big one
 * @param  {Number} i particle num
 */
function absorbEvent(i) {
    obsoleteParticles.push(i);
    mainParticle.size += map(particles[i].size, 0, 524288000, 0, 1);
    stats.absorbed++;
}

/**
 * Add a particle to the canvas
 * @param {Object} particle
 */
function addParticle(particle) {
	particlesQueue.push(particle);
    stats.received++;
}


/**
 * called when events are received
 * @param  {Array} events
 */
function receiveEvent(events) {
	if(!lastFpp) {
		lastFpp = currentFrame;
	} else {
		stats.fpp = currentFrame-lastFpp;
		lastFpp = currentFrame;
	}
	if(!lastCalledTime) {
		lastCalledTime = Date.now();
	} else {
		let delta = (Date.now() - lastCalledTime)/1000;
		lastCalledTime = Date.now();
		stats.frequency = Math.floor(events.length/delta);
	}
    // release old queue to prevent overflow
    // particles = particles.concat(particlesQueue);
    // particlesQueue = [];
    // get new events to queue
    for(let object of events) {
        addParticle({
            /*x: rand(width+10, width+100),
            y: rand(height/2-100, height/2+100),*/
			x: width,
			y: height/2,
            dirx: rand(-8, 0),
            diry: rand(-8, 8),
            color: 'white',
            name: object.name,
            destination: mainParticle,
            size: constrain(map(object.size, 0, 1000000, 1, 2),1,2),
        });
    }
}

/**
 * Random number between min and max
 * @param  {Number} min
 * @param  {Number} max
 * @return {Number} random number
 */
function rand(min, max) {
    return Math.random()*(max-min+1)+min;
}

/**
 * constraint
 * @param  {Number} value
 * @param  {Number} min
 * @param  {Number} max
 * @return {Number}
 */
function constrain(value, min, max) {
  if (value > max) return max;
  if (value < min) return min;
  return value;
}

/**
 * Map a value
 * @param  {Number} value
 * @param  {Number} istart
 * @param  {Number} istop
 * @param  {Number} ostart
 * @param  {Number} ostop
 * @return {Number} mapped value
 */
function map(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
}

/**
 * Return distance between 2 points
 * @param  {Number} x1
 * @param  {Number} y1
 * @param  {Number} x2
 * @param  {Number} y2
 * @return {Number} distance
 */
function dist(x1, y1, x2, y2) {
    let dx;
    let dy;
    dx = x1 - x2;
    dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

function min(x1, x2) {
	if(x2 < x1) return x2;
	return x1;
}

/**
 * resize canvas
 */
function resizeCanvas() {
    width = canvas.width = (window.innerWidth);
    setTimeout(function() {
        height = canvas.height = (window.innerHeight);
    }, 0);
};

function mousePressed(e) {
	mouse.x = e.offsetX;
	mouse.y = e.offsetY;
	mouse.on = true;
}

function mouseReleased(e) {
	mouse.on = false;
}

function mouseDragged(e) {
	mouse.x = e.offsetX;
	mouse.y = e.offsetY;
}

function keyPressed(e) {
	console.log(e);
	if(e.key == 'r') {
		offset = {
			x: 0,
			y: 0,
			z: 1,
			xstart: 0,
			ystart: 0,
		};
	}
}

function mouseWheel(e) {
	// cross-browser wheel delta
	var e = window.event || e; // old IE support
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	if(delta < 0) {
		// dezoom
		offset.z = Math.max(0, offset.z-0.1);
	} else if(delta > 0){
		// zoom
		offset.z += 0.1;
	}
	return false;
}