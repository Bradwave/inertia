/**
 * || Canvas stuff
 */

const spaceCanvas = document.getElementById("space-canvas");
const spaceCtx = spaceCanvas.getContext("2d");

let width;
let height;
let dpi;

let resizeTimeout;

// Resizes the canvas after 200 ms
window.addEventListener("resize", () => {
    // Clear plots !!! (it is truly needed though?)

    spaceCanvas.style.opacity = 0;
    spaceCanvas.style.visibility = "collapse";

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        spaceCanvas.style.visibility = "visible";
        spaceCanvas.style.opacity = 1;

        resizeCanvas();

        drawSpace();
    }, 200);
});

resizeCanvas = () => {
    dpi = window.devicePixelRatio;

    // Sets the canvas width and height based on the dpi resolution of the page
    const styleWidth = +getComputedStyle(spaceCanvas).getPropertyValue("width").slice(0, -2);
    const styleHeight = +getComputedStyle(spaceCanvas).getPropertyValue("height").slice(0, -2);
    spaceCanvas.setAttribute('height', Math.round(styleHeight * dpi));
    spaceCanvas.setAttribute('width', Math.round(styleWidth * dpi));

    // Saves the width and height of the resized canvas, multiplied by dpi?
    width = Math.round(spaceCanvas.offsetWidth * dpi);
    height = Math.round(spaceCanvas.offsetHeight * dpi);
}

/**
 * || Physics
 */

let particle = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let acceleration = { x: 0, y: 0 };
let maxSpeed = 100;

let eventsSize = 500;
let velAvgTime = 5;
let accAvgTime = 10;
let velocities = [...Array(accAvgTime)].map(() => { return { x: 0, y: 0 }; });
let particleEvents;

updatePhysics = () => {
    if (!isParticleSelected && isParticleMoving) {
        let inc = { x: 0, y: 0 };

        if (isCursorDown) {
            inc.x = (cursor.x - particle.x) / 2;
            inc.y = (cursor.y - particle.y) / 2;
        } else {
            inc.x = Math.abs(velocity.x) > .5 ? .95 * velocity.x : 0;
            inc.y = Math.abs(velocity.y) > .5 ? .95 * velocity.y : 0;
        }
        inc = limitSpeed(inc, .99 * maxSpeed);

        particle.x += .1 * inc.x;
        particle.y += .1 * inc.y;
    }

    velocity.x = (particleEvents[0].x - particleEvents[velAvgTime - 1].x) / (2);
    velocity.y = (particleEvents[0].y - particleEvents[velAvgTime - 1].y) / (2);

    velocities.unshift({ x: velocity.x, y: velocity.y });
    // Limits the size of the stored velocities array
    if (velocities.length > accAvgTime - 1) velocities.pop();

    acceleration.x = (velocities[0].x - velocities[accAvgTime - 1].x) / (10);
    acceleration.y = (velocities[0].y - velocities[accAvgTime - 1].y) / (10);

    let isParticleStationary = true;
    velocities.forEach(v => {
        if ((v.x !== 0) || (v.y !== 0)) isParticleStationary = false;
    });

    if (!isParticleStationary || isParticleMoving) {
        particleEvents.unshift({
            x: particle.x,
            y: particle.y,
            xVelocity: velocity.x,
            yVelocity: velocity.y,
            xAcceleration: acceleration.x,
            yAcceleration: acceleration.y,
            velocityAbs: Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
            accelerationAbs: Math.sqrt(acceleration.x * acceleration.x + acceleration.y * acceleration.y),
            angle: Math.atan2(acceleration.x, acceleration.y)
        });
    }

    if (isParticleStationary && isParticleMoving && !isCursorDown) isParticleMoving = false;

    // Limits the size of the stored events array
    if (particleEvents.length > eventsSize) particleEvents.pop();
}

const allEqual = arr => arr.every(val => val === arr[0]);

const limitSpeed = (v, maxSpeed) => {
    // Calculates the velocity vector magnitude
    const vAbs = v.x * v.x + v.y * v.y;
    if (vAbs > maxSpeed * maxSpeed) {
        // Normalizes the velocity vector and multiply by maximum value
        v.x = v.x / Math.sqrt(vAbs) * maxSpeed;
        v.y = v.y / Math.sqrt(vAbs) * maxSpeed;
    }
    return v;
}

