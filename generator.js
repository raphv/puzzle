const HTML_START = `<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Puzzle</title>
        <style>
            * {
                margin: 0; padding: 0; border: none;
            }
            #svg-image {
                max-width: 100%; height: auto; background: #fcfffc; display: block; margin: auto;
            }
            .puzzle-line {
                fill: magenta; stroke-width: 3; fill-opacity: 0;
            }
            .puzzle-piece:hover .puzzle-line {
                fill-opacity: .2;
            }
        </style>
    </head>
    <body>`;

const HTML_END = `
    </body>
</html>`;

const PLAY_SCRIPT = `<script>
    const SNAP = 10**2;

let svg_element = document.getElementById('svg-image'),
    moving_tile = null,
    tile_start_x = 0,
    tile_start_y = 0,
    pointer_start_x = 0,
    pointer_start_y = 0;

function getCoords() {
    let res = (moving_tile.getAttribute('transform') || '').split(/[(),\s]/).filter(n => !isNaN(parseInt(n)));
    if (res.length < 2) {
        return [0, 0];
    } else {
        return res;
    }
}

function startMovement(el, x, y) {
    moving_tile = el;
    let coords = getCoords(),
        line = moving_tile.querySelector('use.puzzle-line');
    line.setAttribute('stroke', 'red');
    tile_start_x = parseInt(coords[0]);
    tile_start_y = parseInt(coords[1]);
    pointer_start_x = x;
    pointer_start_y = y;
}

function continueMovement(x, y) {
    let scale = svg_element.clientWidth / svg_element.getAttribute('width');
        new_x = (x - pointer_start_x) / scale + tile_start_x,
        new_y = (y - pointer_start_y) / scale + tile_start_y;
    moving_tile.setAttribute('transform',\`translate(\${new_x},\${new_y})\`);
}

function endMovement() {
    if (moving_tile) {
        let coords = getCoords(),
            line = moving_tile.querySelector('use.puzzle-line');
        if ((coords[0]**2 + coords[1]**2) < SNAP ) {
            moving_tile.setAttribute('transform', '');
            line.setAttribute('stroke', 'none');
        } else {
            line.setAttribute('stroke', 'blue');
        }
    }
    moving_tile = null;
}

Array.from(svg_element.querySelectorAll('g.puzzle-piece')).forEach(el => {
    el.addEventListener("mousedown", ev => {
        startMovement(el, ev.clientX, ev.clientY);
        ev.preventDefault();
    });
    el.addEventListener("touchstart", ev => {
        if (ev.touches.length === 1) {
            startMovement(el, ev.touches[0].clientX, ev.touches[0].clientY);
            ev.preventDefault();
        }
    });
});

document.addEventListener("mousemove", ev => {
    if (moving_tile) {
        continueMovement(ev.clientX, ev.clientY);
        ev.preventDefault();
    }
});

document.addEventListener("touchmove", ev => {
    if (moving_tile && ev.touches.length === 1) {
        continueMovement(ev.touches[0].clientX, ev.touches[0].clientY);
        ev.preventDefault();
    }
});

document.addEventListener("mouseup", endMovement);
document.addEventListener("touchend", endMovement);
\<\/script>`;

const reader = new FileReader(),
    preview_image = new Image();

let preview_url = null,
    play_url = null,
    IMAGE_DATA = SAMPLE_IMAGE,
    SOURCE_WIDTH = 799,
    SOURCE_HEIGHT = 533,
    never_compressed,
    BASE_WIDTH, BASE_HEIGHT, WIDTH_COUNT, HEIGHT_COUNT, MARGIN;

function autoAdjustColumns() {
    if (SOURCE_WIDTH < SOURCE_HEIGHT) {
        WIDTH_COUNT = 4;
        HEIGHT_COUNT = Math.min(10, Math.round(4*SOURCE_HEIGHT/SOURCE_WIDTH));
    } else {
        HEIGHT_COUNT = 4;
        WIDTH_COUNT = Math.min(10, Math.round(4*SOURCE_WIDTH/SOURCE_HEIGHT));
    }
    document.getElementById('column-slider').value = WIDTH_COUNT;
    document.getElementById('row-slider').value = HEIGHT_COUNT;
    document.getElementById('column-count').innerText = WIDTH_COUNT;
    document.getElementById('row-count').innerText = HEIGHT_COUNT;
}

