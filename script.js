document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const playerTurnDisplay = document.getElementById('player-turn');
    const resetBtn = document.getElementById('reset-btn');

    const gridSize = 4;
    const dotRadius = 10;
    const cellSize = canvas.width / gridSize;
    let currentPlayer = 1;
    let gameOver = false;
    let dots = [];
    let lines = [];
    let selectedDot = null;

    function initGame() {
        dots = [];
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                dots.push({
                    x: col * cellSize + cellSize / 2,
                    y: row * cellSize + cellSize / 2,
                    row,
                    col,
                    connections: [],
                    blocked: false
                });
            }
        }

        lines = [];
        currentPlayer = 1;
        gameOver = false;
        selectedDot = null;
        playerTurnDisplay.textContent = "Player 1's Turn";
        drawBoard();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 4;
        lines.forEach(line => {
            ctx.strokeStyle = line.player === 1 ? 'red' : 'blue';
            ctx.beginPath();
            ctx.moveTo(line.from.x, line.from.y);
            ctx.lineTo(line.to.x, line.to.y);
            ctx.stroke();
        });

        dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = dot.blocked ? '#ccc' : '#fffde8';
            ctx.fill();
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'orange';
            ctx.stroke();
        });

        if (selectedDot) {
            ctx.beginPath();
            ctx.arc(selectedDot.x, selectedDot.y, dotRadius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fffde8';
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = currentPlayer === 1 ? 'red' : 'blue';
            ctx.stroke();
        }
    }

    function getIntermediateDots(from, to) {
        const intermediateDots = [];

        const rowDiff = to.row - from.row;
        const colDiff = to.col - from.col;

        const rowStep = Math.sign(rowDiff);
        const colStep = Math.sign(colDiff);

        // Check if the move is along a straight or diagonal line
        if (!(rowStep === 0 || colStep === 0 || Math.abs(rowDiff) === Math.abs(colDiff))) {
            return intermediateDots; // Not a straight/diagonal line
        }

        let r = from.row + rowStep;
        let c = from.col + colStep;

        while (r !== to.row || c !== to.col) {
            const dot = dots.find(d => d.row === r && d.col === c);
            if (dot && dot !== from && dot !== to) intermediateDots.push(dot);

            r += rowStep;
            c += colStep;

            if (intermediateDots.length > 100) break; // safety check
        }

        return intermediateDots;
    }


    function markIntermediateDots(from, to) {
        const inBetween = getIntermediateDots(from, to);
        inBetween.forEach(dot => {
            dot.blocked = true;
        });
    }

    function isValidMove(fromDot, toDot) {
        if (fromDot === toDot || fromDot.blocked || toDot.blocked) return false;

        for (const line of lines) {
            if (
                (line.from === fromDot && line.to === toDot) ||
                (line.from === toDot && line.to === fromDot)
            ) return false;
        }

        const inBetweenDots = getIntermediateDots(fromDot, toDot);
        if (inBetweenDots.some(dot => dot.blocked)) return false;

        if (wouldCreateLoop(fromDot, toDot)) return false;
        if (wouldCrossLines({ from: fromDot, to: toDot })) return false;

        return true;
    }


    function getValidStartDots() {
        if (lines.length === 0) return dots.filter(dot => !dot.blocked);
        const endpoints = new Set();
        lines.forEach(line => {
            if (line.from.connections.length <= 1 && !line.from.blocked) endpoints.add(line.from);
            if (line.to.connections.length <= 1 && !line.to.blocked) endpoints.add(line.to);
        });
        return Array.from(endpoints);
    }

    function linesIntersect(l1, l2) {
        const a1 = l1.to.y - l1.from.y;
        const b1 = l1.from.x - l1.to.x;
        const c1 = a1 * l1.from.x + b1 * l1.from.y;

        const a2 = l2.to.y - l2.from.y;
        const b2 = l2.from.x - l2.to.x;
        const c2 = a2 * l2.from.x + b2 * l2.from.y;

        const det = a1 * b2 - a2 * b1;
        if (det === 0) return false;

        const x = (b2 * c1 - b1 * c2) / det;
        const y = (a1 * c2 - a2 * c1) / det;

        function onLine(line, px, py) {
            return (
                Math.min(line.from.x, line.to.x) <= px &&
                px <= Math.max(line.from.x, line.to.x) &&
                Math.min(line.from.y, line.to.y) <= py &&
                py <= Math.max(line.from.y, line.to.y)
            );
        }

        return onLine(l1, x, y) && onLine(l2, x, y);
    }

    function wouldCrossLines(newLine) {
        for (const line of lines) {
            if (
                line.from === newLine.from || line.to === newLine.to ||
                line.from === newLine.to || line.to === newLine.from
            ) continue;

            if (linesIntersect(newLine, line)) return true;
        }
        return false;
    }

    function wouldCreateLoop(fromDot, toDot) {
        const visited = new Set();
        const stack = [fromDot];

        while (stack.length > 0) {
            const current = stack.pop();
            if (current === toDot) return true;

            visited.add(current);
            for (const neighbor of current.connections) {
                if (!visited.has(neighbor)) stack.push(neighbor);
            }
        }

        return false;
    }

    function hasValidMoves() {
        const startDots = getValidStartDots();
        let counter = 0;
        for (const fromDot of startDots) {
            for (const toDot of dots) {
                if (++counter > 1000) return true; // avoid freezing
                if (isValidMove(fromDot, toDot)) return true;
            }
        }
        return false;
    }

    canvas.addEventListener('click', function(e) {
        if (gameOver) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedDot = dots.find(dot =>
            Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2) <= dotRadius * 2
        );

        if (!clickedDot || clickedDot.blocked) return;

        const validStartDots = getValidStartDots();

        if (!selectedDot) {
            if (lines.length === 0 || validStartDots.includes(clickedDot)) {
                selectedDot = clickedDot;
                drawBoard();
            }
        } else {
            if (isValidMove(selectedDot, clickedDot)) {
                lines.push({ from: selectedDot, to: clickedDot, player: currentPlayer });
                selectedDot.connections.push(clickedDot);
                clickedDot.connections.push(selectedDot);
                markIntermediateDots(selectedDot, clickedDot);

                selectedDot = null;

                const opponent = currentPlayer === 1 ? 2 : 1;

                if (!hasValidMoves()) {
                    playerTurnDisplay.textContent = `Player ${currentPlayer} made the last move. Player ${currentPlayer} wins!`;
                    gameOver = true;
                    drawBoard();
                    return;
                }

                currentPlayer = currentPlayer === 1 ? 2 : 1;
                playerTurnDisplay.textContent = `Player ${currentPlayer}'s Turn`;
                drawBoard();

                currentPlayer = opponent;
                playerTurnDisplay.textContent = `Player ${currentPlayer}'s Turn`;
                drawBoard();
            } else {
                selectedDot = null;
                drawBoard();
            }
        }
    });

    resetBtn.addEventListener('click', initGame);
    initGame();
});