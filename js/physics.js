/**
 * || Canvas stuff
 */

const space = { ctx: document.getElementById("space-canvas").getContext("2d"), width: 0, height: 0 };
const posPlot = { ctx: document.getElementById("position-canvas").getContext("2d"), width: 0, height: 0 };
const velPlot = { ctx: document.getElementById("velocity-canvas").getContext("2d"), width: 0, height: 0 };
const accPlot = { ctx: document.getElementById("acceleration-canvas").getContext("2d"), width: 0, height: 0 };

const plots = [space, posPlot, velPlot, accPlot];

let dpi = window.devicePixelRatio;

let resizeTimeout;

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

// Resizes the canvas after 200 ms
window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Ignore resize if width hasn't changed and height only slightly did
    if (width === lastWidth && Math.abs(height - lastHeight) < 150) {
        // Ignore address bar hide/show
        return;
    }

    lastWidth = width;
    lastHeight = height;

    // Clear plots !!! (it is truly needed though?)

    plots.forEach(plot => {
        plot.ctx.canvas.style.opacity = 0;
        plot.ctx.canvas.style.visibility = "collapse";
    })

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        plots.forEach(plot => {
            plot.ctx.canvas.style.visibility = "visible";
            plot.ctx.canvas.style.opacity = 1;
            resizeCanvas(plot);
        })

        drawSpace();
        drawPlots();
    }, 200);
});

resizeCanvas = (plot) => {
    dpi = window.devicePixelRatio;

    // Sets the canvas width and height based on the dpi resolution of the page
    const styleWidth = +getComputedStyle(plot.ctx.canvas).getPropertyValue("width").slice(0, -2);
    const styleHeight = +getComputedStyle(plot.ctx.canvas).getPropertyValue("height").slice(0, -2);
    plot.ctx.canvas.setAttribute('height', Math.round(styleHeight * dpi));
    plot.ctx.canvas.setAttribute('width', Math.round(styleWidth * dpi));

    // Saves the width and height of the resized canvas, multiplied by dpi?
    plot.width = Math.round(plot.ctx.canvas.offsetWidth * dpi);
    plot.height = Math.round(plot.ctx.canvas.offsetHeight * dpi);
}

/**
 * || Physics
 */

let particle = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let acceleration = { x: 0, y: 0 };
let maxSpeed = 100;

let eventsSize = 500;
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

    velocity.x = (3 * particle.x - 4 * particleEvents[10].x + particleEvents[20].x) / 20;
    velocity.y = (3 * particle.y - 4 * particleEvents[10].y + particleEvents[20].y) / 20;

    velocities.unshift({ x: velocity.x, y: velocity.y });
    // Limits the size of the stored velocities array
    if (velocities.length > accAvgTime - 1) velocities.pop();

    acceleration.x = (particle.x - 2 * particleEvents[10].x + particleEvents[20].x) / 100;
    acceleration.y = (particle.y - 2 * particleEvents[10].y + particleEvents[20].y) / 100;

    let isParticleStationary = true;
    velocities.forEach(v => {
        if ((Math.sqrt(v.x ** 2 + v.y ** 2) > 2)) isParticleStationary = false;
    });

    if (isParticleStationary) {
        velocity.x = 0;
        velocity.y = 0;
        acceleration.x = 0;
        acceleration.y = 0;
        if (isParticleMoving && !isCursorDown) {
            isParticleMoving = false;
        }
    }

    if (!isParticleStationary || isParticleMoving) {
        particleEvents.unshift({
            x: particle.x, y: particle.y,
            vx: velocity.x, vy: velocity.y,
            ax: acceleration.x, ay: acceleration.y,
            vAbs: Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
            aAbs: Math.sqrt(acceleration.x * acceleration.x + acceleration.y * acceleration.y),
            vAngle: Math.atan2(velocity.x, velocity.y),
            aAngle: Math.atan2(acceleration.x, acceleration.y),
        });
    }

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

space.ctx.canvas.onpointermove = (e) => {
    if (isCursorDown) {
        cursor = { x: getCursorX(e), y: getCursorY(e) };
        if ((particle.x - cursor.x) ** 2 + (particle.y - cursor.y) ** 2 < selectionRadius ** 2) {
            isParticleSelected = true;
        }
    }
}

space.ctx.canvas.onpointerdown = (e) => {
    cursor = { x: getCursorX(e), y: getCursorY(e) };

    isCursorDown = true;
    isParticleMoving = true;

    if ((particle.x - cursor.x) ** 2 + (particle.y - cursor.y) ** 2 < selectionRadius ** 2) {
        isParticleSelected = true;
    } else {
        isParticleSelected = false;
    }
}

space.ctx.canvas.onpointerup = (e) => {
    stopParticleInteraction();
}

space.ctx.canvas.onpointercancel = (e) => {
    stopParticleInteraction();
}

stopParticleInteraction = () => {
    if (isCursorDown) {
        isCursorDown = false;
        isParticleSelected = false;
    }
}

getCursorX = (e) => {
    return (e.clientX - space.ctx.canvas.offsetLeft) * dpi;
}

getCursorY = (e) => {
    return (e.clientY - space.ctx.canvas.offsetTop) * dpi;
}

/**
 * Rendering
 */