function generate() {
    let BASE_WIDTH = Math.min(150,SOURCE_WIDTH/WIDTH_COUNT),
        scale = BASE_WIDTH*WIDTH_COUNT/SOURCE_WIDTH,
        BASE_HEIGHT = scale*SOURCE_HEIGHT/HEIGHT_COUNT,
        MARGIN = Math.max(BASE_HEIGHT, BASE_WIDTH),
        IMAGE_WIDTH = BASE_WIDTH * WIDTH_COUNT,
        IMAGE_HEIGHT = BASE_HEIGHT * HEIGHT_COUNT,
        VP_WIDTH = IMAGE_WIDTH + 2 * MARGIN,
        VP_HEIGHT = IMAGE_HEIGHT + 2 * MARGIN;

    let puzzle_vertical_positions = [];
    for (let x = 0; x < WIDTH_COUNT - 1; x++) {
        let col = [];
        for (let y = 0; y < HEIGHT_COUNT; y++) {
            col.push([
                2*Math.floor(2*Math.random()) + .6*Math.random() - 1.3,
                .4 * Math.random() - .2
            ]);
        }
        puzzle_vertical_positions.push(col);
    }
    let puzzle_horizontal_positions = [];
    for (let x = 0; x < WIDTH_COUNT; x++) {
        let col = [];
        for (let y = 0; y < HEIGHT_COUNT - 1; y++) {
            col.push([
                2*Math.floor(2*Math.random()) + .6*Math.random() - 1.3,
                .4 * Math.random() - .2
        ]);
        }
        puzzle_horizontal_positions.push(col);
    }

    let def_paths = '',
        unshuffled_pieces = '',
        tile_shuffler = [];

    for (let x = 0; x < WIDTH_COUNT; x++) {
        for (let y = 0; y < HEIGHT_COUNT; y++) {
            let top = y * BASE_HEIGHT,
                left = x * BASE_WIDTH,
                bottom = top + BASE_HEIGHT,
                right = left + BASE_WIDTH,
                centre_x = (left + right) / 2,
                centre_y = (top + bottom) / 2;
            let d = `M${left},${top}`;
            if (y) {
                let top_notch = top + BASE_HEIGHT/4 * puzzle_horizontal_positions[x][y-1][0],
                    notch_centre = centre_x + BASE_WIDTH * puzzle_horizontal_positions[x][y-1][1];
                d += `C${(right*2+notch_centre)/3},${top*2-top_notch},${left},${top_notch},${notch_centre},${top_notch}`
                    + `C${right},${top_notch},${(left*2+notch_centre)/3},${top*2-top_notch},${right},${top}`;
            } else {
                d += `L${right},${top}`;
            }
            if (x < (WIDTH_COUNT - 1)) {
                let right_notch = right + BASE_WIDTH/4 * puzzle_vertical_positions[x][y][0],
                    notch_centre = centre_y + BASE_HEIGHT * puzzle_vertical_positions[x][y][1];
                d += `C${right*2-right_notch},${(bottom*2+notch_centre)/3},${right_notch},${top},${right_notch},${notch_centre}`
                    + `C${right_notch},${bottom},${right*2-right_notch},${(top*2+notch_centre)/3},${right},${bottom}`;
            } else {
                d += `L${right},${bottom}`
            }
            if (y < (HEIGHT_COUNT - 1)) {
                let bottom_notch = bottom + BASE_HEIGHT/4 * puzzle_horizontal_positions[x][y][0],
                    notch_centre = centre_x + BASE_WIDTH *  puzzle_horizontal_positions[x][y][1];
                d += `C${(left*2+notch_centre)/3},${bottom*2-bottom_notch},${right},${bottom_notch},${notch_centre},${bottom_notch}`
                    + `C${left},${bottom_notch},${(right*2+notch_centre)/3},${bottom*2-bottom_notch},${left},${bottom}`;
            } else {
                d += `L${left},${bottom}`;
            }
            if (x) {
                let left_notch = left + BASE_WIDTH/4 * puzzle_vertical_positions[x-1][y][0],
                    notch_centre = centre_y + BASE_HEIGHT * puzzle_vertical_positions[x-1][y][1];
                d += `C${left*2-left_notch},${(top*2+notch_centre)/3},${left_notch},${bottom},${left_notch},${notch_centre}`
                + `C${left_notch},${top},${left*2-left_notch},${(bottom*2+notch_centre)/3},${left},${top}`;
            } else {
                d += `z`;
            }
            
            def_paths += `<path id="puzzle-path-${x}-${y}" d="${d}" />
                <clipPath id="puzzle-clip-${x}-${y}"><use href="#puzzle-path-${x}-${y}" />
            </clipPath>`;
            
            unshuffled_pieces += `<g class="puzzle-piece">
            <g class="puzzle-image" clip-path="url(#puzzle-clip-${x}-${y})">
                <use href="#puzzle-image" />
            </g>
            <use class="puzzle-line" href="#puzzle-path-${x}-${y}" stroke="blue" />
            </g>`;

            tile_shuffler.push([`${x}-${y}`, centre_x, centre_y]);

        }
    }

    let margin_shuffler = [],
        square_count = WIDTH_COUNT * HEIGHT_COUNT,
        linear_length = 2 * (WIDTH_COUNT + HEIGHT_COUNT);
    for (let i = 0; i < square_count; i++) {
        let linear_position = linear_length * (i + .5) / square_count;
        if (linear_position < WIDTH_COUNT) {
            margin_shuffler.push([linear_position * BASE_WIDTH, BASE_HEIGHT * (.5 * Math.random() - .25)]);
            continue;
        }
        if (linear_position < (WIDTH_COUNT + HEIGHT_COUNT)) {
            margin_shuffler.push([BASE_WIDTH * (.5 * Math.random() - .25), (linear_position - WIDTH_COUNT) * BASE_HEIGHT]);
            continue;
        }
        if (linear_position < (2 * WIDTH_COUNT + HEIGHT_COUNT)) {
            margin_shuffler.push([(linear_position - WIDTH_COUNT - HEIGHT_COUNT) * BASE_WIDTH, IMAGE_HEIGHT + BASE_HEIGHT * (.5 * Math.random() - .25)]);
            continue;
        }
        margin_shuffler.push([IMAGE_WIDTH + BASE_WIDTH * (.5 * Math.random() - .25), (linear_position - 2 * WIDTH_COUNT - HEIGHT_COUNT) * BASE_HEIGHT]);
    }

    let shuffled_pieces = '';

    while (tile_shuffler.length) {
        let tile_info = tile_shuffler.splice(Math.floor(Math.random()*tile_shuffler.length),1)[0],
            margin_info = margin_shuffler.splice(Math.floor(Math.random()*margin_shuffler.length),1)[0],
            tile_ref = tile_info[0],
            trans_x = margin_info[0] - tile_info[1],
            trans_y = margin_info[1] - tile_info[2];
        
        shuffled_pieces += `<g class="puzzle-piece" transform="translate(${trans_x}, ${trans_y})">
            <g class="puzzle-image" clip-path="url(#puzzle-clip-${tile_ref})">
                <use href="#puzzle-image" />
            </g>
            <use class="puzzle-line" href="#puzzle-path-${tile_ref}" stroke="blue" />
            </g>`;
    }

    let svg_part_1 = `
    <svg id="svg-image" width="${VP_WIDTH}" height="${VP_HEIGHT}" viewBox="${-MARGIN} ${-MARGIN} ${VP_WIDTH} ${VP_HEIGHT}">
        <defs id="svg-defs">
            <image id="puzzle-image" href="${IMAGE_DATA}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" />
            ${def_paths}
        </defs>
        <rect id="background-canvas" fill="#e0f0e0" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" />`;

    let preview_parts = [ HTML_START, svg_part_1, unshuffled_pieces, '</svg>', PLAY_SCRIPT, HTML_END ],
        play_parts = [ HTML_START, svg_part_1, shuffled_pieces, '</svg>', PLAY_SCRIPT, HTML_END ];

    let preview_blob = new Blob(preview_parts,{'type': 'text/html'}),
        play_blob = new Blob(play_parts,{'type': 'text/html'});

    if (preview_url) {
        URL.revokeObjectURL(preview_url);
    }
    preview_url = URL.createObjectURL(preview_blob);
    if (play_url) {
        URL.revokeObjectURL(play_url);
    }
    play_url = URL.createObjectURL(play_blob);

    document.getElementById('preview_frame').src = preview_url;
    Array.from(document.querySelectorAll('.play-links a')).forEach(a => a.href = play_url);
}


