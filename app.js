
const DEFAULT_COLORS = [
    '#e8a64a',
    '#8fbd68',
    '#5c8e54',
    '#5b718b',
    '#d7d0b8',
    '#a95c48',
    '#e5c96b',
    '#a78ac4',
    '#e7e7e7',
    '#303832'
];

let size = 16;
let pixels = [];
let selectedColor = DEFAULT_COLORS[0];
let tool = 'pencil';
let drawing = false;

let history = [];
let historyIndex = -1;
let palette = [...DEFAULT_COLORS];

const $ = id => document.getElementById(id);
const canvas = $('canvas');

function snapshot() {
    const copy = pixels.map(row => [...row]);

    history = history.slice(0, historyIndex + 1);
    history.push(copy);

    if (history.length > 80) {
        history.shift();
    }

    historyIndex = history.length - 1;
    updateHistoryButtons();
}

function restore(index) {
    if (index < 0 || index >= history.length) return;

    historyIndex = index;
    pixels = history[index].map(row => [...row]);

    render();
    updateHistoryButtons();
}

function updateHistoryButtons() {
    $('undoBtn').disabled = historyIndex <= 0;
    $('redoBtn').disabled = historyIndex >= history.length - 1;
}

function initGrid(n, preserve = false) {
    const old = pixels;

    size = n;

    pixels = Array.from({ length: n }, (_, y) =>
        Array.from({ length: n }, (_, x) =>
            preserve && old[y]?.[x] !== undefined
                ? old[y][x]
                : null
        )
    );

    $('dimensionsLabel').textContent = `${n} × ${n} px`;

    $('zoomLabel').textContent =
        n <= 16 ? '100%' : n <= 24 ? '75%' : '55%';

    render();

    history = [];
    historyIndex = -1;

    snapshot();
}

function render() {
    canvas.innerHTML = '';

    canvas.style.gridTemplateColumns =
        `repeat(${size}, var(--pixel-size))`;

    const px = Math.max(9, Math.min(26, Math.floor(416 / size)));

    canvas.style.setProperty('--pixel-size', `${px}px`);

    pixels.forEach((row, y) => {
        row.forEach((color, x) => {
            const cell = document.createElement('div');

            cell.className = 'pixel';
            cell.dataset.x = x;
            cell.dataset.y = y;

            if (color) {
                cell.style.backgroundColor = color;
            }

            cell.addEventListener('pointerdown', event => {
                event.preventDefault();
                drawing = true;
                paint(x, y);
            });

            cell.addEventListener('pointerenter', () => {
                if (drawing) {
                    paint(x, y);
                }
            });

            cell.addEventListener('click', () => {
                if (tool === 'eyedropper') {
                    pickColor(x, y);
                }
            });

            canvas.appendChild(cell);
        });
    });

    updatePixelCount();
}

function paint(x, y) {
    if (tool === 'eyedropper') {
        pickColor(x, y);
        return;
    }

    const next = tool === 'eraser'
        ? null
        : selectedColor;

    if (pixels[y][x] === next) return;

    pixels[y][x] = next;

    const cell = canvas.children[y * size + x];

    cell.style.backgroundColor = next || '';

    updatePixelCount();
}

function finishStroke() {
    if (drawing) {
        drawing = false;
        snapshot();
    }
}

function pickColor(x, y) {
    const color = pixels[y][x];

    if (!color) return;

    selectedColor = color;

    if (!palette.includes(color)) {
        palette.push(color);
        renderPalette();
    }

    updateSelectedColor();
    setTool('pencil');
}

function updatePixelCount() {
    const count = pixels.flat().filter(Boolean).length;

    $('pixelCount').textContent =
        `${count} ${count === 1 ? 'pixel colorido' : 'pixels coloridos'}`;
}

function renderPalette() {
    $('palette').innerHTML = '';

    palette.forEach(color => {
        const swatch = document.createElement('button');

        swatch.className =
            'swatch' + (color === selectedColor ? ' selected' : '');

        swatch.style.backgroundColor = color;
        swatch.title = color;

        swatch.addEventListener('click', () => {
            selectedColor = color;

            setTool('pencil');
            updateSelectedColor();
            renderPalette();
        });

        $('palette').appendChild(swatch);
    });
}

function updateSelectedColor() {
    $('selectedSwatch').style.backgroundColor = selectedColor;
    $('selectedHex').textContent = selectedColor.toUpperCase();

    renderPalette();
}

function setTool(name) {
    tool = name;

    document.querySelectorAll('.tool').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.tool === name
        );
    });
}

function addPaletteColor() {
    const color = $('colorPicker').value.toLowerCase();

    if (!palette.includes(color)) {
        palette.push(color);
    }

    selectedColor = color;

    updateSelectedColor();
}