let velocityScale = 5;
let accelerationScale = 40;

init = () => {
    plots.forEach(plot => {
        resizeCanvas(plot);
    })

    particle = { x: space.width / 2, y: space.height / 2 };
    particleEvents = [...Array(eventsSize)].map(() => {
        return {
            x: particle.x, y: particle.y,
            vx: 0, vy: 0,
            ax: 0, ay: 0,
            vAbs: 0, aAbs: 0,
            vAngle: 0, aAngle: 0
        };
    });

    drawSpace();
    drawPlots();
}

drawSpace = () => {
    updatePosition();
    updatePhysics();

    space.ctx.clearRect(0, 0, space.width + 1, space.height + 1);

    if (isParticleMoving && !isParticleSelected) {
        space.ctx.strokeStyle = "#aed2f5ff";
        space.ctx.lineWidth = 3;
        space.ctx.setLineDash([2, 4]);

        space.ctx.beginPath();
        space.ctx.moveTo(particle.x, particle.y);
        space.ctx.lineTo(cursor.x, cursor.y);
        space.ctx.stroke();
    }

    // Velocity

    space.ctx.strokeStyle = "#84bff6ff";
    space.ctx.lineWidth = 3;
    space.ctx.setLineDash([]);

    space.ctx.beginPath();
    space.ctx.moveTo(particle.x, particle.y);
    space.ctx.lineTo(particle.x + velocity.x * velocityScale, particle.y + velocity.y * velocityScale);
    space.ctx.stroke();

    // Acceleration

    space.ctx.strokeStyle = "#000000";
    space.ctx.lineWidth = 3;

    space.ctx.beginPath();
    space.ctx.moveTo(particle.x, particle.y);
    space.ctx.lineTo(particle.x + acceleration.x * accelerationScale, particle.y + acceleration.y * accelerationScale);
    space.ctx.stroke();

    // Particle

    space.ctx.fillStyle = "#1484e6";

    space.ctx.beginPath();
    space.ctx.arc(particle.x, particle.y, 20, 0, 2 * Math.PI);
    space.ctx.fill();

    requestAnimationFrame(() => { drawSpace(); });
}

drawPlots = () => {
    const endPoint = Math.min(posPlot.width, eventsSize);

    // Position
    posPlot.ctx.clearRect(0, 0, posPlot.width + 1, posPlot.height + 1);

    posPlot.ctx.strokeStyle = "#d1d1d1ff";
    posPlot.ctx.lineWidth = 2;

    posPlot.ctx.beginPath();
    posPlot.ctx.moveTo(0, posPlot.height / 2);
    posPlot.ctx.lineTo(posPlot.width, posPlot.height / 2);
    posPlot.ctx.stroke();

    posPlot.ctx.strokeStyle = "#1484e6";
    posPlot.ctx.lineWidth = 4;

    posPlot.ctx.beginPath();
    posPlot.ctx.moveTo(0, particleEvents[1].y / space.height * posPlot.height);
    for (let i = 1; i < endPoint; i++) {
        posPlot.ctx.lineTo(
            i / endPoint * posPlot.width,
            particleEvents[i].y / space.height * posPlot.height
        );
    }
    posPlot.ctx.stroke();

    // Velocity

    velPlot.ctx.clearRect(0, 0, velPlot.width + 1, velPlot.height + 1);

    velPlot.ctx.strokeStyle = "#d1d1d1ff";
    velPlot.ctx.lineWidth = 2;

    velPlot.ctx.beginPath();
    velPlot.ctx.moveTo(0, velPlot.height / 2);
    velPlot.ctx.lineTo(velPlot.width, velPlot.height / 2);
    velPlot.ctx.stroke();

    velPlot.ctx.strokeStyle = "#1484e6";
    velPlot.ctx.lineWidth = 4;

    velPlot.ctx.beginPath();
    velPlot.ctx.moveTo(0, velPlot.height / 2 - 0.9 * particleEvents[1].vy);
    for (let i = 1; i < endPoint; i++) {
        velPlot.ctx.lineTo(
            i / endPoint * velPlot.width,
            velPlot.height / 2 - 0.9 * particleEvents[i].vy
        );
    }
    velPlot.ctx.stroke();

    // Acceleration

    accPlot.ctx.clearRect(0, 0, accPlot.width + 1, accPlot.height + 1);

    accPlot.ctx.strokeStyle = "#d1d1d1ff";
    accPlot.ctx.lineWidth = 2;

    accPlot.ctx.beginPath();
    accPlot.ctx.moveTo(0, accPlot.height / 2);
    accPlot.ctx.lineTo(accPlot.width, accPlot.height / 2);
    accPlot.ctx.stroke();

    accPlot.ctx.strokeStyle = "#1484e6";
    accPlot.ctx.lineWidth = 4;

    accPlot.ctx.beginPath();
    accPlot.ctx.moveTo(0, accPlot.height / 2 - 10 * particleEvents[1].ay);
    for (let i = 1; i < endPoint; i++) {
        accPlot.ctx.lineTo(
            i / endPoint * accPlot.width,
            accPlot.height / 2 - 10 * particleEvents[i].ay
        );
    }
    accPlot.ctx.stroke();

    requestAnimationFrame(() => { drawPlots(); });
}

init();