/**
 * || Listeners
 */

let cursor = { x: 0, y: 0 };
let isParticleSelected = false;
let isParticleMoving = false;
let isCursorDown = true;
const selectionRadius = 15;

updatePosition = () => {
    if (isParticleSelected) {
        lastCursor = isCursorDown ? cursor : particle;
        // The distance from the cursor and the particle is computed
        const cursorParticleDistance = Math.sqrt((lastCursor.x - particle.x) ** 2 + (lastCursor.y - particle.y) ** 2);
        // If the distance between the cursor and the particle exceeds the threshold value (the selection radius), the particle is moved
        if (cursorParticleDistance > selectionRadius) {
            const xInc = (lastCursor.x - particle.x) * (1 - selectionRadius / cursorParticleDistance);
            const yInc = (lastCursor.y - particle.y) * (1 - selectionRadius / cursorParticleDistance);
            particle.x += .2 * xInc;
            particle.y += .2 * yInc;
        }
    }
}

spaceCanvas.onpointermove = (e) => {
    if (isCursorDown) {
        cursor = { x: getCursorX(e), y: getCursorY(e) };
        if ((particle.x - cursor.x) ** 2 + (particle.y - cursor.y) ** 2 < selectionRadius ** 2) {
            isParticleSelected = true;
        }
    }
}

spaceCanvas.onpointerdown = (e) => {
    cursor = { x: getCursorX(e), y: getCursorY(e) };

    isCursorDown = true;
    isParticleMoving = true;

    if ((particle.x - cursor.x) ** 2 + (particle.y - cursor.y) ** 2 < selectionRadius ** 2) {
        isParticleSelected = true;
    } else {
        isParticleSelected = false;
    }
}

spaceCanvas.onpointerup = (e) => {
    stopParticleInteraction();
}

spaceCanvas.onpointercancel = (e) => {
    stopParticleInteraction();
}

spaceCanvas.onpointerleave = (e) => {
    stopParticleInteraction();
}

stopParticleInteraction = () => {
    if (isCursorDown) {
        isCursorDown = false;
        isParticleSelected = false;
    }
}

getCursorX = (e) => {
    return (e.clientX - spaceCanvas.offsetLeft) * dpi;
}

getCursorY = (e) => {
    return (e.clientY - spaceCanvas.offsetTop) * dpi;
}

/**
 * Rendering
 */

let velocityScale = 5;
let accelerationScale = 40;

init = () => {
    resizeCanvas();

    particle = { x: width / 2, y: height / 2 };
    particleEvents = [...Array(eventsSize)].map(() => {
        return {
            x: particle.x,
            y: particle.y,
            accelerationAbs: 0,
            angle: 0
        };
    });

    drawSpace();
}

drawSpace = () => {
    updatePosition();
    updatePhysics();

    spaceCtx.clearRect(0, 0, width, height);

    if (isParticleMoving && !isParticleSelected) {
        spaceCtx.strokeStyle = "#aed2f5ff";
        spaceCtx.lineWidth = 3;
        spaceCtx.setLineDash([2, 4]);

        spaceCtx.beginPath();
        spaceCtx.moveTo(particle.x, particle.y);
        spaceCtx.lineTo(cursor.x, cursor.y);
        spaceCtx.stroke();
    }

    // Velocity

    spaceCtx.strokeStyle = "#84bff6ff";
    spaceCtx.lineWidth = 3;
    spaceCtx.setLineDash([]);

    spaceCtx.beginPath();
    spaceCtx.moveTo(particle.x, particle.y);
    spaceCtx.lineTo(particle.x + velocity.x * velocityScale, particle.y + velocity.y * velocityScale);
    spaceCtx.stroke();

    // Acceleration

    spaceCtx.strokeStyle = "#000000";
    spaceCtx.lineWidth = 3;

    spaceCtx.beginPath();
    spaceCtx.moveTo(particle.x, particle.y);
    spaceCtx.lineTo(particle.x + acceleration.x * accelerationScale, particle.y + acceleration.y * accelerationScale);
    spaceCtx.stroke();

    // Particle

    spaceCtx.fillStyle = "#1484e6";

    spaceCtx.beginPath();
    spaceCtx.arc(particle.x, particle.y, 20, 0, 2 * Math.PI);
    spaceCtx.fill();

    requestAnimationFrame(() => { drawSpace(); });
}

init();