/*
 * Normaliza o nome do sprite para uso em:
 * - classe CSS
 * - nome da variável JavaScript
 * - nome do arquivo
 */
function normalizeName(value) {
    return value
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'novo-item';
}

/*
 * Exportação dos dois formatos.
 */
function exportCode() {
    const spriteName = normalizeName($('spriteName').value);

    const variableName = spriteName.replace(/-([a-z])/g, (_, letter) =>
        letter.toUpperCase()
    );

    const usedColors = [...new Set(
        pixels.flat().filter(Boolean)
    )];

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    const colorMap = {};

    usedColors.forEach((color, index) => {
        colorMap[color] = letters[index] || `X${index}`;
    });

    /*
     * EXPORTAÇÃO JAVASCRIPT
     */

    const matrix = pixels.map(row => {
        return `        "${row.map(color =>
            color ? colorMap[color] : 'N'
        ).join('')}"`;
    }).join(',\n');

    const jsColors = usedColors.map(color => {
        const letter = colorMap[color];

        const colorClass = `${spriteName}-cor-${letter.toLowerCase()}`;

        return `        ${letter}: "${colorClass}"`;
    }).join(',\n');

    const js = `export const ${variableName} = {
    cores: {
${jsColors}${usedColors.length ? ',\n' : ''}
        N: "nada"
    },
    padrao: [
${matrix}
    ]
};`;

    /*
     * EXPORTAÇÃO SCSS
     */

    const scssColors = usedColors.map(color => {
        const letter = colorMap[color];

        const colorClass = `${spriteName}-cor-${letter.toLowerCase()}`;

        return `.${colorClass} {
    background: ${color};
    z-index: 0;
}`;
    }).join('\n\n');

    const scss = `.${spriteName} 
${scssColors}`;

    /*
     * PREENCHE OS CAMPOS DE EXPORTAÇÃO
     */

    $('jsOutput').value = js;
    $('scssOutput').value = scss;

    document.querySelector('#jsPanel .code-heading span').textContent =
        `spr_${spriteName.replace(/-/g, '_')}.js`;

    document.querySelector('#scssPanel .code-heading span').textContent =
        `_${spriteName}.scss`;

    $('exportDialog').showModal();
}

/*
 * EVENTOS
 */

document.addEventListener('pointerup', finishStroke);

window.addEventListener('blur', finishStroke);

document.querySelectorAll('.tool').forEach(button => {
    button.addEventListener('click', () => {
        setTool(button.dataset.tool);
    });
});

$('resolution').addEventListener('change', event => {
    if (event.target.value === 'custom') {
        const value = Number(prompt('Informe a resolução (4 a 64):', size));

        if (Number.isInteger(value) && value >= 4 && value <= 64) {
            initGrid(value, true);
        } else {
            event.target.value = String(size);
        }

        return;
    }

    initGrid(Number(event.target.value), true);
});

$('addColor').addEventListener('click', addPaletteColor);

$('colorPicker').addEventListener('input', event => {
    selectedColor = event.target.value.toLowerCase();
    updateSelectedColor();
});

$('undoBtn').addEventListener('click', () => {
    restore(historyIndex - 1);
});

$('redoBtn').addEventListener('click', () => {
    restore(historyIndex + 1);
});

$('clearBtn').addEventListener('click', () => {
    if (!confirm('Limpar todos os pixels do canvas?')) return;

    pixels = pixels.map(row => row.map(() => null));

    render();
    snapshot();
});

$('exportBtn').addEventListener('click', exportCode);

$('closeDialog').addEventListener('click', () => {
    $('exportDialog').close();
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(item => {
            item.classList.toggle('active', item === tab);
        });

        document.querySelectorAll('.export-content').forEach(panel => {
            panel.classList.toggle(
                'active',
                panel.id === (tab.dataset.tab === 'js' ? 'jsPanel' : 'scssPanel')
            );
        });
    });
});

document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', async () => {
        const field = $(button.dataset.copy);

        try {
            await navigator.clipboard.writeText(field.value);
            button.textContent = 'Copiado!';
        } catch {
            field.select();
            document.execCommand('copy');
            button.textContent = 'Copiado!';
        }

        setTimeout(() => {
            button.textContent = 'Copiar código';
        }, 1200);
    });
});

document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;

    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        restore(historyIndex - 1);
    } else if (event.ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        restore(historyIndex + 1);
    } else if (event.key.toLowerCase() === 'b') {
        setTool('pencil');
    } else if (event.key.toLowerCase() === 'e') {
        setTool('eraser');
    } else if (event.key.toLowerCase() === 'i') {
        setTool('eyedropper');
    }
});

/*
 * INICIALIZAÇÃO
 */

renderPalette();
updateSelectedColor();
initGrid(16);
