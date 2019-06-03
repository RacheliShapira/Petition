const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const sig = document.querySelector("#sig");
// const button = document.querySelector("button");

context.lineJoin = "round";
context.lineWidth = 4;

let clickX;
let clickY;
let drawing = false;
let drawingData;

canvas.addEventListener("mousedown", function(e) {
    clickX = e.offsetX;
    clickY = e.offsetY;
    drawing = true;
});

canvas.addEventListener("mousemove", function(e) {
    if (drawing) {
        context.moveTo(clickX, clickY);
        clickX = e.offsetX;
        clickY = e.offsetY;
        context.lineTo(clickX, clickY);
        context.stroke();
    }
});

canvas.addEventListener("mouseup", function() {
    drawing = false;
    drawingData = canvas.toDataURL();
    sig.value = drawingData;
});