function showStatus(statusclass, statustext) {
    document.getElementById('image-status').className = statusclass;
    document.getElementById('image-status').textContent = statustext; 
}

function openFile(file) {
    /* This is the callback triggered when opening a file,
     * either from drag-and-drop or browsing file */
    if (!file) {
        showStatus("error","No file opened or dropped");
        return;
    }
    let ftypeparts = file.type.split("/");
    if (ftypeparts[0] !== "image") {
        /* If the file is not an image, we discard it */
        showStatus("error","File is not an image");
        return;
    }
    showStatus("waiting", `Checking "${file.name}"`);
    reader.readAsDataURL(file);
}
reader.addEventListener('load', function() {
    never_compressed = true;
    IMAGE_DATA = reader.result;
    preview_image.src = IMAGE_DATA;
    showStatus('waiting', `Loaded image`);
});
preview_image.addEventListener('load', function() {
    SOURCE_WIDTH = preview_image.naturalWidth;
    SOURCE_HEIGHT = preview_image.naturalHeight;
    let area = SOURCE_WIDTH * SOURCE_HEIGHT;
    if ((area > 900**2 || IMAGE_DATA.length > 280000) && never_compressed) {
        never_compressed = false;
        showStatus('waiting', `Compressing image`);
        let compression_scale = Math.min(1, (860**2/area)**.5),
            new_width = Math.round(compression_scale * SOURCE_WIDTH),
            new_height = Math.round(compression_scale * SOURCE_HEIGHT),
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');
        canvas.width = new_width;
        canvas.height = new_height;
        ctx.drawImage(preview_image, 0, 0, new_width, new_height);
        IMAGE_DATA = canvas.toDataURL('image/jpeg', .75);
        preview_image.src = IMAGE_DATA;
    } else {
        showStatus('success', `Processed image`);
        autoAdjustColumns();
        generate();
    }
});
document.getElementById('image-dropzone').addEventListener('dragenter', function(event) {
  event.preventDefault();
  event.dataTransfer.effectAllowed = 'copy';
});
document.getElementById('image-dropzone').addEventListener('dragover', function(event) {
  event.preventDefault();
});
document.getElementById('image-dropzone').addEventListener('dragleave', function(event) {
  event.preventDefault();
});
document.getElementById('image-dropzone').addEventListener('drop', function(event) {
  event.preventDefault();
  if (event.dataTransfer.files.length) {
     /* Is there a file that has been dropped?
      * If yes, try to read it */
     openFile(event.dataTransfer.files[0]);
  } else {
    showStatus("error", "No file dropped.");
  }
});
document.getElementById('image-input').addEventListener('change', function(event) {
   event.preventDefault();
   openFile(document.getElementById('image-input').files[0]);
});

document.getElementById('column-slider').addEventListener('input', function(ev) {
    WIDTH_COUNT = parseInt(ev.currentTarget.value);
    document.getElementById('column-count').innerText = WIDTH_COUNT;
    generate();
});
document.getElementById('row-slider').addEventListener('input', function(ev) {
    HEIGHT_COUNT = parseInt(ev.currentTarget.value);
    document.getElementById('row-count').innerText = HEIGHT_COUNT;
    generate();
});

autoAdjustColumns();
generate();
